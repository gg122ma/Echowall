# Production Identity and Hosting Contract

> Task classification: `DOC + ARCH/SECURITY/DATA planning / L3-S1 / READY / STANDARD`
>
> Date: 2026-07-19
>
> Status: decision and migration-planning contract only; no production integration is implemented
>
> Review boundary: `L3-S1` applies only to this documentation task. Complete Supabase, Cloudinary, and GitHub Pages integration remains `L4-S3 / FULL_REVIEW` and requires a separately approved task.

## 1. Purpose and evidence boundary

This document records only:

- decisions already confirmed by the project owner;
- migration constraints established by the current repository data model;
- explicitly identified recommendations that still require implementation review; and
- decisions that remain open.

It does not create or configure a Supabase project, database schema, SQL migration, Edge Function, Cloudinary integration, GitHub workflow, GitHub Pages deployment, user account, administrator assignment, or secret. It does not claim that any production interface exists.

Repository evidence used for this contract:

- the application remains static HTML, CSS, vanilla JavaScript, hash routing, Leaflet, browser globals, and LocalStorage prototype data;
- `config/app-config.js` still selects the `local-prototype` auth provider and has no configured Cloudinary endpoint;
- `echo-wall-notes` is the current primary wall-note store;
- `echowall_map_notes` is a separate historical map-note store;
- prototype accounts and sessions are local-only and are not production identities;
- wall-note votes are stored as aggregate counters plus one browser-local `userVote` state, not as authenticated per-user vote records; and
- note images may be embedded Data URLs or Cloudinary-shaped URL/public-ID metadata.

## 2. Confirmed decisions

The following decisions are approved for future implementation.

### 2.1 Hosting

- The frontend will use a GitHub Pages **project site**.
- The confirmed GitHub owner is `gg122ma`.
- The confirmed repository name is `wall`.
- The confirmed repository URL is:

  ```text
  https://github.com/gg122ma/wall
  ```

- The frozen official target address for the GitHub Pages project site is:

  ```text
  https://gg122ma.github.io/wall/
  ```

- GitHub Pages has **not** been deployed or configured. The confirmed URL is the formal target address only and must not be described as live, published, reachable, or production-ready until a separately approved deployment is completed and verified.
- GitHub Pages hosts static frontend assets only. It is not an execution environment for private credentials, Cloudinary signing, privileged database access, or other server-side operations.

### 2.2 Supabase environment

- The competition deployment will use exactly one online Supabase project.
- No second online staging or production project is approved by this contract.
- The project reference, region, URL, publishable key, and operational ownership are not recorded here and must not be guessed.
- A Supabase URL and browser publishable key may eventually be public frontend configuration, but service-role/secret keys must never be placed in frontend JavaScript, GitHub Pages artifacts, documentation, logs, or user-visible output.

### 2.3 Authentication

- Production sign-in will use **Email + Password** only.
- OAuth providers are out of scope and must not be added without a new decision.
- Existing prototype users and sessions are not production accounts.
- Existing LocalStorage passwords or password hashes will not be migrated.
- Email confirmation remains a decision required before Auth implementation.

### 2.4 Administrator authorization

- Administrator authorization will come from a protected `user_roles` table.
- A frontend flag, LocalStorage value, hard-coded credential, or user-editable metadata must not grant administrator rights.
- Role assignments must be writable only through an approved trusted path and enforced by database authorization policies.
- The initial administrator email and first-role-assignment procedure remain unresolved.

### 2.5 Legacy note migration

- Existing wall notes will use a **one-time migration** approach.
- The one-time migration is a future controlled operation, not a continuous synchronization or dual-write contract.
- This decision does not authorize a migration script, SQL file, database write, or LocalStorage deletion in the current task.

## 3. Binding migration contract

### 3.1 Source scope

- `echo-wall-notes` is the primary migration source for wall notes.
- `echowall_map_notes` is a separate legacy data source. It must remain separately identified until the owner decides whether to archive it or migrate it.
- Map-note records must not be silently merged into wall notes because their schema, location semantics, and current product status differ.
- The phrase **all existing notes** means only records contained in the browser-export JSON files that have been explicitly collected and accepted into the migration inventory.
- No claim may be made that one browser export represents all devices, browsers, profiles, or users.

### 3.2 Raw export preservation

Before transformation or import:

1. Export the raw `echo-wall-notes` JSON from every approved source browser/profile.
2. Export `echowall_map_notes` separately when it exists, even while its archive/migration decision is pending.
3. Preserve every raw JSON export unchanged in an approved non-public location.
4. Record source device/browser/profile labels, export time, source key, record count, and a checksum in a migration inventory.
5. Perform validation and transformation on copies, never on the only raw export.

Raw exports may contain user content, local author labels, and embedded image data. They must not be committed to the public repository, published in a GitHub Pages artifact, or printed into logs.

### 3.3 Identity mapping

- Do not migrate prototype passwords, password hashes, or LocalStorage sessions.
- A legacy LocalStorage `authorUserId` must not be inserted into a Supabase Auth UUID field and must not be treated as proof of production identity.
- Production `author_id` ownership may be assigned only to a real authenticated Supabase user through an approved mapping or later claim process.
- Anonymous display state must remain distinct from internal legacy attribution.

Recommended legacy attribution fields:

| Field | Purpose |
| --- | --- |
| `legacy_author_id` | Preserve the original LocalStorage `authorUserId` as non-authoritative migration metadata. |
| `legacy_author_label` | Preserve the best available legacy display label, such as `authorNickname`, without treating it as verified identity. |

These fields are recommendations for the future schema review. They do not exist in the current runtime and do not authorize identity linking.

### 3.4 Vote preservation

- Existing `upvotes` and `downvotes` are aggregate legacy counters.
- Existing `userVote` is browser-local state and cannot establish which production user voted.
- Legacy counters must not be expanded, synthesized, or otherwise represented as authenticated per-user `note_votes` rows.
- New production `note_votes` must begin only from real authenticated voting events after the production vote system is enabled.

Recommended legacy counter fields:

| Field | Purpose |
| --- | --- |
| `legacy_upvotes` | Preserve the imported aggregate upvote count without attributing voters. |
| `legacy_downvotes` | Preserve the imported aggregate downvote count without attributing voters. |

How legacy counters contribute to the public displayed score after cutover remains unresolved.

### 3.5 Idempotency and duplicate prevention

Every imported record must carry:

- a `migration_batch_id` identifying the controlled import attempt; and
- a stable legacy unique key that remains the same when the same source record is reprocessed.

The stable legacy key must distinguish records from different browser exports that may reuse the same numeric note ID. The recommended input is:

```text
legacy source key + approved source-instance identifier + original legacy note ID
```

The future schema must enforce uniqueness for the stable legacy key. `migration_batch_id` alone is not a duplicate-prevention key because retrying in a different batch must still identify the same legacy record.

The exact column name, source-instance identifier format, hashing/normalization rule, and conflict behavior require approval in the later migration design. No identifier may be derived from a password, secret, email content, or device fingerprint collected without approval.

### 3.6 LocalStorage retention

- Migration must never automatically clear `echo-wall-notes`, `echowall_map_notes`, prototype account storage, or any other LocalStorage key.
- A successful import does not itself authorize deletion of local data.
- Raw JSON exports and source LocalStorage must be retained until record counts, stable keys, content, visibility, author labels, vote counters, and image disposition have been accepted.
- Any later cleanup must be a separate, explicit, user-approved objective with rollback evidence.

### 3.7 Legacy images

The current note model can contain:

- `imageDataUrl` with compressed embedded image content;
- `imageUrl` with a remote HTTPS delivery URL;
- `imagePublicId` with Cloudinary-shaped asset metadata; and
- image name, dimensions/crop scale, and fit metadata.

The handling of legacy images remains unresolved. Until a decision is approved:

- preserve image fields in the raw export;
- do not upload Data URLs to Cloudinary;
- do not assume an existing URL/public ID belongs to the future Cloudinary account;
- do not discard notes whose image cannot yet be migrated; and
- do not expose embedded images in migration logs or public artifacts.

## 4. Identity and hosting security boundaries

- The Pages target base URL is confirmed, but Supabase redirect and recovery URLs remain unconfigured until the relevant auth task is approved and the not-yet-deployed Pages target is ready for verification.
- Email confirmation behavior must be decided before registration acceptance and redirect behavior are implemented.
- The `user_roles` table must be protected by explicit grants and RLS or an equivalently controlled trusted path; ordinary users must not grant, update, or delete their own role.
- Authorization must not rely on user-editable metadata.
- Anonymous public display must not expose a production owner UUID or legacy attribution fields.
- The GitHub Pages artifact must contain no Supabase service-role key, Cloudinary API secret, prototype password, raw migration export, or privileged deployment token.
- The one-project decision increases the importance of access control, backups, migration rehearsal, and rollback. Rehearsal must not overwrite or duplicate the accepted online dataset.
- Any implementation that changes auth, database access, RLS, migration state, Cloudinary assets, or deployment remains subject to `L4-S3 / FULL_REVIEW`.

## 5. Decisions still required

| Decision | Why it blocks implementation |
| --- | --- |
| Email confirmation on/off | Changes registration state, user messaging, redirect handling, and acceptance tests. |
| Initial administrator email | Identifies the first production account eligible for an admin role. It must not be guessed or written here prematurely. |
| First administrator authorization method | Must define the trusted one-time process that inserts the initial protected `user_roles` record without creating a public privilege-escalation path. |
| `echowall_map_notes` archive or migration | Determines whether separate historical map records are preserved only as an archive or transformed under a separately reviewed schema. |
| Legacy vote display rule | Must decide whether legacy counters are shown separately, included in a combined display score, frozen, or omitted after cutover. |
| Legacy author claim policy | Must decide whether a future authenticated user may claim a legacy note and what evidence, moderation, and audit process is required. |
| Migration source device/browser inventory | Defines what collected exports are in scope and prevents an incomplete set from being described as all notes. |
| Cloudinary legacy-image treatment | Must decide whether Data URLs are uploaded, retained only in archives, omitted from production media, or handled by another approved process. |

Additional implementation values remain intentionally unset: Supabase project reference/region, Supabase public project URL, publishable key, redirect paths, recovery paths, data-retention period, migration operator, migration schedule, and raw-export storage location.

## 6. Acceptance gates for future tasks

No implementation task may treat this contract as proof that production is ready. Before integration begins:

1. Resolve the decisions required by the specific single-objective task.
2. Verify current Supabase, Cloudinary, and GitHub documentation and supported versions.
3. Define testable RLS/grant behavior for anonymous reader, authenticated user, owner, other user, and administrator.
4. Inventory and preserve raw exports before writing transformation or import code.
5. Define dry-run, duplicate-detection, record-reconciliation, image, and rollback behavior before the one-time migration.
6. Run the required `L4-S3 / FULL_REVIEW` for complete integration.

## 7. Recommended next single objective

Decide whether Supabase Email confirmation is enabled or disabled and record that decision in a documentation-only task. Do not begin Supabase or GitHub Pages implementation as part of that decision.
