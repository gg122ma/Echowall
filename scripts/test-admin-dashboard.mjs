#!/usr/bin/env node
/**
 * ADMIN-V2-003 — direct-call test suite for the Unified Admin Dashboard's
 * pure helpers (app-admin-dashboard.js), built on top of the ADMIN-V2-001/
 * 001A Role/Scope contract and the ADMIN-V2-002/002A ModerationService.
 *
 * Same approach as the other scripts/test-admin-*.mjs suites (this repo has
 * no test runner — see CLAUDE.md): load the real service files plus the
 * real app-admin-dashboard.js into a Node `vm` sandbox and exercise only
 * the PURE HELPER functions (adminDashboardVisibleScopes,
 * adminDashboardFilterItems, adminDashboardSortQueue,
 * adminDashboardGroupReports, adminDashboardOverviewCounts,
 * adminDashboardContentPreview, adminDashboardModuleForContentType) —
 * these never touch `document`, so loading the whole file (its render
 * functions are simply never called) is safe in a DOM-less sandbox.
 * Run with `node scripts/test-admin-dashboard.mjs`.
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
  Object.freeze({ id: 101, contextType: 'community', communityKey: 'global:all', content: 'Global note about orientation week.' }),
  Object.freeze({ id: 102, contextType: 'community', communityKey: `college:${KMK}`, content: 'KMK note about the library.' }),
  Object.freeze({ id: 103, contextType: 'community', communityKey: `college:${KMPP}`, content: 'KMPP note about the cafeteria.' }),
]);

function loadServicesIntoContext(sandbox) {
  const context = vm.createContext(sandbox);
  const files = [
    'i18n/locales/en.js',
    'services/admin-permission-service.js',
    'services/community-service.js',
    'services/moderation-service.js',
    'services/admin-audit-service.js',
    'app-admin-dashboard.js',
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
    organizations: FIXTURE_ORGANIZATIONS,
    getRuntimeNotes: () => FIXTURE_NOTES,
    // ADMIN-V2-003A: real i18n/locales/en.js is loaded into this sandbox as
    // window.EchoLocales.en (see loadServicesIntoContext) -- this I18n.t
    // mirrors the real i18n/index.js's lookup + `{var}` interpolate() logic
    // exactly, so pure helpers like adminDashboardContentPreview that call
    // I18n.t("admin.dash.previewRecord", {id}) produce the SAME real string
    // production does. A dumb `key => key` stub would silently hide a
    // missing-translation-key bug behind a passing test.
    I18n: {
      t: (key, vars = {}) => {
        const table = (sandbox.window && sandbox.window.EchoLocales && sandbox.window.EchoLocales.en) || {};
        const template = table[key] ?? key;
        return String(template).replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
      },
    },
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

function run() {
  const sandbox = buildSandbox();
  const context = loadServicesIntoContext(sandbox);
  const AdminPermissionService = context.AdminPermissionService;
  const ModerationService = context.ModerationService;
  const { ROLES } = AdminPermissionService;

  check('app-admin-dashboard.js pure helpers loaded', typeof context.adminDashboardVisibleScopes === 'function');

  const superAdmin = { id: 'user_super_1', email: 'greencucumbertube@gmail.com', role: 'user' };
  const guest = null;
  const student = { id: 'user_student_1', email: 'student@example.com', role: 'user' };
  const globalModerator = { id: 'user_global_mod_1', email: 'globalmod@example.com', role: 'user' };
  const kmkCollegeAdmin = { id: 'user_kmk_admin_1', email: 'kmkadmin@example.com', role: 'user' };
  const kmppCollegeAdmin = { id: 'user_kmpp_admin_1', email: 'kmppadmin@example.com', role: 'user' };
  const multiCollegeAdmin = { id: 'user_multi_admin_1', email: 'multiadmin@example.com', role: 'user' };
  const studyModerator = { id: 'user_study_mod_1', email: 'studymod@example.com', role: 'user' };
  const legacyAdmin = { id: 'user_legacy_1', email: 'mzteoh88@gmail.com', role: 'admin' };

  AdminPermissionService.grantRoleAssignment({ userId: globalModerator.id, role: ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmkCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: kmppCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMPP, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: multiCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: multiCollegeAdmin.id, role: ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMPP, grantedBy: superAdmin.id });
  AdminPermissionService.grantRoleAssignment({ userId: studyModerator.id, role: ROLES.STUDY_MODERATOR, scopeType: 'study', grantedBy: superAdmin.id });

  // --- Module mapping ---------------------------------------------------------

  check('post -> community module', context.adminDashboardModuleForContentType('post') === 'community');
  check('map_note -> map module', context.adminDashboardModuleForContentType('map_note') === 'map');
  check('study_resource -> study module', context.adminDashboardModuleForContentType('study_resource') === 'study');
  check('comment -> no module (no live feature yet)', context.adminDashboardModuleForContentType('comment') === null);
  check('event -> no module (no live feature yet)', context.adminDashboardModuleForContentType('event') === null);

  // --- Visible scopes: no unauthorized scope leaked in options ---------------

  const superScopes = context.adminDashboardVisibleScopes(superAdmin).map(o => o.label);
  check('Super Admin sees All + Global + Study + every real college', superScopes.includes('All permitted scopes') && superScopes.includes('Global') && superScopes.includes('Study') && superScopes.includes('KMK') && superScopes.includes('KMPP'));
  check('Super Admin scope list is NOT a hardcoded 2-college list (reflects config)', superScopes.length === 5);

  const globalModScopes = context.adminDashboardVisibleScopes(globalModerator).map(o => o.label);
  check('Global Moderator sees ONLY Global (no "All", no colleges, no Study)', globalModScopes.length === 1 && globalModScopes[0] === 'Global');

  const kmkScopes = context.adminDashboardVisibleScopes(kmkCollegeAdmin).map(o => o.label);
  check('KMK College Admin sees ONLY KMK', kmkScopes.length === 1 && kmkScopes[0] === 'KMK');
  check('KMK College Admin scope list does NOT include KMPP', !kmkScopes.includes('KMPP'));

  const kmppScopes = context.adminDashboardVisibleScopes(kmppCollegeAdmin).map(o => o.label);
  check('KMPP College Admin sees ONLY KMPP', kmppScopes.length === 1 && kmppScopes[0] === 'KMPP');

  const multiScopes = context.adminDashboardVisibleScopes(multiCollegeAdmin).map(o => o.label);
  check('Multi-college admin (KMK+KMPP) sees All + KMK + KMPP, nothing else', multiScopes.length === 3 && multiScopes.includes('All permitted scopes') && multiScopes.includes('KMK') && multiScopes.includes('KMPP'));

  const studyModScopes = context.adminDashboardVisibleScopes(studyModerator).map(o => o.label);
  check('Study Moderator sees ONLY Study', studyModScopes.length === 1 && studyModScopes[0] === 'Study');

  const legacyScopes = context.adminDashboardVisibleScopes(legacyAdmin).map(o => o.label);
  check('Legacy admin (Global+Study permission from one assignment) sees All + Global + Study, not derived from assignment.scopeType alone', legacyScopes.length === 3 && legacyScopes.includes('Global') && legacyScopes.includes('Study'));

  check('Student sees no scope options', context.adminDashboardVisibleScopes(student).length === 0);
  check('Guest sees no scope options', context.adminDashboardVisibleScopes(guest).length === 0);

  // --- Create real moderation items/reports spanning every scope -------------

  const globalItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 101, source: 'admin', createdBy: superAdmin.id });
  const kmkItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 102, source: 'admin', createdBy: superAdmin.id });
  const kmppItem = ModerationService.createModerationItem({ contentType: 'post', contentId: 103, source: 'admin', createdBy: superAdmin.id });
  const studyItem = ModerationService.createModerationItem({ contentType: 'study_resource', contentId: 'study_1', source: 'submission', createdBy: student.id });
  const mapItem = ModerationService.createModerationItem({ contentType: 'map_note', contentId: 'note:1', source: 'report', createdBy: student.id });
  ModerationService.updateModerationStatus(kmppItem.id, 'escalated', superAdmin, { reason: 'QA fixture: needs priority review' });
  const approvedGlobal = ModerationService.updateModerationStatus(globalItem.id, 'approved', superAdmin);

  // --- Overview counts: Super Admin sees all permitted data -------------------

  const allItemsForSuper = ModerationService.listModerationItems({}, superAdmin);
  const allReportsForSuper = ModerationService.listReports({}, superAdmin);
  const superCounts = context.adminDashboardOverviewCounts(allItemsForSuper, allReportsForSuper);
  check('Super Admin overview counts include every item (5 created)', superCounts.total === 5);
  check('Super Admin byModule.community counts global+KMK+KMPP posts (3)', superCounts.byModule.community === 3);
  check('Super Admin byModule.study counts the study item', superCounts.byModule.study === 1);
  check('Super Admin byModule.map counts the map item', superCounts.byModule.map === 1);
  check('Super Admin resolved count reflects the approved item', superCounts.resolved === 1);
  check('Super Admin escalated count reflects the escalated KMPP item', superCounts.escalated === 1);

  // --- Overview counts: Global Moderator sees GLOBAL-SCOPE DATA ONLY --------
  // (ADMIN-V2-FINAL-CORRECTION: ADMIN-V2-003A had briefly made Map share
  // Community's canModerateGlobalCommunity gate for EVERY global-tier
  // permission holder, which incorrectly let a real GLOBAL_MODERATOR see
  // the always-KMK-scoped map item too -- a Permission Matrix violation
  // ("GLOBAL_MODERATOR 不允许: College Map"). canModerateMap() now checks
  // isLegacyAdmin() directly instead of canModerateGlobalCommunity(), so
  // only Super Admin/legacy admin/a matching COLLEGE_ADMIN see Map items;
  // a real GLOBAL_MODERATOR is back to Global-scope-only, exactly like
  // College Community moderation was already correctly excluded.)

  const globalModItems = ModerationService.listModerationItems({}, globalModerator);
  const globalModReports = ModerationService.listReports({}, globalModerator);
  const globalModCounts = context.adminDashboardOverviewCounts(globalModItems, globalModReports);
  check('Global Moderator overview total is exactly 1 (global item ONLY -- no map item)', globalModCounts.total === 1);
  check('Global Moderator byModule.community is 1 (not 3 -- KMK/KMPP College posts excluded)', globalModCounts.byModule.community === 1);
  check('Global Moderator byModule.map is 0 (FINAL-CORRECTION: Map no longer shares the Community moderation gate)', globalModCounts.byModule.map === 0);
  check('Global Moderator still cannot see the KMK/KMPP College Community posts', !globalModItems.some(i => i.id === kmkItem.id) && !globalModItems.some(i => i.id === kmppItem.id));
  check('Global Moderator still cannot see the always-KMK map item', !globalModItems.some(i => i.id === mapItem.id));

  // --- KMK College Admin sees ONLY KMK; cannot see KMPP -----------------------
  // (map_note is ALWAYS KMK-scoped -- see moderation-service.js -- so a KMK
  // admin correctly sees both the KMK post AND the map item: 2 items.)

  const kmkItems = ModerationService.listModerationItems({}, kmkCollegeAdmin);
  check('KMK College Admin sees exactly the KMK post + the (always-KMK) map item', kmkItems.length === 2 && kmkItems.some(i => i.id === kmkItem.id) && kmkItems.some(i => i.id === mapItem.id));
  check('KMK College Admin cannot see the KMPP item', !kmkItems.some(item => item.id === kmppItem.id));
  check('KMK College Admin cannot see the KMPP item even when scope is forced in the filter', context.adminDashboardFilterItems(ModerationService.listModerationItems({}, kmkCollegeAdmin), { scope: 'college:3' }).length === 0);

  // --- Multi-scope admin (KMK+KMPP) sees both, nothing else -------------------

  const multiItems = ModerationService.listModerationItems({}, multiCollegeAdmin);
  check('Multi-scope admin sees exactly KMK post + KMPP post + the (always-KMK) map item (3)', multiItems.length === 3 && multiItems.some(i => i.id === kmkItem.id) && multiItems.some(i => i.id === kmppItem.id) && multiItems.some(i => i.id === mapItem.id));
  check('Multi-scope admin does not see the global or study item', !multiItems.some(i => i.id === globalItem.id) && !multiItems.some(i => i.id === studyItem.id));

  // --- Study Moderator sees ONLY study ----------------------------------------

  const studyModItems = ModerationService.listModerationItems({}, studyModerator);
  check('Study Moderator overview total is exactly the 1 study item', studyModItems.length === 1 && studyModItems[0].id === studyItem.id);

  // --- Student / Guest: no admin dashboard data -------------------------------

  check('Student sees zero moderation items', ModerationService.listModerationItems({}, student).length === 0);
  check('Guest sees zero moderation items', ModerationService.listModerationItems({}, guest).length === 0);
  const studentCounts = context.adminDashboardOverviewCounts(ModerationService.listModerationItems({}, student), ModerationService.listReports({}, student));
  check('Student overview counts are all zero', studentCounts.total === 0 && studentCounts.pending === 0 && studentCounts.reported === 0);

  // --- Reports: 3 reports same content -> report count 3, queue case count 1 -

  const r1 = ModerationService.createReport({ reporterUserId: student.id, contentType: 'post', contentId: 102, category: 'spam', details: 'r1' });
  const r2 = ModerationService.createReport({ reporterUserId: 'user_student_2', contentType: 'post', contentId: 102, category: 'harassment', details: 'r2' });
  const r3 = ModerationService.createReport({ reporterUserId: 'user_student_3', contentType: 'post', contentId: 102, category: 'duplicate', details: 'r3' });
  const kmkReports = ModerationService.listReports({ contentType: 'post', contentId: 102 }, superAdmin);
  check('3 reports on the same content are 3 independent report records', kmkReports.length === 3);
  const groups = context.adminDashboardGroupReports(kmkReports);
  check('3 reports on the same content group into exactly 1 queue case', groups.length === 1 && groups[0].reportCount === 3);
  check('Duplicate reports reused ONE active ModerationItem (not 3)', r1.moderationItem.id === r2.moderationItem.id && r2.moderationItem.id === r3.moderationItem.id);

  // --- Filters: status / module / scope / source ------------------------------

  const everythingForSuper = ModerationService.listModerationItems({}, superAdmin);
  check('Filter by status=escalated returns only the KMPP item', context.adminDashboardFilterItems(everythingForSuper, { status: 'escalated' }).every(i => i.status === 'escalated'));
  check('Filter by status=active excludes the approved item', !context.adminDashboardFilterItems(everythingForSuper, { status: 'active' }).some(i => i.id === approvedGlobal.id));
  check('Filter by module=study returns only the study item', context.adminDashboardFilterItems(everythingForSuper, { module: 'study' }).every(i => i.contentType === 'study_resource'));
  check('Filter by module=map returns only the map item', context.adminDashboardFilterItems(everythingForSuper, { module: 'map' }).every(i => i.contentType === 'map_note'));
  check('Filter by scope=college:1 returns only KMK items', context.adminDashboardFilterItems(everythingForSuper, { scope: `college:${KMK}` }).every(i => i.scopeType === 'college' && i.scopeId === KMK));
  check('Filter by source=submission returns only the study item', context.adminDashboardFilterItems(everythingForSuper, { source: 'submission' }).every(i => i.source === 'submission'));
  check('Filter by source=report returns only the map item', context.adminDashboardFilterItems(everythingForSuper, { source: 'report' }).every(i => i.source === 'report'));

  // --- Risk / status ordering --------------------------------------------------

  ModerationService.updateModerationStatus(mapItem.id, 'escalated', superAdmin, { reason: 'QA fixture: needs priority review' });
  const midPriority = ModerationService.listModerationItems({}, superAdmin).find(i => i.id === kmkItem.id);
  const sorted = context.adminDashboardSortQueue(ModerationService.listModerationItems({}, superAdmin));
  const escalatedIndexes = sorted.map((item, index) => (item.status === 'escalated' ? index : -1)).filter(index => index >= 0);
  const pendingIndexes = sorted.map((item, index) => (item.status === 'pending' ? index : -1)).filter(index => index >= 0);
  check('Sorted queue puts every escalated item before every pending item', escalatedIndexes.length > 0 && pendingIndexes.length > 0 && Math.max(...escalatedIndexes) < Math.min(...pendingIndexes));

  // --- Resolved history excludes active queue ---------------------------------

  const historyForSuper = context.adminDashboardHistoryItems(ModerationService.listModerationItems({}, superAdmin));
  check('History includes the approved item', historyForSuper.some(i => i.id === approvedGlobal.id));
  check('History excludes pending/escalated (active) items', !historyForSuper.some(i => i.status === 'pending' || i.status === 'escalated'));

  // --- Content preview: safe, canonical, no internal storage details ---------

  const communityPreview = context.adminDashboardContentPreview(kmkItem);
  check('Community post preview shows a real excerpt from canonical content', communityPreview.detail.includes('library'));
  const studyPreview = context.adminDashboardContentPreview(studyItem);
  check('Study resource preview does not crash when no StudyResourceService exists (safe fallback)', typeof studyPreview.title === 'string');
  const mapPreview = context.adminDashboardContentPreview(mapItem);
  check('Map note preview shows the record key, not raw internal fields', mapPreview.detail.includes('note:1'));

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
