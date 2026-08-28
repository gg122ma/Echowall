// COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY: minimal compatibility
// normalization for legacy seed/demo community notes (the 696-note bundle
// predates postType/communityKey/communityScope/moderationStatus -- none of
// those fields exist on its raw JSON) and for the All Student KM seed
// (data/demo-seed-all-student-km.v1.js), which already carries them
// explicitly. Never rewrites content/author/timestamp/scope -- only backfills
// the fields normal user posts (see handleFormSubmit in app-wall.js) always
// have, so seed posts are accepted by the exact same Post Detail / comment /
// filter code paths with zero seed-specific branching there. Idempotent: a
// note that already has a valid value for a field keeps it unchanged.
function normalizeDemoSeedCommunityFields(note) {
  if (!note || note.contextType !== "community") return note;
  const contract = window.EchoPostTypeContract;
  const postType = contract ? contract.normalize(note.postType) : (note.postType === "question" ? "question" : "discussion");
  const communityScope = note.communityScope || (note.orgId == null ? "global" : (note.majorId == null ? "college" : "jurusan"));
  const cs = window.CommunityService;
  const communityKey = (cs && cs.isValidCommunityKey(note.communityKey))
    ? note.communityKey
    : (cs ? cs.getCommunityKey(communityScope, note.orgId, note.majorId) : note.communityKey);
  return {
    ...note,
    postType,
    questionStatus: note.questionStatus !== undefined && note.questionStatus !== null
      ? note.questionStatus
      : (postType === "question" ? "open" : null),
    communityScope,
    communityKey,
    moderationStatus: note.moderationStatus || "published",
    commentCount: Number.isFinite(Number(note.commentCount)) ? Number(note.commentCount) : 0,
  };
}

// Merges the legacy 696-note showcase/KMK bundle with the All Student KM
// seed (a separate, independently-loaded array -- see the comment atop
// data/demo-seed-all-student-km.v1.js for why it is NOT folded into the
// bundle file itself). Both sources go through the exact same id-assignment
// loop and normalizeDemoSeedCommunityFields() call, so there is only ever
// one code path a seed note becomes a fully interactive runtime note through.
function activateDemoSeedSnapshot(snapshot) {
  const usedIds = new Set(notes.map(note => Number(note.id)).filter(Number.isFinite));
  let runtimeId = -1;
  const additionalSeedNotes = Array.isArray(window.ECHO_WALL_ALL_STUDENT_KM_SEED) ? window.ECHO_WALL_ALL_STUDENT_KM_SEED : [];
  const combinedSourceNotes = snapshot.notes.concat(additionalSeedNotes);
  const runtimeNotes = combinedSourceNotes.map(note => {
    while (usedIds.has(runtimeId)) runtimeId -= 1;
    const runtimeNote = Object.freeze({
      ...normalizeDemoSeedCommunityFields(note),
      id:runtimeId,
      isDemoSeedRuntime:true,
    });
    usedIds.add(runtimeId);
    runtimeId -= 1;
    return runtimeNote;
  });
  demoSeedRuntimeNotes = Object.freeze(runtimeNotes);
  demoSeedRuntimeStatus = "ready";
  emitRuntimeNotesChange({ type:"seed-ready", count:demoSeedRuntimeNotes.length });
}
async function loadDefaultDemoSeed() {
  if (demoSeedRuntimeStatus === "ready") return true;
  if (demoSeedRuntimeStatus === "loading") return false;
  demoSeedRuntimeStatus = "loading";
  demoSeedRuntimeError = "";
  try {
    const bundledSnapshot = window.ECHO_WALL_DEMO_SEED_BUNDLE;
    if (bundledSnapshot) {
      validatePortableDemoSeedBundle(bundledSnapshot);
      activateDemoSeedSnapshot(bundledSnapshot);
      return true;
    }    const response = await fetch(DEFAULT_DEMO_SEED_PATH, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`Demo seed request failed (${response.status}).`);
    const snapshot = await response.json();
    validateShowcaseDemoSeedSnapshot(snapshot);
    // Same id-assignment + normalization + All Student KM merge as the
    // bundled-snapshot path above -- one shared implementation, see
    // activateDemoSeedSnapshot()'s own comment.
    activateDemoSeedSnapshot(snapshot);
    return true;
  } catch (error) {
    demoSeedRuntimeNotes = Object.freeze([]);
    demoSeedRuntimeStatus = "error";
    demoSeedRuntimeError = error instanceof Error ? error.message : "Demo seed loading failed.";
    console.error("Demo seed loading failed:", error);
    return false;
  }
}
