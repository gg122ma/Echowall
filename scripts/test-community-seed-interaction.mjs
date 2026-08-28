#!/usr/bin/env node
/**
 * COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY — direct-call test suite.
 *
 * Covers:
 *  - Legacy (696-note) demo/seed community posts get a stable id and are
 *    normalized (postType/communityKey/communityScope/moderationStatus)
 *    into the exact shape a normal user post already has, so Post Detail /
 *    CommentService need zero seed-specific branching.
 *  - Comment persistence for a seed post uses the SAME CommentService/
 *    storage key a normal post uses, bound by post id, and survives a
 *    simulated reload (re-running the seed activation pipeline).
 *  - Real user posts (the `notes` array) are never touched by seed
 *    normalization/activation.
 *  - Echo Library: the i18n label contract changed; the internal `#/study`
 *    route/page keys did not.
 *
 * This project has no test runner/package manager (see CLAUDE.md) — run
 * directly with `node scripts/test-community-seed-interaction.mjs`. Loads
 * the real app-data.js/services/*.js source files in a minimal vm sandbox
 * (same approach as scripts/test-study-upload.mjs) — no DOM, no real
 * localStorage/IndexedDB, a small in-memory localStorage fake instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
}

function createFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
    clear: () => store.clear(),
  };
}

function buildSandbox(localStorage) {
  const sandbox = {
    console,
    setTimeout, clearTimeout, queueMicrotask,
    localStorage,
    dispatchEvent: () => {},
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  };
  sandbox.window = sandbox;
  return sandbox;
}

function loadFile(context, relativePath) {
  const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

const fakeLocalStorage = createFakeLocalStorage();
const sandbox = buildSandbox(fakeLocalStorage);
const context = vm.createContext(sandbox);
loadFile(context, 'services/community-service.js');
loadFile(context, 'services/comment-service.js');
loadFile(context, 'data/demo-seed-bundle.v1.js');
loadFile(context, 'data/demo-seed-all-student-km.v1.js');
loadFile(context, 'app-data.js');

const CommunityService = context.CommunityService;
const CommentService = context.CommentService;

check('CommunityService loaded', Boolean(CommunityService));
check('CommentService loaded', Boolean(CommentService));
check('activateDemoSeedSnapshot loaded', typeof context.activateDemoSeedSnapshot === 'function');
check('EchoPostTypeContract loaded', Boolean(context.EchoPostTypeContract));

// --- Real user post fixture, injected before any seed activation, exactly
// like a real signed-in user's post already in `notes` when the page loads.

const REAL_USER_POST = Object.freeze({
  id: 500,
  schemaVersion: 3,
  contextType: 'community',
  orgId: 1,
  batchId: null,
  majorId: 1,
  placeId: '',
  postType: 'discussion',
  questionStatus: null,
  communityKey: 'jurusan:1:1',
  communityScope: 'jurusan',
  moderationStatus: 'published',
  commentCount: 0,
  category: 'academic',
  isAnonymous: true,
  authorNickname: null,
  authorUserId: 'real_user_1',
  shape: 'rounded',
  color: '#BFDBFE',
  rotation: 1,
  upvotes: 0, downvotes: 0, score: 0, userVote: null,
  createdAt: '2026-08-20T10:00:00.000Z',
  content: 'A real user wrote this post.',
});
// Loaded through the same real bootstrap path production uses
// (loadNotes() reading localStorage[STORAGE_KEY]) — NOT by poking the
// module-level `notes` binding directly, which a vm `let` declaration
// does not expose as a context property anyway.
fakeLocalStorage.setItem('echo-wall-notes', JSON.stringify([REAL_USER_POST]));
context.loadNotes({ readOnly: true });
check('loadNotes() picked up the fixture real user post', context.getRuntimeNotes().some(n => n.id === 500));

// --- First "page load": activate the demo seed --------------------------

const bundle = context.ECHO_WALL_DEMO_SEED_BUNDLE;
check('demo-seed-bundle.v1.js note count is 696', bundle.notes.length === 696);
context.activateDemoSeedSnapshot(bundle);

const runtimeNotesFirstLoad = context.getRuntimeNotes();
check('getRuntimeNotes includes the real user post unchanged', (() => {
  const found = runtimeNotesFirstLoad.find(n => n.id === 500);
  return found && found.content === REAL_USER_POST.content && found.postType === 'discussion' && found.communityKey === 'jurusan:1:1';
})());
check('Real user post total count is exactly 1 (not duplicated/reseeded)', runtimeNotesFirstLoad.filter(n => n.id === 500).length === 1);

// The 67 new All Student KM notes are the only demo-seed notes carrying a
// seedOrder field (see data/demo-seed-all-student-km.v1.js) -- everything
// else with isDemoSeedRuntime is one of the legacy bundle's 696 notes.
const legacySeedNotes = runtimeNotesFirstLoad.filter(n => n.isDemoSeedRuntime === true && n.seedOrder === undefined);
check('Legacy 696-note bundle notes are present as runtime notes', legacySeedNotes.length === 696, `got ${legacySeedNotes.length}`);

// Pick a fixed legacy seed note by its demoSeedKey (stable across runs since
// it is looked up by content key, not by array position).
const TARGET_KEY = 'batch06|community:2:4|note001';
const legacyTarget1 = runtimeNotesFirstLoad.find(n => n.demoSeedKey === TARGET_KEY);
check(`Legacy seed note ${TARGET_KEY} found`, Boolean(legacyTarget1));

// --- Old seed accepted by normal Post Detail: normalized fields present --

check('Legacy seed postType normalized to a canonical value', legacyTarget1 && ['discussion', 'question'].includes(legacyTarget1.postType));
check('Legacy seed postType defaults to discussion (raw JSON has no postType field)', legacyTarget1 && legacyTarget1.postType === 'discussion');
check('Legacy seed questionStatus is null for a discussion post', legacyTarget1 && legacyTarget1.questionStatus === null);
check('Legacy seed communityKey normalized to a valid key', legacyTarget1 && CommunityService.isValidCommunityKey(legacyTarget1.communityKey));
check('Legacy seed communityKey derived correctly from orgId/majorId', legacyTarget1 && legacyTarget1.communityKey === 'jurusan:2:4');
check('Legacy seed communityScope normalized', legacyTarget1 && legacyTarget1.communityScope === 'jurusan');
check('Legacy seed moderationStatus normalized to published', legacyTarget1 && legacyTarget1.moderationStatus === 'published');
check('Legacy seed original content untouched', legacyTarget1 && legacyTarget1.content === 'Pada minggu awal, cuba fahami cara setiap subjek saling berkait. Matematik, fizik dan lakaran bukan topik berasingan apabila digunakan untuk menyelesaikan masalah kejuruteraan.');
check('Legacy seed original author untouched', legacyTarget1 && legacyTarget1.authorNickname === 'Amani K.');

const legacyId1 = legacyTarget1.id;
check('Legacy seed id is a negative, non-user id', Number.isInteger(legacyId1) && legacyId1 < 0);

// --- Old seed comment allowed + persistence bound to the stable id -------

const createdComment = CommentService.createComment({
  postId: legacyId1,
  authorUserId: 'test_reader_1',
  isAnonymous: true,
  content: 'This is a real comment on a legacy seed post.',
});
check('Comment created on a legacy seed post', Boolean(createdComment && createdComment.id));
check('Comment count is 1 immediately after posting', CommentService.getCommentCount(legacyId1) === 1);
check('Comment thread contains the new comment', CommentService.getCommentThreadForPost(legacyId1)[0]?.content === 'This is a real comment on a legacy seed post.');

// --- Simulated reload: reactivate the seed and confirm the SAME id -------

context.activateDemoSeedSnapshot(bundle);
const runtimeNotesSecondLoad = context.getRuntimeNotes();
const legacyTarget2 = runtimeNotesSecondLoad.find(n => n.demoSeedKey === TARGET_KEY);
check('Legacy seed note id is stable across a simulated reload', legacyTarget2 && legacyTarget2.id === legacyId1);
check('Comment still bound to the same post id after reload', CommentService.getCommentCount(legacyTarget2.id) === 1);
check('Comment content survives reload (real persistence, not re-seeded)', CommentService.getCommentThreadForPost(legacyTarget2.id)[0]?.content === 'This is a real comment on a legacy seed post.');
check('Legacy seed note count is still exactly 696 after a second activation (no duplication)', runtimeNotesSecondLoad.filter(n => n.isDemoSeedRuntime === true && n.seedOrder === undefined).length === 696);

// --- Real user post still unaffected after seed reload + a seed comment --

const realPostAfter = runtimeNotesSecondLoad.find(n => n.id === 500);
check('Real user post unaffected by seed comment/reload', realPostAfter && realPostAfter.content === REAL_USER_POST.content && realPostAfter.postType === 'discussion');
check('Real user post has zero comments (none were ever posted on it)', CommentService.getCommentCount(500) === 0);
check('Real user post does not receive a demo engagement base', realPostAfter && realPostAfter.demoEngagementScore === undefined);
check('Real user post display continues to use its real score', realPostAfter && context.getNoteEngagementScore(realPostAfter) === REAL_USER_POST.score);

// Exercise the real vote handler, not a hand-written simulation. The minimal
// DOM stub makes renderWallNotes/openModal safely no-op after persistence.
context.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};
context.addEventListener = () => {};
loadFile(context, 'app-wall.js');
context.voteNote(500, 'up');
check('Real user upvote still increments the real stored score', realPostAfter.upvotes === 1 && realPostAfter.score === 1 && realPostAfter.userVote === 'up');
check('Real user card/Hot display follows the real vote result', context.getNoteEngagementScore(realPostAfter) === 1);
context.voteNote(500, 'up');
check('Real user vote toggle still restores the real stored score', realPostAfter.upvotes === 0 && realPostAfter.score === 0 && realPostAfter.userVote === null);

const seedScoreBeforeVoteAttempt = context.getNoteEngagementScore(legacyTarget2);
context.voteNote(legacyTarget2.id, 'up');
check('Frozen runtime seed vote behavior remains unchanged', context.getNoteEngagementScore(legacyTarget2) === seedScoreBeforeVoteAttempt && legacyTarget2.userVote === null);

// --- Echo Library: label contract changed, internal route/page keys did not

const en = context.EchoLocales?.en;
const ms = context.EchoLocales?.ms;
const zh = context.EchoLocales?.zh;
if (!en) { loadFile(context, 'i18n/locales/en.js'); loadFile(context, 'i18n/locales/ms.js'); loadFile(context, 'i18n/locales/zh.js'); }
const enLocale = context.EchoLocales.en;
const msLocale = context.EchoLocales.ms;
const zhLocale = context.EchoLocales.zh;

check('EN study.home.title is Echo Library', enLocale['study.home.title'] === 'Echo Library');
check('EN study.hub.title is Echo Library', enLocale['study.hub.title'] === 'Echo Library');
check('EN study.home.cta mentions Echo Library', enLocale['study.home.cta'] === 'Explore Echo Library');
check('ZH study.home.title renamed (no longer 学习资料)', zhLocale['study.home.title'] !== '学习资料' && zhLocale['study.home.title'].length > 0);
check('MS study.home.title renamed (no longer Nota Pembelajaran)', msLocale['study.home.title'] !== 'Nota Pembelajaran' && msLocale['study.home.title'].length > 0);
check('Admin study labels intentionally left untouched (out of scope)', enLocale['admin.study.title'] === 'Study Notes Moderation');

const routerSource = fs.readFileSync(path.join(ROOT, 'app-router.js'), 'utf8');
check('app-router.js still routes #/study to the internal "study-home" page key', routerSource.includes('return { page: "study-home" }'));
check('app-router.js study-home/jurusan/semester/subject titles no longer say "Study Notes"', !/"study-(home|jurusan|semester|subject)":\s*"Study Notes/.test(routerSource));
const appStudySource = fs.readFileSync(path.join(ROOT, 'app-study.js'), 'utf8');
check('app-study.js still defines its Study Notes V2 route handlers (architecture unchanged)', appStudySource.includes('function renderStudyHome') || appStudySource.includes('renderStudyHome'));

// --- Report ------------------------------------------------------------------

const failed = results.filter(result => !result.pass);
for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.name}${result.detail ? ` (${result.detail})` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} assertions passed.`);
if (failed.length) {
  console.log(`\nFAILED:`);
  failed.forEach(result => console.log(`  - ${result.name}${result.detail ? ` (${result.detail})` : ''}`));
  process.exit(1);
}
