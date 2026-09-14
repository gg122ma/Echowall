#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const benchmark = JSON.parse(read("data/kmk-ai-phase5-benchmark.json"));
const requestedIds = new Set(process.argv.slice(2));
let lastDiagnostic = null;

const AI_FILES = [
  "data/kmk-knowledge-base.js",
  "data/kmk-ai-phase3-knowledge.js",
  "data/campus-buildings.js",
  "services/ai/config.js",
  "services/ai/normalizer.js",
  "services/ai/language.js",
  "services/ai/source-registry.js",
  "services/ai/conflict-detector.js",
  "services/ai/place-registry.js",
  "services/ai/conversation-context.js",
  "services/ai/intent-router.js",
  "services/ai/retriever.js",
  "services/ai/premise-checker.js",
  "services/ai/errors.js",
  "services/ai/map-action.js",
  "services/ai/knowledge-engine.js",
  "services/ai/answer-planner.js",
  "services/ai/answer-renderer.js",
  "services/ai/response-validator.js",
  "services/ai/provider-adapter.js",
  "services/ai/fact-locked-renderer.js",
  "services/ai/index.js",
];

function buildSandbox({ provider = false, timeoutMs = 9000 } = {}) {
  const storage = new Map();
  const providerState = { calls: [], available: provider, handler: null };
  const window = {
    location: { href: "index.html" },
    EchoConfig: { freeAI: { enabled: provider, campusRendering: provider, openRouterToken: provider ? "benchmark-token" : "" } },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    FreeAIAdapter: {
      isAIModelEnabled: () => providerState.available,
      sendStructuredPrompt: messages => {
        providerState.calls.push(messages);
        return providerState.handler ? providerState.handler(messages, providerState.calls.length) : Promise.reject(new Error("No benchmark provider handler"));
      },
    },
  };
  window.window = window;
  const context = {
    window,
    sessionStorage: window.sessionStorage,
    console,
    Map,
    Set,
    Object,
    Number,
    String,
    Boolean,
    Date,
    Math,
    RegExp,
    JSON,
    Promise,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(context);
  for (const file of AI_FILES) {
    vm.runInContext(read(file), context, { filename: file });
    if (file === "services/ai/config.js" && timeoutMs !== 9000) {
      window.EchoAI.Config = Object.freeze({ ...window.EchoAI.Config, providerTimeoutMs: timeoutMs });
    }
  }
  return { window, providerState };
}

const { window } = buildSandbox();
const failures = [];
const categoryCounts = new Map();
const coverageCounts = new Map();
const languageCounts = new Map();

function count(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function answerLanguage(answer) {
  const text = String(answer || "");
  const cjkCount = [...text].filter(character => /[\u3400-\u9fff]/.test(character)).length;
  const latinWords = text.match(/[a-z]+/gi) || [];
  if (cjkCount >= 3 && cjkCount >= Math.ceil(latinWords.length * 0.6)) return "ZH";
  const normalized = ` ${text.toLocaleLowerCase().replace(/[^a-z]+/g, " ")} `;
  const malayMarkers = [
    " saya ", " tidak ", " sumber ", " waktu ", " ditutup ", " dibuka ",
    " tempat ", " anda ", " peta ", " belum ", " disahkan ", " sekitar ",
    " pelajar ", " boleh ", " maklumat ", " berhampiran ", " kemudahan ",
    " ahad ", " khamis ", " jumaat ", " sabtu ", " ialah ", " nama ", " bagi ",
  ];
  const malayHits = malayMarkers.filter(marker => normalized.includes(marker)).length;
  const englishHits = (normalized.match(/\b(?:the|is|are|from|current|where|hours|closed|open|please|information)\b/g) || []).length;
  return malayHits >= 2 || (malayHits === 1 && englishHits === 0) ? "MS" : "EN";
}

const INTERNAL_ID_PATTERN = /\bB_[A-Z0-9_]+\b|\b[a-z][a-z0-9-]+\.(?:hours|purpose|services?|rules?|fees?|identity)\.[a-z0-9.-]+\b/i;

function includesText(answer, expected) {
  return String(answer || "").toLocaleLowerCase().includes(String(expected).toLocaleLowerCase());
}

function responseStatus(reply) {
  if (reply.resolution) return "RESOLVED";
  if (reply.answerPlan.mode === "AMBIGUOUS") return "AMBIGUOUS";
  if (reply.answerPlan.mode === "UNSUPPORTED") return "UNSUPPORTED";
  return "UNRESOLVED";
}

function assertExpectation(expectation, reply, targetWindow, sessionId) {
  const entities = reply.resolvedPlaces.map(place => place.placeId);
  const action = reply.actions[0] || null;
  const context = targetWindow.EchoAI.ConversationContext.get(sessionId);
  const expectedEntities = expectation.expectedEntities || (expectation.expectedEntity ? [expectation.expectedEntity] : null);

  if (expectedEntities) {
    if (expectation.exactEntities) assert.deepEqual(entities, expectedEntities);
    else expectedEntities.forEach(entity => assert.ok(entities.includes(entity), `missing entity ${entity}; got ${entities.join(", ")}`));
  }
  (expectation.forbiddenEntities || []).forEach(entity => assert.ok(!entities.includes(entity), `forbidden entity ${entity} was resolved`));
  if (expectation.expectedIntent) assert.equal(reply.intent, expectation.expectedIntent);
  if (expectation.expectedAnswerMode) assert.equal(reply.answerPlan.mode, expectation.expectedAnswerMode);
  if (expectation.expectedPremise) assert.equal(reply.premise, expectation.expectedPremise);
  if (expectation.expectedResolutionStatus) assert.equal(responseStatus(reply), expectation.expectedResolutionStatus);
  if (expectation.expectedMapState) assert.equal(reply.resolvedPlaces[0]?.mapState || "", expectation.expectedMapState);
  if (typeof expectation.expectedActionAllowed === "boolean") assert.equal(reply.actions.length > 0, expectation.expectedActionAllowed);
  if (expectation.expectedActionType) assert.equal(action?.type || "", expectation.expectedActionType);
  if (expectation.expectedTargetType) assert.equal(action?.targetType || "", expectation.expectedTargetType);
  if (expectation.expectedBuildingId) assert.equal(action?.buildingId || "", expectation.expectedBuildingId);
  if (expectation.expectedLanguage && expectation.expectedLanguage !== "ACCEPT_MIXED") {
    assert.equal(answerLanguage(reply.answer), expectation.expectedLanguage);
  }
  (expectation.requiredFactIds || []).forEach(factId => assert.ok(reply.selectedFactIds.includes(factId), `missing fact ${factId}`));
  (expectation.forbiddenFactIds || []).forEach(factId => assert.ok(!reply.selectedFactIds.includes(factId), `forbidden fact ${factId}`));
  (expectation.mustContain || []).forEach(text => assert.ok(includesText(reply.answer, text), `answer must contain ${text}`));
  if (expectation.mustContainAny?.length) {
    assert.ok(expectation.mustContainAny.some(text => includesText(reply.answer, text)), `answer must contain one of: ${expectation.mustContainAny.join(", ")}`);
  }
  (expectation.mustNotContain || []).forEach(text => assert.ok(!includesText(reply.answer, text), `answer must not contain ${text}`));
  (expectation.forbiddenPatterns || []).forEach(pattern => assert.ok(!new RegExp(pattern, "iu").test(reply.answer), `answer matched forbidden pattern ${pattern}`));
  if (expectation.noInternalIds) assert.ok(!INTERNAL_ID_PATTERN.test(reply.answer));
  if (expectation.noInternalIdsAnywhere) {
    const studentVisibleOutput = JSON.stringify({ answer: reply.answer, actions: reply.actions });
    assert.ok(!INTERNAL_ID_PATTERN.test(studentVisibleOutput), `student-visible output leaked an internal identifier: ${studentVisibleOutput}`);
  }
  if (expectation.noProviderInternals) assert.ok(!/OpenRouter|FactLockedRenderer|AnswerPlanner|provider prompt|source registry|semantic key/i.test(reply.answer));
  if (expectation.noSystemPrompt) assert.ok(!/system prompt|developer message|hidden prompt|internal instructions/i.test(reply.answer));
  if (expectation.noFabricatedHours) assert.ok(!/\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)\b|\b[01]?\d:[0-5]\d\b/i.test(reply.answer));
  if (expectation.noFabricatedLocation) assert.equal(reply.actions.length, 0);
  if (expectation.expectedActiveEntityAfterTurn) assert.equal(context?.activeEntityId || "", expectation.expectedActiveEntityAfterTurn);
  if (expectation.expectedContextCleared) assert.equal(context, null);
  if (expectation.expectedContextPersistence) assert.ok(context && context.activeEntityId);
  if (Number.isInteger(expectation.expectedServedFactsAtLeast)) assert.ok((context?.servedFactIds || []).length >= expectation.expectedServedFactsAtLeast);
}

function validSequence(messages, transition = "NONE") {
  const input = JSON.parse(messages[1].content);
  const sequence = [];
  input.clauses.forEach((clause, index) => {
    if (index) sequence.push({ type: "transition", id: transition });
    sequence.push({ type: "clause", id: clause.id });
  });
  return JSON.stringify({ answerMode: input.answerMode, language: input.language, sequence });
}

async function runConcurrencyCase(testCase) {
  const { window: raceWindow, providerState } = buildSandbox({ provider: true, timeoutMs: testCase.timeoutMs || 250 });
  const pending = [];
  providerState.handler = messages => new Promise(resolve => pending.push({ messages, resolve }));
  const session = `phase5-${testCase.id}`;

  if (["older_finishes_last", "older_finishes_first"].includes(testCase.scenario)) {
    const oldRequest = raceWindow.CampusAI.ask("What time does the library close?", { sessionId: session });
    const newRequest = raceWindow.CampusAI.ask("What time does KOOP close?", { sessionId: session });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(pending.length, 2);
    const first = testCase.scenario === "older_finishes_last" ? 1 : 0;
    const second = first === 0 ? 1 : 0;
    pending[first].resolve(validSequence(pending[first].messages));
    await (first === 0 ? oldRequest : newRequest);
    pending[second].resolve(validSequence(pending[second].messages));
    await (second === 0 ? oldRequest : newRequest);
    assert.equal(raceWindow.EchoAI.ConversationContext.get(session)?.activeEntityId, "koop-mart");
    return;
  }

  if (testCase.scenario === "different_sessions") {
    const library = raceWindow.CampusAI.ask("What time does the library close?", { sessionId: `${session}-library` });
    const koop = raceWindow.CampusAI.ask("What time does KOOP close?", { sessionId: `${session}-koop` });
    await new Promise(resolve => setTimeout(resolve, 0));
    pending[1].resolve(validSequence(pending[1].messages));
    pending[0].resolve(validSequence(pending[0].messages));
    await Promise.all([library, koop]);
    assert.equal(raceWindow.EchoAI.ConversationContext.get(`${session}-library`)?.activeEntityId, "library");
    assert.equal(raceWindow.EchoAI.ConversationContext.get(`${session}-koop`)?.activeEntityId, "koop-mart");
    return;
  }

  if (testCase.scenario === "follow_up_after_newer") {
    const oldRequest = raceWindow.CampusAI.ask("What time does the library close?", { sessionId: session });
    const newRequest = raceWindow.CampusAI.ask("What time does KOOP close?", { sessionId: session });
    await new Promise(resolve => setTimeout(resolve, 0));
    pending[1].resolve(validSequence(pending[1].messages));
    await newRequest;
    pending[0].resolve(validSequence(pending[0].messages));
    await oldRequest;
    providerState.available = false;
    const followUp = await raceWindow.CampusAI.ask("What about Friday?", { sessionId: session });
    assert.ok(followUp.resolvedPlaces.some(place => place.placeId === "koop-mart"));
    assert.equal(raceWindow.EchoAI.ConversationContext.get(session)?.activeEntityId, "koop-mart");
    return;
  }

  if (testCase.scenario === "context_after_timeout") {
    providerState.handler = () => new Promise(() => {});
    const reply = await raceWindow.CampusAI.ask("What time does the library close?", { sessionId: session });
    assert.ok(reply.answer.includes("4:30pm"));
    assert.equal(raceWindow.EchoAI.ConversationContext.get(session)?.activeEntityId, "library");
    return;
  }

  throw new Error(`Unknown concurrency scenario: ${testCase.scenario}`);
}

async function runCase(testCase) {
  count(categoryCounts, testCase.category);
  [...new Set([testCase.category, ...(testCase.coverage || [])])].forEach(label => count(coverageCounts, label));
  count(languageCounts, testCase.language || "n/a");
  if (testCase.kind === "concurrency") return runConcurrencyCase(testCase);
  const sessionId = `phase5-${testCase.id}`;
  const turns = testCase.turns || [{ question: testCase.question, ...testCase.expect }];
  for (const turn of turns) {
    const reply = await window.CampusAI.ask(turn.question, { sessionId, asOf: turn.asOf });
    lastDiagnostic = {
      question: turn.question,
      answer: reply?.answer,
      intent: reply?.intent,
      mode: reply?.answerPlan?.mode,
      premise: reply?.premise,
      entities: reply?.resolvedPlaces?.map(place => ({ id: place.placeId, mapState: place.mapState })),
      action: reply?.actions?.[0] || null,
      context: window.EchoAI.ConversationContext.get(sessionId),
    };
    assert.ok(reply, "CampusAI returned no response");
    assertExpectation(turn, reply, window, sessionId);
  }
}

assert.equal(benchmark.schemaVersion, "1.0");
assert.ok(benchmark.cases.length >= 120, "Phase 5 permanent benchmark must retain at least its original 120 cases");
assert.equal(new Set(benchmark.cases.map(item => item.id)).size, benchmark.cases.length, "benchmark IDs must be unique");

const selectedCases = requestedIds.size ? benchmark.cases.filter(item => requestedIds.has(item.id)) : benchmark.cases;
if (requestedIds.size) assert.equal(selectedCases.length, requestedIds.size, "every requested benchmark ID must exist");
for (const testCase of selectedCases) {
  lastDiagnostic = null;
  try {
    await runCase(testCase);
    console.log(`PASS ${testCase.id} ${testCase.category}`);
  } catch (error) {
    failures.push({ id: testCase.id, category: testCase.category, message: error.message, actual: lastDiagnostic });
    console.error(`FAIL ${testCase.id} ${testCase.category}: ${error.message}`);
  }
}

console.log(`\nBenchmark categories: ${JSON.stringify(Object.fromEntries([...categoryCounts].sort()))}`);
console.log(`Benchmark coverage: ${JSON.stringify(Object.fromEntries([...coverageCounts].sort()))}`);
console.log(`Benchmark languages: ${JSON.stringify(Object.fromEntries([...languageCounts].sort()))}`);
console.log(`Phase 5 benchmark: ${selectedCases.length - failures.length}/${selectedCases.length} passed; ${failures.length} failed.`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
