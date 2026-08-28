/**
 * Study Notes V2 — Upload / Moderation storage (STUDY-V2-007/008).
 *
 * This app has no backend (see CLAUDE.md: no bundler, no server, static
 * GitHub Pages deploy) — confirmed again explicitly before writing this file
 * (see study v2/checkpoints/STUDY-V2-007/PRE_STATE.md). So this is the
 * "Competition Demo Upload Storage": real, persistent, per-browser storage
 * via IndexedDB, NOT a fake success message and NOT LocalStorage/base64 for
 * the PDF bytes themselves (LocalStorage has a ~5-10MB total quota and is
 * synchronous/string-only — wrong tool for multi-MB binary files).
 *
 * Mirrors services/map-note-service.js's provider-swap shape on purpose
 * (`ready()/list()/subscribe()/useProvider()`, a `provider` object satisfying
 * a REQUIRED_METHODS contract) so a future real backend (Supabase Storage,
 * S3, Cloudinary) can be dropped in via `StudyUploadService.useProvider(...)`
 * without any UI caller (app-study.js, a future app-study-admin.js) needing
 * to change — nothing outside this file ever touches `indexedDB` directly.
 *
 * Two IndexedDB object stores in one database (`echowall-study-uploads-v1`):
 *   "submissions" (keyPath "id")   — StudySubmission metadata records
 *   "files"       (key = fileId)   — raw File/Blob bytes, keyed by the
 *                                     sha256:<hex> content hash (so the same
 *                                     file uploaded twice only ever stores
 *                                     the blob once)
 *
 * Public surface: window.StudyUploadService — see the Object.freeze block at
 * the bottom for the full method list.
 *
 * INVARIANT (see CODE_AUDIT.md): a submission is "pending" the instant it's
 * created (moderationStatus:"pending", verificationStatus:"unverified") and
 * MUST NEVER be auto-published. The only way a submission's resource-shaped
 * form is exposed to StudyResourceService (services/study-resource-service.js
 * -> getManifest()) is getApprovedResourcesSync(), which filters strictly to
 * moderationStatus === "approved". Do not add any other path that surfaces a
 * pending/rejected submission to a public query.
 */
(function () {
  'use strict';

  const DB_NAME = 'echowall-study-uploads-v1';
  const DB_VERSION = 1;
  const FILES_STORE = 'files';
  const SUBMISSIONS_STORE = 'submissions';
  const REQUIRED_METHODS = ['ready', 'list', 'create', 'update', 'getFileBlob', 'subscribe'];

  // Derived from the real 377-file Competition Demo File Set
  // (assets/study-files/) measured before writing this file: min 26KB,
  // median 0.43MB, P95 3.01MB, max 45.73MB. 60MB gives real headroom above
  // the largest real file actually seen, not an arbitrary round number.
  const MAX_FILE_BYTES = 60 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = new Set(['pdf']); // spec section 15: PDF-first this version
  const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

  const listeners = new Set();
  let provider = createLocalIndexedDbSubmissionProvider();
  let providerUnsubscribe = null;
  let readyPromise = null;
  let cache = []; // sync-readable mirror of provider.list(), refreshed after every read/write

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function asError(error, fallback) {
    return error instanceof Error ? error : new Error(fallback);
  }

  function validateProvider(candidate) {
    if (!candidate || typeof candidate !== 'object') throw new Error('Study Upload provider must be an object.');
    const missing = REQUIRED_METHODS.filter(method => typeof candidate[method] !== 'function');
    if (missing.length) throw new Error('Study Upload provider is missing: ' + missing.join(', ') + '.');
    return candidate;
  }

  function notify(change) {
    const snapshot = clone(change || { type: 'change' });
    listeners.forEach(listener => {
      try { listener(clone(snapshot)); }
      catch { console.warn('A Study Upload listener failed.'); }
    });
  }

  async function refreshCache() {
    cache = await provider.list();
    return cache;
  }

  function bindProvider(nextProvider) {
    providerUnsubscribe?.();
    providerUnsubscribe = nextProvider.subscribe(() => {
      void refreshCache().then(() => notify({ type: 'change' }));
    });
  }

  async function ready() {
    if (!readyPromise) {
      readyPromise = Promise.resolve()
        .then(() => validateProvider(provider).ready())
        .then(() => refreshCache())
        .then(() => { bindProvider(provider); return true; })
        .catch(error => { readyPromise = null; throw asError(error, 'Study Upload provider failed to initialize.'); });
    }
    return readyPromise;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('Study Upload subscriber must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getProviderName() {
    return String(provider.name || provider.constructor?.name || 'StudyUploadProvider');
  }

  async function useProvider(candidate) {
    const nextProvider = validateProvider(candidate);
    if (nextProvider === provider) return getProviderName();
    await nextProvider.ready();
    const previousProvider = provider;
    const previousUnsubscribe = providerUnsubscribe;
    provider = nextProvider;
    readyPromise = null;
    await ready();
    previousUnsubscribe?.();
    previousProvider.destroy?.();
    notify({ type: 'provider', provider: getProviderName() });
    return getProviderName();
  }

  // --- IndexedDB provider ---------------------------------------------

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB is not available in this browser.')); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(SUBMISSIONS_STORE)) database.createObjectStore(SUBMISSIONS_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(FILES_STORE)) database.createObjectStore(FILES_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(asError(request.error, 'Could not open the Study Upload database.'));
    });
  }

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(asError(request.error, 'Study Upload storage request failed.'));
    });
  }

  function createLocalIndexedDbSubmissionProvider() {
    const providerListeners = new Set();
    let dbPromise = null;

    function emit(change) {
      const snapshot = clone(change || { type: 'change' });
      providerListeners.forEach(listener => {
        try { listener(clone(snapshot)); }
        catch { console.warn('A Study Upload provider listener failed.'); }
      });
    }

    function db() {
      if (!dbPromise) dbPromise = openDatabase();
      return dbPromise;
    }

    async function withStore(storeName, mode, fn) {
      const database = await db();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result;
        Promise.resolve(fn(store)).then(value => { result = value; }).catch(error => {
          try { tx.abort(); } catch { /* transaction may already be finishing */ }
          reject(error);
        });
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(asError(tx.error, 'Study Upload storage transaction failed.'));
        tx.onabort = () => reject(asError(tx.error, 'Study Upload storage transaction aborted.'));
      });
    }

    return {
      name: 'local-indexeddb-study-uploads',
      async ready() { await db(); return true; },
      async list() {
        const records = await withStore(SUBMISSIONS_STORE, 'readonly', store => reqToPromise(store.getAll()));
        return clone(records || []);
      },
      // Stores the blob keyed by content hash (fileId) — a second submission
      // with the identical hash never duplicates the stored bytes. Blob write
      // and metadata write are two sequential transactions (IndexedDB does
      // not support a single transaction spanning stores opened separately
      // like this cleanly across the await boundary) — if the metadata write
      // fails after the blob write succeeded, the orphaned blob is harmless
      // (content-addressed, no submission references it) and is left in
      // place rather than risking a delete race with another concurrent
      // submission that hashes to the same file.
      async create(record, blob) {
        await withStore(FILES_STORE, 'readwrite', async store => {
          const existing = await reqToPromise(store.get(record.fileId));
          if (!existing) store.put(blob, record.fileId);
        });
        await withStore(SUBMISSIONS_STORE, 'readwrite', store => { store.put(record); });
        emit({ type: 'create', id: record.id });
        return clone(record);
      },
      async update(id, patch) {
        const updated = await withStore(SUBMISSIONS_STORE, 'readwrite', async store => {
          const current = await reqToPromise(store.get(id));
          if (!current) throw new Error('Study submission was not found.');
          const merged = { ...current, ...patch, updatedAt: new Date().toISOString() };
          store.put(merged);
          return merged;
        });
        emit({ type: 'update', id });
        return clone(updated);
      },
      async getFileBlob(fileId) {
        if (!fileId) return null;
        const blob = await withStore(FILES_STORE, 'readonly', store => reqToPromise(store.get(fileId)));
        return blob || null;
      },
      subscribe(listener) {
        if (typeof listener !== 'function') throw new Error('Study Upload provider subscriber must be a function.');
        providerListeners.add(listener);
        return () => providerListeners.delete(listener);
      },
      destroy() { providerListeners.clear(); },
    };
  }

  // --- Sync cache accessors (for rendering — IndexedDB itself is async) --

  function getCachedSubmissions() {
    return clone(cache);
  }

  function getSubmissionById(id) {
    return cache.find(item => item.id === id) || null;
  }

  // The ONLY bridge from submissions into the public resource pipeline —
  // approved-only, by construction. See services/study-resource-service.js
  // getManifest(), which concatenates this onto the built-in manifest.
  function getApprovedResourcesSync() {
    return cache.filter(item => item.moderationStatus === 'approved').map(submissionToResource);
  }

  function getModerationQueue(filters = {}) {
    const { moderationStatus = 'pending', subjectCode, duplicateStatus } = filters;
    return cache.filter(item => {
      if (moderationStatus && moderationStatus !== 'all' && item.moderationStatus !== moderationStatus) return false;
      if (subjectCode && item.subjectCode !== subjectCode) return false;
      if (duplicateStatus && duplicateStatus !== 'all' && item.duplicateStatus !== duplicateStatus) return false;
      return true;
    }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function submissionToResource(record) {
    return {
      id: record.id,
      title: record.title,
      jurusan: record.jurusan,
      semester: record.semester,
      subjectCode: record.subjectCode,
      resourceType: record.resourceType,
      resourceSubtype: record.resourceSubtype || null,
      topic: record.topic || null,
      yearStart: record.yearStart ?? null,
      yearEnd: record.yearEnd ?? null,
      examSessionLabel: record.examSessionLabel || null,
      sourceCollege: record.sourceCollege || null,
      sourceType: record.sourceType || 'unknown',
      contributorUserId: record.contributorUserId || null,
      fileId: record.fileId,
      language: null,
      description: record.description || null,
      relatedResourceId: record.relatedResourceId || null,
      resourceGroupId: record.resourceGroupId || null,
      moderationStatus: record.moderationStatus,
      verificationStatus: record.verificationStatus,
      // Approved submissions are treated exactly like a built-in
      // "auto_parsed" resource for publishability purposes — see
      // StudyResourceService.isPublishable(). manual_review has no meaning
      // for user uploads (a human already reviewed it via moderation).
      reviewStatus: 'auto_parsed',
      parseWarnings: [],
      sourceBatch: 'user_upload',
      sourceRelativePath: null,
      isDuplicate: false,
      duplicateOfResourceId: record.duplicateOfResourceId || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      // Never a real static path — resolved at open-time via
      // StudyUploadService.getFileBlobBySubmissionId(). Encoded with a fake
      // extension suffix so StudyResourceService.getResourceFileType()/
      // isResourceFilePdf() (which both just read the fileUrl's extension)
      // keep working completely unchanged for uploaded files too.
      fileUrl: `indexeddb://${record.id}.${record.fileExt || 'pdf'}`,
      demoAvailable: true,
    };
  }

  // --- Validation ---------------------------------------------------

  function fileExtension(fileName) {
    const name = String(fileName || '');
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  async function readPdfSignature(file) {
    try {
      const head = await file.slice(0, PDF_SIGNATURE.length).arrayBuffer();
      const bytes = new Uint8Array(head);
      return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
    } catch {
      return false;
    }
  }

  // Returns { ok, errors[] } — never throws; callers decide how to surface
  // errors (this stage's UI shows them inline, never a silent block).
  async function validateFile(file) {
    const errors = [];
    if (!file) { errors.push('study.upload.error.fileRequired'); return { ok: false, errors }; }
    if (!Number.isFinite(file.size) || file.size <= 0) errors.push('study.upload.error.fileEmpty');
    if (file.size > MAX_FILE_BYTES) errors.push('study.upload.error.fileTooLarge');
    const extension = fileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(extension)) errors.push('study.upload.error.fileType');
    if (file.type && file.type !== 'application/pdf' && extension === 'pdf') {
      // MIME type is browser-reported and not authoritative on its own —
      // combined with the signature check below, not used alone to reject.
    }
    if (extension === 'pdf' && file.size > 0) {
      const hasSignature = await readPdfSignature(file);
      if (!hasSignature) errors.push('study.upload.error.filePdfSignature');
    }
    return { ok: errors.length === 0, errors };
  }

  async function computeFileHash(file) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return `sha256:${hex}`;
  }

  function normalizeTitleForCompare(title) {
    return String(title || '').toLowerCase().replace(/[^a-z0-9一-鿿]+/g, ' ').trim();
  }

  function titleSimilarity(a, b) {
    const normA = normalizeTitleForCompare(a);
    const normB = normalizeTitleForCompare(b);
    if (!normA || !normB) return 0;
    if (normA === normB) return 1;
    const tokensA = new Set(normA.split(' ').filter(Boolean));
    const tokensB = new Set(normB.split(' ').filter(Boolean));
    if (!tokensA.size || !tokensB.size) return 0;
    let overlap = 0;
    tokensA.forEach(token => { if (tokensB.has(token)) overlap += 1; });
    return overlap / Math.max(tokensA.size, tokensB.size);
  }

  // Duplicate scan pool: the FULL built-in manifest (not just publishable —
  // a manual_review item's file still really exists on disk/DB), plus every
  // local pending/approved submission. Per spec: rejected submissions are
  // deliberately excluded (a corrected re-upload of the same bytes must stay
  // possible after a metadata-reason rejection).
  function duplicateScanPool() {
    const builtIn = Array.isArray(window.STUDY_RESOURCE_MANIFEST) ? window.STUDY_RESOURCE_MANIFEST : [];
    const submissions = cache.filter(item => item.moderationStatus === 'pending' || item.moderationStatus === 'approved');
    return { builtIn, submissions };
  }

  function findDuplicate(sha256, metadata) {
    const { builtIn, submissions } = duplicateScanPool();
    const exactBuiltIn = builtIn.find(resource => resource.fileId === sha256);
    if (exactBuiltIn) return { exact: true, exactResource: exactBuiltIn, likely: false, likelyResource: null };
    const exactSubmission = submissions.find(item => item.fileId === sha256);
    if (exactSubmission) return { exact: true, exactResource: submissionToResource(exactSubmission), likely: false, likelyResource: null };

    const candidatePool = builtIn
      .filter(resource => resource.subjectCode === metadata.subjectCode && resource.resourceType === metadata.resourceType)
      .concat(submissions
        .filter(item => item.subjectCode === metadata.subjectCode && item.resourceType === metadata.resourceType)
        .map(submissionToResource));
    let best = null;
    let bestScore = 0;
    for (const candidate of candidatePool) {
      const sameYear = (metadata.yearStart && candidate.yearStart === metadata.yearStart)
        || (metadata.examSessionLabel && candidate.examSessionLabel === metadata.examSessionLabel);
      const score = titleSimilarity(metadata.title, candidate.title);
      if (score >= 0.6 && (sameYear || (!metadata.yearStart && !metadata.examSessionLabel)) && score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best ? { exact: false, exactResource: null, likely: true, likelyResource: best } : { exact: false, exactResource: null, likely: false, likelyResource: null };
  }

  // --- Submission lifecycle ------------------------------------------

  function requireAuthenticatedUser() {
    const user = window.AuthService?.getCurrentUser?.();
    if (!user) throw new Error('study.upload.error.signInRequired');
    return user;
  }

  // Defense in depth: app-study.js's form already validates these client-
  // side (fast feedback, no IndexedDB round-trip for an obviously-incomplete
  // form), but the service layer re-validates authoritatively — a future
  // second caller (e.g. an admin bulk-import tool) must not be able to skip
  // these by going around the UI.
  function validateMetadata(metadata) {
    const errors = [];
    if (!String(metadata?.title || '').trim()) errors.push('study.upload.error.titleRequired');
    if (!metadata?.jurusan) errors.push('study.upload.error.jurusanRequired');
    if (!metadata?.semester) errors.push('study.upload.error.semesterRequired');
    if (!metadata?.subjectCode) errors.push('study.upload.error.subjectRequired');
    if (!metadata?.resourceType) errors.push('study.upload.error.typeRequired');
    return errors;
  }

  async function getFileBlob(fileId) {
    await ready();
    return provider.getFileBlob(fileId);
  }

  async function getFileBlobBySubmissionId(submissionId) {
    const record = getSubmissionById(submissionId);
    if (!record) return null;
    return getFileBlob(record.fileId);
  }

  function newSubmissionId() {
    return `study_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function newGroupId() {
    return `grp_upload_${Math.random().toString(36).slice(2, 10)}`;
  }

  // Links two SUBMISSIONS bidirectionally when a fresh upload names an
  // already-known submission as its related resource — e.g. spec's own
  // worked flow "upload a Question, then upload its Scheme and link back."
  // A built-in manifest resource can never be mutated (Object.freeze +
  // explicit invariant in study-resource-service.js) so linking TO a
  // built-in resource stays one-directional: the new submission points at
  // it, but the frozen built-in item's own relatedResourceId is untouched.
  // This is a documented, accepted limitation — see REPORT_STUDY-V2-007.md.
  async function linkRelatedIfSubmission(newRecord) {
    if (!newRecord.relatedResourceId) return newRecord;
    const target = getSubmissionById(newRecord.relatedResourceId);
    if (!target) return newRecord; // built-in resource or unknown id — nothing to update
    const groupId = target.resourceGroupId || newGroupId();
    if (!target.relatedResourceId) {
      await provider.update(target.id, { relatedResourceId: newRecord.id, resourceGroupId: groupId });
      await refreshCache();
    }
    return { ...newRecord, resourceGroupId: groupId };
  }

  // metadata: see the StudySubmission field list in the module comment.
  // Throws (never silently no-ops) on: not signed in, permission checkbox
  // unchecked, file validation failure, or an exact-hash duplicate.
  async function createSubmission(metadata, file) {
    const user = requireAuthenticatedUser();
    if (!metadata.permissionConfirmed) throw new Error('study.upload.error.permissionRequired');
    const metadataErrors = validateMetadata(metadata);
    if (metadataErrors.length) {
      const error = new Error('study.upload.error.fileInvalid');
      error.fieldErrors = metadataErrors;
      throw error;
    }
    const fileCheck = await validateFile(file);
    if (!fileCheck.ok) {
      const error = new Error('study.upload.error.fileInvalid');
      error.fieldErrors = fileCheck.errors;
      throw error;
    }
    await ready();
    const sha256 = await computeFileHash(file);
    const duplicate = findDuplicate(sha256, metadata);
    if (duplicate.exact) {
      const error = new Error('study.upload.error.exactDuplicate');
      error.code = 'EXACT_DUPLICATE';
      error.duplicateResource = duplicate.exactResource;
      throw error;
    }

    const now = new Date().toISOString();
    let record = {
      id: newSubmissionId(),
      title: String(metadata.title || '').trim(),
      jurusan: metadata.jurusan,
      semester: Number(metadata.semester),
      subjectCode: metadata.subjectCode,
      resourceType: metadata.resourceType,
      resourceSubtype: metadata.resourceSubtype || null,
      topic: metadata.topic ? String(metadata.topic).trim() : null,
      yearStart: metadata.yearStart != null && metadata.yearStart !== '' ? Number(metadata.yearStart) : null,
      yearEnd: metadata.yearEnd != null && metadata.yearEnd !== '' ? Number(metadata.yearEnd) : null,
      examSessionLabel: metadata.examSessionLabel ? String(metadata.examSessionLabel).trim() : null,
      sourceCollege: metadata.sourceCollege ? String(metadata.sourceCollege).trim() : null,
      sourceType: metadata.sourceType || 'unknown',
      contributorUserId: user.id,
      fileId: sha256,
      fileName: file.name,
      fileType: fileExtension(file.name),
      fileExt: fileExtension(file.name),
      fileSize: file.size,
      description: metadata.description ? String(metadata.description).trim() : null,
      relatedResourceId: metadata.relatedResourceId || null,
      resourceGroupId: null,
      moderationStatus: 'pending',
      verificationStatus: 'unverified',
      duplicateStatus: duplicate.likely ? 'likely' : 'none',
      duplicateOfResourceId: duplicate.likely ? duplicate.likelyResource.id : null,
      permissionConfirmed: true,
      rejectionReason: null,
      auditLog: [],
      createdAt: now,
      updatedAt: now,
    };
    record = await linkRelatedIfSubmission(record);
    const saved = await provider.create(record, file);
    await refreshCache();
    notify({ type: 'create', id: saved.id });
    // ADMIN-V2-002: mirror into the unified moderation queue, best-effort.
    // StudyUploadService's own moderationStatus/verificationStatus fields
    // remain the real source of truth for Study -- this is an additional
    // index, not a replacement, so a missing/failing ModerationService must
    // never block a real upload.
    // ADMIN-V2-008: evaluate BEFORE creating the ModerationService mirror
    // (not after) so a flagged submission gets exactly ONE ModerationItem,
    // correctly source:"auto_flag" (so it counts in the Dashboard's
    // "Flagged" stat -- source==="auto_flag" -- see app-admin-dashboard.js's
    // adminDashboardOverviewCounts) -- calling this after the mirror already
    // exists would have meant every flag silently merged into the
    // pre-existing source:"submission" item instead, which would have made
    // Study auto-flags invisible to that stat. Best-effort either way: a
    // failed evaluation must never block the real upload above.
    let studyEvaluation = null;
    try {
      studyEvaluation = window.ModerationAssistService?.evaluateStudySubmission?.(saved) || null;
    } catch (error) {
      console.error('ModerationAssistService evaluation failed (upload still saved):', error);
    }
    try {
      window.ModerationService?.createModerationItem?.({
        contentType: 'study_resource',
        contentId: saved.id,
        source: studyEvaluation?.flagged ? 'auto_flag' : 'submission',
        status: 'pending',
        riskScore: studyEvaluation?.flagged ? studyEvaluation.riskScore : 0,
        reason: studyEvaluation?.flagged ? studyEvaluation.reason : null,
        createdBy: saved.contributorUserId,
      });
    } catch { /* best-effort mirror only */ }
    return { record: saved, duplicateWarning: duplicate.likely ? duplicate.likelyResource : null };
  }

  const EDITABLE_MODERATION_FIELDS = [
    'title', 'jurusan', 'semester', 'subjectCode', 'resourceType', 'resourceSubtype', 'topic',
    'yearStart', 'yearEnd', 'examSessionLabel', 'sourceCollege', 'sourceType', 'description', 'relatedResourceId',
  ];

  function sanitizeModerationPatch(patch = {}) {
    const clean = {};
    for (const key of EDITABLE_MODERATION_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) clean[key] = patch[key];
    }
    if (Object.prototype.hasOwnProperty.call(clean, 'semester')) clean.semester = Number(clean.semester);
    if (Object.prototype.hasOwnProperty.call(clean, 'yearStart') && clean.yearStart !== null && clean.yearStart !== '') clean.yearStart = Number(clean.yearStart);
    if (Object.prototype.hasOwnProperty.call(clean, 'yearEnd') && clean.yearEnd !== null && clean.yearEnd !== '') clean.yearEnd = Number(clean.yearEnd);
    return clean;
  }

  // ADMIN-V2-001: the real moderator gate is AdminPermissionService's
  // Role/Scope contract (STUDY_RESOURCE_MODERATE), not the legacy binary
  // AuthService.isCurrentUserAdmin() — a SUPER_ADMIN, a legacy prototype
  // admin, or a real STUDY_MODERATOR RoleAssignment all pass; a Global
  // Moderator or College Admin with no Study permission does not.
  function requireModerator() {
    const user = window.AuthService?.getCurrentUser?.();
    const allowed = Boolean(user) && Boolean(window.AdminPermissionService?.canModerateStudy?.(user));
    if (!allowed) throw new Error('study.upload.error.moderatorRequired');
    return user;
  }

  function pushAudit(record, entry) {
    const auditLog = Array.isArray(record.auditLog) ? record.auditLog.slice() : [];
    auditLog.push(entry);
    return auditLog;
  }

  // ADMIN-V2-002/FINAL-CORRECTION: locates a mirrored ModerationItem for
  // this submission, if one exists. A lookup only, never itself a mutation
  // -- still safe to treat as best-effort (a missing ModerationService, or
  // a submission that predates ADMIN-V2-002 and has no mirror yet, simply
  // means "no mirror", not an audit failure).
  function findMirroredModerationItem(contentId, moderator) {
    try {
      const items = window.ModerationService?.listModerationItems?.({ contentType: 'study_resource' }, moderator) || [];
      return items.find(entry => entry.contentId === String(contentId)) || null;
    } catch {
      return null;
    }
  }

  // ADMIN-V2-004/FINAL-CORRECTION: single, REQUIRED audit-logging entry
  // point for every Study moderation action. Called directly for `verify`
  // (no ModerationService status equivalent exists) and as the fallback for
  // approve/reject when no mirrored ModerationItem exists (submissions that
  // predate ADMIN-V2-002). No longer best-effort: this now THROWS if
  // AdminAuditService is missing or itself fails, instead of swallowing the
  // error -- callers must invoke this (or the ModerationService mirror path
  // in findMirroredModerationItem's caller) BEFORE committing their real
  // provider.update mutation, so a broken audit trail blocks the action.
  function logStudyAuditAction(contentId, action, moderator, beforeSnapshot, afterSnapshot, reason) {
    if (!window.AdminAuditService || typeof window.AdminAuditService.createAuditAction !== 'function') {
      throw new Error('AdminAuditService is required to perform this Study action.');
    }
    window.AdminAuditService.createAuditAction({
      actorUserId: moderator?.id,
      actorEmail: moderator?.email,
      action,
      targetType: 'study_resource',
      targetId: contentId,
      scopeType: 'study',
      scopeId: null,
      beforeSnapshot,
      afterSnapshot,
      reason: reason || null,
    }, moderator);
  }

  // ADMIN-V2-006 — safe reconciliation between StudyUploadService's own
  // moderationStatus (the real source of truth — see this file's header
  // INVARIANT comment) and the best-effort ModerationService mirror.
  // Drift is possible because reconciliation itself here remains
  // best-effort per-submission (see the try/catch below) even though
  // ADMIN-V2-FINAL-CORRECTION made the live approve/reject/verify audit
  // path required -- this function is the explicit, safe repair path spec
  // section 19 asks for,
  // NOT a replacement for that best-effort design and NOT a rewrite of
  // either storage. Idempotent: calling it repeatedly when nothing has
  // drifted is a no-op. Never touches IndexedDB/StudyUploadService's own
  // storage — only ever creates/updates the ModerationService mirror to
  // match what StudyUploadService already, authoritatively, says.
  function reconcileStudyModerationState() {
    const moderator = requireModerator();
    const ms = window.ModerationService;
    if (!ms) return { checked: 0, created: 0, updated: 0, skipped: 0 };
    const submissions = getCachedSubmissions();
    const mirroredItems = ms.listModerationItems({ contentType: 'study_resource' }, moderator);
    const mirrorByContentId = new Map(mirroredItems.map(item => [item.contentId, item]));
    let created = 0;
    let updated = 0;
    let skipped = 0;
    submissions.forEach(submission => {
      try {
        const existing = mirrorByContentId.get(String(submission.id));
        if (!existing) {
          ms.createModerationItem({
            contentType: 'study_resource',
            contentId: submission.id,
            source: 'submission',
            status: submission.moderationStatus,
            createdBy: submission.contributorUserId,
            reason: submission.moderationStatus === 'rejected' ? (submission.rejectionReason || null) : null,
          });
          created += 1;
          return;
        }
        if (existing.status !== submission.moderationStatus) {
          const reason = submission.moderationStatus === 'rejected' ? (submission.rejectionReason || 'Reconciled') : undefined;
          ms.updateModerationStatus(existing.id, submission.moderationStatus, moderator, reason ? { reason } : {});
          updated += 1;
        }
      } catch {
        // Best-effort, matching every other mirror operation in this file --
        // one unreconcilable submission (e.g. an invalid status transition
        // ModerationItem's state machine genuinely can't reach directly)
        // must never block reconciling the rest.
        skipped += 1;
      }
    });
    return { checked: submissions.length, created, updated, skipped };
  }

  async function approveSubmission(id, metadataPatch = {}) {
    const moderator = requireModerator();
    const current = getSubmissionById(id);
    if (!current) throw new Error('study.upload.error.notFound');
    if (current.duplicateStatus === 'exact') throw new Error('study.upload.error.cannotApproveExactDuplicate');
    const patch = sanitizeModerationPatch(metadataPatch);
    const editedFields = Object.keys(patch);
    // ADMIN-V2-FINAL-CORRECTION: audit-first -- ensure the AuditAction (via
    // the ModerationService mirror if one exists, else directly) is
    // persisted BEFORE provider.update below commits the real state change.
    // Neither path swallows failures anymore; this function does not catch
    // either, so a broken/missing AdminAuditService blocks the approval.
    const mirror = findMirroredModerationItem(id, moderator);
    if (mirror) {
      window.ModerationService.updateModerationStatus(mirror.id, 'approved', moderator, {});
    } else {
      logStudyAuditAction(id, 'approve', moderator,
        { moderationStatus: current.moderationStatus },
        { moderationStatus: 'approved', editedFields },
        null);
    }
    const auditEntry = { action: 'approve', moderatorUserId: moderator.id, at: new Date().toISOString(), editedFields };
    const updated = await provider.update(id, {
      ...patch,
      moderationStatus: 'approved',
      rejectionReason: null,
      auditLog: pushAudit(current, auditEntry),
    });
    await refreshCache();
    notify({ type: 'moderate', id, action: 'approve' });
    return updated;
  }

  async function rejectSubmission(id, reason) {
    const moderator = requireModerator();
    const current = getSubmissionById(id);
    if (!current) throw new Error('study.upload.error.notFound');
    const cleanReason = String(reason || '').trim();
    if (!cleanReason) throw new Error('study.upload.error.rejectReasonRequired');
    // ADMIN-V2-FINAL-CORRECTION: audit-first -- see approveSubmission's
    // identical comment above.
    const mirror = findMirroredModerationItem(id, moderator);
    if (mirror) {
      window.ModerationService.updateModerationStatus(mirror.id, 'rejected', moderator, { reason: cleanReason });
    } else {
      logStudyAuditAction(id, 'reject', moderator,
        { moderationStatus: current.moderationStatus },
        { moderationStatus: 'rejected' },
        cleanReason);
    }
    const auditEntry = { action: 'reject', moderatorUserId: moderator.id, at: new Date().toISOString(), reason: cleanReason };
    const updated = await provider.update(id, {
      moderationStatus: 'rejected',
      rejectionReason: cleanReason,
      auditLog: pushAudit(current, auditEntry),
    });
    await refreshCache();
    notify({ type: 'moderate', id, action: 'reject' });
    return updated;
  }

  const VERIFICATION_STATUSES = new Set(['unverified', 'verified_source', 'verified_file']);

  async function setVerification(id, verificationStatus) {
    const moderator = requireModerator();
    if (!VERIFICATION_STATUSES.has(verificationStatus)) throw new Error('study.upload.error.invalidVerification');
    const current = getSubmissionById(id);
    if (!current) throw new Error('study.upload.error.notFound');
    // ADMIN-V2-FINAL-CORRECTION: audit-first -- no ModerationService status
    // equivalent exists for verification, so this always goes through
    // logStudyAuditAction directly; it now throws (not best-effort) if
    // AdminAuditService is missing/failing, and this function does not
    // catch, so provider.update below never runs on audit failure.
    logStudyAuditAction(id, 'verify', moderator,
      { verificationStatus: current.verificationStatus },
      { verificationStatus },
      null);
    const auditEntry = { action: 'verify', moderatorUserId: moderator.id, at: new Date().toISOString(), to: verificationStatus };
    const updated = await provider.update(id, {
      verificationStatus,
      auditLog: pushAudit(current, auditEntry),
    });
    await refreshCache();
    notify({ type: 'moderate', id, action: 'verify' });
    return updated;
  }

  window.StudyUploadService = Object.freeze({
    ready,
    subscribe,
    getProviderName,
    useProvider,
    getCachedSubmissions,
    getSubmissionById,
    getApprovedResourcesSync,
    getModerationQueue,
    submissionToResource,
    validateFile,
    computeFileHash,
    findDuplicate,
    createSubmission,
    approveSubmission,
    rejectSubmission,
    setVerification,
    reconcileStudyModerationState,
    getFileBlob,
    getFileBlobBySubmissionId,
    MAX_FILE_BYTES,
  });

  window.LocalIndexedDbStudySubmissionProvider = { create: createLocalIndexedDbSubmissionProvider };
})();
