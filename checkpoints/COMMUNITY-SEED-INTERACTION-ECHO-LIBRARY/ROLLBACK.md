# ROLLBACK — COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY

Scope: undo ONLY this task's changes. Do not touch any other uncommitted work already in the tree
(see `HANDOFF.md`'s many prior dated entries — this working tree carries a lot of in-flight work
that must survive any rollback here). No `git reset --hard` / `git clean` / `git stash` / `git
checkout -- .` — hand-revert the specific hunks below instead.

## 1. Delete new files (safe, nothing else depends on them)

```
data/demo-seed-all-student-km.v1.js
scripts/test-community-seed-interaction.mjs
scripts/test-all-student-km-seed.mjs
reports/REPORT_COMMUNITY-SEED-INTERACTION-AND-ECHO-LIBRARY.md
checkpoints/COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY/
```

## 2. `index.html` and `map.html`

Remove this one line from each (added directly after the existing
`<script src="./data/demo-seed-bundle.v1.js"></script>` line):

```html
<script src="data/demo-seed-all-student-km.v1.js"></script>
```

## 3. `app-data.js`

- Delete the `normalizeDemoSeedCommunityFields(note)` function (added directly above
  `activateDemoSeedSnapshot`).
- In `activateDemoSeedSnapshot(snapshot)`: remove the `additionalSeedNotes`/`combinedSourceNotes`
  lines and the `normalizeDemoSeedCommunityFields(note)` call; restore the map body to plain
  `snapshot.notes.map(note => { while (usedIds.has(runtimeId)) ...; Object.freeze({...note,
  id:runtimeId, isDemoSeedRuntime:true}); ... })`.
- In `loadDefaultDemoSeed()`'s `fetch()`-fallback branch: restore the inline id-assignment loop
  (it currently just calls `activateDemoSeedSnapshot(snapshot)` — replace that one line with the
  original inline `usedIds`/`runtimeId`/`.map(...)` block, ending in
  `demoSeedRuntimeNotes = Object.freeze(runtimeNotes); demoSeedRuntimeStatus = "ready";
  emitRuntimeNotesChange(...)`).

## 4. `app-wall.js`

- Restore `getDemoSeedLabelHTML()` (was directly above the Question-badge comment block):
  ```js
  function getDemoSeedLabelHTML() {
    return `<span class="demo-seed-label" aria-label="Demo content; Kandungan demo; 演示内容"><span>Demo content</span><span>Kandungan demo</span><span>演示内容</span></span>`;
  }
  ```
- In `buildNoteDOM()`: restore `${isDemoSeed ? " is-demo-seed-preview" : ""}` in the className
  template; restore the `noteAction` ternary (`isDemoSeed ? '<span class="demo-seed-preview-readonly" aria-label="Read-only demo content">🔒 Read-only</span>' : <the vote button>`);
  restore `${isDemoSeed ? getDemoSeedLabelHTML() : ""}` in the card `innerHTML` template (right
  after `${getQuestionBadgeHTML(note)}`).
- In `openModal()`: restore `modalActions` to
  `isDemoSeed ? '<span class="demo-seed-preview-readonly">🔒 Read-only demo content · Voting disabled</span>' : <the two vote buttons>`;
  restore `commentsSectionHTML` to `note.contextType === "community" && !isDemoSeed ? ... : ""`;
  restore `questionActionsHTML`'s condition to `!isDemoSeed && note.postType === "question" && ...`;
  restore `${isDemoSeed ? getDemoSeedLabelHTML() : ""}` in the modal `content.innerHTML` template
  (right after `${getQuestionBadgeHTML(note)}`, before the translate button).

## 5. `app-router.js`

Revert these 4 values back to `"Study Notes — Echo Wall"` in the `titles` map inside
`updateDocumentTitle`-equivalent function: `study-home`, `study-jurusan`, `study-semester`,
`study-subject`. (`study-resource` / `study-upload` were never changed — leave them.)

## 6. `app-study.js`

In `renderStudyNotFound()`, revert:
```
<h1>Echo Library page not found</h1>
<p>This Echo Library link does not match a known programme.</p>
```
back to:
```
<h1>Study Notes page not found</h1>
<p>This Study Notes link does not match a known programme.</p>
```

## 7. `i18n/locales/en.js` / `ms.js` / `zh.js`

Revert these 7 keys per locale back to their PRE_STATE.md values:
`study.home.title`, `study.home.cta`, `study.hub.eyebrow`, `study.hub.title`,
`study.subjectComingSoon`, `study.viewerComingSoon`, `study.upload.comingSoon`. Do not touch
`admin.study.*` (was never changed) or any other `study.*`/generic "study material(s)" key (also
never changed).

## Verification after rollback

```
node --check app-data.js app-wall.js app-router.js app-study.js
node scripts/test-study-upload.mjs
node scripts/test-post-type-unification.mjs
```
Both should still pass 100% (they did before this task and are unrelated to it — a failure after
rollback means something else in the tree was disturbed, not this task).
