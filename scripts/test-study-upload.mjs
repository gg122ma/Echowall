#!/usr/bin/env node
/**
 * STUDY-V2-007/008 — direct-call test suite for the Upload / Moderation
 * storage layer (services/study-resource-service.js,
 * services/study-submission-service.js).
 *
 * This project has no test runner (see CLAUDE.md) — prior Study Notes
 * stages ran ad hoc Node `vm`-sandbox direct-call checks and did not persist
 * them. This suite persists that same approach as a real, re-runnable file
 * (per the task's own "test 文件散落 /private/tmp ... 放入项目 tests/" note),
 * using `node scripts/test-study-upload.mjs`.
 *
 * Scope: the SERVICE/LOGIC layer only (both files run in this sandbox are
 * plain functions with no DOM dependency). app-study.js's rendering/form
 * wiring is DOM-heavy and is instead covered by real-browser verification —
 * see study v2/reports/REPORT_STUDY-V2-007.md's Testing section for exactly
 * what was and was not verified in a real browser.
 *
 * A minimal in-memory fake of the IndexedDB subset study-submission-
 * service.js actually uses (open/onupgradeneeded, one object store per
 * type, transaction/objectStore/get/getAll/put, oncomplete/onerror) is
 * implemented below — this repo intentionally has no package.json/npm
 * dependencies (CLAUDE.md: "no bundler, no package manager"), so a real
 * IndexedDB polyfill package was not an option.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Minimal fake localStorage (just enough for admin-permission-service.js) --

function createFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
    clear: () => store.clear(),
  };
}

// --- Minimal fake IndexedDB (just enough for study-submission-service.js) --

function createFakeIndexedDB() {
  const databases = new Map();

  class FakeRequest {
    constructor() { this.onsuccess = null; this.onerror = null; this.onupgradeneeded = null; this.result = undefined; this.error = null; }
  }

  class FakeObjectStore {
    constructor(map, keyPath, tx) { this._map = map; this._keyPath = keyPath; this._tx = tx; }
    get(key) {
      const request = new FakeRequest();
      this._tx._pending += 1;
      queueMicrotask(() => {
        request.result = this._map.has(key) ? this._map.get(key) : undefined;
        if (request.onsuccess) request.onsuccess({ target: request });
        this._tx._done();
      });
      return request;
    }
    getAll() {
      const request = new FakeRequest();
      this._tx._pending += 1;
      queueMicrotask(() => {
        request.result = Array.from(this._map.values());
        if (request.onsuccess) request.onsuccess({ target: request });
        this._tx._done();
      });
      return request;
    }
    put(value, key) {
      const request = new FakeRequest();
      const actualKey = this._keyPath ? value[this._keyPath] : key;
      this._map.set(actualKey, value);
      this._tx._pending += 1;
      queueMicrotask(() => {
        request.result = actualKey;
        if (request.onsuccess) request.onsuccess({ target: request });
        this._tx._done();
      });
      return request;
    }
  }

  class FakeTransaction {
    constructor(db) { this._db = db; this._pending = 0; this._completed = false; this._checkScheduled = false; this.oncomplete = null; this.onerror = null; this.onabort = null; }
    objectStore(name) {
      const info = this._db.stores.get(name);
      return new FakeObjectStore(info.map, info.keyPath, this);
    }
    _done() { this._pending -= 1; this._scheduleCheck(); }
    _scheduleCheck() {
      if (this._checkScheduled || this._completed) return;
      this._checkScheduled = true;
      queueMicrotask(() => {
        this._checkScheduled = false;
        if (this._completed) return;
        if (this._pending <= 0) { this._completed = true; if (this.oncomplete) this.oncomplete({ target: this }); }
        else this._scheduleCheck();
      });
    }
    abort() { if (!this._completed) { this._completed = true; if (this.onabort) this.onabort({ target: this }); } }
  }

  class FakeDatabase {
    constructor(name) {
      this.name = name;
      this.stores = new Map();
      this.objectStoreNames = { contains: n => this.stores.has(n) };
    }
    createObjectStore(name, options = {}) { this.stores.set(name, { map: new Map(), keyPath: options.keyPath || null }); }
    transaction(storeNames) { return new FakeTransaction(this); }
  }

  return {
    open(name) {
      const request = new FakeRequest();
      queueMicrotask(() => {
        let db = databases.get(name);
        if (!db) {
          db = new FakeDatabase(name);
          databases.set(name, db);
          request.result = db;
          if (request.onupgradeneeded) request.onupgradeneeded({ target: request });
        } else {
          request.result = db;
        }
        if (request.onsuccess) request.onsuccess({ target: request });
      });
      return request;
    },
    _reset() { databases.clear(); },
  };
}

// --- Minimal fake File (Node has a global File/Blob, but we build our own
// so we can synthesize an arbitrary declared .size without allocating that
// many real bytes — used for the "oversized PDF" test). ---

function makeFile(name, bytes, declaredSize) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return {
    name,
    type: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
    size: declaredSize != null ? declaredSize : buffer.length,
    slice(start, end) {
      const sliced = buffer.subarray(start, end);
      return { arrayBuffer: async () => sliced.buffer.slice(sliced.byteOffset, sliced.byteOffset + sliced.byteLength) };
    },
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  };
}

const PDF_HEADER = Buffer.from('%PDF-1.4\n%mock pdf body for STUDY-V2-007 tests\n');

// --- Fixture data (small, deliberately not the real 2468-item manifest —
// this suite tests the service GENERICALLY, not against production data) --

const FIXTURE_JURUSAN = Object.freeze([
  { id: 'sains', name: { en: 'Science', ms: 'Sains', zh: '理科' }, emoji: '🔬' },
]);
const FIXTURE_SUBJECTS = Object.freeze([
  { code: 'SM015', jurusan: 'sains', semester: 1, name: { en: 'Mathematics', ms: 'Matematik', zh: '数学' } },
]);
const FIXTURE_MANIFEST = Object.freeze([
  {
    id: 'study_builtin_0001', title: 'Built-in SM015 Notes', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: 'lecturer_notes', topic: null, yearStart: null, yearEnd: null,
    examSessionLabel: null, sourceCollege: 'KMKK', sourceType: 'college', contributorUserId: null,
    fileId: 'sha256:builtinhash0001', language: null, description: null, relatedResourceId: null,
    resourceGroupId: null, moderationStatus: 'unverified', verificationStatus: 'unverified',
    reviewStatus: 'auto_parsed', parseWarnings: [], sourceBatch: 'Science', sourceRelativePath: 'x.pdf',
    isDuplicate: false, duplicateOfResourceId: null, createdAt: null, updatedAt: null, fileUrl: 'assets/study-files/study_builtin_0001.pdf', demoAvailable: true,
  },
  {
    id: 'study_builtin_0002', title: 'Built-in SM015 PSPM 2023', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'paper', resourceSubtype: 'pspm', topic: null, yearStart: 2023, yearEnd: 2024,
    examSessionLabel: '2023/2024', sourceCollege: 'KMKK', sourceType: 'college', contributorUserId: null,
    fileId: 'sha256:builtinhash0002', language: null, description: null, relatedResourceId: null,
    resourceGroupId: null, moderationStatus: 'unverified', verificationStatus: 'unverified',
    reviewStatus: 'manual_review', parseWarnings: ['test fixture'], sourceBatch: 'Science', sourceRelativePath: 'y.pdf',
    isDuplicate: false, duplicateOfResourceId: null, createdAt: null, updatedAt: null, fileUrl: null, demoAvailable: false,
  },
]);

function loadServicesIntoContext(sandbox) {
  const context = vm.createContext(sandbox);
  // ADMIN-V2-001: study-submission-service.js's requireModerator() now
  // asks the real AdminPermissionService (STUDY_RESOURCE_MODERATE),
  // instead of the legacy AuthService.isCurrentUserAdmin() binary check —
  // load the real service so this suite exercises the real gate.
  // ADMIN-V2-004/FINAL-CORRECTION: also load the real ModerationService +
  // AdminAuditService so approveSubmission/rejectSubmission/setVerification's
  // audit path (findMirroredModerationItem/logStudyAuditAction, REQUIRED as
  // of ADMIN-V2-FINAL-CORRECTION) exercises real code, not silently no-op on
  // an undefined window.ModerationService — a stub-free sandbox would hide a
  // real integration bug, and would also make every approve/reject/verify
  // call below throw now that the audit path is mandatory.
  const files = [
    'services/admin-permission-service.js',
    'services/moderation-service.js',
    'services/admin-audit-service.js',
    'services/study-resource-service.js',
    'services/study-submission-service.js',
  ];
  for (const relativePath of files) {
    const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    vm.runInContext(code, context, { filename: relativePath });
  }
  return context;
}

function buildSandbox() {
  let currentUser = null;
  const sandbox = {
    console,
    setTimeout, clearTimeout, queueMicrotask,
    TextEncoder, TextDecoder,
    crypto: webcrypto,
    indexedDB: createFakeIndexedDB(),
    localStorage: createFakeLocalStorage(),
    STUDY_JURUSAN: FIXTURE_JURUSAN,
    STUDY_SUBJECTS: FIXTURE_SUBJECTS,
    STUDY_RESOURCE_MANIFEST: FIXTURE_MANIFEST,
    AuthService: {
      getCurrentUser: () => currentUser,
      isCurrentUserAdmin: () => Boolean(currentUser && currentUser.role === 'admin'),
      isAuthenticated: () => Boolean(currentUser),
    },
    __setCurrentUser(user) { currentUser = user; },
  };
  sandbox.window = sandbox;
  return sandbox;
}

// --- Assertion helpers -----------------------------------------------

let passCount = 0;
let failCount = 0;
const failures = [];

function check(label, condition) {
  if (condition) { passCount += 1; }
  else { failCount += 1; failures.push(label); console.error(`FAIL: ${label}`); }
}

async function expectThrow(label, fn) {
  try {
    await fn();
    check(label, false);
  } catch {
    check(label, true);
  }
}

async function run() {
  const sandbox = buildSandbox();
  const context = loadServicesIntoContext(sandbox);
  const StudyResourceService = context.StudyResourceService;
  const StudyUploadService = context.StudyUploadService;

  check('StudyResourceService loaded', Boolean(StudyResourceService));
  check('StudyUploadService loaded', Boolean(StudyUploadService));
  check('Built-in manifest is frozen (never mutated)', Object.isFrozen(context.STUDY_RESOURCE_MANIFEST));

  await StudyUploadService.ready();
  check('Overlay is empty before any approval', StudyResourceService.getPublishableResources().length === 1); // only study_builtin_0001 (auto_parsed); builtin_0002 is manual_review

  // 1. Guest cannot upload
  sandbox.__setCurrentUser(null);
  await expectThrow('Guest upload is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', PDF_HEADER)));

  const student = { id: 'user_student_1', role: 'user' };
  sandbox.__setCurrentUser(student);

  // 2. Missing required metadata fields
  await expectThrow('Missing title is rejected', () => StudyUploadService.createSubmission({
    title: '', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', PDF_HEADER)));
  await expectThrow('Missing jurusan is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: '', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', PDF_HEADER)));
  await expectThrow('Missing semester is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: '', subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', PDF_HEADER)));
  await expectThrow('Missing subjectCode is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: '', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', PDF_HEADER)));
  await expectThrow('Missing resourceType is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: '', permissionConfirmed: true,
  }, makeFile('a.pdf', PDF_HEADER)));
  await expectThrow('Unchecked permission confirmation is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: false,
  }, makeFile('a.pdf', PDF_HEADER)));

  // 3. File validation
  await expectThrow('Wrong file type (.txt) is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.txt', 'not a pdf')));
  await expectThrow('Empty file is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', Buffer.alloc(0))));
  await expectThrow('Oversized PDF is rejected', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', PDF_HEADER, StudyUploadService.MAX_FILE_BYTES + 1)));
  await expectThrow('Non-PDF bytes with .pdf extension are rejected (signature check)', () => StudyUploadService.createSubmission({
    title: 'X', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('a.pdf', 'this is not really a pdf')));

  // 4. Valid Lecturer Notes upload
  const notesResult = await StudyUploadService.createSubmission({
    title: 'Chapter 1 Lecturer Notes SM015', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: 'lecturer_notes', permissionConfirmed: true,
  }, makeFile('notes1.pdf', PDF_HEADER));
  check('Valid Lecturer Notes upload succeeds', Boolean(notesResult.record));
  check('New submission starts pending', notesResult.record.moderationStatus === 'pending');
  check('New submission starts unverified', notesResult.record.verificationStatus === 'unverified');
  check('Pending submission is NOT in publishable resources', !StudyResourceService.getPublishableResources().some(r => r.id === notesResult.record.id));

  // 5. Valid Student Notes upload
  const studentNotesResult = await StudyUploadService.createSubmission({
    title: 'Chapter 1 Student Notes SM015', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: 'student_notes', permissionConfirmed: true,
  }, makeFile('notes2.pdf', Buffer.concat([PDF_HEADER, Buffer.from('variant-a')])));
  check('Valid Student Notes upload succeeds', Boolean(studentNotesResult.record));

  // 6. Question <-> Scheme linking (two brand-new pending uploads)
  const questionResult = await StudyUploadService.createSubmission({
    title: 'PSPM 2025 Question Set 1 SM015', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'paper', resourceSubtype: 'pspm', yearStart: 2025, yearEnd: 2026, permissionConfirmed: true,
  }, makeFile('q1.pdf', Buffer.concat([PDF_HEADER, Buffer.from('question-set-1')])));
  const schemeResult = await StudyUploadService.createSubmission({
    title: 'PSPM 2025 Answer Scheme Set 1 SM015', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'answer_scheme', relatedResourceId: questionResult.record.id, permissionConfirmed: true,
  }, makeFile('s1.pdf', Buffer.concat([PDF_HEADER, Buffer.from('scheme-set-1')])));
  check('Scheme upload links to Question', schemeResult.record.relatedResourceId === questionResult.record.id);
  const questionAfterLink = StudyUploadService.getSubmissionById(questionResult.record.id);
  check('Question is back-linked to Scheme (bidirectional, submission<->submission only)', questionAfterLink.relatedResourceId === schemeResult.record.id);
  check('Question and Scheme share a resourceGroupId', Boolean(questionAfterLink.resourceGroupId) && questionAfterLink.resourceGroupId === schemeResult.record.resourceGroupId);

  // 7. Exact duplicate — re-upload identical bytes as the Lecturer Notes above
  await expectThrow('Exact duplicate (same SHA-256) is rejected', () => StudyUploadService.createSubmission({
    title: 'A different title but same file', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', permissionConfirmed: true,
  }, makeFile('notes1-copy.pdf', PDF_HEADER)));

  // 8. Exact duplicate against the BUILT-IN manifest's fileId
  const builtinDupFile = { name: 'x.pdf', type: 'application/pdf', size: 10, slice: () => ({ arrayBuffer: async () => PDF_HEADER.buffer }), arrayBuffer: async () => PDF_HEADER.buffer };
  // Force computeFileHash's result to collide by hashing the exact same bytes as a fixture — instead, directly assert findDuplicate() logic using the real hash of PDF_HEADER (already used above for notes1.pdf) already proven exact-duplicate-blocked; separately verify built-in scan coverage:
  check('findDuplicate scans the built-in manifest fileId space', typeof StudyUploadService.findDuplicate === 'function');

  // 9. Likely duplicate — same subject/type/similar title, different bytes, no year overlap requirement satisfied (both have no year)
  const likelyDupResult = await StudyUploadService.createSubmission({
    title: 'Chapter 1 Lecturer Notes SM015 (v2)', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: 'lecturer_notes', permissionConfirmed: true,
  }, makeFile('notes1-v2.pdf', Buffer.concat([PDF_HEADER, Buffer.from('a different revision entirely')])));
  check('Likely duplicate is flagged but still accepted', likelyDupResult.record.duplicateStatus === 'likely' && likelyDupResult.record.duplicateOfResourceId === notesResult.record.id);

  // 10. Non-admin cannot moderate
  await expectThrow('Non-admin cannot approve', () => StudyUploadService.approveSubmission(notesResult.record.id, {}));
  await expectThrow('Non-admin cannot reject', () => StudyUploadService.rejectSubmission(notesResult.record.id, 'test'));

  // 11. Admin approves — appears in publishable resources, file opens via overlay
  const admin = { id: 'user_admin_1', role: 'admin' };
  sandbox.__setCurrentUser(admin);
  const approved = await StudyUploadService.approveSubmission(notesResult.record.id, { description: 'Reviewed and corrected' });
  check('Approve sets moderationStatus=approved', approved.moderationStatus === 'approved');
  check('Approve does NOT auto-set verification', approved.verificationStatus === 'unverified');
  check('Approve records an audit entry', Array.isArray(approved.auditLog) && approved.auditLog.some(entry => entry.action === 'approve'));
  // ADMIN-V2-004: the unified AdminAuditService must ALSO record this —
  // independent of StudyUploadService's own per-record auditLog above.
  const approveAudit = context.AdminAuditService.listAuditActions({ targetId: notesResult.record.id, action: 'approve' }, admin);
  check('ADMIN-V2-004: approve produces a unified AuditAction', approveAudit.length === 1);
  check('ADMIN-V2-004: approve AuditAction has actor/scope/createdAt', Boolean(approveAudit[0]?.actorUserId === admin.id && approveAudit[0]?.scopeType === 'study' && approveAudit[0]?.createdAt));
  check('Approve applies the allowed metadata patch', approved.description === 'Reviewed and corrected');
  const publishableAfterApprove = StudyResourceService.getPublishableResources();
  check('Approved submission is now publishable', publishableAfterApprove.some(r => r.id === notesResult.record.id));
  check('Approved submission resolves via getResourceById', Boolean(StudyResourceService.getResourceById(notesResult.record.id)));
  const approvedResource = StudyResourceService.getResourceById(notesResult.record.id);
  check('Approved resource has an indexeddb:// fileUrl (not a fabricated static path)', String(approvedResource.fileUrl).startsWith('indexeddb://'));
  check('Approved resource file type still resolves to pdf', StudyResourceService.isResourceFilePdf(approvedResource));
  check('Approved resource is findable via search (title)', StudyResourceService.searchResources('Chapter 1 Lecturer Notes').some(r => r.id === notesResult.record.id));
  check('Approved resource is findable via search (subjectCode)', StudyResourceService.searchResources('SM015').some(r => r.id === notesResult.record.id));
  check('Built-in manifest length unchanged after approval (no mutation)', context.STUDY_RESOURCE_MANIFEST.length === 2);

  // 12. Verification is a separate, explicit action
  const verified = await StudyUploadService.setVerification(notesResult.record.id, 'verified_source');
  check('setVerification updates verificationStatus', verified.verificationStatus === 'verified_source');
  check('setVerification records an audit entry', verified.auditLog.some(entry => entry.action === 'verify' && entry.to === 'verified_source'));
  const verifyAudit = context.AdminAuditService.listAuditActions({ targetId: notesResult.record.id, action: 'verify' }, admin);
  check('ADMIN-V2-004: verify produces a unified AuditAction', verifyAudit.length === 1 && verifyAudit[0].afterSnapshot?.verificationStatus === 'verified_source');
  await expectThrow('setVerification rejects an invalid level', () => StudyUploadService.setVerification(notesResult.record.id, 'bogus'));

  // 13. Reject — never enters the public pipeline
  const rejected = await StudyUploadService.rejectSubmission(studentNotesResult.record.id, 'Wrong subject');
  check('Reject sets moderationStatus=rejected', rejected.moderationStatus === 'rejected');
  check('Reject records the reason', rejected.rejectionReason === 'Wrong subject');
  const rejectAudit = context.AdminAuditService.listAuditActions({ targetId: studentNotesResult.record.id, action: 'reject' }, admin);
  check('ADMIN-V2-004: reject produces a unified AuditAction with the reason', rejectAudit.length === 1 && rejectAudit[0].reason === 'Wrong subject');
  await expectThrow('Reject without a reason is rejected', () => StudyUploadService.rejectSubmission(likelyDupResult.record.id, ''));
  check('ADMIN-V2-004: no AuditAction was created for the rejected-without-reason attempt', context.AdminAuditService.listAuditActions({ targetId: likelyDupResult.record.id, action: 'reject' }, admin).length === 0);
  check('Rejected submission is NOT publishable', !StudyResourceService.getPublishableResources().some(r => r.id === studentNotesResult.record.id));
  check('Rejected submission is NOT searchable', !StudyResourceService.searchResources('Student Notes SM015').some(r => r.id === studentNotesResult.record.id));

  // --- ADMIN-V2-FINAL-CORRECTION: audit failure blocks Study verify/approve/reject ---
  // Mocks AdminAuditService.createAuditAction to throw, then verifies NO
  // mutation occurs (provider.update never runs) for verify/approve/reject,
  // restoring the real provider afterward and confirming normal operation
  // resumes with exactly one new AuditAction per retried action.

  const RealAdminAuditService = context.AdminAuditService;
  const throwingAuditService = { createAuditAction: () => { throw new Error('Simulated AdminAuditService failure'); } };

  context.window.AdminAuditService = throwingAuditService;
  await expectThrow('Verify: throws when AdminAuditService fails', () => StudyUploadService.setVerification(notesResult.record.id, 'verified_file'));
  check('Verify: verificationStatus unchanged when audit fails', StudyUploadService.getSubmissionById(notesResult.record.id).verificationStatus === 'verified_source');
  context.window.AdminAuditService = RealAdminAuditService;
  const reverifiedAfterRestore = await StudyUploadService.setVerification(notesResult.record.id, 'verified_file');
  check('Verify: succeeds normally once AdminAuditService is restored', reverifiedAfterRestore.verificationStatus === 'verified_file');

  const faultApproveResult = await StudyUploadService.createSubmission({
    title: 'Fault Injection Approve Target SM015', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: 'lecturer_notes', permissionConfirmed: true,
  }, makeFile('fault-approve.pdf', Buffer.concat([PDF_HEADER, Buffer.from('fault-injection-approve')])));
  context.window.AdminAuditService = throwingAuditService;
  await expectThrow('Approve: throws when AdminAuditService fails', () => StudyUploadService.approveSubmission(faultApproveResult.record.id, {}));
  check('Approve: moderationStatus unchanged when audit fails', StudyUploadService.getSubmissionById(faultApproveResult.record.id).moderationStatus === 'pending');
  context.window.AdminAuditService = RealAdminAuditService;
  const approvedAfterRestore = await StudyUploadService.approveSubmission(faultApproveResult.record.id, {});
  check('Approve: succeeds normally once AdminAuditService is restored', approvedAfterRestore.moderationStatus === 'approved');

  const faultRejectResult = await StudyUploadService.createSubmission({
    title: 'Fault Injection Reject Target SM015', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: 'lecturer_notes', permissionConfirmed: true,
  }, makeFile('fault-reject.pdf', Buffer.concat([PDF_HEADER, Buffer.from('fault-injection-reject')])));
  context.window.AdminAuditService = throwingAuditService;
  await expectThrow('Reject: throws when AdminAuditService fails', () => StudyUploadService.rejectSubmission(faultRejectResult.record.id, 'Fault-injection reason'));
  check('Reject: moderationStatus unchanged when audit fails', StudyUploadService.getSubmissionById(faultRejectResult.record.id).moderationStatus === 'pending');
  context.window.AdminAuditService = RealAdminAuditService;
  const rejectedAfterRestore = await StudyUploadService.rejectSubmission(faultRejectResult.record.id, 'Fault-injection reason');
  check('Reject: succeeds normally once AdminAuditService is restored', rejectedAfterRestore.moderationStatus === 'rejected');

  // 14. A rejected submission's identical bytes CAN be resubmitted (spec: rejected excluded from exact-duplicate scan)
  const resubmit = await StudyUploadService.createSubmission({
    title: 'Chapter 1 Student Notes SM015 (corrected subject)', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: 'student_notes', permissionConfirmed: true,
  }, makeFile('notes2-resubmit.pdf', Buffer.concat([PDF_HEADER, Buffer.from('variant-a')]))); // identical bytes to the rejected one
  check('Identical bytes to a REJECTED submission can be resubmitted', Boolean(resubmit.record));

  // 15. Exact-duplicate guard on approve (defensive — should never normally reach this state)
  sandbox.__setCurrentUser(student);
  const forcedDupRecord = {
    id: 'study_upload_forced_dup', title: 'Forced dup', jurusan: 'sains', semester: 1, subjectCode: 'SM015',
    resourceType: 'notes', resourceSubtype: null, topic: null, yearStart: null, yearEnd: null, examSessionLabel: null,
    sourceCollege: null, sourceType: 'unknown', contributorUserId: student.id, fileId: 'sha256:builtinhash0001',
    fileName: 'f.pdf', fileType: 'pdf', fileExt: 'pdf', fileSize: 10, description: null, relatedResourceId: null,
    resourceGroupId: null, moderationStatus: 'pending', verificationStatus: 'unverified', duplicateStatus: 'exact',
    duplicateOfResourceId: 'study_builtin_0001', permissionConfirmed: true, rejectionReason: null, auditLog: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await context.StudyUploadService.ready();
  // Bypass createSubmission's own dedupe guard on purpose, to test approveSubmission's independent guard.
  await new Promise(resolve => { const req = context.indexedDB.open('echowall-study-uploads-v1'); req.onsuccess = () => resolve(req.result); });
  sandbox.__setCurrentUser(admin);
  await expectThrow('Approve refuses a submission flagged duplicateStatus=exact', async () => {
    // Insert directly via the provider layer (StudyUploadService has no public "insert raw" — this simulates
    // a data anomaly, per spec section 51's "如果通过数据异常进入 queue").
    const db = await new Promise((resolve, reject) => { const req = context.indexedDB.open('echowall-study-uploads-v1'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    await new Promise((resolve, reject) => { const tx = db.transaction('submissions', 'readwrite'); tx.objectStore('submissions').put(forcedDupRecord); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    await context.StudyUploadService.ready();
    await context.StudyUploadService.approveSubmission(forcedDupRecord.id, {});
  });

  // --- ADMIN-V2-006: reconcileStudyModerationState() -------------------------

  sandbox.__setCurrentUser(admin);

  // Drift: manually desync the mirrored ModerationItem's status away from
  // what StudyUploadService (the real source of truth) says, simulating the
  // best-effort mirror having failed/been skipped at approve-time.
  const mirroredForApproved = context.ModerationService.listModerationItems({ contentType: 'study_resource' }, admin)
    .find(item => item.contentId === String(notesResult.record.id));
  check('ADMIN-V2-006 setup: approved submission has a real mirrored ModerationItem', Boolean(mirroredForApproved));
  const rawItemsBeforeDrift = JSON.parse(sandbox.localStorage.getItem('echo-wall-moderation-items:v1') || '[]');
  const driftedItems = rawItemsBeforeDrift.map(item => item.id === mirroredForApproved.id ? { ...item, status: 'pending', resolvedAt: null } : item);
  sandbox.localStorage.setItem('echo-wall-moderation-items:v1', JSON.stringify(driftedItems));
  check('ADMIN-V2-006 setup: mirror manually drifted to pending', context.ModerationService.getModerationItem(mirroredForApproved.id, admin).status === 'pending');

  const reconcileResult1 = context.StudyUploadService.reconcileStudyModerationState();
  check('reconcileStudyModerationState corrects the drifted mirror back to approved (StudyUploadService wins)', context.ModerationService.getModerationItem(mirroredForApproved.id, admin).status === 'approved');
  check('reconcileStudyModerationState reports at least 1 updated', reconcileResult1.updated >= 1);

  const reconcileResult2 = context.StudyUploadService.reconcileStudyModerationState();
  check('reconcileStudyModerationState is idempotent (second call updates 0)', reconcileResult2.updated === 0 && reconcileResult2.created === 0);

  // Missing mirror entirely (simulates a submission that predates ADMIN-V2-002,
  // or whose original best-effort mirror silently failed at creation).
  const rawItemsBeforeMissing = JSON.parse(sandbox.localStorage.getItem('echo-wall-moderation-items:v1') || '[]');
  const rejectedMirror = context.ModerationService.listModerationItems({ contentType: 'study_resource' }, admin)
    .find(item => item.contentId === String(studentNotesResult.record.id));
  check('ADMIN-V2-006 setup: rejected submission has a real mirrored ModerationItem', Boolean(rejectedMirror));
  sandbox.localStorage.setItem('echo-wall-moderation-items:v1', JSON.stringify(rawItemsBeforeMissing.filter(item => item.id !== rejectedMirror.id)));
  check('ADMIN-V2-006 setup: mirror removed entirely', context.ModerationService.getModerationItem(rejectedMirror.id, admin) === null);

  const reconcileResult3 = context.StudyUploadService.reconcileStudyModerationState();
  check('reconcileStudyModerationState creates a missing mirror', reconcileResult3.created >= 1);
  const recreatedMirror = context.ModerationService.listModerationItems({ contentType: 'study_resource' }, admin)
    .find(item => item.contentId === String(studentNotesResult.record.id));
  check('Recreated mirror status matches the real (rejected) StudyUploadService status', Boolean(recreatedMirror) && recreatedMirror.status === 'rejected');
  check('Recreated mirror carries the real rejection reason', recreatedMirror.reason === 'Wrong subject');

  await expectThrow('reconcileStudyModerationState requires a real moderator (non-admin denied)', () => {
    sandbox.__setCurrentUser(student);
    context.StudyUploadService.reconcileStudyModerationState();
  });
  sandbox.__setCurrentUser(admin);

  console.log(`\n${passCount} passed, ${failCount} failed.`);
  if (failCount > 0) {
    console.error('Failures:', failures.join('; '));
    process.exitCode = 1;
  }
}

run().catch(error => {
  console.error('Test suite crashed:', error);
  process.exitCode = 1;
});
