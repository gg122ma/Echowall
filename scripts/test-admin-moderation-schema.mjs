#!/usr/bin/env node
/**
 * ADMIN-V2-002 — direct-call test suite for the unified ModerationItem +
 * Report schema (services/moderation-service.js), built on top of the
 * ADMIN-V2-001/001A Role/Scope contract (services/admin-permission-service.js).
 *
 * Same approach as scripts/test-admin-role-scope.mjs / test-study-upload.mjs
 * (this repo has no test runner — see CLAUDE.md): load the real service
 * files into a Node `vm` sandbox with a minimal fake `localStorage` and a
 * small fixture `notes` array (standing in for real Community post data),
 * then exercise everything through direct calls.
 * Run with `node scripts/test-admin-moderation-schema.mjs`.
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

// Fixture Community/Building posts standing in for the real `notes` array
// (app-data.js) -- realistic enough to exercise CommunityService's own
// scope-derivation logic, per ADMIN-V2-002 section 6's "derive scope from
// the canonical content object" requirement.
const KMK = 1;
const KMPP = 3;
// ADMIN-V2-002A: a real `organizations` fixture (the shape app-data.js's
// canonical config actually has) so moderation-service.js's
// resolveKmkOrgId() exercises its real lookup path, not just its fallback
// literal, in every test below.
const FIXTURE_ORGANIZATIONS = Object.freeze([
  Object.freeze({ id: KMK, name: 'KMK', type: 'college' }),
  Object.freeze({ id: KMPP, name: 'KMPP', type: 'college' }),
]);
const FIXTURE_NOTES = Object.freeze([
  Object.freeze({ id: 101, contextType: 'community', communityKey: 'global:all' }),
  Object.freeze({ id: 102, contextType: 'community', communityKey: `college:${KMK}` }),
  Object.freeze({ id: 103, contextType: 'community', communityKey: `college:${KMPP}` }),
  Object.freeze({ id: 104, contextType: 'community', orgId: KMK, majorId: 5 }), // derived via jurusan:KMK:5 -> college:KMK
  Object.freeze({ id: 105, contextType: 'building', placeId: 'B_PUSTAKA' }), // no orgId -- defaults to KMK
]);

function loadServicesIntoContext(sandbox) {
  const context = vm.createContext(sandbox);
  const files = ['services/admin-permission-service.js', 'services/community-service.js', 'services/moderation-service.js', 'services/admin-audit-service.js'];
  for (const relativePath of files) {
    const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    vm.runInContext(code, context, { filename: relativePath });
  }
  return context;
}

function buildSandbox(organizationsFixture = FIXTURE_ORGANIZATIONS, notesFixture = FIXTURE_NOTES) {
  const sandbox = {
    console,
    localStorage: createFakeLocalStorage(),
    getRuntimeNotes: () => notesFixture,
    organizations: organizationsFixture,
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
  const AdminPermissionService = context.AdminPermissionService;
  const AdminAuditService = context.AdminAuditService;
  const { ROLES } = AdminPermissionService;

  check('ModerationService loaded', Boolean(ModerationService));

  const superAdmin = { id: 'user_super_1', email: 'greencucumbertube@gmail.com', role: 'user' };
  const guest = null;
  const student = { id: 'user_student_1', email: 'student@example.com', role: 'user' };
  const globalModerator = { id: 'user_global_mod_1', email: 'globalmod@example.com', role: 'user' };
  const kmkCollegeAdmin = { id: 'user_kmk_admin_1', email: 'kmkadmin@example.com', role: 'user' };
  const kmppCollegeAdmin = { id: 'user_kmpp_admin_1', email: 'kmppadmin@example.com', role: 'user' };
  const studyModerator = { id: 'user_study_mod_1', email: 'studymod@example.com', role: 'user' };
  const disabledStudyModerator = { id: 'user_disabled_1', email: 'disabled@example.com', role: 'user' };

  AdminPermissionService.grantRoleAssignment({ userId: globalModerator.id, role: ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmkCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmppCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMPP, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: studyModerator.id, role: ROLES.STUDY_MODERATOR, scopeType: 'study', grantedBy: superAdmin.id });
  const disabledAssignment = AdminPermissionService.grantRoleAssignment({ userId: disabledStudyModerator.id, role: ROLES.STUDY_MODERATOR, scopeType: 'study', grantedBy: superAdmin.id });
  AdminPermissionService.setAssignmentStatus(disabledAssignment.id, 'disabled');

  // --- 1. Valid ModerationItem create ---------------------------------------

  const globalItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 101, source: 'admin', createdBy: superAdmin.id });
  check('Valid ModerationItem create succeeds', Boolean(globalItem?.id));
  check('New item defaults to pending', globalItem.status === 'pending');
  check('New item has no resolvedAt while pending', globalItem.resolvedAt === null);

  // --- 2/3/4. Invalid contentType / status / scope rejected -----------------

  expectThrow('Invalid contentType rejected', () => ModerationService.createModerationItem({ contentType: 'not_a_type', contentId: 1, source: 'admin' }));
  expectThrow('Invalid status rejected', () => ModerationService.createModerationItem({ contentType: 'post', contentId: 101, source: 'admin', status: 'not_a_status' }));
  expectThrow('Invalid source rejected', () => ModerationService.createModerationItem({ contentType: 'post', contentId: 101, status: 'pending' }));
  expectThrow('Invalid scope (bad scopeType string) rejected for a no-adapter contentType', () => ModerationService.createModerationItem({ contentType: 'event', contentId: 1, source: 'admin', scopeType: 'not_a_scope' }));
  expectThrow('College scope missing scopeId rejected for a no-adapter contentType', () => ModerationService.createModerationItem({ contentType: 'event', contentId: 1, source: 'admin', scopeType: 'college' }));

  // --- 5. Global item scope correct ------------------------------------------

  check('Global post (101) -> scopeType global, scopeId null', globalItem.scopeType === 'global' && globalItem.scopeId === null);

  // --- 6. KMK item cannot masquerade as KMPP ---------------------------------

  const kmkItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 102, source: 'admin', createdBy: superAdmin.id });
  check('KMK post (102) -> scopeType college, scopeId KMK', kmkItem.scopeType === 'college' && kmkItem.scopeId === KMK);
  expectThrow('KMK post supplied with scopeId=KMPP is rejected (scope mismatch)', () => ModerationService.createModerationItem({ contentType: 'post', contentId: 102, source: 'admin', scopeType: 'college', scopeId: KMPP }));

  const kmppItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 103, source: 'admin', createdBy: superAdmin.id });
  check('KMPP post (103) -> scopeType college, scopeId KMPP', kmppItem.scopeType === 'college' && kmppItem.scopeId === KMPP);

  const jurusanDerivedItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 104, source: 'admin', createdBy: superAdmin.id });
  check('Jurusan post (104, orgId-derived) -> scopeType college, scopeId KMK', jurusanDerivedItem.scopeType === 'college' && jurusanDerivedItem.scopeId === KMK);

  const buildingItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 105, source: 'admin', createdBy: superAdmin.id });
  check('Building post (105, no orgId) -> defaults to KMK college scope', buildingItem.scopeType === 'college' && buildingItem.scopeId === KMK);

  // --- 7. Study resource scope = study ---------------------------------------

  const studyItem = ModerationService.createModerationItem({ contentType: 'study_resource', contentId: 'study_upload_1', source: 'submission', createdBy: student.id });
  check('Study resource -> scopeType study, scopeId null', studyItem.scopeType === 'study' && studyItem.scopeId === null);

  const mapNoteItem = ModerationService.createModerationItem({ contentType: 'map_note', contentId: 'pin_1', source: 'report', createdBy: student.id });
  check('Map note -> scopeType college (KMK)', mapNoteItem.scopeType === 'college' && mapNoteItem.scopeId === KMK);

  // --- 8. Create Report --------------------------------------------------------

  const reportResult = ModerationService.createReport({ reporterUserId: student.id, contentType: 'post', contentId: 103, category: 'spam', details: 'looks like spam' });
  check('createReport succeeds', Boolean(reportResult?.report?.id));
  check('Report starts status "open"', reportResult.report.status === 'open');
  check('Report scope derived from content (KMPP)', reportResult.report.scopeType === 'college' && reportResult.report.scopeId === KMPP);
  check('createReport also returns a moderationItem', Boolean(reportResult.moderationItem?.id));
  expectThrow('Report with invalid category rejected', () => ModerationService.createReport({ reporterUserId: student.id, contentType: 'post', contentId: 103, category: 'not_a_category' }));
  expectThrow('Report without reporterUserId rejected', () => ModerationService.createReport({ contentType: 'post', contentId: 103, category: 'spam' }));

  // --- 9/10/11. Multiple reports, no auto-delete, dedupe to same item -------

  const secondReport = ModerationService.createReport({ reporterUserId: 'user_student_2', contentType: 'post', contentId: 103, category: 'harassment', details: 'also reporting' });
  check('Second report on same content succeeds independently', Boolean(secondReport?.report?.id));
  check('Second report has a different report id than the first', secondReport.report.id !== reportResult.report.id);
  check('Duplicate reports reuse the SAME active moderation item', secondReport.moderationItem.id === reportResult.moderationItem.id);
  check('Reused moderation item risk score increased (priority raised)', secondReport.moderationItem.riskScore > reportResult.moderationItem.riskScore);
  check('Reports do not auto-delete/hide content -- moderation item still pending', secondReport.moderationItem.status === 'pending');

  const reportsForContent = ModerationService.listReports({ contentType: 'post', contentId: 103 }, superAdmin);
  check('Both reports for content 103 are independently listed (report != delete, not merged away)', reportsForContent.length === 2);

  // --- Super Admin sees everything -------------------------------------------

  const allItemsForSuper = ModerationService.listModerationItems({}, superAdmin);
  check('Super Admin sees all moderation items', allItemsForSuper.length >= 7);

  // --- Global Moderator sees global only --------------------------------------

  const globalModItems = ModerationService.listModerationItems({}, globalModerator);
  check('Global Moderator sees the global item', globalModItems.some(item => item.id === globalItem.id));
  check('Global Moderator does NOT see the KMK item', !globalModItems.some(item => item.id === kmkItem.id));
  check('Global Moderator does NOT see the study item', !globalModItems.some(item => item.id === studyItem.id));
  // ADMIN-V2-FINAL-CORRECTION: a real GLOBAL_MODERATOR must NOT see the
  // always-KMK-scoped map_note item either -- canModerateMap() no longer
  // falls back to canModerateGlobalCommunity() (see
  // services/admin-permission-service.js's own FINAL-CORRECTION comment).
  check('Global Moderator does NOT see the always-KMK map_note item (FINAL-CORRECTION)', !globalModItems.some(item => item.id === mapNoteItem.id));

  // --- KMK College Admin sees KMK only; KMPP denied ---------------------------

  const kmkAdminItems = ModerationService.listModerationItems({}, kmkCollegeAdmin);
  check('KMK College Admin sees the KMK item', kmkAdminItems.some(item => item.id === kmkItem.id));
  check('KMK College Admin sees the jurusan-derived KMK item', kmkAdminItems.some(item => item.id === jurusanDerivedItem.id));
  check('KMK College Admin sees the building-default KMK item', kmkAdminItems.some(item => item.id === buildingItem.id));
  check('KMK College Admin sees the KMK-scoped map_note item', kmkAdminItems.some(item => item.id === mapNoteItem.id));
  check('KMK College Admin does NOT see the KMPP item', !kmkAdminItems.some(item => item.id === kmppItem.id));
  check('KMK College Admin does NOT see the global item', !kmkAdminItems.some(item => item.id === globalItem.id));
  check('KMPP item denied to KMK admin via getModerationItem too', ModerationService.getModerationItem(kmppItem.id, kmkCollegeAdmin) === null);

  const kmppAdminItems = ModerationService.listModerationItems({}, kmppCollegeAdmin);
  check('KMPP College Admin sees the KMPP item', kmppAdminItems.some(item => item.id === kmppItem.id));
  check('KMPP College Admin does NOT see the KMK item', !kmppAdminItems.some(item => item.id === kmkItem.id));

  // --- Study Moderator sees study only ----------------------------------------

  const studyModItems = ModerationService.listModerationItems({}, studyModerator);
  check('Study Moderator sees the study item', studyModItems.some(item => item.id === studyItem.id));
  check('Study Moderator does NOT see the global item', !studyModItems.some(item => item.id === globalItem.id));
  check('Study Moderator does NOT see the KMK item', !studyModItems.some(item => item.id === kmkItem.id));

  // --- Student / Guest denied --------------------------------------------------

  check('Student sees zero moderation items', ModerationService.listModerationItems({}, student).length === 0);
  check('Guest sees zero moderation items', ModerationService.listModerationItems({}, guest).length === 0);
  expectThrow('Student cannot updateModerationStatus', () => ModerationService.updateModerationStatus(globalItem.id, 'approved', student));
  expectThrow('Guest cannot updateModerationStatus', () => ModerationService.updateModerationStatus(globalItem.id, 'approved', guest));

  // --- Disabled RoleAssignment denied ------------------------------------------

  check('Disabled STUDY_MODERATOR assignment sees zero study items', ModerationService.listModerationItems({}, disabledStudyModerator).length === 0);
  expectThrow('Disabled STUDY_MODERATOR assignment cannot updateModerationStatus', () => ModerationService.updateModerationStatus(studyItem.id, 'approved', disabledStudyModerator));

  // --- Status transition validation --------------------------------------------

  const approvedItem = ModerationService.updateModerationStatus(globalItem.id, 'approved', superAdmin);
  check('pending -> approved succeeds', approvedItem.status === 'approved');
  check('Approving sets resolvedAt', Boolean(approvedItem.resolvedAt));
  expectThrow('approved -> escalated is an invalid transition', () => ModerationService.updateModerationStatus(globalItem.id, 'escalated', superAdmin, { reason: 'QA' }));
  expectThrow('ADMIN-V2-004: hide without a reason is rejected (reason required)', () => ModerationService.updateModerationStatus(globalItem.id, 'hidden', superAdmin));
  const hiddenAfterApproved = ModerationService.updateModerationStatus(globalItem.id, 'hidden', superAdmin, { reason: 'Contains spam links' });
  check('approved -> hidden succeeds (retroactive hide is allowed) with a reason', hiddenAfterApproved.status === 'hidden' && hiddenAfterApproved.reason === 'Contains spam links');
  const restored = ModerationService.updateModerationStatus(globalItem.id, 'pending', superAdmin);
  check('hidden -> pending succeeds (restore for re-review), no reason required', restored.status === 'pending');
  expectThrow('ADMIN-V2-004: escalate without a reason is rejected (reason required)', () => ModerationService.updateModerationStatus(kmkItem.id, 'escalated', superAdmin));
  const escalated = ModerationService.updateModerationStatus(kmkItem.id, 'escalated', superAdmin, { reason: 'Needs Super Admin review' });
  check('pending -> escalated succeeds with a reason', escalated.status === 'escalated');
  expectThrow('escalated -> pending is an invalid transition (must resolve, not silently un-escalate)', () => ModerationService.updateModerationStatus(kmkItem.id, 'pending', superAdmin));
  expectThrow('Unknown status value rejected by updateModerationStatus', () => ModerationService.updateModerationStatus(kmppItem.id, 'not_a_status', superAdmin));

  // --- getQueueItems default filter (active only) ------------------------------

  expectThrow('ADMIN-V2-004: reject without a reason is rejected (reason required)', () => ModerationService.updateModerationStatus(kmppItem.id, 'rejected', superAdmin));
  expectThrow('ADMIN-V2-004: reject with a whitespace-only reason is rejected', () => ModerationService.updateModerationStatus(kmppItem.id, 'rejected', superAdmin, { reason: '   ' }));
  const rejected = ModerationService.updateModerationStatus(kmppItem.id, 'rejected', superAdmin, { reason: 'Duplicate of another KMPP post' });
  check('kmppItem rejected with a reason', rejected.status === 'rejected' && rejected.reason === 'Duplicate of another KMPP post');
  const superQueue = ModerationService.getQueueItems(superAdmin);
  check('getQueueItems excludes rejected items by default', !superQueue.some(item => item.id === kmppItem.id));
  check('getQueueItems includes escalated items by default', superQueue.some(item => item.id === kmkItem.id));

  // --- updateReportStatus ---------------------------------------------------

  const reviewingReport = ModerationService.updateReportStatus(reportResult.report.id, 'reviewing', kmppCollegeAdmin);
  check('KMPP College Admin can update a KMPP-scoped report status', reviewingReport.status === 'reviewing');
  expectThrow('KMK College Admin cannot update a KMPP-scoped report', () => ModerationService.updateReportStatus(secondReport.report.id, 'dismissed', kmkCollegeAdmin));
  expectThrow('Invalid report status rejected', () => ModerationService.updateReportStatus(reportResult.report.id, 'not_a_status', superAdmin));

  // --- ADMIN-V2-002A: Map Note integration ------------------------------------
  // contentId uses the real recordKey convention services/map-note-service.js's
  // canonicalRecordKey() produces ("note:<id>" for anchored building-wall map
  // notes, "pin:<id>" for direct pins) so ModerationService and MapNoteService
  // always agree on the same contentId for the same note.

  const anchoredMapNoteItem = ModerationService.createModerationItem({ contentType: 'map_note', contentId: 'note:501', source: 'admin', createdBy: superAdmin.id });
  check('Real-shaped anchored map note (note:501) -> scopeType college, scopeId KMK', anchoredMapNoteItem.scopeType === 'college' && anchoredMapNoteItem.scopeId === KMK);
  const directPinItem = ModerationService.createModerationItem({ contentType: 'map_note', contentId: 'pin:900', source: 'admin', createdBy: superAdmin.id });
  check('Real-shaped direct pin (pin:900) -> scopeType college, scopeId KMK', directPinItem.scopeType === 'college' && directPinItem.scopeId === KMK);
  expectThrow('Map note supplied with scopeId=KMPP is rejected (caller cannot claim KMPP)', () => ModerationService.createModerationItem({ contentType: 'map_note', contentId: 'note:501', source: 'admin', scopeType: 'college', scopeId: KMPP }));

  const mapReport1 = ModerationService.createReport({ reporterUserId: student.id, contentType: 'map_note', contentId: 'note:777', category: 'spam', details: 'map report QA 1' });
  check('Map report creates a Report', Boolean(mapReport1?.report?.id));
  check('Map report scope derived as KMK college', mapReport1.report.scopeType === 'college' && mapReport1.report.scopeId === KMK);
  check('Map report creates a ModerationItem', Boolean(mapReport1.moderationItem?.id));
  const mapReport2 = ModerationService.createReport({ reporterUserId: 'user_student_2', contentType: 'map_note', contentId: 'note:777', category: 'harassment', details: 'map report QA 2' });
  check('Second map report reuses the SAME active moderation item (no duplicate queue case)', mapReport2.moderationItem.id === mapReport1.moderationItem.id);
  check('Second map report raised the shared item risk score', mapReport2.moderationItem.riskScore > mapReport1.moderationItem.riskScore);
  const mapReportsForContent = ModerationService.listReports({ contentType: 'map_note', contentId: 'note:777' }, superAdmin);
  check('Both map reports independently listed', mapReportsForContent.length === 2);

  check('Super Admin can read the map note item', Boolean(ModerationService.getModerationItem(mapReport1.moderationItem.id, superAdmin)));
  const superMapUpdate = ModerationService.updateModerationStatus(mapReport1.moderationItem.id, 'approved', superAdmin);
  check('Super Admin can update the map note item', superMapUpdate.status === 'approved');
  check('KMK College Admin (allowed Map moderator under the shared college-scope gate) can read the map note item', Boolean(ModerationService.getModerationItem(directPinItem.id, kmkCollegeAdmin)));
  const kmkMapUpdate = ModerationService.updateModerationStatus(directPinItem.id, 'hidden', kmkCollegeAdmin, { reason: 'Off-topic pin' });
  check('KMK College Admin can operate on a KMK map note item (Hide status mapping)', kmkMapUpdate.status === 'hidden');
  check('Wrong-college (KMPP) admin denied read access to a KMK map note item', ModerationService.getModerationItem(directPinItem.id, kmppCollegeAdmin) === null);
  expectThrow('Wrong-college (KMPP) admin denied write access to a KMK map note item', () => ModerationService.updateModerationStatus(directPinItem.id, 'approved', kmppCollegeAdmin));
  expectThrow('Student denied write access to a map note item', () => ModerationService.updateModerationStatus(directPinItem.id, 'approved', student));
  expectThrow('Guest denied write access to a map note item', () => ModerationService.updateModerationStatus(directPinItem.id, 'approved', guest));
  check('Student sees zero map note items', ModerationService.listModerationItems({ contentType: 'map_note' }, student).length === 0);
  check('Guest sees zero map note items', ModerationService.listModerationItems({ contentType: 'map_note' }, guest).length === 0);

  const restoredMapItem = ModerationService.updateModerationStatus(directPinItem.id, 'pending', kmkCollegeAdmin);
  check('hidden -> pending is a valid restore/reopen transition for a map note item', restoredMapItem.status === 'pending');
  const rejectedAfterHidden = ModerationService.updateModerationStatus(anchoredMapNoteItem.id, 'hidden', superAdmin, { reason: 'Reported as spam' });
  check('pending -> hidden succeeds (simulating admin Hide)', rejectedAfterHidden.status === 'hidden');
  const deletedMapItem = ModerationService.updateModerationStatus(anchoredMapNoteItem.id, 'rejected', superAdmin, { reason: 'Confirmed spam, hard delete' });
  check('hidden -> rejected is a valid transition (simulating a hard Delete of previously-hidden content)', deletedMapItem.status === 'rejected');

  // --- ADMIN-V2-003A: legacy admin / Old Map Admin parity fix ----------------
  // mzteoh88-style legacy admin: role==='admin', NOT the super-admin email.
  // Holds only the virtual LEGACY_ADMIN_PSEUDO_ROLE assignment (global-scope
  // GLOBAL_COMMUNITY_MODERATE + STUDY_RESOURCE_MODERATE -- no college
  // RoleAssignment at all; see services/admin-permission-service.js). Before
  // this fix, canAccessScopeForModeration required canModerateCollege(user,
  // KMK) for every college-scoped item including map_note, which a legacy
  // admin never passes -- exactly the "Old Map Admin tab allowed it, Unified
  // Queue silently hid it" inconsistency the ADMIN-V2-003A spec calls out.

  const legacyAdmin = { id: 'user_legacy_1', email: 'legacyadmin@example.com', role: 'admin' };
  check('Legacy admin is recognized as isLegacyAdmin, not Super Admin', AdminPermissionService.isLegacyAdmin(legacyAdmin) && !AdminPermissionService.isSuperAdmin(legacyAdmin));
  const legacyAdminItems = ModerationService.listModerationItems({}, legacyAdmin);
  check('Legacy admin sees the KMK-scoped map_note item (parity with the Old Map Admin tab)', legacyAdminItems.some(item => item.id === mapNoteItem.id));
  check('Legacy admin sees the always-KMK anchored map note item too', legacyAdminItems.some(item => item.id === anchoredMapNoteItem.id));
  check('Legacy admin still cannot see the KMK Community post (no COLLEGE_ADMIN grant)', !legacyAdminItems.some(item => item.id === kmkItem.id));
  check('Legacy admin still cannot see the KMPP Community post', !legacyAdminItems.some(item => item.id === kmppItem.id));
  check('Legacy admin can read a map note item via getModerationItem', Boolean(ModerationService.getModerationItem(mapReport1.moderationItem.id, legacyAdmin)));
  const legacyMapUpdate = ModerationService.updateModerationStatus(anchoredMapNoteItem.id, 'pending', legacyAdmin);
  check('Legacy admin can act on a map note item (matches Old Map Admin tab capability)', legacyMapUpdate.status === 'pending');
  check('AdminPermissionService.canModerateMap: legacy admin true for KMK', AdminPermissionService.canModerateMap(legacyAdmin, KMK));
  check('AdminPermissionService.canModerateMap: KMK College Admin true for KMK (unchanged prior behavior, preserved via fallback)', AdminPermissionService.canModerateMap(kmkCollegeAdmin, KMK));
  check('AdminPermissionService.canModerateMap: KMK College Admin false for KMPP (no cross-college leak)', !AdminPermissionService.canModerateMap(kmkCollegeAdmin, KMPP));
  check('AdminPermissionService.canModerateMap: student false', !AdminPermissionService.canModerateMap(student, KMK));
  check('AdminPermissionService.canModerateMap: guest false', !AdminPermissionService.canModerateMap(guest, KMK));
  check('Legacy admin does NOT gain ADMIN_MANAGE', !AdminPermissionService.hasPermission(legacyAdmin, AdminPermissionService.PERMISSIONS.ADMIN_MANAGE));
  check('Legacy admin does NOT gain AUDIT_READ_ALL', !AdminPermissionService.hasPermission(legacyAdmin, AdminPermissionService.PERMISSIONS.AUDIT_READ_ALL));
  check('Legacy admin does NOT gain the COLLEGE_ADMIN role', !AdminPermissionService.hasRole(legacyAdmin, ROLES.COLLEGE_ADMIN));
  check('Legacy admin does NOT gain the SUPER_ADMIN role', !AdminPermissionService.hasRole(legacyAdmin, ROLES.SUPER_ADMIN));

  // --- ADMIN-V2-FINAL-CORRECTION: audit failure blocks Hide/Reject -----------
  // Mocks AdminAuditService.createAuditAction to throw, then verifies
  // updateModerationStatus (Hide, Reject) leaves the item's status
  // UNCHANGED, restoring the real provider afterward and confirming normal
  // operation resumes with exactly one new AuditAction per action.

  // Uses a before/after AuditAction-count DIFF rather than an absolute
  // count, since contentId 101 already accrued a 'hide' AuditAction earlier
  // in this same run (hiddenAfterApproved) -- an absolute "length === 1"
  // check would be a false negative against that pre-existing record.
  const RealAdminAuditService = AdminAuditService;
  const throwingAuditService = { createAuditAction: () => { throw new Error('Simulated AdminAuditService failure'); } };
  const faultItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 101, source: 'admin', createdBy: superAdmin.id });
  const hideAuditCountBefore = AdminAuditService.listAuditActions({ action: 'hide', targetId: String(faultItem.contentId) }, superAdmin).length;

  context.window.AdminAuditService = throwingAuditService;
  expectThrow('Hide: throws when AdminAuditService fails', () =>
    ModerationService.updateModerationStatus(faultItem.id, 'hidden', superAdmin, { reason: 'Fault-injection test' }));
  check('Hide: item status NOT changed when audit fails', ModerationService.getModerationItem(faultItem.id, superAdmin).status === 'pending');

  expectThrow('Reject: throws when AdminAuditService fails', () =>
    ModerationService.updateModerationStatus(faultItem.id, 'rejected', superAdmin, { reason: 'Fault-injection test' }));
  check('Reject: item status NOT changed when audit fails', ModerationService.getModerationItem(faultItem.id, superAdmin).status === 'pending');

  context.window.AdminAuditService = RealAdminAuditService;
  const hiddenAfterRestore = ModerationService.updateModerationStatus(faultItem.id, 'hidden', superAdmin, { reason: 'Retried after restore' });
  check('Hide: succeeds normally once AdminAuditService is restored', hiddenAfterRestore.status === 'hidden');
  check('Hide: exactly one new AuditAction after restore-and-retry', AdminAuditService.listAuditActions({ action: 'hide', targetId: String(faultItem.contentId) }, superAdmin).length === hideAuditCountBefore + 1);

  // --- ADMIN-V2-FINAL-CORRECTION: audit failure blocks Reviewer assign -------

  const assignFaultItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 105, source: 'admin', createdBy: superAdmin.id });
  const assignAuditCountBefore = AdminAuditService.listAuditActions({ action: 'assign', targetId: String(assignFaultItem.contentId) }, superAdmin).length;
  context.window.AdminAuditService = throwingAuditService;
  expectThrow('Reviewer assign: throws when AdminAuditService fails', () =>
    ModerationService.assignModerationItem(assignFaultItem.id, 'user_reviewer_fault', superAdmin));
  check('Reviewer assign: assignedTo NOT changed when audit fails', ModerationService.getModerationItem(assignFaultItem.id, superAdmin).assignedTo === null);

  context.window.AdminAuditService = RealAdminAuditService;
  const assignedAfterRestore = ModerationService.assignModerationItem(assignFaultItem.id, 'user_reviewer_fault', superAdmin);
  check('Reviewer assign: succeeds normally once AdminAuditService is restored', assignedAfterRestore.assignedTo === 'user_reviewer_fault');
  check('Reviewer assign: exactly one new AuditAction after restore-and-retry', AdminAuditService.listAuditActions({ action: 'assign', targetId: String(assignFaultItem.contentId) }, superAdmin).length === assignAuditCountBefore + 1);
}

// ADMIN-V2-002A: proves the KMK college id is a real lookup against the
// canonical `organizations` config, not a hardcoded literal that happens
// to equal 1 -- this sandbox gives KMK a deliberately unusual id (77) and
// confirms every KMK-scoped derivation follows it.
function runKmkLookupIndependenceCheck() {
  const distinctiveKmkId = 77;
  const organizationsFixture = Object.freeze([Object.freeze({ id: distinctiveKmkId, name: 'KMK', type: 'college' })]);
  const notesFixture = Object.freeze([Object.freeze({ id: 1, contextType: 'building', placeId: 'B_PUSTAKA' })]);
  const sandbox = buildSandbox(organizationsFixture, notesFixture);
  const context = loadServicesIntoContext(sandbox);
  const ModerationService = context.ModerationService;
  const buildingItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 1, source: 'admin' });
  check('KMK org id is resolved from organizations config, not hardcoded (building post)', buildingItem.scopeId === distinctiveKmkId);
  const mapItem = ModerationService.createModerationItem({ contentType: 'map_note', contentId: 'note:1', source: 'admin' });
  check('KMK org id is resolved from organizations config, not hardcoded (map note)', mapItem.scopeId === distinctiveKmkId);
}

try {
  run();
  runKmkLookupIndependenceCheck();
  console.log(`\n${passCount} passed, ${failCount} failed.`);
  if (failCount > 0) {
    console.error('\nFailed checks:', failures);
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Test run crashed:', error);
  process.exitCode = 1;
}
