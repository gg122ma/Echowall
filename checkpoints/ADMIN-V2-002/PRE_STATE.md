# PRE_STATE — ADMIN-V2-002

Date: 2026-08-23

Full pre-edit copies of every touched file are in `before/*.pre` (exact working-tree content
immediately before this task started). `services/moderation-service.js` and
`scripts/test-admin-moderation-schema.mjs` are brand-new files — no `.pre` snapshot exists for
them because they did not exist before this task.

## Audit findings (before writing any code)

- **Community posts** (`notes` array, `app-data.js`, `contextType: "community"`): moderation state
  is a single `isHidden` boolean, admin-toggled directly by `app-admin.js`'s `adminToggleHidden()`.
  No queue, no status enum, no report mechanism of any kind exists.
- **Building-wall posts** (`notes` array, `contextType: "building"`): same `isHidden` boolean, but
  `app-admin.js`'s `getAdminCommunityNotes()` filters these OUT of the existing Community Notes
  admin tab entirely — they currently have zero moderation UI.
- **Comments** (`services/comment-service.js`): already has a `moderationStatus` field
  (`"published"|"pending"|"flagged"|"rejected"`) in its schema/normalizer, but `createComment()`
  always hardcodes `moderationStatus: "published"` — nothing in the codebase ever sets any other
  value. This is a schema stub with no real moderation flow behind it (confirmed by grep: no
  `report`/`flag`/`reject` function exists anywhere for comments).
- **Map notes** (`services/map-note-service.js`): same `isHidden` boolean pattern as Community,
  surfaced in `app-admin.js`'s separate "Map Notes" tab (`adminToggleMapHidden`/`adminDeleteMapNote`).
  No queue/status concept.
- **Study resources** (`services/study-submission-service.js`): the only module with a REAL,
  multi-state moderation flow already — `moderationStatus: "pending"|"approved"|"rejected"`,
  `verificationStatus`, `duplicateStatus`, and a real `auditLog` array populated by
  `approveSubmission()`/`rejectSubmission()`/`setVerification()`. This is the module ADMIN-V2-002
  actually wires into the new unified schema (see ROLLBACK.md).
- **Report feature**: confirmed by project-wide grep (`report`, `flag`, `createReport`,
  `riskScore`) — **no report/flag feature exists anywhere in the codebase**. The Report contract in
  this stage is fully greenfield, not a migration of an existing feature.
- **Event / Review content types**: no Event or Review feature exists at all in this codebase (no
  service, no route, no data model). Per the task's own instruction ("如果 Comment/Event 当前没有
  完整实现：只完成 contract + adapter，不要伪造不存在的 UI"), these get contract-level support
  (recognized `contentType` values, structural scope validation) and nothing else.

## Key pre-edit hunks

### services/study-submission-service.js

`createSubmission()` ended with:
```js
    record = await linkRelatedIfSubmission(record);
    const saved = await provider.create(record, file);
    await refreshCache();
    notify({ type: 'create', id: saved.id });
    return { record: saved, duplicateWarning: duplicate.likely ? duplicate.likelyResource : null };
  }
```
No `syncModerationItemStatus()` helper existed. `approveSubmission()`/`rejectSubmission()` ended
their bodies immediately after `notify({ type: 'moderate', id, action: '...' }); return updated;`
with no call into any moderation-queue mirror.

### index.html

`services/map-note-service.js` was immediately followed by `data/study-subjects.js` — no
`services/moderation-service.js` script tag existed anywhere in the file.

### scripts/test-admin-moderation-schema.mjs

Did not exist.

## ADMIN-V2-002A addendum (2026-08-23, same checkpoint) — Map Moderation Integration

Audited `services/map-note-service.js`, `features/map-note-overlay.js`, `app-admin.js`, and
`echomap.js` before writing any code. Findings:

- **Two map note kinds, one combined provider**: "anchored building notes" (`sourceType:
  "map_message"`, recordKey `note:<id>`) are real Community-adjacent `notes` array entries
  (`contextType: "building"`) with a separately-stored lat/lng anchor
  (`echowall_map_note_anchors_v1`) — this is the ONLY kind creatable through the real UI today
  (`features/map-note-overlay.js`'s "Post directly" flow calls `MapNoteService.create()`, which
  routes to this provider). "Direct pins" (`sourceType: "direct_pin"`, recordKey `pin:<id>`,
  stored in `echowall_map_notes`) exist as a data shape and are hide/delete/list-able, but
  `MapNoteService.create()` for that provider throws "Direct Pin creation is not supported" — no
  live creation path exists for them.
- **No orgId/college field anywhere** on either note shape — scope is inherently a fixed constant
  (KMK), not something that varies per-note and could be derived from a per-item lookup.
- **Visibility**: `isHidden` boolean only, no separate moderation status field, no report entry
  point anywhere (confirmed absent, matching ADMIN-V2-002's original audit).
- **Admin actions** (`app-admin.js`): `adminToggleMapHidden(recordKey)` →
  `MapNoteService.setHidden(recordKey, !isHidden)`; `adminDeleteMapNote(recordKey)` →
  `MapNoteService.delete(recordKey)` after a native `confirm()` prompt. Delete is a REAL hard
  delete at the provider level (`pins.splice(...)` / `store.deletePlaceNote(...)`) — no
  soft-delete/tombstone exists.
- **Creation stays public immediately** — `features/map-note-overlay.js`'s compose form requires
  sign-in but has no pending/review step; a new map note is visible on Echo Map right away. This is
  the behavior ADMIN-V2-002A preserves exactly (see section 3 of the ADMIN-V2-002A task and
  REPORT_ADMIN-V2-002.md's addendum).

### services/moderation-service.js (pre-002A state, before the addendum below)

```js
const KMK_ORG_ID = 1;
```
(no `resolveKmkOrgId()`/`KMK_ORG_ID_FALLBACK` existed; both `post`-building-default and `map_note`
scope derivation referenced this bare constant directly).

```js
const ALLOWED_TRANSITIONS = Object.freeze({
  pending: new Set(["pending", "approved", "rejected", "hidden", "escalated"]),
  escalated: new Set(["escalated", "approved", "rejected", "hidden"]),
  approved: new Set(["approved", "hidden"]),
  rejected: new Set(["rejected", "pending"]),
  hidden: new Set(["hidden", "pending"]),
});
```

### services/map-note-service.js (pre-002A state)

```js
window.MapNoteService = Object.freeze({
  ready,
  list:(query = {}) => callProvider('list', query),
  create:input => callProvider('create', input),
  setHidden:(id, hidden) => callProvider('setHidden', id, hidden),
  delete:id => callProvider('delete', id),
  exportData:() => callProvider('exportData'),
  subscribe,
  getProviderName,
  useProvider,
});
```
No `canonicalRecordKey()`/`syncMapNoteModerationStatus()` helpers existed; `setHidden`/`delete`
never touched `ModerationService`.
