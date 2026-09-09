# EchoWall Admin Panel Plan

Status: planning only. This release implements no new Admin UI.

## Product goal

Give nontechnical campus staff a safe, human-readable workspace for maintaining
published content, campus knowledge, Map associations, photos, users, and AI
quality without requiring SQL, Git, JSON editing, or UUID-heavy workflows.

## Proposed information architecture

### Dashboard

Show actionable counts: items awaiting moderation, unresolved source conflicts,
stale campus sources, unassociated places, reported photos, and recently failed
AI checks. Each card opens a filtered work queue rather than an opaque chart.

### Content management

Search and filter posts/comments by community, college, Building, status,
author presentation, and date. Actions are preview, approve, hide, archive,
restore, and escalate. Delete should normally be soft-delete/archive; permanent
deletion requires an explicit elevated workflow and reason.

### Campus knowledge

Edit one fact through labeled fields: place, topic, English/Bahasa Melayu/
Chinese wording, source title, source date, PDF page, effective date, and review
status. Show source freshness and flag records that need re-verification. A page
number may be published only when it is present in the owner-provided source;
otherwise retain the fact with an explicit `reference requires verification`
state. Historical provenance is append-only: an edit creates a revision and
never rewrites the evidence attached to an earlier revision.

### Source conflict review

Present disagreeing values side by side with source authority, page, date, and
affected answers. Staff may mark a newer source authoritative, keep the result
uncertain, or request review. Never silently discard the losing record; retain
the resolution reason and audit history. The queue is created only when sources
assert incompatible values for the same semantic fact (for example, Friday
`closed` versus Friday `08:00-16:30`). Different descriptions, services, rules,
languages, or complementary subsets do not create a conflict by themselves.

### Map/place association

Choose campus places by name/search, preview the existing Echo Map target, and
validate Building IDs without asking staff to type UUIDs. Ambiguous or missing
targets block publication of a navigation action but do not block an
information-only fact. The server accepts only IDs from the canonical Building
registry; the UI cannot fabricate a `B_*` association or fall back to another
place.

### Photo moderation

Show the post context, Cloudinary preview, uploader, dimensions/bytes/format,
reports, and orphan-cleanup state. Support approve, hide, archive, restore, and
request-review actions. Failed post attachment leaves an auditable
`orphan-pending` item for an idempotent cleanup worker; staff do not delete an
arbitrary Cloudinary public ID. Do not expose Cloudinary secrets or raw
EXIF/GPS.

### Users and roles

Search users by display name/email, show verified/unverified status and active/
disabled state, then assign human-readable roles and scopes. Use institution and
Building pickers, not IDs. Verified status is read-only and comes from
Supabase Auth's authoritative confirmation timestamp, never editable profile
metadata. High-impact grants require confirmation and a reason.

### Audit log

Record actor, action, target, before/after summary, scope, reason, and timestamp
for every moderation, knowledge, role, restore, and source-resolution action.
Audit history is append-only to ordinary staff and filterable/exportable for
review.

### AI knowledge testing

Provide a safe preview area where staff can enter English, Malay, or Chinese
questions and see the answer, detected intent, confidence, grounding/pages,
premise classification, conflicts, and proposed Map target. “Publish knowledge”
and “test answer” are separate actions. The Map target preview must use the
same validator as production.

## Safety and workflow

- Draft → reviewer approval → published is the default knowledge lifecycle.
- All destructive-looking actions are soft archive/hide first, with restore.
- Server-side RLS/RPC permission checks remain authoritative; hidden buttons
  are not security.
- Source changes and role changes require reason fields and audit records.
- Forms validate in plain language and link directly to the affected page/Map
  preview.
- Bulk operations show an exact impact preview and never default to “select
  all.”

## Delivery stages

1. Backend permission/audit contracts and read-only dashboard APIs.
2. Content and photo moderation queues with archive/restore.
3. Campus knowledge editor, freshness, conflicts, and place association.
4. User verified-status and role management.
5. AI answer/Map preview, accessibility, staff training, and acceptance tests.

Existing legacy Admin files predate this plan and are not expanded by this
release.
