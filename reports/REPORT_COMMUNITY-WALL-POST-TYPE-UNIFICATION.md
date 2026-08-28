# REPORT — COMMUNITY-WALL-POST-TYPE-UNIFICATION

Date: 2026-08-23  
Implementation: PASS  
Overall acceptance: BLOCKED (required real-browser bridge unavailable)

## Canonical contract

Community's contract was retained without redesign: `postType` is the sole content-type field,
with exact enum `discussion | question`, default `discussion`, and invalid/missing fallback
`discussion`. `contextType` remains solely location context. Existing EN/BM/ZH `form.postType*`,
`wall.type*`, and Question badge/status keys are reused.

`window.EchoPostTypeContract` now owns enum, default, and normalization. Community, Building Wall,
Echo Map, persistence normalization, and Admin display consume it; no second field was introduced.

## Results

- Community: unchanged UI/behavior; shared normalization.
- Building: radios visible; selection persists; Question badge renders after publish/reload.
- Map: type is immediately after Note and persists through `MapNoteService`/`EchoNoteStore`.
  Category remains independent (Question + Academic Advice is valid). Existing placement,
  Category, Shape, Color, Photo, and identity paths remain intact; Map Photo/Color inputs persist
  through the same Building-note store.
- Legacy: missing/invalid values safely read as Discussion; no destructive deletion/schema rewrite.
- Admin: moderation rows show normalized type; existing moderation scopes/actions remain.
- Theme: new Map controls reuse existing light/dark-aware compose-card styles.

## Automated verification

- Task suite: PASS, 32 assertions.
- All 9 `scripts/test-*.mjs`: PASS; 578 assertions total, 0 failures.
- Active-source JavaScript syntax scan: PASS. The literal archival-inclusive scan only flags two
  pre-existing checkpoint fragments that are not complete runnable JS files.

Coverage includes all three modules, both enum values, legacy/invalid fallback, persistence,
Question + Category coexistence, badge/form wiring, EN/BM/ZH, and Admin regression suites.

## Browser QA

BLOCKED. The mandatory `browser:control-in-app-browser` workflow was used, but initialization
failed with `privileged native pipe bridge is not available; browser-client is not trusted`.
Per that skill, no external Playwright or alternate browser surface was substituted. The requested
Community/Building/Map clicks, reload, EN/BM/ZH, and Light/Dark matrix therefore cannot be honestly
marked browser-passed in this run.

## Modified files

`app-data.js`, `app-wall.js`, `features/map-note-overlay.js`, `app-admin.js`,
`scripts/test-post-type-unification.mjs`, `HANDOFF.md`, `CHANGELOG.md`, `CODE_AUDIT.md`, this report,
and the two checkpoint files.
