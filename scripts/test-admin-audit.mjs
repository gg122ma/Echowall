#!/usr/bin/env node
/**
 * ADMIN-V2-004 — direct-call test suite for the unified Audit Trail
 * (services/admin-audit-service.js), built on top of the ADMIN-V2-001/001A
 * Role/Scope contract and the ADMIN-V2-002/002A ModerationService.
 *
 * Same approach as the other scripts/test-admin-*.mjs suites (this repo has
 * no test runner — see CLAUDE.md): load the real service files into a Node
 * `vm` sandbox with a minimal fake `localStorage` and a small fixture
 * `notes` array, then exercise everything through direct calls.
 *
 * Study's own approve/reject/verify -> AuditAction integration is covered
 * in scripts/test-study-upload.mjs (which already loads the real
 * StudyUploadService + IndexedDB fixture harness) rather than duplicated
 * here — see that file's "ADMIN-V2-004:" assertions.
 *
 * Run with `node scripts/test-admin-audit.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function createFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
    clear: () => store.clear(),
  };
}

const KMK = 1;
const KMPP = 3;
const FIXTURE_ORGANIZATIONS = Object.freeze([
  Object.freeze({ id: KMK, name: 'KMK', type: 'college' }),
  Object.freeze({ id: KMPP, name: 'KMPP', type: 'college' }),
]);
const FIXTURE_NOTES = Object.freeze([
  Object.freeze({ id: 201, contextType: 'community', communityKey: 'global:all' }),
  Object.freeze({ id: 202, contextType: 'community', communityKey: `college:${KMK}` }),
  Object.freeze({ id: 203, contextType: 'community', communityKey: `college:${KMPP}` }),
]);

function loadServicesIntoContext(sandbox) {
  const context = vm.createContext(sandbox);
  const files = [
    'services/admin-permission-service.js',
    'services/community-service.js',
    'services/moderation-service.js',
    'services/admin-audit-service.js',
  ];
  for (const relativePath of files) {
    const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    vm.runInContext(code, context, { filename: relativePath });
  }
  return context;
}

function buildSandbox() {
  const sandbox = {
    console,
    localStorage: createFakeLocalStorage(),
    getRuntimeNotes: () => FIXTURE_NOTES,
    organizations: FIXTURE_ORGANIZATIONS,
  };
  sandbox.window = sandbox;
  return sandbox;
}

// --- Assertion helpers ----------------------------------------------------

let passCount = 0;
let failCount = 0;
const failures = [];

function check(label, condition) {
  if (condition) { passCount += 1; }
  else { failCount += 1; failures.push(label); console.error(`FAIL: ${label}`); }
}

function expectThrow(label, fn) {
  try {
    fn();
    check(label, false);
  } catch {
    check(label, true);
  }
}

function run() {
  const sandbox = buildSandbox();
  const context = loadServicesIntoContext(sandbox);
  const ModerationService = context.ModerationService;
  const AdminAuditService = context.AdminAuditService;
  const AdminPermissionService = context.AdminPermissionService;
  const { ROLES } = AdminPermissionService;

  check('AdminAuditService loaded', Boolean(AdminAuditService));

  const superAdmin = { id: 'user_super_1', email: 'greencucumbertube@gmail.com', role: 'user' };
  const guest = null;
  const student = { id: 'user_student_1', email: 'student@example.com', role: 'user' };
  const globalModerator = { id: 'user_global_mod_1', email: 'globalmod@example.com', role: 'user' };
  const kmkCollegeAdmin = { id: 'user_kmk_admin_1', email: 'kmkadmin@example.com', role: 'user' };
  const kmppCollegeAdmin = { id: 'user_kmpp_admin_1', email: 'kmppadmin@example.com', role: 'user' };
  const studyModerator = { id: 'user_study_mod_1', email: 'studymod@example.com', role: 'user' };

  AdminPermissionService.grantRoleAssignment({ userId: globalModerator.id, role: ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmkCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmppCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMPP, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: studyModerator.id, role: ROLES.STUDY_MODERATOR, scopeType: 'study', grantedBy: superAdmin.id });

  // --- 1. Every real moderation action produces an AuditAction ---------------
  // (via ModerationService.updateModerationStatus's built-in hook)

  const globalItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 201, source: 'admin', createdBy: superAdmin.id });
  const kmkItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 202, source: 'admin', createdBy: superAdmin.id });
  const kmppItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 203, source: 'admin', createdBy: superAdmin.id });

  // approve -> audit
  const approvedItem = ModerationService.updateModerationStatus(globalItem.id, 'approved', superAdmin);
  const approveAudit = AdminAuditService.listAuditActions({ targetId: '201', action: 'approve' }, superAdmin);
  check('approve -> exactly one AuditAction', approveAudit.length === 1);
  check('approve AuditAction has action=approve', approveAudit[0].action === 'approve');
  check('approve reason is optional (null accepted)', approveAudit[0].reason === null);

  // hide without reason -> denied, no AuditAction created
  expectThrow('hide without a reason is rejected (reason required)', () => ModerationService.updateModerationStatus(globalItem.id, 'hidden', superAdmin));
  check('no AuditAction created for the denied hide-without-reason attempt', AdminAuditService.listAuditActions({ targetId: '201', action: 'hide' }, superAdmin).length === 0);

  // hide + reason -> audit
  ModerationService.updateModerationStatus(globalItem.id, 'hidden', superAdmin, { reason: 'Contains a broken link' });
  const hideAudit = AdminAuditService.listAuditActions({ targetId: '201', action: 'hide' }, superAdmin);
  check('hide + reason -> exactly one AuditAction', hideAudit.length === 1);
  check('hide AuditAction carries the reason', hideAudit[0].reason === 'Contains a broken link');
  check('hide AuditAction beforeSnapshot/afterSnapshot both present', Boolean(hideAudit[0].beforeSnapshot) && Boolean(hideAudit[0].afterSnapshot));
  check('hide AuditAction beforeSnapshot reflects the PRIOR status', hideAudit[0].beforeSnapshot.status === 'approved');
  check('hide AuditAction afterSnapshot reflects the NEW status', hideAudit[0].afterSnapshot.status === 'hidden');

  // restore -> audit, no reason required
  ModerationService.updateModerationStatus(globalItem.id, 'pending', superAdmin);
  const restoreAudit = AdminAuditService.listAuditActions({ targetId: '201', action: 'restore' }, superAdmin);
  check('restore -> exactly one AuditAction, no reason required', restoreAudit.length === 1 && restoreAudit[0].reason === null);

  // reject without reason -> denied
  expectThrow('reject without a reason is rejected (reason required)', () => ModerationService.updateModerationStatus(kmppItem.id, 'rejected', superAdmin));
  expectThrow('reject with a whitespace-only reason is rejected', () => ModerationService.updateModerationStatus(kmppItem.id, 'rejected', superAdmin, { reason: '   ' }));
  check('no AuditAction created for either denied reject attempt', AdminAuditService.listAuditActions({ targetId: '203', action: 'reject' }, superAdmin).length === 0);

  // reject + reason -> audit
  ModerationService.updateModerationStatus(kmppItem.id, 'rejected', superAdmin, { reason: 'Duplicate content' });
  const rejectAudit = AdminAuditService.listAuditActions({ targetId: '203', action: 'reject' }, superAdmin);
  check('reject + reason -> exactly one AuditAction', rejectAudit.length === 1 && rejectAudit[0].reason === 'Duplicate content');

  // escalate without reason -> denied; with reason -> audit
  expectThrow('escalate without a reason is rejected (reason required)', () => ModerationService.updateModerationStatus(kmkItem.id, 'escalated', superAdmin));
  ModerationService.updateModerationStatus(kmkItem.id, 'escalated', superAdmin, { reason: 'Needs Super Admin review' });
  const escalateAudit = AdminAuditService.listAuditActions({ targetId: '202', action: 'escalate' }, superAdmin);
  check('escalate + reason -> exactly one AuditAction', escalateAudit.length === 1);

  // --- 2. Every AuditAction has the full documented shape --------------------

  check('AuditAction shape: id/actorUserId/action/targetType/targetId/scopeType/scopeId/beforeSnapshot/afterSnapshot/reason/createdAt', Boolean(
    hideAudit[0].id && hideAudit[0].actorUserId && hideAudit[0].action && hideAudit[0].targetType && hideAudit[0].targetId
    && hideAudit[0].scopeType && 'scopeId' in hideAudit[0] && 'beforeSnapshot' in hideAudit[0] && 'afterSnapshot' in hideAudit[0]
    && 'reason' in hideAudit[0] && hideAudit[0].createdAt
  ));
  check('AuditAction actorEmail is captured when supplied', hideAudit[0].actorEmail === superAdmin.email);

  // --- 3. Map delete: irreversible, still audited -----------------------------
  // (simulating app-admin.js's adminDeleteMapNote flow at the service level)

  const mapDeleteAudit = AdminAuditService.createAuditAction({
    actorUserId: superAdmin.id,
    actorEmail: superAdmin.email,
    action: 'delete',
    targetType: 'map_note',
    targetId: 'note:9001',
    scopeType: 'college',
    scopeId: KMK,
    beforeSnapshot: { isHidden: false, recordKey: 'note:9001' },
    afterSnapshot: { deleted: true, irreversible: true },
    reason: null,
  }, superAdmin);
  check('Map delete creates an AuditAction', Boolean(mapDeleteAudit?.id));
  check('Map delete AuditAction is flagged irreversible in afterSnapshot', mapDeleteAudit.afterSnapshot.irreversible === true);
  check('Map delete does not require a reason', mapDeleteAudit.reason === null);

  // --- 4. Scope isolation on READ (mirrors ModerationService exactly) --------

  const superAll = AdminAuditService.listAuditActions({}, superAdmin);
  check('Super Admin sees every AuditAction', superAll.length >= 6);

  const globalModAudit = AdminAuditService.listAuditActions({}, globalModerator);
  check('Global Moderator sees the global-scope AuditAction', globalModAudit.some(a => a.targetId === '201'));
  check('Global Moderator does NOT see the KMK-scope AuditAction', !globalModAudit.some(a => a.targetId === '202'));
  check('Global Moderator does NOT see the KMPP-scope AuditAction', !globalModAudit.some(a => a.targetId === '203'));

  const kmkAudit = AdminAuditService.listAuditActions({}, kmkCollegeAdmin);
  check('KMK College Admin sees the KMK-scope AuditAction', kmkAudit.some(a => a.targetId === '202'));
  check('KMK College Admin does NOT see the KMPP-scope AuditAction', !kmkAudit.some(a => a.targetId === '203'));
  check('KMK College Admin does NOT see the global-scope AuditAction', !kmkAudit.some(a => a.targetId === '201'));

  const kmppAudit = AdminAuditService.listAuditActions({}, kmppCollegeAdmin);
  check('KMPP College Admin sees only the KMPP-scope AuditAction (denied KMK)', kmppAudit.some(a => a.targetId === '203') && !kmppAudit.some(a => a.targetId === '202'));

  const studyModAudit = AdminAuditService.listAuditActions({}, studyModerator);
  check('Study Moderator sees zero Community/Map AuditActions (none are study-scoped in this fixture set)', studyModAudit.length === 0);

  check('Student sees zero AuditActions', AdminAuditService.listAuditActions({}, student).length === 0);
  check('Guest sees zero AuditActions', AdminAuditService.listAuditActions({}, guest).length === 0);
  check('getAuditAction denies a Student reading a KMK-scope record directly by id', AdminAuditService.getAuditAction(kmkAudit[0]?.id, student) === null);
  check('getAuditAction allows the KMK admin to read their own KMK-scope record', Boolean(AdminAuditService.getAuditAction(kmkAudit[0]?.id, kmkCollegeAdmin)));

  // --- 5. Filters: actor / action / targetType / date range -------------------

  check('Filter by action=hide returns only hide records', AdminAuditService.listAuditActions({ action: 'hide' }, superAdmin).every(a => a.action === 'hide'));
  check('Filter by targetType=map_note returns only the map delete record', AdminAuditService.listAuditActions({ targetType: 'map_note' }, superAdmin).every(a => a.targetType === 'map_note'));
  check('Filter by actorUserId returns only that actor\'s records', AdminAuditService.listAuditActions({ actorUserId: superAdmin.id }, superAdmin).every(a => a.actorUserId === superAdmin.id));
  const farFuture = new Date(Date.now() + 86400000).toISOString();
  check('Filter by createdAtFrom in the future returns zero records', AdminAuditService.listAuditActions({ createdAtFrom: farFuture }, superAdmin).length === 0);
  const farPast = new Date(Date.now() - 86400000).toISOString();
  check('Filter by createdAtFrom in the past still returns records', AdminAuditService.listAuditActions({ createdAtFrom: farPast }, superAdmin).length > 0);

  // --- 6. Direct createAuditAction contract validation -------------------------

  expectThrow('createAuditAction requires actorUserId', () => AdminAuditService.createAuditAction({ action: 'approve', targetType: 'post', targetId: '1', scopeType: 'global' }));
  expectThrow('createAuditAction rejects an unknown action', () => AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'not_a_real_action', targetType: 'post', targetId: '1', scopeType: 'global' }));
  expectThrow('createAuditAction rejects an unknown targetType', () => AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'approve', targetType: 'not_a_real_type', targetId: '1', scopeType: 'global' }));
  expectThrow('createAuditAction requires scopeId for college scope', () => AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'approve', targetType: 'post', targetId: '1', scopeType: 'college' }));
  expectThrow('createAuditAction rejects hide with no reason', () => AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'hide', targetType: 'post', targetId: '1', scopeType: 'global' }));
  expectThrow('createAuditAction rejects reject with no reason', () => AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'reject', targetType: 'post', targetId: '1', scopeType: 'global' }));
  expectThrow('createAuditAction rejects escalate with no reason', () => AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'escalate', targetType: 'post', targetId: '1', scopeType: 'global' }));
  check('createAuditAction accepts approve with no reason', Boolean(AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'approve', targetType: 'post', targetId: '1', scopeType: 'global' })));
  check('createAuditAction accepts restore with no reason', Boolean(AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'restore', targetType: 'post', targetId: '1', scopeType: 'global' })));

  // --- 7. Snapshot sanitization: no PDF bytes / base64 / password / token ----

  const poisonedSnapshot = {
    title: 'Real Title',
    password: 'super-secret-123',
    authToken: 'abc.def.ghi',
    fileBase64: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+',
    longBinaryLookingString: 'A'.repeat(400),
    normalLongText: 'This is a perfectly normal sentence '.repeat(10),
    nested: { blobUrl: 'blob:http://localhost/abc-123', ok: 'fine' },
  };
  const auditWithPoison = AdminAuditService.createAuditAction({
    actorUserId: 'u1', action: 'approve', targetType: 'study_resource', targetId: 'study_1', scopeType: 'study',
    beforeSnapshot: poisonedSnapshot, afterSnapshot: null,
  }, superAdmin);
  const serialized = JSON.stringify(auditWithPoison.beforeSnapshot);
  check('Sanitized snapshot has NO password field', !('password' in auditWithPoison.beforeSnapshot));
  check('Sanitized snapshot has NO token-named field', !('authToken' in auditWithPoison.beforeSnapshot));
  check('Sanitized snapshot omits the base64 PDF payload string', !serialized.includes('JVBERi0'));
  check('Sanitized snapshot omits the long binary-shaped string', !serialized.includes('A'.repeat(400)));
  check('Sanitized snapshot omits the nested blob URL', !serialized.includes('blob:http'));
  check('Sanitized snapshot KEEPS a normal safe field', auditWithPoison.beforeSnapshot.title === 'Real Title');
  check('Sanitized snapshot KEEPS normal long prose text (truncated, not omitted)', typeof auditWithPoison.beforeSnapshot.normalLongText === 'string' && auditWithPoison.beforeSnapshot.normalLongText.length > 0);
  check('Sanitized nested object keeps its safe sibling field', auditWithPoison.beforeSnapshot.nested.ok === 'fine');

  // --- 8. ADMIN-V2-FINAL-CORRECTION: persistence failure propagates ----------
  // Proves writeActionsRaw() no longer swallows a real LocalStorage write
  // failure (e.g. quota exceeded) -- createAuditAction must genuinely throw,
  // not report success while writing nothing.

  const originalSetItem = sandbox.localStorage.setItem;
  sandbox.localStorage.setItem = () => { throw new Error('Simulated LocalStorage quota exceeded'); };
  expectThrow('createAuditAction throws when localStorage.setItem fails (no longer swallowed)', () =>
    AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'approve', targetType: 'post', targetId: 'persist_fail_1', scopeType: 'global' }, superAdmin));
  sandbox.localStorage.setItem = originalSetItem;
  check('After restoring localStorage, createAuditAction succeeds normally', Boolean(
    AdminAuditService.createAuditAction({ actorUserId: 'u1', action: 'approve', targetType: 'post', targetId: 'persist_fail_1', scopeType: 'global' }, superAdmin)
  ));

  // --- 9. ADMIN-V2-FINAL-CORRECTION: hard-delete ordering guarantee ----------
  // Simulates app-admin.js's adminDeleteMapNote/adminDeleteNote pattern:
  // capture beforeSnapshot -> call createAuditAction -> only THEN perform the
  // destructive delete. A throwing AdminAuditService must leave the
  // "content" (here, a boolean flag standing in for the real, irreversible
  // MapNoteService.delete() call) untouched.

  let deleteWasCalled = false;
  function simulateHardDelete(recordKey, auditService) {
    const before = { isHidden: false, recordKey };
    auditService.createAuditAction({
      actorUserId: superAdmin.id, actorEmail: superAdmin.email, action: 'delete',
      targetType: 'map_note', targetId: recordKey, scopeType: 'college', scopeId: KMK,
      beforeSnapshot: before, afterSnapshot: { deleted: true, irreversible: true }, reason: null,
    }, superAdmin);
    deleteWasCalled = true;
  }

  const throwingAuditService = { createAuditAction: () => { throw new Error('Simulated AdminAuditService failure'); } };
  expectThrow('Hard delete: throws when AdminAuditService fails before the destructive step', () => simulateHardDelete('note:9002', throwingAuditService));
  check('Hard delete: the destructive step never ran when audit failed', deleteWasCalled === false);

  simulateHardDelete('note:9002', AdminAuditService);
  check('Hard delete: the destructive step runs once audit succeeds', deleteWasCalled === true);
  check('Hard delete: exactly one AuditAction exists for the retried delete', AdminAuditService.listAuditActions({ action: 'delete', targetId: 'note:9002' }, superAdmin).length === 1);

  console.log(`\n${passCount} passed, ${failCount} failed.`);
  if (failCount > 0) {
    console.error('\nFailed checks:', failures);
    process.exitCode = 1;
  }
}

try {
  run();
} catch (error) {
  console.error('Test run crashed:', error);
  process.exitCode = 1;
}
