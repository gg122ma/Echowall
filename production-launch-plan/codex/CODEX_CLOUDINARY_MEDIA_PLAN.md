# EchoWall Cloudinary media plan

Status: implementation plan; no Cloudinary or Supabase resources are created  
Scope: user-uploaded post photos only; Echo Library/Study files are explicitly separate  
Primary objective: upload the smallest acceptable visible image while preserving the current photo UI and never exposing the Cloudinary API secret

## 1. Decision

Use a browser-compressed, signed, direct Cloudinary upload:

select → validate bytes/type → decode with orientation → resize/compress → preview → authenticated signature reservation from Supabase Edge Function → direct browser upload to Cloudinary → verify Cloudinary response through a trusted Edge Function → atomically create the post/media metadata in Supabase.

The Cloudinary-stored “original” is the already compressed browser result. Do not upload or retain the user's source original. PostgreSQL stores metadata only:

- reservation/media ID and owning post ID;
- secure_url;
- public_id and Cloudinary version;
- width, height, bytes, format;
- optional asset_id/etag for reconciliation;
- crop_scale and fit used by the current UI;
- lifecycle state and audit timestamps.

Never store a base64/data URL, binary image, upload signature, API secret, or temporary deletion token in PostgreSQL.

## 2. Current local photo contract

### 2.1 Building/Community Wall composer

Current app-wall.js behavior is the visible baseline:

| Property | Current behavior |
|---|---|
| accepted input | image/jpeg, image/png, image/webp |
| source maximum | 8 MiB |
| initial resize | longest edge capped at 1,280 px; no enlargement |
| preferred output | WebP via canvas |
| fallback output | JPEG if WebP canvas export throws |
| starting quality | 0.84 |
| iterations | at most 10 |
| quality progression | subtract 0.08 while quality is above 0.58 |
| size progression | after low quality, multiply width/height by 0.82 and reset quality to 0.76 |
| nominal byte target | 450 KiB |
| final tolerance | at most 115% of target = 517.5 KiB / 529,920 bytes |
| crop behavior | non-destructive display metadata, scale 1.0–1.8 |
| fit behavior | CSS cover or contain |
| current local storage | compressed data URL |
| configured Cloudinary path | obtains signature then direct upload, but lacks lifecycle/confirmation |

The current progress copy says “Resizing photo for local storage…” and completion reports compressed KB. The production UI should retain selection, preview, remove, crop-scale, fit, disabled-during-processing, and aria-live behavior.

### 2.2 Map Direct Posting composer

Current map flow is materially different:

- accepts JPEG/PNG/WebP;
- rejects any source over 450 KiB;
- reads the source as a data URL;
- does no resize/compression, no crop/fit, and no Cloudinary upload;
- creates a canonical Building Wall post, then writes its map anchor.

Production keeps the 450 KiB source-selection cap and the same visible composer. It routes the accepted image through MediaProvider and Cloudinary so every production user photo is compressed before upload and no base64 enters shared storage.

### 2.3 Current weaknesses to remove

- blank Cloudinary config silently returns a local data URL;
- a successful Cloudinary upload followed by note persistence failure leaks an orphan;
- upload response provenance is not verified by the backend;
- bytes and format are not retained in current remote metadata;
- signer parameters are too client-directed;
- there is no trusted delete/retry/reconciliation contract;
- Map Direct Posting bypasses the adapter;
- LocalStorage whole-array rewrites plus base64 quickly approach browser quota.

## 3. Production preprocessing policy

### 3.1 Input validation

Validate before decode:

| Rule | Wall composer | Map composer |
|---|---:|---:|
| source file maximum | 8,388,608 bytes | 460,800 bytes |
| accepted declared MIME | JPEG, PNG, WebP | JPEG, PNG, WebP |
| accepted magic bytes | JPEG FF D8 FF; PNG signature; RIFF…WEBP | same |
| zero byte | reject | reject |
| decoded dimensions | at least 1×1 | at least 1×1 |
| decoded pixel safety cap | recommend 40 megapixels | recommend 40 megapixels |
| long output edge | 1,280 px maximum | 1,280 px maximum, no enlargement |
| output byte target | 460,800 | 460,800 |
| absolute output acceptance | 529,920 | 529,920 |

File extension and browser file.type are hints. Both must agree with a supported magic signature, and decode must succeed. Reject SVG, GIF, HEIC/HEIF, AVIF input, executable/polyglot signatures, or any unsupported content rather than passing it through unchanged.

The 40-megapixel decode cap protects the browser from small compressed decompression-bomb images. Benchmark on target mobile devices and lower it if memory evidence demands; any lower value remains a documented security parity exception.

### 3.2 Decode and orientation

1. Create a revocable object URL; do not first base64-encode the source.
2. Prefer createImageBitmap with imageOrientation=from-image where supported and verified.
3. Fall back to an HTMLImageElement object-URL decode matching current behavior.
4. Set a 15-second decode watchdog and obey AbortSignal.
5. Derive oriented dimensions, cap the long edge at 1,280, and never enlarge.
6. Draw once per attempted dimension into an alpha-capable canvas.
7. Re-encoding strips EXIF and other source metadata, including GPS.
8. Revoke source/preview object URLs and release ImageBitmap/canvas references after publish/cancel.

Maintain a fixture set for EXIF orientations 1–8, portrait/landscape, transparency, tiny images, high-detail images, corrupt/truncated input, and oversized dimensions. “The browser usually orients it” is not an acceptance test.

### 3.3 Compression algorithm

For the Wall composer, retain the current 1,280/0.84/450 KiB/10-attempt algorithm for the first production release. Change the internal return value from data URL to Blob plus metadata; that avoids a base64 expansion without changing visible pixels.

Algorithm:

1. scale longest edge to at most 1,280;
2. encode WebP at quality 0.84;
3. if over 450 KiB, decrement quality by 0.08 while current quality is above 0.58;
4. after that boundary, reduce both dimensions to 82%, reset quality to 0.76, and continue;
5. stop after ten attempts;
6. accept immediately at or below 450 KiB;
7. preserve the current final tolerance only at or below 529,920 bytes;
8. otherwise fail visibly and keep the unsubmitted composer draft.

Probe WebP export once per browser session: canvas.toBlob must return a non-empty image/webp Blob. If unsupported, use image/jpeg with the same quality loop. Do not claim WebP merely because toBlob did not throw. The current JPEG fallback can flatten transparent pixels unpredictably; use an explicit opaque neutral/white canvas background in that fallback only after a visual fixture confirms it matches acceptable current output.

For Map Direct Posting, first retain the current 450 KiB source rejection. Then decode/orient and run the same no-enlargement pipeline. Many accepted images will be re-encoded even when already below the cap; preview must show the exact outgoing compressed Blob.

### 3.4 Browser fallback

- OffscreenCanvas/worker compression is an optimization, not a launch dependency. The initial implementation may use the current main-thread canvas path while preserving disabled/progress feedback.
- If canvas, toBlob, decode, or orientation-safe fallback is unavailable, stop with a localized retry/choose-another-photo error. Do not upload the source original.
- If WebP is unavailable, JPEG is the required supported fallback.
- If a network outage begins after preparation, keep the current form fields and in-memory preview. An explicitly labelled draft may be stored locally, but it is not a published post.
- Never switch the production provider to LocalDataUrlMediaProvider.

## 4. Signed upload protocol

### 4.1 Reservation

The client generates uploadId and idempotencyKey UUIDs, then calls **cloudinary-sign-upload** with the authenticated Supabase user JWT and prepared metadata. The function:

1. verifies the user JWT with the current Supabase Edge Auth pattern;
2. rejects disabled users and invalid composer/context;
3. checks per-user and hashed-IP burst/rate limits in durable storage;
4. creates or reuses a user-owned post_media reservation in state reserved;
5. chooses every Cloudinary naming/policy parameter server-side;
6. signs the exact parameter set with the Cloudinary API secret;
7. returns public API key/cloud name, timestamp, signature, parameters, reservation ID, and business expiresAt.

Suggested Cloudinary values:

| Parameter | Production value |
|---|---|
| endpoint | https://api.cloudinary.com/v1_1/{cloud_name}/image/upload |
| resource_type/type | image/upload |
| asset_folder | echowall/{environment}/user-photos |
| public_id | ew_{random UUID without user PII} |
| public_id_prefix | optional date partition chosen by server, never user input |
| use_filename | false |
| unique_filename | false because server public_id is already unique |
| overwrite | false |
| allowed_formats | webp,jpg,jpeg |
| max_file_size | 529920 bytes |
| incoming transformation | c_limit,w_1280,h_1280 as defense in depth; no quality rewrite |
| tags | fixed echowall, environment, composer tags |
| context | reservation ID, draft ID, algorithm version; no email/display name |
| timestamp | Edge server Unix time |
| signature algorithm | SHA-256 if account configuration supports/enforces it; otherwise documented SHA-1 default and migration plan |

The signer never accepts arbitrary folder, public_id, transformation, tags, context, overwrite, notification URL, access mode, or moderation parameters from the client. It constructs them from an allow-list.

Cloudinary's authentication signature is technically valid for one hour from timestamp. EchoWall sets expiresAt to approximately 60 seconds and the browser refuses to begin after it. Because a signature alone is not one-time, replay protection also relies on:

- a unique, reserved public_id;
- overwrite=false;
- reservation ownership/state;
- a stable idempotency key;
- rate limits and expiry;
- response confirmation before attachment.

### 4.2 Direct upload

The browser POSTs multipart/form-data directly to Cloudinary:

- compressed Blob as file;
- public api_key;
- signature;
- timestamp;
- every exact signed parameter/value;
- no extra unsigned upload parameter.

Use an XMLHttpRequest or a fetch-compatible upload-progress mechanism already abstracted by MediaProvider. Abort is allowed before completion. Treat Cloudinary HTTP 420/429 as rate-limited and respect backoff. Unknown network outcome triggers confirmation/lookup before at most one same-reservation retry; never request a new public_id and upload another copy immediately.

### 4.3 Response verification

The browser receives secure_url, public_id, version, response signature, width, height, bytes, format, asset_id/etag when present. It calls a small trusted **cloudinary-confirm-upload** Edge Function before post creation.

The function:

- authenticates the same reservation owner;
- verifies Cloudinary's response signature from public_id and version with the API secret;
- requires public_id exactly equal to the reservation;
- requires secure_url HTTPS, expected Cloudinary delivery host/cloud name, and a versioned path matching public_id;
- enforces width/height ≤1,280, bytes ≤529,920, allowed format, and resource_type=image/type=upload;
- treats unknown response fields as forward-compatible, not an error;
- writes only allow-listed metadata and changes reserved → uploaded_unattached;
- returns the normalized media descriptor.

Cloudinary officially documents response-signature verification at https://cloudinary.com/documentation/response_signatures. This confirmation prevents a modified browser from registering an arbitrary external URL or fabricated upload response. If confirmation fails after Cloudinary success, the reservation remains reconcilable by public_id and the asset becomes an orphan cleanup candidate.

Alternative signed webhooks are useful for asynchronous reconciliation but are not required for first launch. If later enabled, verify X-Cld-Signature and X-Cld-Timestamp exactly as Cloudinary documents; never trust a webhook solely by source IP.

### 4.4 Atomic attachment

PostRepository.create or MapNoteRepository.create passes only the confirmed reservation ID, never authority-bearing Cloudinary fields. A PostgreSQL function:

- confirms reservation owner = auth.uid();
- confirms state=uploaded_unattached and not expired;
- creates the post;
- applies crop_scale/fit current bounds;
- assigns post_id and state=attached to the media row;
- for Map Direct Posting, creates the anchor in the same transaction;
- records the client idempotency result;
- returns the public post/media projection.

If the transaction fails, no broken post is visible and the uploaded object remains retryable/unattached.

## 5. Edge Function contracts

### 5.1 cloudinary-sign-upload

| Item | Contract |
|---|---|
| method | POST plus OPTIONS |
| auth | valid Supabase user JWT; current publishable key header |
| input | uploadId, composer, bytes, width, height, format, context IDs, algorithmVersion, idempotencyKey |
| 200 | reservationId, cloudName, apiKey, uploadUrl, publicId, timestamp, expiresAt, signatureAlgorithm, signature, signedParams |
| errors | 400 validation; 401 JWT; 403 disabled/context; 409 idempotency mismatch; 413 limits; 429 quota; 503 config |
| rate | default 10/user/hour, 30/user/day, plus burst; tune with evidence |
| secrets | Cloudinary API secret; optional Supabase secret client local to function |
| CORS | exact localhost/staging/production/future-domain Origin allow-list; Vary: Origin |
| logs | correlation, pseudonymous user, reservation, composer, declared bytes/dimensions, outcome/latency; redact JWT/signature/secret |

### 5.2 cloudinary-confirm-upload

| Item | Contract |
|---|---|
| method/auth | POST; same authenticated reservation owner |
| input | reservationId and allow-listed Cloudinary response: public_id, version, signature, secure_url, width, height, bytes, format, resource_type, type, asset_id?, etag? |
| 200 | normalized UploadedMedia with state uploaded_unattached |
| errors | 400 shape/domain; 401; 403 owner; 404 reservation; 409 wrong state/public_id; 413 bytes/dimension; 422 response signature; 503 |
| secrets | Cloudinary API secret for response verification |
| replay | confirming the identical terminal response is success; different response for same reservation is conflict |
| CORS/log | same strict origins; never log response signature/URL query/JWT |

### 5.3 cloudinary-delete-asset

This contract exists now for future Admin/orphan cleanup, but no Admin UI is built.

| Item | Contract |
|---|---|
| method | POST plus OPTIONS for moderator path; scheduled job path is server-to-server |
| auth | scoped moderator with explicit asset-delete permission, or trusted cleanup identity |
| input | mediaId, reason, invalidate, expectedVersion, idempotencyKey |
| validation | database resolves public_id; asset is unreferenced or owning content has approved delete transition; reason required |
| action | mark delete_pending and audit; call Cloudinary destroy; optionally invalidate; mark deleted/result |
| success | 200 deleted/not_found; 202 delete_pending if retry queued |
| errors | 400/401/403/404/409/429/502/503 |
| replay | already-deleted/not_found is successful terminal outcome |
| secret | Cloudinary API secret never returned |
| logs | actor/job, scope, media ID, hashed public_id, reason code, result, correlation |

Do not use a browser delete token as the normal lifecycle: Cloudinary documents that upload-returned deletion tokens expire after about ten minutes and they do not satisfy future audited moderation. Use the trusted deletion function.

## 6. Asset lifecycle and consistency

### 6.1 State machine

reserved → uploaded_unattached → attached → delete_pending → deleted

Additional terminal/recovery states:

- reservation_expired: no confirmed upload before the short reservation/grace window;
- orphan_candidate: confirmed/upload-discovered but unattached after 24 hours;
- delete_failed: last deletion failed and remains retryable;
- quarantined: response or asset metadata fails validation; never attachable.

Every transition has updated_at, attempt_count, last_error_code, correlation_id, and actor/job identity as applicable. Public reads only return attached media on a published/visible post.

### 6.2 Failure matrix

| Failure point | Durable evidence | Recovery |
|---|---|---|
| signer returns, no upload | reserved row | expire reservation; no Cloudinary object expected |
| Cloudinary upload fails clearly | reserved row + client error | retry same reservation before expiry or abandon |
| network drops after possible upload | reserved row and known public_id | call confirm with any received response; otherwise trusted reconciliation queries by public_id before retry |
| Cloudinary succeeds, confirm fails due transient Edge outage | object + reserved row | retry confirm; cleanup waits at least 24 hours |
| response signature/metadata invalid | object possibly exists + quarantined reservation | never attach; security event; trusted delete |
| confirm succeeds, DB post fails | uploaded_unattached | retry publish with same post idempotency; cleanup after grace |
| post transaction response lost | attached or uploaded row | find post by idempotency; never upload twice |
| DB post exists but media link fails | prevented by one transaction | no partial visible state |
| deletion DB transition succeeds, Cloudinary fails | delete_pending/delete_failed | content stays hidden/deleted; retry job with backoff |
| Cloudinary reports not found | delete_pending | mark deleted as idempotent success |

Cleanup schedule:

- every hour, expire old reserved rows;
- daily, find uploaded_unattached older than 24 hours;
- trusted job deletes Cloudinary asset, then marks row deleted;
- retry transient delete failure at 1h, 6h, 24h, then alert;
- retain deletion/audit metadata per policy without retaining the image;
- reconcile database and Cloudinary inventory weekly within Admin API rate limits.

Never list the whole Cloudinary account on every cleanup run. Query the indexed database queue and use known public_id; use bounded batches.

### 6.3 Future replacement/edit

No replacement UI is introduced at launch. The backend contract for later:

1. upload and confirm a new unique reservation;
2. transaction attaches the new media to the post and marks old media delete_pending;
3. UI reads the new versioned URL;
4. trusted function destroys old public_id with invalidate as needed;
5. a failed deletion never rolls the post back to a broken old image.

Never overwrite an existing public_id. Versioned unique URLs make cache behavior and rollback deterministic.

## 7. Delivery and rendering

Store Cloudinary's returned secure_url and version/public_id, then generate delivery URLs only through MediaProvider with named/allow-listed transformations. Do not let post content form transformation strings.

Recommended launch transformations:

| Use | Transformation intent |
|---|---|
| note card/list | limit long width near 960, automatic browser format and good quality; preserve aspect ratio; CSS continues current cover/contain/crop scale |
| full note/detail | limit to uploaded maximum 1,280; automatic format/good quality |
| small map/list thumbnail if currently rendered | limit/crop only if current UI already crops; otherwise preserve aspect ratio |

Do not server-side face crop, generative crop, background removal, or change crop scale. Current crop/fit metadata remains the visual authority.

Before adopting f_auto/q_auto or a named transformation, run screenshot comparisons against the uploaded compressed master across representative notes and themes. If pixels/layout differ materially, serve the versioned secure_url for launch and add delivery optimization only after approval. Delivery transformations create derivatives, not a second retained source original.

Cache strategy:

- versioned Cloudinary URLs are immutable and long-cacheable;
- replacement always uses a new public_id;
- deletion uses invalidate=true for sensitive/moderated removal, acknowledging CDN invalidation may take seconds/minutes and old cached copies can persist;
- a hidden post stops returning the URL immediately even while physical deletion retries.

## 8. Security and abuse controls

- valid Supabase user JWT required to reserve, confirm, attach, or request deletion;
- all ordinary assets internally owned even if the post displays Anonymous;
- API secret present only in Edge Function secret store;
- strict CORS origin allow-list, but authorization remains independent of CORS;
- rate/quota counters durable, not only function memory;
- no caller-selected folder/public_id/overwrite/notification/transformation;
- magic-byte and decode validation before signing;
- Cloudinary max bytes/format/incoming dimension defense;
- response signature verification before database attachment;
- allow-list secure_url host/cloud/path and use stored public_id for delivery/deletion;
- unique public_id plus overwrite=false prevents replay replacement;
- Content Security Policy production plan allows images only from self/data only where legacy fixture needs it and the exact Cloudinary host; production rendering should not allow arbitrary remote image hosts;
- strip EXIF by canvas re-encode;
- redact signatures, JWTs, URLs with tokens, and PII from logs;
- owner identifiers never appear in Cloudinary tags/context or anonymous public projection.

Security test cases:

- no JWT, expired JWT, disabled user, other user's reservation;
- changed folder/public_id/tags/transform after signature;
- signature used after business expiry and after Cloudinary's longer technical window;
- same signature/public_id replay;
- mismatched Cloudinary response signature/version;
- forged secure_url/cloud name/public_id;
- oversized source and oversized compressed Blob;
- MIME/extension/magic mismatch, corrupt decode, SVG/polyglot, extreme dimensions;
- unsupported output format or width/height/bytes response;
- double-click upload/publish and dropped response;
- direct REST attempt to attach an unconfirmed/other-user media row;
- anonymous public post hides internal owner but remains accountable server-side;
- orphan cleanup never deletes attached asset;
- moderator delete scope and audit;
- API secret/publishable artifact scans.

## 9. Performance and cost

At the hard maximum, 10,000 compressed masters are about 4.94 GiB; a realistic average below 300 KiB is about 2.86 GiB. Measure actual prepared_blob_bytes and delivered_bytes without recording content. Alert when median/p95 changes after browser releases or algorithm versions.

Launch guardrails:

- target 450 KiB; track p50/p95, not only hard cap;
- concurrency one upload per composer and at most two across a tab;
- signer 10/hour and 30/day per user initially;
- delivery width no greater than rendered need;
- daily orphan cleanup and weekly inventory reconciliation;
- Cloudinary budget alerts at 50%, 75%, and 90% of plan credits;
- no eager derivatives unless measured traffic justifies them;
- log algorithm version to compare size/quality;
- use Cloudinary usage/billing dashboards and Supabase reservation counts for reconciliation.

As verified 2026-08-28/29, Cloudinary Free currently advertises 25 monthly credits, an image upload maximum around 10 MB/25 megapixels, and a rate-limited Admin API; one credit currently maps to defined transformation/storage/bandwidth units. These are time-sensitive. Recheck https://cloudinary.com/pricing and https://cloudinary.com/pricing/compare-plans before procurement and go-live.

## 10. Parity exceptions

### PARITY EXCEPTION — production never stores a photo post only in LocalStorage

- Why: a local fallback would misrepresent a failed shared write, bypass RLS/moderation, and strand content on one device.
- User impact: during Supabase/Edge/Cloudinary outage, photo publication stops and shows Retry instead of appearing locally.
- Mitigation: retain the unsent composer fields/preview; idempotent retry; explicit draft label; status messaging.
- User approval required: **No; this is explicitly required by the production security brief.**

### PARITY EXCEPTION — Map Direct Posting re-encodes accepted photos

- Why: the fixed production architecture requires compression before every user-photo upload; current map path stores an already-small source unchanged.
- User impact: the preview/file format/pixels may differ slightly, and very high-dimension ≤450 KiB files are reduced to 1,280 px.
- Mitigation: preserve the 450 KiB selection cap, show the exact outgoing preview, never enlarge, use the same algorithm, run visual fixtures.
- User approval required: **Yes, because this is a visible media-output difference.**

### PARITY EXCEPTION — decompression-bomb pixel cap

- Why: an 8 MiB compressed file can decode to unsafe memory dimensions.
- User impact: an unusually huge-dimension file that local runtime might attempt to decode is rejected.
- Mitigation: 40-megapixel starting cap, localized explanation, benchmark and document supported values.
- User approval required: **No; security/stability gate, with no effect on normal photos.**

### PARITY EXCEPTION — progress text must not claim local storage

- Why: “Resizing photo for local storage…” is false in production.
- User impact: status copy becomes neutral, for example “Preparing photo…”, while controls/layout remain unchanged.
- Mitigation: retain the same timing, aria-live region, and final compressed-KB message in EN/BM/ZH.
- User approval required: **Yes, as a visible copy change.**

## 11. Implementation sequence and gates

1. Extract current compression into MediaProvider without changing algorithm; Local provider regression tests compare dimensions/bytes/pixels and UI behavior.
2. Add Blob return/previews and exact Wall/Map policy variants.
3. Implement post_media reservation states and RLS.
4. Implement signer and strict CORS/rate limits; verify no secret in browser/artifact.
5. Implement direct upload and response confirmation.
6. Implement atomic post/media and map-post/media/anchor functions.
7. Add cleanup/delete contracts and failure injection tests.
8. Enable in staging; test mobile memory, orientation, transparency, abort, offline, double submit, orphans, and cost metrics.
9. Enable production behind a public non-secret feature flag only after the complete parity/security suite passes.

Rollback:

- frontend rollback may select the immediately preceding Supabase/Cloudinary provider version, but never production LocalDataUrl writes;
- keep signer/confirm v1 and schema backward compatible for at least one release;
- disable new photo uploads server-side if a security issue appears while text-only posts remain available;
- queued orphan/deletion cleanup continues independently of frontend rollback.

## 12. Go/no-go criteria

Go only if:

- all accepted images are decoded/oriented and compressed before network transfer;
- Wall and Map current visible policies/preview/crop/fit pass;
- signer needs a valid JWT and signs only server-selected short-lived parameters;
- Cloudinary API secret and Supabase trusted credentials are absent from repository, bundle, source maps, logs, and Pages artifact;
- upload response signature is verified before attachment;
- PostgreSQL has metadata only and no base64;
- Cloudinary success + DB failure recovery and orphan cleanup are proven;
- direct REST cannot attach another user's/unconfirmed media;
- delete contract is audited/idempotent without any Admin UI;
- versioned delivery/rollback works;
- plan/quota alerts and rate limits are configured;
- every required parity exception decision is resolved.

## 13. Official references

Verified 2026-08-28/29:

- Client-side signed uploads: https://cloudinary.com/documentation/client_side_uploading
- Authentication signatures and exact parameter signing: https://cloudinary.com/documentation/authentication_signatures
- Upload API parameters/response: https://cloudinary.com/documentation/image_upload_api_reference
- Upload response signatures: https://cloudinary.com/documentation/response_signatures
- Signature quick reference/notifications: https://cloudinary.com/documentation/signatures
- Asset deletion: https://cloudinary.com/documentation/delete_assets
- CDN invalidation: https://cloudinary.com/documentation/invalidate_cached_media_assets_on_the_cdn
- Cloudinary plan comparison: https://cloudinary.com/pricing/compare-plans
- Supabase Edge user authentication: https://supabase.com/docs/guides/functions/auth
- Supabase Edge auth headers: https://supabase.com/docs/guides/functions/auth-headers
- Supabase Edge CORS: https://supabase.com/docs/guides/functions/cors
- Supabase Edge limits: https://supabase.com/docs/guides/functions/limits
