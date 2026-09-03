/**
 * Community realtime signal client (BACKEND V2.2).
 *
 * This service NEVER reads or parses raw Community rows (app.posts /
 * app.comments / app.post_votes). It subscribes to exactly one
 * Realtime-published table, app.realtime_events, whose only columns are
 * event_type/scope_type/college_id/jurusan_id/building_id/post_id/
 * created_at (see supabase/migrations/20260902120000_community_realtime_signal.sql).
 * Every event it forwards is that whitelisted shape and nothing else — it
 * carries no owner/user identity and no post/comment content by
 * construction, not merely by convention here.
 *
 * Responsibilities: connect, subscribe/unsubscribe to a Community scope
 * and/or an open post thread, debounce bursts of signals, and dispatch
 * plain DOM CustomEvents that callers (app-wall.js) use to decide when to
 * re-fetch through the existing, already-sanitized
 * CommunityDataProvider/CommunitySupabaseRepositories read path
 * (api.posts_public / api.comments_public). This file has no CRUD logic
 * and no second cache of posts/comments — it only ever tells the caller
 * "something you're looking at may have changed, go re-fetch".
 */
(function () {
  const DEBOUNCE_MS = 500;
  const SIGNAL_EVENT = "echo:community-realtime-signal";
  const RECONNECT_EVENT = "echo:community-realtime-reconnect";

  let channel = null;
  let channelPromise = null;
  let connectionState = "idle"; // idle | connected | disconnected
  let scopeSubscription = null; // { communityKey, scopeType, collegeId, jurusanId }
  let postSubscription = null; // { postId }
  let pendingSignals = [];
  let debounceTimer = null;

  function rpcScope(scope) {
    return scope === "global" ? "all_km" : scope;
  }

  function scopeFromCommunityKey(communityKey) {
    const parsed = window.CommunityService?.parseCommunityKey?.(communityKey);
    if (!parsed) return null;
    return {
      communityKey,
      scopeType: rpcScope(parsed.scope),
      collegeId: parsed.orgId,
      jurusanId: parsed.majorId,
    };
  }

  function matchesScopeSubscription(signal) {
    if (!scopeSubscription) return false;
    // BACKEND V2.3 — "building_college" is a local-only matching mode (not
    // a database scope_type value): it is what a Map view subscribes as,
    // because Map must react to ANY building's post within its college,
    // not one specific building. It intentionally does not compare
    // signal.scopeType against itself — it compares against the real
    // "building" signal scope.
    if (scopeSubscription.scopeType === "building_college") {
      return signal.scopeType === "building"
        && Number(signal.collegeId) === Number(scopeSubscription.collegeId);
    }
    if (signal.scopeType !== scopeSubscription.scopeType) return false;
    if (scopeSubscription.scopeType === "all_km") return true;
    if (scopeSubscription.scopeType === "college") {
      return Number(signal.collegeId) === Number(scopeSubscription.collegeId);
    }
    if (scopeSubscription.scopeType === "jurusan") {
      return Number(signal.collegeId) === Number(scopeSubscription.collegeId)
        && Number(signal.jurusanId) === Number(scopeSubscription.jurusanId);
    }
    // BACKEND V2.3 — Building Wall: a signal wakes this subscription only
    // when BOTH college_id and building_id match exactly. building_id alone
    // is not sufficient — the same logical building slug is not guaranteed
    // unique across colleges (college identity is part of Building scope).
    if (scopeSubscription.scopeType === "building") {
      return Number(signal.collegeId) === Number(scopeSubscription.collegeId)
        && String(signal.buildingId) === String(scopeSubscription.buildingId);
    }
    return false;
  }

  function matchesPostSubscription(signal) {
    return Boolean(postSubscription) && signal.postId != null
      && String(signal.postId) === String(postSubscription.postId);
  }

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function flushPendingSignals() {
    const signals = pendingSignals;
    pendingSignals = [];
    debounceTimer = null;
    if (!signals.length) return;
    const scopeMatches = signals.filter(matchesScopeSubscription);
    const postMatches = signals.filter(matchesPostSubscription);
    if (scopeMatches.length) dispatch(SIGNAL_EVENT, { reason: "scope", events: scopeMatches });
    if (postMatches.length) dispatch(SIGNAL_EVENT, { reason: "post", events: postMatches });
  }

  function queueSignal(signal) {
    pendingSignals.push(signal);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushPendingSignals, DEBOUNCE_MS);
  }

  function handleRealtimeEventRow(row) {
    if (!row || typeof row !== "object") return;
    // Whitelist-only mapping off app.realtime_events. No other field of
    // `row` is ever read, so an unexpected/extra column on the source
    // table can never leak through this function.
    queueSignal({
      eventType: row.event_type,
      scopeType: row.scope_type,
      collegeId: row.college_id,
      jurusanId: row.jurusan_id,
      buildingId: row.building_id,
      postId: row.post_id,
    });
  }

  // ensureChannel() is memoized on the in-flight PROMISE, not just the
  // eventual channel value — matching the exact pattern
  // services/community-supabase-client.js's getClient() already uses for
  // the same reason. app-router.js's initial DOMContentLoaded handler calls
  // render() more than once by design (once synchronously, again after
  // StudyUploadService.ready() resolves — see app-router.js:658-665), so
  // renderContextWall()/subscribeToScope() can fire multiple times in quick
  // succession before the first call's `await getClient()` settles. A plain
  // `if (channel) return channel;` guard only protects against calls made
  // AFTER that first assignment — every overlapping call made before it
  // would see `channel` still null and independently call
  // client.channel("community-realtime-events")...subscribe(...) again for
  // the identical topic, which Supabase Realtime's server rejects with
  // CHANNEL_ERROR ("mismatch between server and client bindings for
  // postgres changes") once it sees the second overlapping join — this was
  // confirmed live against production by tracing client.channel/.on/.subscribe
  // calls: two full join sequences for "community-realtime-events" fired
  // back to back, and the channel then reported CHANNEL_ERROR instead of
  // SUBSCRIBED. Memoizing the promise closes that race entirely.
  async function ensureChannel() {
    if (channelPromise) return channelPromise;
    channelPromise = (async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      channel = client
        .channel("community-realtime-events")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "app", table: "realtime_events" },
          message => handleRealtimeEventRow(message?.new)
        )
        .subscribe(status => {
          if (status === "SUBSCRIBED") {
            const wasDisconnected = connectionState === "disconnected";
            connectionState = "connected";
            if (wasDisconnected) dispatch(RECONNECT_EVENT, {});
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // Degrade silently: existing mutate-then-refetch behavior (create
            // post/comment/vote/solve already re-fetch on the acting device)
            // keeps working with no realtime layer active. A later successful
            // (re)connect fires RECONNECT_EVENT so callers can catch up.
            connectionState = "disconnected";
            // A dead channel cannot recover itself — drop the memoized
            // state so the next subscribeToScope()/subscribeToPost() call
            // (e.g. the next wall navigation) opens a fresh channel instead
            // of returning this permanently broken one forever.
            channel = null;
            channelPromise = null;
          }
        });
      return channel;
    })();
    channelPromise.catch(() => {
      // getClient()/channel()/on()/subscribe() itself threw — allow a
      // future call to retry from scratch rather than replaying the same
      // cached rejection forever (mirrors community-supabase-client.js's
      // getClient() clientPromise-reset-on-catch behavior).
      channel = null;
      channelPromise = null;
    });
    return channelPromise;
  }

  async function subscribeToScope(communityKey) {
    const scope = scopeFromCommunityKey(communityKey);
    scopeSubscription = scope;
    if (!scope) return;
    try {
      await ensureChannel();
    } catch {
      // Community Supabase not configured for this browser (e.g. local
      // fallback origin) — nothing to subscribe to; scope-relevant UI
      // already works purely off mutate-then-refetch in that mode.
    }
  }

  // BACKEND V2.3 — Building Wall scope subscription. Deliberately takes
  // structured (collegeId, buildingId) arguments rather than a serialized
  // string key: there is exactly one caller boundary for each (app-wall.js
  // for Building Wall, features/map-note-overlay.js for the Map), so a
  // shared parse/serialize round-trip would add a failure mode (a typo'd
  // format string) for no benefit over passing the two values directly.
  async function subscribeToBuildingScope(collegeId, buildingId) {
    const canonicalCollegeId = Number(collegeId);
    const canonicalBuildingId = String(buildingId || "");
    if (!Number.isInteger(canonicalCollegeId) || canonicalCollegeId <= 0 || !canonicalBuildingId) {
      scopeSubscription = null;
      return;
    }
    scopeSubscription = { scopeType: "building", collegeId: canonicalCollegeId, buildingId: canonicalBuildingId };
    try {
      await ensureChannel();
    } catch {
      // See subscribeToScope — same non-fatal local-fallback degrade.
    }
  }

  // BACKEND V2.3 — Map scope subscription: college-wide, not one specific
  // building (a campus Map shows markers across every building in its
  // college). Matched via matchesScopeSubscription's "building_college"
  // branch above.
  async function subscribeToMapScope(collegeId) {
    const canonicalCollegeId = Number(collegeId);
    if (!Number.isInteger(canonicalCollegeId) || canonicalCollegeId <= 0) {
      scopeSubscription = null;
      return;
    }
    scopeSubscription = { scopeType: "building_college", collegeId: canonicalCollegeId };
    try {
      await ensureChannel();
    } catch {
      // See subscribeToScope — same non-fatal local-fallback degrade.
    }
  }

  function unsubscribeScope() {
    scopeSubscription = null;
  }

  async function subscribeToPost(postId) {
    postSubscription = postId != null ? { postId: String(postId) } : null;
    if (!postSubscription) return;
    try {
      await ensureChannel();
    } catch {
      // See subscribeToScope — same non-fatal fallback.
    }
  }

  function unsubscribePost() {
    postSubscription = null;
  }

  function unsubscribeAll() {
    scopeSubscription = null;
    postSubscription = null;
    pendingSignals = [];
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (channel) {
      const closingChannel = channel;
      channel = null;
      channelPromise = null;
      connectionState = "idle";
      window.CommunitySupabaseClient.getClient()
        .then(client => client.removeChannel(closingChannel))
        .catch(() => {});
    }
  }

  window.CommunityRealtimeService = Object.freeze({
    SIGNAL_EVENT,
    RECONNECT_EVENT,
    subscribeToScope,
    subscribeToBuildingScope,
    subscribeToMapScope,
    unsubscribeScope,
    subscribeToPost,
    unsubscribePost,
    unsubscribeAll,
  });
})();
