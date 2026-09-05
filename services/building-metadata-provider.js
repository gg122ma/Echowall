/**
 * BACKEND V2.4a — Building metadata read layer.
 *
 * Static data/campus-buildings.js (+ data/campus-building-hours.js) remains
 * the authoritative baseline. This provider is a pure, optional OVERLAY:
 * api.building_metadata_public rows, when present, override individual
 * fields whole (never merged per-language, never merged day-by-day). No
 * row / Supabase unavailable / request failure / empty table all fall back
 * to today's static behavior byte-for-byte, silently — this is an
 * enhancement layer, never a page-blocking dependency, so no user-facing
 * error is ever surfaced from here.
 *
 * Reuses the SAME Supabase activation/client boundary as Community/Building
 * Wall/Map (window.CommunitySupabaseClient) — no second Supabase init
 * system, no service_role, no realtime subscription.
 */
(function () {
  const cache = new Map(); // building_id -> api.building_metadata_public row
  let preloadPromise = null;

  function activation() { return window.CommunitySupabaseClient.getActivationState(); }
  function isRemoteRequested() { return activation().mode !== "local"; }

  // Fetches every row exactly once per page load (memoized on the in-flight
  // promise, same pattern as CommunitySupabaseClient.getClient()'s
  // clientPromise) — one bulk request for all 32 Buildings, never one
  // request per card. Resolves `true` only if at least one row was found
  // (i.e. there is something new for a caller to re-render); resolves
  // `false` for local mode, an empty table, or any failure — all of which
  // mean "static behavior is already correct, nothing to do".
  function preload() {
    if (preloadPromise) return preloadPromise;
    preloadPromise = (async () => {
      if (!isRemoteRequested()) return false;
      try {
        const client = await window.CommunitySupabaseClient.getClient();
        const { data, error } = await client.from("building_metadata_public").select("*");
        if (error || !Array.isArray(data)) return false;
        data.forEach(row => {
          const buildingId = String(row?.building_id || "");
          if (buildingId) cache.set(buildingId, row);
        });
        return cache.size > 0;
      } catch {
        return false;
      }
    })();
    return preloadPromise;
  }

  function getRow(buildingId) {
    return cache.get(String(buildingId || "")) || null;
  }

  // Whole-field override only — a present (non-null) backend field replaces
  // the ENTIRE static field (including every language key of a localized
  // object); a null/absent backend field leaves the static field untouched.
  // Never mutates the static building object.
  function mergeBuilding(staticBuilding, row) {
    if (!staticBuilding) return null;
    if (!row) return staticBuilding;
    const effective = Object.assign({}, staticBuilding);
    if (row.description != null) effective.description = row.description;
    if (row.purpose != null) effective.purpose = row.purpose;
    if (row.special_notes != null) effective.specialNotes = row.special_notes;
    if (row.localized_alias != null) effective.localizedAlias = row.localized_alias;
    return effective;
  }

  function getEffectiveBuilding(placeId) {
    const staticBuilding = typeof window.getCampusBuilding === "function" ? window.getCampusBuilding(placeId) : null;
    return mergeBuilding(staticBuilding, getRow(placeId));
  }

  // Consumed by data/campus-building-hours.js's getSnapshot() so there
  // remains exactly ONE canonical open/closed calculation path — this only
  // supplies which config object to read, never a derived open_now value.
  function getHoursOverride(buildingId) {
    const row = getRow(buildingId);
    return row && row.hours != null ? row.hours : null;
  }

  window.BuildingMetadataProvider = Object.freeze({
    preload,
    getEffectiveBuilding,
    getHoursOverride,
  });
})();
