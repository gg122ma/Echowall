# EchoWall API and interface contracts

Status: implementation contract; provider names and payloads may be versioned, but UI modules must not call Supabase or Cloudinary directly  
Applies to: localhost, staging, and GitHub Pages production  
Contract version: v1

## 1. Design rules

1. UI, router, wall, community, map, and Study rendering modules depend only on the interfaces in this document.
2. Vendor-specific response objects never escape a provider/repository. Every result is converted to an EchoWall domain shape.
3. Supabase Data API plus RLS is the default for safe row-local reads and writes. PostgreSQL functions are used for atomic state transitions. Edge Functions exist only for secrets, privileged multi-system work, or server-side validation that cannot be trusted to the browser.
4. Every mutation takes a client-generated UUID idempotency key where retry could duplicate visible state.
5. Production has no silent LocalStorage/IndexedDB success fallback for shared state. A local draft is explicitly unsent.
6. All functions accept an optional AbortSignal. Route changes abort obsolete reads and uploads.
7. Every list is paginated even if current seed data fits in memory. The UI adapter may accumulate pages to preserve current rendering.
8. Timestamps are UTC ISO 8601 on the wire and timestamptz in PostgreSQL.
9. IDs are opaque strings in UI code. Adapters may map current numeric/negative seed IDs to stable production UUIDs and back to a display key.
10. Edge Function and RPC contracts are versioned before a breaking change; the database stays compatible with at least the current and immediately preceding production frontend.

## 2. Shared wire types

### 2.1 Result and error

Successful methods return the documented value and throw/return an EchoError only for failure. Do not encode errors in a successful null unless null is explicitly meaningful.

EchoError:

| Field | Type | Meaning |
|---|---|---|
| code | enum string | stable machine code |
| messageKey | string | i18n key, not raw vendor text |
| retryable | boolean | safe to offer Retry |
| httpStatus | integer or null | sanitized upstream status |
| correlationId | string or null | trace shared across browser/function/database |
| retryAfterMs | integer or null | rate-limit/backoff hint |
| fieldErrors | map string→messageKey or null | validation fields |
| causeClass | string or null | non-sensitive diagnostic class |

Stable codes: ABORTED, OFFLINE, TIMEOUT, AUTH_REQUIRED, AUTH_EXPIRED, EMAIL_UNCONFIRMED, FORBIDDEN, NOT_FOUND, VALIDATION_FAILED, CONFLICT, IDEMPOTENCY_CONFLICT, RATE_LIMITED, PAYLOAD_TOO_LARGE, UNSUPPORTED_MEDIA, DUPLICATE, STORAGE_FAILED, MEDIA_FAILED, UPSTREAM_FAILED, SERVICE_UNAVAILABLE, INTERNAL.

Never return SQL text, table policy details, credentials, Cloudinary signatures after use, Storage service URLs containing privileged tokens, stack traces, or raw imported source paths.

### 2.2 Page and query

Page<T> = items:T[], nextCursor:string|null, hasMore:boolean, snapshotAt:string, total:null|number.

- Cursor pagination is ordered by a stable pair such as created_at descending, id descending.
- Cursor is an opaque base64url-encoded signed/validated value or a pair encoded by the repository; callers do not parse it.
- total is null unless the current UI genuinely needs a count. Avoid exact count on every feed request.
- Default page: posts 25, comments 20 roots, resources 30, submissions 20; hard maximum 50.
- Search strings are normalized, 2–100 characters. Empty search uses browse indexes, not a wildcard full scan.

### 2.3 Core domain projections

PublicPost:

- id, legacyDisplayId?, contextKind, collegeId?, jurusanId?, buildingId?;
- postType, questionStatus?, title?, content, category;
- shape, color, rotation, positionX, positionY;
- displayAuthorName, isAnonymous, isOwnedByViewer;
- createdAt, updatedAt, solvedAt?;
- moderation/public visibility already applied;
- media: PublicMedia[];
- upvotes, downvotes, score, viewerVote;
- commentCount;
- isSeed, seedDisplayDisclosure? only if approved.

PublicMedia:

- id, secureUrl/deliveryUrl, width, height, bytes, format;
- cropScale, fit;
- no private upload signature, API secret, owner ID, or deletion token.

PublicComment:

- id, postId, parentCommentId, depth, content;
- displayAuthorName, isAnonymous, isOwnedByViewer;
- createdAt, updatedAt;
- replies array only when assembled by repository.

SessionView:

- access state only: user {id,email}, expiresAt, emailConfirmed;
- profile returned separately;
- no token is exposed to UI rendering or application logs.

Profile:

- id, email, displayName, educationStatus, educationOrgId, educationMajorId, educationStartYear, createdAt, updatedAt.

StudyResource:

- public catalogue fields only: id, sourceKind, title, jurusan, semester, subjectCode, resourceType/subtype, topic, years/session, sourceCollege, language/description if approved, fileAvailability, public file descriptor, moderation/verification display state, relation/group IDs;
- never sourceRelativePath, parser warnings, generator username/path, private object path, uploader identity, reviewer note, raw SHA unless explicitly needed for duplicate UI.

## 3. Standard timeout, retry, and idempotency policy

| Operation | Timeout | Automatic retry | Idempotency |
|---|---:|---|---|
| Auth session/profile read | 8 s | one retry on network/5xx after 250–750 ms jitter | not applicable |
| ordinary list/get | 8 s | up to two retries on network, 429 respecting Retry-After, or 5xx | cursor makes repeat safe |
| ordinary mutation | 12 s | no retry unless method has idempotency key; then one recovery lookup and one retry | required as documented |
| PostgreSQL function | 12 s | same as mutation | request UUID persisted with outcome |
| signer Edge Function | 8 s | one retry only before any Cloudinary upload starts | uploadId is stable; new timestamp/signature may be issued |
| Cloudinary upload | 45 s | one retry with the same uploadId/public_id only when outcome is unknown; overwrite remains false | uploadId/public_id and reservation |
| Study resumable upload | 5 min overall, 30 s per request | TUS resume according to offset | stable submission/file object path |
| Study finalize/review function | 30 s; benchmark server hashing separately | status lookup before one retry | action idempotency UUID |

Backoff is capped and cancellable. Never retry 400/401/403/404/409 validation conflicts except after a fresh session for one AUTH_EXPIRED event. A 429 uses server Retry-After. A network failure after a mutation invokes the method-specific lookup by idempotency key before another create.

## 4. AuthProvider

Production implementation: **SupabaseAuthProvider**. Regression implementation: **LocalAuthProvider**, adapting the current AuthService without changing UI. Supabase client owns secure session persistence and refresh; the UI never writes an EchoWall fake session.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| initialize | {signal} | SessionView|null | none | TIMEOUT, SERVICE_UNAVAILABLE | one read retry; Local only when environment explicitly local |
| getSession | {fresh?:boolean,signal} | SessionView|null | none | AUTH_EXPIRED, TIMEOUT | cached SDK session unless fresh; never reads prototype key in production |
| onAuthStateChange | listener(event,session) | unsubscribe() | none | listener errors isolated | no retry; emit INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, PASSWORD_RECOVERY, USER_UPDATED |
| signUp | {email,password,displayName,education?,redirectTo,idempotencyKey,signal} | {session:SessionView|null,confirmationRequired:boolean,profilePending:boolean} | none | VALIDATION_FAILED, CONFLICT, RATE_LIMITED | no blind retry; recovery is sign-in/resend; no local account fallback |
| signIn | {email,password,signal} | SessionView | none | AUTH_REQUIRED, EMAIL_UNCONFIRMED, RATE_LIMITED | no automatic credential retry |
| signOut | {scope:'local'|'global',signal} | void | authenticated/session optional | SERVICE_UNAVAILABLE | local SDK tokens cleared according to chosen scope; shared data untouched |
| requestPasswordReset | {email,redirectTo,signal} | {accepted:true} | none | VALIDATION_FAILED, RATE_LIMITED | response does not disclose whether email exists |
| updateRecoveredPassword | {password,signal} | void | recovery session | AUTH_REQUIRED, VALIDATION_FAILED | no retry |
| resendConfirmation | {email,redirectTo,signal} | {accepted:true} | none | RATE_LIMITED | cooldown shown from Retry-After |

The provider maps current register/sign-in/sign-out labels and validation keys. Email confirmation/password recovery visible differences are controlled by the decisions document.

## 5. ProfileRepository

Production: **SupabaseProfileRepository**. profiles.id equals auth.users.id. A signup trigger creates only a minimal safe row; initialization remains idempotent if the trigger temporarily fails.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| getMe | {signal} | Profile | authenticated | AUTH_REQUIRED, NOT_FOUND | one read retry; NOT_FOUND invokes ensureProfile once |
| ensureProfile | {displayName?,education?,idempotencyKey,signal} | Profile | authenticated owner | VALIDATION_FAILED, CONFLICT | upsert limited to current user; safe by user ID; no production local fallback |
| updateMe | {displayName,educationStatus,educationOrgId?,educationMajorId?,educationStartYear?,expectedUpdatedAt,signal} | Profile | authenticated owner | VALIDATION_FAILED, CONFLICT | optimistic concurrency; caller refetches on conflict |
| getCapabilities | {signal} | {roles:[],scopes:[],permissions:[]} | authenticated | AUTH_REQUIRED | server-derived role assignment projection; never user_metadata |

Ordinary users cannot update role, email confirmation, moderation, seed, audit, or another profile. Email change, if later exposed, stays an AuthProvider operation with Supabase verification and is not added at launch.

## 6. PostRepository

Production: **SupabasePostRepository**. Local: adapter around EchoNoteStore/current note normalization. Current legacy keys are derived by the adapter.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| list | {context,postType?,category?,sort,cursor?,limit?,signal} | Page<PublicPost> | anon allowed | VALIDATION_FAILED, TIMEOUT | read policy; two retries; no shared local fallback |
| getById | {id,signal} | PublicPost | anon allowed if visible | NOT_FOUND | one retry |
| findByIdempotencyKey | {idempotencyKey,signal} | PublicPost|null | authenticated owner | AUTH_REQUIRED | used only after unknown mutation result |
| create | {draft,mediaReservationId?,idempotencyKey,signal} | PublicPost | authenticated | AUTH_REQUIRED, VALIDATION_FAILED, CONFLICT, MEDIA_FAILED | publish_post RPC; recover by idempotency key before retry |
| setQuestionStatus | {postId,status:'open'|'solved',expectedStatus,idempotencyKey,signal} | PublicPost | owner or authorized moderator | FORBIDDEN, CONFLICT | set_question_status RPC compare-and-set; idempotent outcome |
| getOwnerHistory | {cursor?,limit?,signal} | Page<PublicPost> | authenticated owner | AUTH_REQUIRED | not exposed as new UI unless needed for recovery |

create validates current 500-character content rule, post visual enums/bounds, context combination, category, anonymity, and title semantics. The database snapshots the authenticated profile display name. It ignores any caller-supplied author ID, aggregate counts, moderation status, seed flag, timestamps, or role.

There is no ordinary update/delete method in v1 because current UI has no such feature. Backend soft-delete/moderation capability exists only behind ModerationGateway.

## 7. CommentRepository

Production: **SupabaseCommentRepository**. Local: adapter around current CommentService.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| listThread | {postId,cursor?,rootLimit?,signal} | {roots:PublicComment[],nextCursor,hasMore} | anon if post visible | NOT_FOUND, TIMEOUT | roots paginated; replies fetched/aggregated without N+1 |
| getCount | {postId,signal} | integer | anon | NOT_FOUND | may come with post projection |
| findByIdempotencyKey | {postId,idempotencyKey,signal} | PublicComment|null | authenticated owner | AUTH_REQUIRED | unknown-outcome recovery |
| create | {postId,parentCommentId?,content,isAnonymous,idempotencyKey,signal} | PublicComment | authenticated | AUTH_REQUIRED, VALIDATION_FAILED, CONFLICT | direct insert under RLS plus DB trigger, or one thin RPC if return projection needs masking; lookup before retry |

The server derives depth. A parent must be a visible root on the same post. No reply-to-reply can be inserted via REST. There is no ordinary edit/delete method in v1.

## 8. VoteRepository

Production: **SupabaseVoteRepository**. Local: adapter around current note vote mutation for parity fixtures.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| setVote | {postId,value:-1|0|1,idempotencyKey,expectedVersion?,signal} | {postId,upvotes,downvotes,score,viewerVote,version} | authenticated | AUTH_REQUIRED, FORBIDDEN, CONFLICT | set_post_vote RPC atomically upserts/deletes unique vote and returns aggregate; lookup/refetch on unknown outcome |
| getViewerVote | {postId,signal} | -1|0|1 | authenticated; 0 for anon | AUTH_EXPIRED | normally included in post projection |

value zero removes the viewer's row. Unique(post_id,user_id) and a ±1 check prevent double votes. Seed interaction policy is checked server-side. Signed-out voting becomes a documented parity exception rather than an anonymous fingerprint/cookie identity.

## 9. BuildingRepository

Production: **HybridBuildingRepository**: versioned static snapshot for normal rendering/search and Supabase reference validation when writing.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| list | {query?,collegeId?,signal} | BuildingSummary[] | anon | VALIDATION_FAILED | static, immediate; optional server overlay not launch-critical |
| getById | {buildingId,signal} | BuildingDetail|null | anon | none | static source is intentional offline read fallback |
| getHours | {buildingId,locale,signal} | BuildingHours[] | anon | none | static localized snapshot |
| resolveAlias | {text,signal} | BuildingSummary|null | anon | none | same mapping used by Ask Echo |
| validateWriteTarget | {buildingId,signal} | {id,footprintVersion,active} | authenticated | AUTH_REQUIRED, NOT_FOUND | server reference read before map direct publish, also revalidated in RPC |

CI compares static IDs/versions with seeded colleges, Jurusan, buildings, hours, and footprint records. Static fallback is safe because it is catalogue data, not a successful shared mutation.

## 10. MapNoteRepository

Production: **SupabaseMapNoteRepository**. It presents current map records but shares posts rather than copying them. Local provider stays for regression fixtures.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| list | {bounds?,buildingId?,sourceType:'all'|'anchored_post'|'legacy_pin',visibility:'visible',cursor?,limit?,signal} | Page<MapNote> | anon | VALIDATION_FAILED | query returns only public visible records; legacy merged in adapter |
| create | {buildingId,lat,lng,postDraft,mediaReservationId?,footprintVersion,idempotencyKey,signal} | {post:PublicPost,mapNote:MapNote} | authenticated | AUTH_REQUIRED, VALIDATION_FAILED, CONFLICT | publish_map_post RPC creates post/media link/anchor atomically; recovery by idempotency key |
| getLabelForBuilding | {buildingId,signal} | MapLabel|null | anon | TIMEOUT | derived deterministic visible top note; may be returned in list |
| exportOwnedData | {cursor?,signal} | Page<MapNote> | authenticated owner | AUTH_REQUIRED | future portability; does not expose others |

No ordinary setHidden/delete exists. Those current local admin-oriented operations move to ModerationGateway. Production create of legacy direct pins remains unsupported.

## 11. StudyResourceRepository

Production: **HybridStudyResourceRepository** overlays approved Supabase rows on a sanitized static curated catalogue. Local: current StudyResourceService adapter.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| listSubjects | {jurusan?,semester?,signal} | StudySubject[] | anon | none | static snapshot |
| list | {jurusan?,semester?,subjectCode?,category?,subtype?,year?,sourceCollege?,sort,cursor?,limit?,signal} | Page<StudyResource> | anon | VALIDATION_FAILED | merge static and approved remote with stable ordering; static remains available during Supabase read outage with a visible stale/offline indicator if overlay was expected |
| search | {query,filters?,sort?,cursor?,limit?,signal} | Page<StudyResource> | anon | VALIDATION_FAILED | preserve current code/title/topic/year matching order; server overlay search uses matching normalized fields |
| getById | {resourceId,signal} | StudyResource|null | anon if published | NOT_FOUND | resolve namespace; no pending leak |
| getRelations | {resourceId,relationType?,signal} | StudyRelation[] | anon if both visible | NOT_FOUND | many-to-many rows; adapter preserves current primary-related result |
| getOpenDescriptor | {resourceId,signal} | {kind:'static'|'public_storage'|'unavailable',url?,mime?,fileName?,expiresAt?} | anon if published | NOT_FOUND, SERVICE_UNAVAILABLE | static path includes Pages base; approved public Storage URL or short-lived signed URL by chosen bucket plan |

Pending/rejected/private import metadata never enters list/search/get results for anon or ordinary authenticated users.

## 12. StudySubmissionRepository

Production: **SupabaseStudySubmissionRepository** plus Supabase Storage. IndexedDB may retain an explicitly unsent draft/blob and upload offset, never the authoritative submission.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| validateLocalFile | {file,signal} | {size,mimeHint,pdfHeaderOk,sha256} | local/auth not required | PAYLOAD_TOO_LARGE, UNSUPPORTED_MEDIA | no network; worker preferred; client hash is provisional |
| checkDuplicate | {sha256,metadata,signal} | {exact,exactResourceId?,likely,candidates[]} | authenticated | AUTH_REQUIRED | server checks built-in+submission hashes and heuristic index; exact blocks object creation |
| createUploadIntent | {metadata,fileName,size,mimeHint,sha256,permissionConfirmed,idempotencyKey,signal} | {submissionId,fileId,bucket,objectPath,uploadMode,maxBytes} | authenticated | VALIDATION_FAILED, DUPLICATE, RATE_LIMITED | RPC/direct insert with RLS; returns same intent for repeated key |
| uploadFile | {intent,file,onProgress,signal} | {objectPath,etag?,bytes} | authenticated owner | STORAGE_FAILED, PAYLOAD_TOO_LARGE | TUS resumable above 6 MiB; stable path; IndexedDB may hold resume draft only |
| finalizeUpload | {submissionId,objectPath,clientSha256,idempotencyKey,signal} | StudySubmission | authenticated owner | VALIDATION_FAILED, STORAGE_FAILED, CONFLICT | study-finalize-upload Edge Function or protected function; server checks object size/header and records validation state; recovery by submission ID |
| listMine | {status?,cursor?,limit?,signal} | Page<StudySubmission> | authenticated owner | AUTH_REQUIRED | two read retries |
| getMine | {submissionId,signal} | StudySubmission | authenticated owner | AUTH_REQUIRED, NOT_FOUND | one read retry |
| retryUpload | {submissionId,file,signal} | StudySubmission | authenticated owner and awaiting/failed upload | CONFLICT, STORAGE_FAILED | resumes/replaces only same content-addressed path under policy |

Metadata validates programme/semester/subject/type/year combinations and relation targets on the server. A likely duplicate is accepted only with the same warning behavior and a stored duplicate candidate; an exact content hash reuses the canonical file object or blocks based on the Study plan. create/finalize never makes content public.

## 13. MediaProvider

Production: **CloudinaryMediaProvider**. Local: **LocalDataUrlMediaProvider** only in local/regression environment. The production selector refuses to instantiate the local provider.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| prepareImage | {file,composer:'wall'|'map',signal,onProgress?} | PreparedImage {blob,width,height,bytes,format,previewUrl,algorithmVersion} | local | PAYLOAD_TOO_LARGE, UNSUPPORTED_MEDIA, MEDIA_FAILED | deterministic current-compatible compression; no network |
| reserveUpload | {prepared,context,idempotencyKey,signal} | UploadReservation {id,cloudName,apiKey,timestamp,expiresAt,signature,signedParams,uploadUrl,publicId} | authenticated | AUTH_REQUIRED, RATE_LIMITED | cloudinary-sign-upload; refresh once if expired before upload |
| upload | {reservation,prepared,onProgress?,signal} | UploadedMedia {reservationId,secureUrl,publicId,width,height,bytes,format,version,etag?} | signed Cloudinary request | MEDIA_FAILED, TIMEOUT | unknown outcome lookup/one retry using same unique public_id and overwrite=false |
| confirmUpload | {reservationId,cloudinaryResponse,signal} | ConfirmedMedia | authenticated reservation owner | FORBIDDEN, VALIDATION_FAILED, MEDIA_FAILED | cloudinary-confirm-upload verifies Cloudinary response signature and marks uploaded_unattached; identical replay succeeds |
| attachToPost | handled through PostRepository.create/create map | PublicMedia | authenticated owner of reservation | CONFLICT, MEDIA_FAILED | atomic database transaction marks attached |
| abandon | {reservationId,signal} | {scheduledForCleanup:true} | authenticated owner | AUTH_REQUIRED | best effort; cleanup job remains authoritative |
| requestDelete | {mediaId,reason,idempotencyKey,signal} | {state:'scheduled'|'deleted'} | future authorized moderator/owner flow only | FORBIDDEN | calls protected deletion contract, not exposed in ordinary v1 UI |

Object URLs/previews are revoked after use. No original and compressed copy are both uploaded. No base64 is written to PostgreSQL or a production local note.

## 14. ModerationGateway

Production: **SupabaseModerationGateway**. It is backend-ready but no launch Admin UI consumes privileged methods.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| getCapabilities | {signal} | roles/scopes/permissions | authenticated | AUTH_REQUIRED | protected projection |
| listQueue | {scope,status,type,cursor?,limit?,signal} | Page<ModerationItem> | scoped moderator | FORBIDDEN | no public use |
| hideContent | {targetType,targetId,reason,expectedVersion,idempotencyKey,signal} | ModerationResult | scoped moderator | FORBIDDEN, CONFLICT | moderation-action Edge/RPC; audit and visibility transaction |
| restoreContent | same | ModerationResult | scoped moderator | FORBIDDEN, CONFLICT | idempotent state transition |
| softDeleteContent | same plus deleteMedia?:boolean | ModerationResult | higher scoped permission | FORBIDDEN, CONFLICT | row state/audit commit; external asset deletion queued, never hides DB failure |
| reviewStudy | {submissionId,action:'approve'|'reject'|'verify',patch?,reason?,verificationStatus?,idempotencyKey,signal} | StudySubmission/StudyResource | Study reviewer in scope | FORBIDDEN, VALIDATION_FAILED, CONFLICT | study-review-action; recomputes validation/duplicates/relations |
| getAudit | {filters,cursor?,limit?,signal} | Page<AuditAction> | authorized audit reader | FORBIDDEN | protected table/view |

Service credentials are not a method parameter. The gateway sends the current user JWT; the server derives actor and scope. Cloudinary deletion is a separate queued result so database audit/visibility can commit even if Cloudinary is temporarily unavailable.

## 15. CampusKnowledgeProvider

Launch: **LocalCampusKnowledgeProvider**, adapting the current KMK knowledge base and building catalogue. Future external provider remains disabled.

| Method | Arguments | Return | Auth | Errors | Retry/idempotency/fallback |
|---|---|---|---|---|---|
| search | {query,locale,limit?,signal} | KnowledgeMatch[] | anon | VALIDATION_FAILED | local static, bounded |
| answer | {query,locale,conversationContext?,signal} | {text,citations:[],actions:[],boundaryCode?,provider:'local'} | anon | VALIDATION_FAILED | current deterministic retrieval/refusal rules |
| getBuildingActions | {buildingId,locale,signal} | Action[] | anon | none | local hash-route actions |
| getVersion | none | {knowledgeVersion,buildingVersion} | none | none | included in diagnostics |

A future **EdgeCampusKnowledgeProvider** may call ask-echo-proxy. It is not enabled until privacy, consent, retention, prompt-injection, cost, and parity approval. External AI tokens never appear in public configuration.

## 16. Direct Data API versus function boundary

| Operation | Mechanism | Why |
|---|---|---|
| public visible post/comment/reference/resource reads | direct Supabase Data API under RLS or safe public projection | RLS is sufficient; no custom API |
| owner profile read/update | direct Data API under RLS and column-limited grants | row-local |
| root/reply insert | direct Data API plus constraints/trigger | one-row write; parent invariant enforced in DB |
| ordinary Study submission intent/list | direct Data API or thin RPC where duplicate transaction is required | no secret |
| Storage pending upload | direct Supabase Storage using user JWT/RLS | object path owner-scoped |
| publish ordinary post without map/media | publish_post PostgreSQL function | stable idempotency and exact returned public projection |
| attach reserved media and publish post | PostgreSQL function | post, media ownership/status, and row links atomic |
| Map Direct Posting | publish_map_post PostgreSQL function | post + media + anchor atomic and footprint validated |
| vote | set_post_vote PostgreSQL function | unique upsert/delete and aggregate atomic |
| solved/reopen | set_question_status PostgreSQL function | compare-and-set plus owner/moderator auth/audit |
| Cloudinary signature | Edge Function | requires Cloudinary API secret |
| Cloudinary upload | direct browser → Cloudinary signed endpoint | avoids proxy bandwidth |
| Cloudinary delete | Edge Function | API secret and privileged role |
| Study file final sniff/hash/scan | Edge Function or trusted worker contract | browser assertions are untrusted; benchmark limits |
| Study approval/public object promotion | Edge Function + database function | privileged Storage action plus atomic metadata/resource state |
| moderation hide/restore/delete | database function; Edge only when external asset work needed | scope check/audit transaction |
| future external Ask Echo | Edge Function | third-party secret, rate/privacy boundary |

## 17. Edge Function contract matrix

All functions use HTTPS JSON except direct Cloudinary/Storage uploads. Function implementations use the current Supabase user-auth wrapper/pattern and retain default JWT verification. They require both the project's public API-key header and Authorization: Bearer user JWT. A trusted scheduled job uses a separate server-only invocation identity. CORS is not authorization.

### 17.1 cloudinary-sign-upload

| Contract item | Definition |
|---|---|
| Caller/method | signed-in public browser; POST |
| Auth | valid Supabase user JWT; active profile; server derives user ID |
| Input | {requestVersion:'1', uploadId:UUID, composer:'wall'|'map', bytes, width, height, format:'webp'|'jpeg', context:{kind,buildingId?/collegeId?/jurusanId?}, idempotencyKey:UUID} |
| Validation | prepared bytes/dimensions within composer policy; allow-listed format/context; user rate/quota; uploadId/idempotency ownership |
| Server action | create/reuse media reservation; generate unique public_id under configured asset_folder/public prefix; choose tags/context server-side; timestamp now; overwrite=false; sign exact allow-listed parameters using Cloudinary API secret |
| Success 200 | {requestVersion:'1', reservationId, cloudName, apiKey, uploadUrl, publicId, timestamp, expiresAt, signatureAlgorithm, signature, signedParams} |
| Errors | 400 validation, 401 invalid/expired JWT, 403 disabled profile/context, 409 idempotency mismatch, 413 policy size, 429 rate limit, 503 upstream/config unavailable |
| Secrets | Cloudinary API secret; Supabase secret/admin client only if reservation cannot be inserted with user-scoped client |
| Rate limit | launch default 10/hour and 30/day/user; optional IP burst 5/5 minutes; configuration, not hard-coded UI |
| CORS | exact allow-listed Origin; POST/OPTIONS; Vary: Origin; allowed headers authorization, apikey, content-type, x-client-info, x-correlation-id |
| Replay | business expiresAt about 60 seconds; Cloudinary signature may technically remain valid longer; unique public_id, overwrite=false, reservation one active upload, idempotency ownership, rate limit |
| Logs | correlation/user hash/reservation/composer/outcome/latency/bytes; never signature, JWT, content, API secret |

### 17.2 cloudinary-confirm-upload

The upload path confirms Cloudinary provenance before attachment:

| Contract item | Definition |
|---|---|
| Caller/method | signed-in browser that owns the reservation; POST |
| Auth/input | valid user JWT; reservationId plus allow-listed Cloudinary response fields public_id, version, signature, secure_url, width, height, bytes, format, resource_type, type, asset_id?/etag? |
| Validation | verify Cloudinary response signature from public_id/version using API secret; exact reserved public_id; HTTPS expected cloud/host/path; width/height/bytes/format limits |
| Success | 200 normalized media descriptor with state uploaded_unattached |
| Errors | 400 response shape/domain, 401, 403 owner, 404 reservation, 409 public_id/state mismatch, 413, 422 bad response signature, 503 |
| Secrets/rate/CORS | Cloudinary API secret; same user upload quota and strict origin policy |
| Replay/logs | identical confirmation is success, a different response conflicts; never log response signature/JWT |

### 17.3 cloudinary-delete-asset

| Contract item | Definition |
|---|---|
| Caller/method | future ModerationGateway or trusted orphan job; POST |
| Auth | user JWT with scoped delete permission, or scheduled trusted identity |
| Input | {requestVersion:'1', mediaId, reason, invalidate:boolean, expectedVersion, idempotencyKey} |
| Validation | server loads public_id; caller scope; state transition; reason required; media not referenced by another post |
| Server action | mark delete_pending/audit transaction; call Cloudinary destroy by public_id; on success mark deleted with result/timestamp; on failure leave retryable pending |
| Success | 200 {mediaId,state:'deleted'|'not_found',cloudinaryResult,invalidated,deletedAt}; 202 {state:'delete_pending'} for retry queue |
| Errors | 400, 401, 403, 404, 409, 429, 502/503 |
| Secrets | Cloudinary API key/secret, Supabase trusted key only for job path |
| Rate limit | moderators 30/minute; job batched below current Admin API limit; configurable |
| CORS | no anon; same strict origin rules for browser; scheduled identity has no browser CORS dependency |
| Replay | idempotency key and deleted terminal state; repeated not_found is success |
| Logs | actor/scope/media/public_id hash/reason code/result/correlation; redact secret/signature |

### 17.4 study-finalize-upload

| Contract item | Definition |
|---|---|
| Caller/method | uploader browser after Storage completes; POST |
| Auth | valid user JWT; owns pending submission and object prefix |
| Input | {requestVersion:'1', submissionId, objectPath, expectedBytes, clientSha256, idempotencyKey} |
| Validation | bucket/path exact match to intent; Storage object exists; size cap; Content-Type hint; server reads first bytes for %PDF-; server hash/scan status recorded by trusted process |
| Success | 200 {submissionId,status:'pending',fileValidationStatus,sha256Status,scanStatus,duplicateStatus,updatedAt} |
| Errors | 400 invalid header/path, 401, 403, 404 object, 409 intent/object/hash conflict, 413, 422 unsafe file, 429, 503 |
| Secrets | Supabase secret only if Storage metadata/header cannot be read through owner client; no Cloudinary secret |
| Rate limit | 5 concurrent and 20/day/user initially |
| CORS | strict origins |
| Replay | submission + idempotency key; same object metadata returns same result |
| Limits | benchmark 60 MiB hashing against Edge CPU/wall limits before launch; if not safe, quarantine remains pending until a separate trusted scanner verifies it |
| Logs | IDs, sizes, hash prefix, validation/scan outcome; never document content or signed URL |

### 17.5 study-review-action

| Contract item | Definition |
|---|---|
| Caller/method | future authorized Study reviewer/operational tool; POST |
| Auth | user JWT and active STUDY_REVIEWER assignment/scope |
| Input | {requestVersion:'1', submissionId, action:'approve'|'reject'|'verify', metadataPatch?,verificationStatus?,reason?,expectedVersion,idempotencyKey} |
| Validation | full taxonomy and required fields recomputed; relation targets exist/same subject/complementary type; exact/likely duplicate recomputed; file server hash/header/scan/license states meet approval gate |
| Server action | reject/verify uses transactional state+audit; approve copies/promotes object to approved location if required, then transaction creates/updates Study resource and relations; compensation cleans copied orphan on DB failure |
| Success | 200 {submission,resource?,relations?,auditId,objectState} |
| Errors | 400, 401, 403, 404, 409 stale version/duplicate, 422 file not cleared, 429, 502 Storage copy, 503 |
| Secrets | Supabase trusted Storage/database credential |
| Rate limit | 60/minute/reviewer; lower for file promotion |
| CORS | strict origins; no public caller |
| Replay | idempotency key stored with action result; repeated approve returns existing resource |
| Logs | actor/scope/action/target/reason code/result/correlation; metadata diff sanitized |

### 17.6 moderation-action

| Contract item | Definition |
|---|---|
| Caller/method | future scoped moderator; POST |
| Auth | user JWT plus active role/scope |
| Input | {targetType,targetId,action:'hide'|'restore'|'soft_delete',reason,deleteMedia:false by default,expectedVersion,idempotencyKey} |
| Success | 200 {targetType,targetId,visibilityStatus,version,auditId,mediaDeletionState?} |
| Server boundary | use a PostgreSQL function for DB-only transitions; invoke Cloudinary deletion contract only if approved action requires it |
| Errors/rate | standard 400/401/403/404/409/429/503; 120/minute/moderator |
| Replay/log/CORS | stored idempotency result; strict origins; complete audit, no content body in standard logs |

### 17.7 ask-echo-proxy — future, disabled

| Contract item | Definition |
|---|---|
| Caller/method | public browser only after separate approved launch; POST |
| Auth | decision required: anonymous rate-limited or authenticated; default authenticated |
| Input | bounded query, locale, approved context IDs; never full local storage/history |
| Success | sanitized answer, approved actions/citations, provider/model version, safety code |
| Secrets | external AI credential only in Edge Function |
| Rate/replay | strict user/IP quota; queries are not replayed automatically |
| Privacy | explicit retention/redaction policy and consent required |
| Launch | not deployed or configured for current production launch; LocalCampusKnowledgeProvider remains authoritative |

## 18. CORS and origin contract

Allowed origins are exact environment variables, not suffix/wildcard matches:

- localhost development origins explicitly enumerated, for example http://localhost:PORT and http://127.0.0.1:PORT;
- one staging Pages/custom origin;
- the production GitHub Pages origin including owner host (Origin itself has no path);
- future verified custom-domain origin, added before cutover.

Rules:

- reject missing Origin for browser-only functions unless the request is a separately authenticated scheduled/server invocation;
- OPTIONS returns only the requested allowed origin, methods, allowed headers, max-age, and Vary: Origin;
- POST response also includes the same origin and Vary header;
- allow authorization, apikey, content-type, x-client-info, x-correlation-id, and x-idempotency-key only as needed;
- do not allow credentials cookies; Supabase bearer tokens are headers;
- never use CORS as a substitute for JWT, role, object ownership, signature expiry, or RLS;
- Cloudinary direct upload uses its supported cross-origin endpoint and the exact signed fields; EchoWall cannot widen Cloudinary policy from the browser.

## 19. Configuration and secrets matrix

| Configuration | Localhost | Staging | Production Pages | Classification |
|---|---|---|---|---|
| APP_ENV | local/staging | staging | production | public |
| APP_BUILD_SHA / RELEASE_ID | local hash | immutable commit | immutable commit | public |
| APP_BASE_PATH / BASE_URL | / | Pages repo path or staging domain | configure-pages output/fixed repo path | public |
| SUPABASE_URL | local/staging project | staging project | production project | safe frontend |
| SUPABASE_PUBLISHABLE_KEY | local/staging public key | staging public key | production public key | safe frontend; RLS mandatory |
| CLOUDINARY_CLOUD_NAME | dev/test cloud | staging folder/account | production cloud | safe frontend |
| CLOUDINARY_UPLOAD_FOLDER_PREFIX | dev | staging | production | public constraint duplicated server-side |
| feature flags | local providers selectable | production providers, no index engines | production providers | public |
| allowed origins | dev env | Edge secret/config | Edge secret/config | trusted configuration |
| SUPABASE_SECRET_KEY | local CLI function secret only | Edge secret | Edge secret | trusted only |
| DATABASE_URL/direct password | migration runner only | protected CI/environment | protected CI/environment | trusted only |
| CLOUDINARY_API_KEY | returned by signer where required | Edge config and signed response | Edge config and signed response | public identifier, not a secret; need not be baked into static config |
| CLOUDINARY_API_SECRET | never browser | Edge secret | Edge secret | secret |
| future AI key | disabled | Edge secret only if approved | Edge secret only | secret |
| signing/rate-limit salts | local function secret | Edge secret | Edge secret | secret |

Public config generation must use an allow-list and fail if an unexpected variable is requested. CI scans the entire staged artifact for known secret prefixes, legacy service_role/secret keys, Cloudinary API secret, database URLs, private filesystem paths, and high-entropy values. GitHub environment secrets are not written to files unless the file is outside the artifact and securely removed by the runner; prefer passing trusted configuration only to migration/function deployment jobs, not Pages build.

Use separate Supabase projects and Cloudinary folders/accounts for staging and production when budget permits. Never point a localhost/local-provider test at production without an explicit protected switch.

## 20. Failure and consistency matrix

| Failure | Detection | Recovery/compensation | User-visible state |
|---|---|---|---|
| Cloudinary succeeds, DB post fails | reservation remains uploaded_unattached | retry same publish idempotency key; cleanup after 24h if never attached | draft retained with “photo uploaded, post not published”; Retry |
| DB post succeeds, response lost | lookup by idempotency key finds post | render returned lookup; do not upload/create again | brief “Checking publish status” |
| forged media result | reservation public_id/owner/expected constraints mismatch | reject attach; cleanup actual reservation | photo publish failed |
| DB succeeds but client media render metadata missing | authoritative post get includes media | refetch; do not write partial client copy | loading/retry |
| double-click post/comment | UI disables; unique owner+idempotency | second returns first outcome | one item |
| duplicate comment after network loss | find by idempotency key | render existing | one item |
| vote race/multiple tabs | transactional unique vote and versioned aggregate | last accepted user intent wins; refetch on conflict | optimistic value corrects to server |
| solve/reopen race | expectedStatus compare-and-set | refetch current state, optionally retry explicit user action | “Question status changed; refreshed” |
| Supabase outage | health/network error | read static campus/Study curated data only; shared mutations remain unsent | explicit unavailable/retry; never “posted locally” |
| Cloudinary outage | upload error/reservation state | retry same reservation or abandon; no post with broken URL | draft/preview retained |
| Edge signer outage | no signature | retain prepared draft blob in memory/explicit local draft; retry | upload unavailable |
| Study upload succeeds, DB finalize fails | object path exists, submission awaiting_finalize | repeat finalize by submission/idempotency; orphan after grace | pending upload recovery |
| Study DB intent succeeds, upload fails | awaiting_upload | resumable retry or explicit cancel; cleanup after expiry | progress/retry |
| Study approval copy succeeds, DB publish fails | approval action records copied object id | retry transaction; cleanup copy if terminal failure | remains pending, never public partial metadata |
| broken RLS migration | policy integration tests/403 or exposure probe | rollback migration before frontend promotion | no deploy |
| bad Pages artifact | smoke/secret/asset/route tests | redeploy known-good commit; DB backward compatibility | maintenance/status communication if already public |

## 21. Observability and privacy

- Generate a correlation ID in the browser for every mutation; propagate to Edge Function headers and database request/idempotency records.
- Measure success/failure/latency by operation, HTTP class, composer/context, and anonymous aggregate plan tier. Do not log post/comment body, password/email, JWT, signatures, signed URLs, PDF content, or private source path.
- Hash or otherwise pseudonymize user IDs in platform logs; authoritative audit rows may store the actual actor under protected access.
- Alert on signer 5xx, upload-to-attach conversion drops, orphan growth, RLS 403 spikes after migrations, Study pending objects without rows, duplicate mutation conflicts, and Pages smoke failures.
- Audit privileged actions append-only. A failed external deletion is recorded as delete_pending, not falsely reported complete.
- Client diagnostics expose build SHA, provider names, public knowledge/catalogue version, and correlation ID; they never expose credentials.

## 22. Interface acceptance checklist

- Every current UI call can be mapped to one documented provider method without a raw Supabase/Cloudinary fetch in render modules.
- Production provider selection fails closed and cannot choose a Local write provider.
- All list methods paginate and have deterministic order.
- Every create/state transition has idempotency and unknown-outcome recovery.
- Every authorization statement is enforced server-side and covered in the RLS/security matrix.
- Public anonymous projections cannot reveal internal ownership.
- One-level reply, context, relation, duplicate, vote, and question-state invariants survive direct REST bypass attempts.
- Edge Functions use user JWTs for caller identity; admin clients are local to the function and only after role/scope validation.
- CORS permits only enumerated origins and no secret is present in public config/artifact.
- Cloudinary upload is direct and signed after compression; deletion remains trusted.
- Study pending objects/metadata are private; approval is a validated/audited transition.
- CampusKnowledgeProvider remains bounded/local at launch.
- Admin UI is not implemented by these contracts.

## 23. Official implementation references

Verified 2026-08-28/29; recheck immediately before implementation:

- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Edge Function Auth: https://supabase.com/docs/guides/functions/auth
- Edge Function auth headers: https://supabase.com/docs/guides/functions/auth-headers
- Edge Function CORS: https://supabase.com/docs/guides/functions/cors
- Edge Function limits: https://supabase.com/docs/guides/functions/limits
- Auth password/reset flow: https://supabase.com/docs/guides/auth/passwords
- Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Storage RLS: https://supabase.com/docs/guides/storage/security/access-control
- Storage standard/resumable uploads: https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Cloudinary client-side signed upload: https://cloudinary.com/documentation/client_side_uploading
- Cloudinary signature rules: https://cloudinary.com/documentation/authentication_signatures
- Cloudinary Upload API: https://cloudinary.com/documentation/image_upload_api_reference
- Cloudinary deletion: https://cloudinary.com/documentation/delete_assets
