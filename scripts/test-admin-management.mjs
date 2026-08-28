#!/usr/bin/env node
/**
 * ADMIN-V2-007 — direct-call test suite for Admin Management (Role Manager),
 * built on the ADMIN-V2-001/001A Role/Scope contract and the ADMIN-V2-004
 * AdminAuditService.
 *
 * app-admin-management.js's DOM-rendering form/list is covered by real-
 * browser QA instead (see reports/REPORT_ADMIN-V2-007.md) — this suite
 * covers the SERVICE-layer contract those DOM functions are thin wrappers
 * around (grantRoleAssignment/setAssignmentStatus/revokeRoleAssignment),
 * which is where the real security boundary lives.
 *
 * Same approach as the other scripts/test-admin-*.mjs suites (this repo has
 * no test runner — see CLAUDE.md): load the real service files into a Node
 * `vm` sandbox with a minimal fake `localStorage`, then exercise everything
 * through direct calls. Run with `node scripts/test-admin-management.mjs`.
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

function loadServicesIntoContext(sandbox) {
  const context = vm.createContext(sandbox);
  const files = ['services/admin-permission-service.js', 'services/admin-audit-service.js'];
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
    organizations: FIXTURE_ORGANIZATIONS,
  };
  sandbox.window = sandbox;
  return sandbox;
}

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
  const AdminPermissionService = context.AdminPermissionService;
  const AdminAuditService = context.AdminAuditService;
  const { ROLES } = AdminPermissionService;

  const superAdmin = { id: 'user_super_1', email: 'greencucumbertube@gmail.com', role: 'user' };
  const notSuperAdmin = { id: 'user_kmk_admin_1', email: 'kmkadmin@example.com', role: 'user' };
  const legacyAdmin = { id: 'user_legacy_1', email: 'mzteoh88@gmail.com', role: 'admin' };
  const targetGlobal = { id: 'target_global_1' };
  const targetKmk = { id: 'target_kmk_1' };
  const targetStudy = { id: 'target_study_1' };
  const targetReviewer = { id: 'target_reviewer_1' };

  // --- 1. Legacy admin is NOT Super Admin --------------------------------------

  check('mzteoh88@gmail.com -> NOT isSuperAdmin', !AdminPermissionService.isSuperAdmin(legacyAdmin));
  check('mzteoh88@gmail.com -> isLegacyAdmin true', AdminPermissionService.isLegacyAdmin(legacyAdmin));

  // --- 2. Super Admin can grant every assignable role --------------------------

  const globalGrant = AdminPermissionService.grantRoleAssignment({ userId: targetGlobal.id, role: ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id, actor: superAdmin });
  check('Super Admin grants GLOBAL_MODERATOR', Boolean(globalGrant?.id) && globalGrant.status === 'active');
  check('Granted Global Moderator -> canModerateGlobalCommunity true', AdminPermissionService.canModerateGlobalCommunity({ id: targetGlobal.id }));

  const kmkGrant = AdminPermissionService.grantRoleAssignment({ userId: targetKmk.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id, actor: superAdmin });
  check('Super Admin grants COLLEGE_ADMIN (KMK)', Boolean(kmkGrant?.id));
  check('Granted KMK admin -> canModerateCollege(KMK) true', AdminPermissionService.canModerateCollege({ id: targetKmk.id }, KMK));
  check('Granted KMK admin -> canModerateCollege(KMPP) false', !AdminPermissionService.canModerateCollege({ id: targetKmk.id }, KMPP));

  const studyGrant = AdminPermissionService.grantRoleAssignment({ userId: targetStudy.id, role: ROLES.STUDY_MODERATOR, scopeType: 'study', grantedBy: superAdmin.id, actor: superAdmin });
  check('Super Admin grants STUDY_MODERATOR', Boolean(studyGrant?.id));
  check('Granted Study Moderator -> canModerateStudy true', AdminPermissionService.canModerateStudy({ id: targetStudy.id }));

  const reviewerGrant = AdminPermissionService.grantRoleAssignment({ userId: targetReviewer.id, role: ROLES.CONTENT_REVIEWER, scopeType: 'global', grantedBy: superAdmin.id, actor: superAdmin });
  check('Super Admin grants CONTENT_REVIEWER', Boolean(reviewerGrant?.id));
  check('Granted Content Reviewer -> hasPermission(CONTENT_REVIEW) true', AdminPermissionService.hasPermission({ id: targetReviewer.id }, AdminPermissionService.PERMISSIONS.CONTENT_REVIEW));

  // --- 3. Invalid role/scope combinations rejected ------------------------------

  expectThrow('COLLEGE_ADMIN + scopeType study is rejected', () => AdminPermissionService.grantRoleAssignment({ userId: 'x1', role: ROLES.COLLEGE_ADMIN, scopeType: 'study', scopeId: KMK, grantedBy: superAdmin.id, actor: superAdmin }));
  expectThrow('GLOBAL_MODERATOR + scopeType college is rejected', () => AdminPermissionService.grantRoleAssignment({ userId: 'x2', role: ROLES.GLOBAL_MODERATOR, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id, actor: superAdmin }));
  expectThrow('STUDY_MODERATOR + scopeType global is rejected', () => AdminPermissionService.grantRoleAssignment({ userId: 'x3', role: ROLES.STUDY_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id, actor: superAdmin }));
  expectThrow('COLLEGE_ADMIN missing scopeId is rejected', () => AdminPermissionService.grantRoleAssignment({ userId: 'x4', role: ROLES.COLLEGE_ADMIN, scopeType: 'college', grantedBy: superAdmin.id, actor: superAdmin }));
  expectThrow('Unknown role is rejected', () => AdminPermissionService.grantRoleAssignment({ userId: 'x5', role: 'NOT_A_REAL_ROLE', grantedBy: superAdmin.id, actor: superAdmin }));

  // --- 4. UI can never create a second SUPER_ADMIN ------------------------------

  expectThrow('grantRoleAssignment(role=SUPER_ADMIN) is always rejected, even by a real Super Admin', () => AdminPermissionService.grantRoleAssignment({ userId: 'x6', role: ROLES.SUPER_ADMIN, scopeType: 'system', grantedBy: superAdmin.id, actor: superAdmin }));

  // --- 5. Non-Super-Admin cannot grant/disable/enable/revoke -------------------

  expectThrow('Non-Super-Admin cannot grant a role', () => AdminPermissionService.grantRoleAssignment({ userId: 'x7', role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, actor: notSuperAdmin }));
  expectThrow('Non-Super-Admin cannot disable a role', () => AdminPermissionService.setAssignmentStatus(kmkGrant.id, 'disabled', notSuperAdmin));
  expectThrow('Non-Super-Admin cannot revoke a role', () => AdminPermissionService.revokeRoleAssignment(kmkGrant.id, notSuperAdmin));
  check('Denied grant attempt did not mutate storage', AdminPermissionService.listAllRoleAssignments().every(a => a.userId !== 'x7'));

  // --- 6. Role change is IMMEDIATE (no re-login / cache needed) ----------------

  check('Before disable: KMK admin can moderate KMK', AdminPermissionService.canModerateCollege({ id: targetKmk.id }, KMK));
  const disabled = AdminPermissionService.setAssignmentStatus(kmkGrant.id, 'disabled', superAdmin);
  check('Disable succeeds', disabled.status === 'disabled');
  check('IMMEDIATELY after disable (same process, no re-login): KMK admin can no longer moderate KMK', !AdminPermissionService.canModerateCollege({ id: targetKmk.id }, KMK));
  check('IMMEDIATELY after disable: canAccessAdminPanel also false (fully locked out, not just the one permission)', !AdminPermissionService.canAccessAdminPanel({ id: targetKmk.id }));

  const reEnabled = AdminPermissionService.setAssignmentStatus(kmkGrant.id, 'active', superAdmin);
  check('Re-enable succeeds', reEnabled.status === 'active');
  check('IMMEDIATELY after re-enable: KMK admin can moderate KMK again', AdminPermissionService.canModerateCollege({ id: targetKmk.id }, KMK));

  const revoked = AdminPermissionService.revokeRoleAssignment(kmkGrant.id, superAdmin);
  check('Revoke succeeds and returns the removed assignment', revoked.id === kmkGrant.id);
  check('IMMEDIATELY after revoke: KMK admin permanently cannot moderate KMK', !AdminPermissionService.canModerateCollege({ id: targetKmk.id }, KMK));
  check('Revoked assignment no longer appears in listAllRoleAssignments', !AdminPermissionService.listAllRoleAssignments().some(a => a.id === kmkGrant.id));
  expectThrow('Revoking an already-revoked id throws (not found)', () => AdminPermissionService.revokeRoleAssignment(kmkGrant.id, superAdmin));

  // --- 7. Super Admin can never be disabled/revoked (no real row exists) -------

  expectThrow('setAssignmentStatus on a fabricated Super Admin virtual id throws (not found)', () => AdminPermissionService.setAssignmentStatus(`virtual_SUPER_ADMIN_${superAdmin.id}`, 'disabled', superAdmin));
  expectThrow('revokeRoleAssignment on a fabricated Super Admin virtual id throws (not found)', () => AdminPermissionService.revokeRoleAssignment(`virtual_SUPER_ADMIN_${superAdmin.id}`, superAdmin));
  check('Super Admin remains Super Admin regardless (bootstrap identity is email-only, not a storage row)', AdminPermissionService.isSuperAdmin(superAdmin));

  // --- 8. Every grant/disable/enable/revoke creates a real AuditAction ---------

  const grantAudit = AdminAuditService.listAuditActions({ action: 'grant', targetId: targetGlobal.id }, superAdmin);
  check('grant produced an AuditAction', grantAudit.length === 1 && grantAudit[0].actorEmail === superAdmin.email);
  const disableAudit = AdminAuditService.listAuditActions({ action: 'disable', targetId: targetKmk.id }, superAdmin);
  check('disable produced an AuditAction', disableAudit.length === 1);
  const enableAudit = AdminAuditService.listAuditActions({ action: 'enable', targetId: targetKmk.id }, superAdmin);
  check('re-enable produced an AuditAction', enableAudit.length === 1);
  const revokeAudit = AdminAuditService.listAuditActions({ action: 'revoke', targetId: targetKmk.id }, superAdmin);
  check('revoke produced an AuditAction', revokeAudit.length === 1);
  check('Role-management AuditActions carry actor/target/before/after/createdAt', Boolean(
    revokeAudit[0].actorUserId && revokeAudit[0].targetType === 'role_assignment' && revokeAudit[0].targetId === targetKmk.id
    && revokeAudit[0].beforeSnapshot && revokeAudit[0].afterSnapshot === null && revokeAudit[0].createdAt
  ));
  check('Role-management AuditActions are "system"-scoped (Super-Admin/AUDIT_READ_ALL-only visibility)', revokeAudit[0].scopeType === 'system');
  check('A KMK-scoped college admin cannot see role-management Audit records (system scope denies them)', AdminAuditService.listAuditActions({ action: 'grant' }, notSuperAdmin).length === 0);

  // --- 9. No-actor calls remain fully backward compatible (old test-fixture style) --

  const noActorGrant = AdminPermissionService.grantRoleAssignment({ userId: 'legacy_fixture_1', role: ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id });
  check('grantRoleAssignment with no actor still works (backward compatible)', Boolean(noActorGrant?.id));
  check('grantRoleAssignment with no actor does not throw trying to audit (best-effort skip)', AdminAuditService.listAuditActions({ targetId: 'legacy_fixture_1' }, superAdmin).length === 0);

  // --- 10. ADMIN-V2-FINAL-CORRECTION: audit failure blocks Role grant/revoke ---
  // Mocks AdminAuditService.createAuditAction to throw, then verifies the
  // role-management mutation NEVER applies -- swaps window.AdminAuditService
  // (a mutable property on the sandbox `window`, not on the frozen service
  // object itself), restoring the real provider afterward and confirming
  // normal operation resumes with exactly one AuditAction.

  const RealAdminAuditService = AdminAuditService;
  const throwingAuditService = { createAuditAction: () => { throw new Error('Simulated AdminAuditService failure'); } };

  context.window.AdminAuditService = throwingAuditService;
  const beforeFaultGrantCount = AdminPermissionService.listAllRoleAssignments().length;
  expectThrow('Role grant: throws when AdminAuditService fails', () =>
    AdminPermissionService.grantRoleAssignment({ userId: 'fault_target_1', role: ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id, actor: superAdmin }));
  check('Role grant: no assignment created when audit fails', AdminPermissionService.listAllRoleAssignments().length === beforeFaultGrantCount);

  context.window.AdminAuditService = RealAdminAuditService;
  const faultTarget = AdminPermissionService.grantRoleAssignment({ userId: 'fault_target_2', role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id, actor: superAdmin });

  context.window.AdminAuditService = throwingAuditService;
  expectThrow('Role revoke: throws when AdminAuditService fails', () => AdminPermissionService.revokeRoleAssignment(faultTarget.id, superAdmin));
  check('Role revoke: assignment NOT removed when audit fails', AdminPermissionService.listAllRoleAssignments().some(a => a.id === faultTarget.id));
  check('Role revoke: still active/moderating after failed-audit revoke attempt', AdminPermissionService.canModerateCollege({ id: 'fault_target_2' }, KMK));

  context.window.AdminAuditService = RealAdminAuditService;
  const revokedAfterRestore = AdminPermissionService.revokeRoleAssignment(faultTarget.id, superAdmin);
  check('Role revoke: succeeds normally once AdminAuditService is restored', revokedAfterRestore.id === faultTarget.id);
  check('Role revoke: exactly one AuditAction after restore-and-retry', AdminAuditService.listAuditActions({ action: 'revoke', targetId: 'fault_target_2' }, superAdmin).length === 1);

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
