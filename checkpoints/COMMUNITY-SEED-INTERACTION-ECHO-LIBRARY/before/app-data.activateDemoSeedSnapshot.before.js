function activateDemoSeedSnapshot(snapshot) {
  const usedIds = new Set(notes.map(note => Number(note.id)).filter(Number.isFinite));
  let runtimeId = -1;
  const runtimeNotes = snapshot.notes.map(note => {
    while (usedIds.has(runtimeId)) runtimeId -= 1;
    const runtimeNote = Object.freeze({
      ...note,
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
    const usedIds = new Set(notes.map(note => Number(note.id)).filter(Number.isFinite));
    let runtimeId = -1;
    const runtimeNotes = snapshot.notes.map(note => {
      while (usedIds.has(runtimeId)) runtimeId -= 1;
      const runtimeNote = Object.freeze({
        ...note,
        id: runtimeId,
        isDemoSeedRuntime:true,
      });
      usedIds.add(runtimeId);
      runtimeId -= 1;
      return runtimeNote;
    });
    demoSeedRuntimeNotes = Object.freeze(runtimeNotes);
    demoSeedRuntimeStatus = "ready";
    emitRuntimeNotesChange({ type:"seed-ready", count:demoSeedRuntimeNotes.length });
    return true;
  } catch (error) {
    demoSeedRuntimeNotes = Object.freeze([]);
    demoSeedRuntimeStatus = "error";
    demoSeedRuntimeError = error instanceof Error ? error.message : "Demo seed loading failed.";
    console.error("Demo seed loading failed:", error);
    return false;
  }
}
