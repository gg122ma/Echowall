#!/usr/bin/env node
/**
 * ADMIN-V2-005 — direct-call test suite for College Permission Enforcement +
 * Content Reviewer assigned-only access, built on the ADMIN-V2-001/001A
 * Role/Scope contract, the ADMIN-V2-002/002A ModerationService, and the
 * ADMIN-V2-004 AdminAuditService/assignModerationItem.
 *
 * app-admin.js's DOM-rendering scope logic (getAdminCommunityNotes /
 * getAdminFilterDefinitions / adminCanModerateNote / canAccessMapModeration)
 * is DOM-heavy and covered by real-browser QA instead (see
 * reports/REPORT_ADMIN-V2-005.md) — this suite covers the SERVICE-layer
 * contracts those DOM functions depend on, which is where the real security
 * boundary lives (the DOM functions are UI convenience on top of it).
 *
 * Same approach as the other scripts/test-admin-*.mjs suites (this repo has
 * no test runner — see CLAUDE.md): load the real service files into a Node
 * `vm` sandbox with a minimal fake `localStorage` and a small fixture
 * `notes` array, then exercise everything through direct calls.
 * Run with `node scripts/test-admin-college-scope.mjs`.
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
const OTHER_COLLEGE = 2;
const FIXTURE_ORGANIZATIONS = Object.freeze([
  Object.freeze({ id: KMK, name: 'KMK', type: 'college' }),
  Object.freeze({ id: KMPP, name: 'KMPP', type: 'college' }),
  Object.freeze({ id: OTHER_COLLEGE, name: 'OTHER', type: 'college' }),
]);
const FIXTURE_NOTES = Object.freeze([
  Object.freeze({ id: 301, contextType: 'community', communityKey: 'global:all' }),
  Object.freeze({ id: 302, contextType: 'community', communityKey: `college:${KMK}` }),
  Object.freeze({ id: 303, contextType: 'community', communityKey: `college:${KMPP}` }),
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

  const superAdmin = { id: 'user_super_1', email: 'greencucumbertube@gmail.com', role: 'user' };
  const guest = null;
  const student = { id: 'user_student_1', email: 'student@example.com', role: 'user' };
  const globalModerator = { id: 'user_global_mod_1', email: 'globalmod@example.com', role: 'user' };
  const kmkAdmin = { id: 'user_kmk_admin_1', email: 'kmkadmin@example.com', role: 'user' };
  const kmppAdmin = { id: 'user_kmpp_admin_1', email: 'kmppadmin@example.com', role: 'user' };
  const multiAdmin = { id: 'user_multi_1', email: 'multi@example.com', role: 'user' };
  const studyModerator = { id: 'user_study_mod_1', email: 'studymod@example.com', role: 'user' };
  const reviewer = { id: 'user_reviewer_1', email: 'reviewer@example.com', role: 'user' };

  AdminPermissionService.grantRoleAssignment({ userId: globalModerator.id, role: ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmkAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmppAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMPP, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: multiAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: multiAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMPP, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: studyModerator.id, role: ROLES.STUDY_MODERATOR, scopeType: 'study', grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: reviewer.id, role: ROLES.CONTENT_REVIEWER, scopeType: 'global', grantedBy: superAdmin.id });

  // --- 1. Base college permission matrix (KMK/KMPP/multi/global/study) ------

  check('KMK admin -> canModerateCollege(KMK) true', AdminPermissionService.canModerateCollege(kmkAdmin, KMK));
  check('KMK admin -> canModerateCollege(KMPP) false', AdminPermissionService.canModerateCollege(kmkAdmin, KMPP) === false);
  check('KMK admin -> canModerateGlobalCommunity false', AdminPermissionService.canModerateGlobalCommunity(kmkAdmin) === false);
  check('KMK admin -> canModerateStudy false', AdminPermissionService.canModerateStudy(kmkAdmin) === false);
  check('KMPP admin -> canModerateCollege(KMPP) true', AdminPermissionService.canModerateCollege(kmppAdmin, KMPP));
  check('KMPP admin -> canModerateCollege(KMK) false', AdminPermissionService.canModerateCollege(kmppAdmin, KMK) === false);
  check('KMPP admin -> canModerateGlobalCommunity false', AdminPermissionService.canModerateGlobalCommunity(kmppAdmin) === false);
  check('KMPP admin -> canModerateStudy false', AdminPermissionService.canModerateStudy(kmppAdmin) === false);
  check('Multi-scope admin -> canModerateCollege(KMK) true', AdminPermissionService.canModerateCollege(multiAdmin, KMK));
  check('Multi-scope admin -> canModerateCollege(KMPP) true', AdminPermissionService.canModerateCollege(multiAdmin, KMPP));
  check('Multi-scope admin -> canModerateCollege(OTHER, ungranted) false', AdminPermissionService.canModerateCollege(multiAdmin, OTHER_COLLEGE) === false);

  // --- 2. Real ModerationItems spanning every scope, queue visibility -------

  const globalItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 301, source: 'admin', createdBy: superAdmin.id });
  const kmkItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 302, source: 'admin', createdBy: superAdmin.id });
  const kmppItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 303, source: 'admin', createdBy: superAdmin.id });
  const studyItem = ModerationService.createModerationItem({ contentType: 'study_resource', contentId: 'study_301', source: 'submission', createdBy: student.id });

  const kmkItems = ModerationService.listModerationItems({}, kmkAdmin);
  check('KMK admin queue: sees exactly the KMK item (count scope-safe)', kmkItems.length === 1 && kmkItems[0].id === kmkItem.id);
  const kmppItems = ModerationService.listModerationItems({}, kmppAdmin);
  check('KMPP admin queue: sees exactly the KMPP item (count scope-safe)', kmppItems.length === 1 && kmppItems[0].id === kmppItem.id);
  const multiItems = ModerationService.listModerationItems({}, multiAdmin);
  check('Multi-scope admin queue: sees exactly KMK+KMPP (2), not global/study', multiItems.length === 2 && multiItems.some(i => i.id === kmkItem.id) && multiItems.some(i => i.id === kmppItem.id));
  check('Global Moderator queue: does not include KMK or KMPP', !ModerationService.listModerationItems({}, globalModerator).some(i => i.id === kmkItem.id || i.id === kmppItem.id));
  check('Study Moderator queue: does not include KMK or KMPP', !ModerationService.listModerationItems({}, studyModerator).some(i => i.id === kmkItem.id || i.id === kmppItem.id));

  // --- 2A. ADMIN-V2-FINAL-CORRECTION: Global Moderator STRICT isolation -----
  // Re-verifies the exact Permission Matrix rule this correction stage
  // exists to enforce: "GLOBAL_MODERATOR 不允许: College Community/Building/
  // Map/Study/Admin Management" -- across every real surface, not just
  // canModerateCollege() in isolation.

  const kmkMapItem = ModerationService.createModerationItem({ contentType: 'map_note', contentId: 'note:9001', source: 'admin', createdBy: superAdmin.id });
  const globalModAllItems = ModerationService.listModerationItems({}, globalModerator);
  check('Global Moderator: sees the global post', globalModAllItems.some(i => i.id === globalItem.id));
  check('Global Moderator: does NOT see the always-KMK map_note item', !globalModAllItems.some(i => i.id === kmkMapItem.id));
  check('Global Moderator: canModerateCommunityContent(college, KMK) false', AdminPermissionService.canModerateCommunityContent(globalModerator, 'college', KMK) === false);
  check('Global Moderator: canModerateCommunityContent(college, KMPP) false', AdminPermissionService.canModerateCommunityContent(globalModerator, 'college', KMPP) === false);
  check('Global Moderator: canModerateCommunityContent(global, null) true', AdminPermissionService.canModerateCommunityContent(globalModerator, 'global', null));
  check('Global Moderator: canModerateCollegeBuilding(KMK) false', AdminPermissionService.canModerateCollegeBuilding(globalModerator, KMK) === false);
  check('Global Moderator: canModerateMap(KMK) false', AdminPermissionService.canModerateMap(globalModerator, KMK) === false);
  check('Global Moderator: canModerateStudy false', AdminPermissionService.canModerateStudy(globalModerator) === false);
  check('Global Moderator: isSuperAdmin false (Admin Management denied)', AdminPermissionService.isSuperAdmin(globalModerator) === false);
  expectThrow('Global Moderator: updateModerationStatus on the KMK map item throws (write denied)', () => ModerationService.updateModerationStatus(kmkMapItem.id, 'approved', globalModerator));
  expectThrow('Global Moderator: updateModerationStatus on the KMK Community post throws (write denied)', () => ModerationService.updateModerationStatus(kmkItem.id, 'approved', globalModerator));

  // --- 3. Forced scope tampering denied --------------------------------------

  check('KMK admin: getModerationItem(kmppItem) directly by id returns null (read denied)', ModerationService.getModerationItem(kmppItem.id, kmkAdmin) === null);
  expectThrow('KMK admin: updateModerationStatus on the KMPP item throws (write denied)', () => ModerationService.updateModerationStatus(kmppItem.id, 'approved', kmkAdmin));
  check('KMK admin: forcing filters.scopeId=KMPP does not widen listModerationItems', ModerationService.listModerationItems({ scopeType: 'college', scopeId: KMPP }, kmkAdmin).length === 0);
  check('KMK admin: forcing filters.scopeType=global does not widen listModerationItems', ModerationService.listModerationItems({ scopeType: 'global' }, kmkAdmin).length === 0);
  check('KMK admin: forcing filters.scopeType=study does not widen listModerationItems', ModerationService.listModerationItems({ scopeType: 'study' }, kmkAdmin).length === 0);
  expectThrow('KMPP admin: updateModerationStatus on the KMK item throws (write denied, reverse direction)', () => ModerationService.updateModerationStatus(kmkItem.id, 'approved', kmppAdmin));
  check('KMK admin: canAccessScope("college", KMPP) direct check also denies', AdminPermissionService.canAccessScope(kmkAdmin, 'college', KMPP) === false);

  // --- 4. Content Reviewer: assigned-only access -----------------------------

  check('Content Reviewer: sees ZERO items before any assignment (no scope permission of their own)', ModerationService.listModerationItems({}, reviewer).length === 0);
  expectThrow('Non-Super-Admin (KMK admin) cannot assign a moderation item', () => ModerationService.assignModerationItem(kmkItem.id, reviewer.id, kmkAdmin));
  const assigned = ModerationService.assignModerationItem(kmkItem.id, reviewer.id, superAdmin);
  check('Super Admin can assign a moderation item to a Content Reviewer', assigned.assignedTo === reviewer.id);
  const reviewerItemsAfterAssign = ModerationService.listModerationItems({}, reviewer);
  check('Content Reviewer: sees EXACTLY the assigned item after assignment', reviewerItemsAfterAssign.length === 1 && reviewerItemsAfterAssign[0].id === kmkItem.id);
  check('Content Reviewer: still cannot see the unassigned KMPP item', !reviewerItemsAfterAssign.some(i => i.id === kmppItem.id));
  check('Content Reviewer: can read the assigned item directly by id', Boolean(ModerationService.getModerationItem(kmkItem.id, reviewer)));
  check('Content Reviewer: cannot read the unassigned KMPP item directly by id', ModerationService.getModerationItem(kmppItem.id, reviewer) === null);
  const reviewerUpdate = ModerationService.updateModerationStatus(kmkItem.id, 'approved', reviewer);
  check('Content Reviewer: CAN act on the item assigned to them', reviewerUpdate.status === 'approved');
  expectThrow('Content Reviewer: still cannot act on the unassigned KMPP item', () => ModerationService.updateModerationStatus(kmppItem.id, 'approved', reviewer));

  const assignAudit = AdminAuditService.listAuditActions({ action: 'assign', targetId: '302' }, superAdmin);
  check('Assignment produced an AuditAction (action="assign")', assignAudit.length === 1 && assignAudit[0].afterSnapshot?.assignedTo === reviewer.id);

  const unassigned = ModerationService.assignModerationItem(kmkItem.id, null, superAdmin);
  check('Super Admin can unassign', unassigned.assignedTo === null);
  check('Content Reviewer: loses access once unassigned', ModerationService.listModerationItems({}, reviewer).length === 0);
  const unassignAudit = AdminAuditService.listAuditActions({ action: 'unassign', targetId: '302' }, superAdmin);
  check('Unassignment produced an AuditAction (action="unassign")', unassignAudit.length === 1);

  // --- 5. Student / Guest denied everywhere -----------------------------------

  check('Student: canModerateCollege(KMK) false', AdminPermissionService.canModerateCollege(student, KMK) === false);
  check('Student: sees zero moderation items', ModerationService.listModerationItems({}, student).length === 0);
  check('Guest: sees zero moderation items', ModerationService.listModerationItems({}, guest).length === 0);
  expectThrow('Guest: cannot assign a moderation item', () => ModerationService.assignModerationItem(kmppItem.id, reviewer.id, guest));

  // --- 6. Audit scope-safe (college isolation mirrors ModerationService) -----

  ModerationService.updateModerationStatus(kmppItem.id, 'hidden', superAdmin, { reason: 'QA fixture' });
  const kmkAuditView = AdminAuditService.listAuditActions({}, kmkAdmin);
  check('KMK admin Audit view: does NOT include the KMPP hide action', !kmkAuditView.some(a => a.targetId === '303'));
  const kmppAuditView = AdminAuditService.listAuditActions({}, kmppAdmin);
  check('KMPP admin Audit view: DOES include their own KMPP hide action', kmppAuditView.some(a => a.targetId === '303'));
  check('KMPP admin Audit view: does NOT include the KMK approve action', !kmppAuditView.some(a => a.targetId === '302'));
  const superAuditView = AdminAuditService.listAuditActions({}, superAdmin);
  check('Super Admin Audit view: sees both the KMK and KMPP actions', superAuditView.some(a => a.targetId === '302') && superAuditView.some(a => a.targetId === '303'));
  check('Student Audit view: sees zero records', AdminAuditService.listAuditActions({}, student).length === 0);

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
