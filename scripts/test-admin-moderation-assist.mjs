#!/usr/bin/env node
/**
 * ADMIN-V2-008 — direct-call test suite for Auto Moderation Assist
 * (services/moderation-assist-service.js), built on the ADMIN-V2-002
 * ModerationService and the ADMIN-V2-001 Role/Scope contract.
 *
 * Same approach as the other scripts/test-admin-*.mjs suites (this repo has
 * no test runner — see CLAUDE.md): load the real service files into a Node
 * `vm` sandbox, then exercise everything through direct calls.
 * Run with `node scripts/test-admin-moderation-assist.mjs`.
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
const FIXTURE_ORGANIZATIONS = Object.freeze([Object.freeze({ id: KMK, name: 'KMK', type: 'college' })]);

function loadServicesIntoContext(sandbox) {
  const context = vm.createContext(sandbox);
  const files = [
    'services/admin-permission-service.js',
    'services/community-service.js',
    'services/moderation-service.js',
    'services/admin-audit-service.js',
    'services/moderation-assist-service.js',
  ];
  for (const relativePath of files) {
    const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    vm.runInContext(code, context, { filename: relativePath });
  }
  return context;
}

function buildSandbox(notesFixture) {
  const sandbox = {
    console,
    URL, // moderation-assist-service.js's isSuspiciousUrl() needs the real URL constructor -- Node's vm sandbox does NOT inherit host globals automatically (unlike a real browser, where window.URL always exists).
    localStorage: createFakeLocalStorage(),
    getRuntimeNotes: () => notesFixture,
    organizations: FIXTURE_ORGANIZATIONS,
  };
  sandbox.window = sandbox;
  return sandbox;
}

// listModerationItems() has no contentId filter parameter (only listReports()
// does) -- filtering by contentId here in the test itself, rather than
// asserting on a filters.contentId that the real function silently ignores.
function itemsForContent(ModerationService, contentType, contentId, user) {
  return ModerationService.listModerationItems({ contentType }, user).filter(item => item.contentId === String(contentId));
}

let passCount = 0;
let failCount = 0;
const failures = [];

function check(label, condition) {
  if (condition) { passCount += 1; }
  else { failCount += 1; failures.push(label); console.error(`FAIL: ${label}`); }
}

function run() {
  // --- 1. Community: normal content is never flagged -------------------------

  const normalNote = Object.freeze({ id: 1, contextType: 'community', communityKey: 'global:all', authorUserId: 'u1', content: 'Anyone free to study together this weekend?', createdAt: '2026-08-20T10:00:00.000Z' });
  const sandbox1 = buildSandbox([normalNote]);
  const context1 = loadServicesIntoContext(sandbox1);
  const evalNormal = context1.ModerationAssistService.evaluateCommunityPost(normalNote, [normalNote]);
  check('Normal content is NOT flagged', evalNormal.flagged === false);
  check('Normal content has riskScore 0', evalNormal.riskScore === 0);
  check('Normal content has zero rules triggered', evalNormal.rulesTriggered.length === 0);

  // --- 2. Community: spam repetition flagged ----------------------------------

  const repeatedText = 'Buy cheap essays here, guaranteed A+!';
  const spamNotes = [1, 2, 3].map(n => Object.freeze({
    id: 100 + n, contextType: 'community', communityKey: 'global:all', authorUserId: 'spammer_1',
    content: repeatedText, createdAt: `2026-08-20T10:0${n}:00.000Z`,
  }));
  const evalSpam = context1.ModerationAssistService.evaluateCommunityPost(spamNotes[2], spamNotes);
  check('Repeated identical content by the same author is flagged', evalSpam.flagged);
  check('Spam repetition rule is in rulesTriggered', evalSpam.rulesTriggered.includes('spam_repetition'));
  check('Flagged content has riskScore > 0', evalSpam.riskScore > 0);
  check('Flagged content has an explanatory reason (explainability, spec section 34)', typeof evalSpam.reason === 'string' && evalSpam.reason.includes('spam_repetition'));

  // --- 3. Community: duplicate content (different author) flagged ------------

  const duplicateNotes = [
    Object.freeze({ id: 201, contextType: 'community', communityKey: 'global:all', authorUserId: 'author_a', content: 'Check out this amazing deal', createdAt: '2026-08-20T09:00:00.000Z' }),
    Object.freeze({ id: 202, contextType: 'community', communityKey: 'global:all', authorUserId: 'author_b', content: 'Check out this amazing deal', createdAt: '2026-08-20T09:05:00.000Z' }),
  ];
  const evalDup = context1.ModerationAssistService.evaluateCommunityPost(duplicateNotes[1], duplicateNotes);
  check('Identical content from a DIFFERENT author is flagged as duplicate', evalDup.flagged && evalDup.rulesTriggered.includes('duplicate_content'));

  // --- 4. Community: suspicious link flagged ----------------------------------

  const linkNote = Object.freeze({ id: 301, contextType: 'community', communityKey: 'global:all', authorUserId: 'u9', content: 'Click here for free stuff: http://bit.ly/free-money', createdAt: '2026-08-20T10:00:00.000Z' });
  const evalLink = context1.ModerationAssistService.evaluateCommunityPost(linkNote, [linkNote]);
  check('A known link-shortener domain is flagged', evalLink.flagged && evalLink.rulesTriggered.includes('suspicious_link_domain'));

  const floodLinksNote = Object.freeze({ id: 302, contextType: 'community', communityKey: 'global:all', authorUserId: 'u10', content: 'a http://x.com/1 b http://y.com/2 c http://z.com/3', createdAt: '2026-08-20T10:00:00.000Z' });
  const evalFloodLinks = context1.ModerationAssistService.evaluateCommunityPost(floodLinksNote, [floodLinksNote]);
  check('3+ links in one post is flagged even without a shortener domain', evalFloodLinks.flagged && evalFloodLinks.rulesTriggered.includes('excessive_links'));

  // --- 5. Community: flood posting -------------------------------------------

  const floodNotes = [1, 2, 3, 4, 5].map(n => Object.freeze({
    id: 400 + n, contextType: 'community', communityKey: 'global:all', authorUserId: 'flooder_1',
    content: `distinct message number ${n}`, createdAt: `2026-08-20T10:0${n}:00.000Z`,
  }));
  const evalFlood = context1.ModerationAssistService.evaluateCommunityPost(floodNotes[4], floodNotes);
  check('5 posts within 10 minutes by the same author is flagged as flood', evalFlood.flagged && evalFlood.rulesTriggered.includes('flood_posting'));

  // --- 6. Risk score stays within a stable, bounded range ---------------------

  const maxSignalNote = Object.freeze({
    id: 500, contextType: 'community', communityKey: 'global:all', authorUserId: 'flooder_1',
    content: repeatedText, createdAt: '2026-08-20T10:09:00.000Z',
  });
  const allSignalsFixture = [...spamNotes, ...floodNotes, maxSignalNote];
  const evalMax = context1.ModerationAssistService.evaluateCommunityPost(maxSignalNote, allSignalsFixture);
  check('riskScore never exceeds 100 even with many signals triggered', evalMax.riskScore <= 100);
  check('riskScore is always a finite non-negative number', Number.isFinite(evalMax.riskScore) && evalMax.riskScore >= 0);

  // --- 7. Study: missing required metadata flagged ---------------------------

  const incompleteSubmission = { id: 'study_1', title: '', jurusan: 'sains', semester: 1, subjectCode: '', resourceType: 'notes', fileId: 'sha256:abc', fileSize: 1000, duplicateStatus: 'none' };
  const evalMissing = context1.ModerationAssistService.evaluateStudySubmission(incompleteSubmission);
  check('Missing title/subjectCode is flagged', evalMissing.flagged && evalMissing.rulesTriggered.includes('missing_required_metadata'));
  check('Missing fields are reported for explainability', evalMissing.missingFields.includes('title') && evalMissing.missingFields.includes('subjectCode'));

  // --- 8. Study: missing/broken file flagged ----------------------------------

  const brokenFileSubmission = { id: 'study_2', title: 'Notes', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', fileId: null, fileSize: 0, duplicateStatus: 'none' };
  const evalBroken = context1.ModerationAssistService.evaluateStudySubmission(brokenFileSubmission);
  check('Missing/zero-size file is flagged', evalBroken.flagged && evalBroken.rulesTriggered.includes('missing_or_broken_file'));

  // --- 9. Study: exact hash duplicate flagged ---------------------------------

  const exactDupSubmission = { id: 'study_3', title: 'Notes', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', fileId: 'sha256:abc', fileSize: 1000, duplicateStatus: 'exact' };
  const evalExactDup = context1.ModerationAssistService.evaluateStudySubmission(exactDupSubmission);
  check('duplicateStatus=exact is flagged', evalExactDup.flagged && evalExactDup.rulesTriggered.includes('exact_hash_duplicate'));

  const completeSubmission = { id: 'study_4', title: 'Good Notes', jurusan: 'sains', semester: 1, subjectCode: 'SM015', resourceType: 'notes', fileId: 'sha256:def', fileSize: 2000, duplicateStatus: 'none' };
  const evalComplete = context1.ModerationAssistService.evaluateStudySubmission(completeSubmission);
  check('A complete, non-duplicate submission is NOT flagged', evalComplete.flagged === false);

  // --- 10. applyAutoFlag: creates exactly ONE ModerationItem, never dupes ----

  const ModerationService = context1.ModerationService;
  const scope = { scopeType: 'global', scopeId: null };
  const created1 = context1.ModerationAssistService.applyAutoFlag('post', spamNotes[2].id, scope, evalSpam);
  check('applyAutoFlag creates a ModerationItem', Boolean(created1?.id));
  check('Created item has source="auto_flag"', created1.source === 'auto_flag');
  check('Created item status is "pending" (assist only, never auto-decided)', created1.status === 'pending');
  check('Created item carries the riskScore', created1.riskScore === evalSpam.riskScore);
  check('Created item carries the explainable reason', created1.reason === evalSpam.reason);

  const superAdmin = { id: 'user_super_1', email: 'greencucumbertube@gmail.com', role: 'user' };
  const itemsAfterFirstFlag = itemsForContent(ModerationService, 'post', spamNotes[2].id, superAdmin);
  check('Exactly one active queue item exists after the first flag', itemsAfterFirstFlag.length === 1);

  // Repeat evaluation (e.g. re-running rules after an unrelated edit) must
  // NOT spawn a second active queue case for the same content.
  const created2 = context1.ModerationAssistService.applyAutoFlag('post', spamNotes[2].id, scope, evalSpam);
  check('Repeat auto-flag reuses the SAME ModerationItem id (no duplicate)', created2.id === created1.id);
  const itemsAfterSecondFlag = itemsForContent(ModerationService, 'post', spamNotes[2].id, superAdmin);
  check('Still exactly one active queue item after a repeat evaluation', itemsAfterSecondFlag.length === 1);

  // --- 11. Auto flag never permanently deletes/hides content ------------------

  check('applyAutoFlag never returns a "rejected"/"hidden" status', created1.status !== 'rejected' && created1.status !== 'hidden');
  check('An unflagged evaluation produces no ModerationItem at all (no fabricated flags)', context1.ModerationAssistService.applyAutoFlag('post', normalNote.id, scope, evalNormal) === null);
  check('No item was created for the unflagged normal note', itemsForContent(ModerationService, 'post', normalNote.id, superAdmin).length === 0);

  // --- 12. Permissions unaffected: scope gating on an auto_flag item is IDENTICAL to a reported one ---

  const globalModerator = { id: 'user_global_mod_1', email: 'globalmod@example.com', role: 'user' };
  const kmkAdmin = { id: 'user_kmk_admin_1', email: 'kmkadmin@example.com', role: 'user' };
  context1.AdminPermissionService.grantRoleAssignment({ userId: globalModerator.id, role: context1.AdminPermissionService.ROLES.GLOBAL_MODERATOR, scopeType: 'global', grantedBy: superAdmin.id });
  context1.AdminPermissionService.grantRoleAssignment({ userId: kmkAdmin.id, role: context1.AdminPermissionService.ROLES.COLLEGE_ADMIN, scopeType: 'college', scopeId: KMK, grantedBy: superAdmin.id });
  check('An auto_flag item on global-scope content is visible to a Global Moderator (same as a reported item would be)', itemsForContent(ModerationService, 'post', spamNotes[2].id, globalModerator).some(i => i.id === created1.id));
  check('An auto_flag item on global-scope content is invisible to a KMK-only College Admin', !itemsForContent(ModerationService, 'post', spamNotes[2].id, kmkAdmin).some(i => i.id === created1.id));
  check('Student/Guest still fully denied for an auto_flag item', ModerationService.getModerationItem(created1.id, { id: 'student_1' }) === null && ModerationService.getModerationItem(created1.id, null) === null);

  // Reject on an auto-flagged item still requires a reason, exactly like any other item (ADMIN-V2-004 unaffected).
  try {
    ModerationService.updateModerationStatus(created1.id, 'rejected', superAdmin);
    check('Reject without a reason on an auto-flagged item is denied', false);
  } catch {
    check('Reject without a reason on an auto-flagged item is denied', true);
  }
  const rejectedWithReason = ModerationService.updateModerationStatus(created1.id, 'rejected', superAdmin, { reason: 'Confirmed spam' });
  check('A human moderator can still reject an auto-flagged item with a reason (auto-flag never bypasses the normal action flow)', rejectedWithReason.status === 'rejected');

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
