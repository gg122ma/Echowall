#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS - ${name}`);
}

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
  "services/ai/retriever.js",
  "services/ai/intent-router.js",
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

// A minimal, hand-rolled FreeAIAdapter stub — Phase 4 must not depend on the
// real RAG adapter's behavior, only on the {isAIModelEnabled, sendStructuredPrompt}
// shape ProviderAdapter/FactLockedRenderer consume.
function makeFreeAIAdapterStub() {
  const state = { available: false, next: { text: "" }, handler: null, calls: 0, lastMessages: null };
  return {
    state,
    adapter: {
      isAIModelEnabled: () => state.available,
      sendStructuredPrompt: async messages => {
        state.calls += 1;
        state.lastMessages = messages;
        if (typeof state.handler === "function") return state.handler(messages, state.calls);
        const next = state.next;
        if (next && next.throw) throw next.throw;
        if (typeof next.text === "function") return next.text(messages);
        return next.text;
      },
    },
  };
}

function buildSandbox({ campusRendering = true, providerTimeoutMs } = {}) {
  const storageValues = new Map();
  const { state: providerState, adapter: freeAIAdapter } = makeFreeAIAdapterStub();
  const window = {
    location: { href: "index.html" },
    sessionStorage: {
      getItem: key => storageValues.get(key) || null,
      setItem: (key, value) => storageValues.set(key, value),
      removeItem: key => storageValues.delete(key),
    },
    EchoConfig: { freeAI: { enabled: true, campusRendering, openRouterToken: "test-token" } },
    FreeAIAdapter: freeAIAdapter,
  };
  window.window = window;
  const context = {
    window, sessionStorage: window.sessionStorage, console,
    Map, Set, Object, Number, String, Boolean, Date, Math, RegExp, JSON,
    Promise, setTimeout, clearTimeout,
  };
  vm.createContext(context);
  for (const file of AI_FILES) {
    vm.runInContext(read(file), context, { filename: file });
    if (file === "services/ai/config.js" && Number.isFinite(providerTimeoutMs)) {
      window.EchoAI.Config = Object.freeze({ ...window.EchoAI.Config, providerTimeoutMs });
    }
  }
  return { context, window, providerState };
}

// ---------------------------------------------------------------------------
// Config gating: campusProviderRenderingEnabled must honor EchoConfig.freeAI.campusRendering
// ---------------------------------------------------------------------------
{
  const offWindow = { EchoConfig: { freeAI: { campusRendering: false } } };
  offWindow.window = offWindow;
  const offContext = { window: offWindow, Object };
  vm.createContext(offContext);
  vm.runInContext(read("services/ai/config.js"), offContext, { filename: "services/ai/config.js" });
  check("campusRendering:false disables the provider-rendering config flag", offContext.window.EchoAI.Config.campusProviderRenderingEnabled === false);

  const defaultWindow = { EchoConfig: { freeAI: {} } };
  defaultWindow.window = defaultWindow;
  const defaultContext = { window: defaultWindow, Object };
  vm.createContext(defaultContext);
  vm.runInContext(read("services/ai/config.js"), defaultContext, { filename: "services/ai/config.js" });
  check("provider-rendering config flag defaults off without explicit opt-in", defaultContext.window.EchoAI.Config.campusProviderRenderingEnabled === false);

  const onWindow = { EchoConfig: { freeAI: { campusRendering: true } } };
  onWindow.window = onWindow;
  const onContext = { window: onWindow, Object };
  vm.createContext(onContext);
  vm.runInContext(read("services/ai/config.js"), onContext, { filename: "services/ai/config.js" });
  check("campusRendering:true explicitly enables provider rendering", onContext.window.EchoAI.Config.campusProviderRenderingEnabled === true);
}

// ---------------------------------------------------------------------------
// Sandbox with the provider config flag ON; FreeAIAdapter availability/response
// is toggled per test to exercise every fallback path.
// ---------------------------------------------------------------------------
const { window, providerState } = buildSandbox({ campusRendering: true });

{
  const { window: optOutWindow, providerState: optOutProvider } = buildSandbox({ campusRendering: false });
  optOutProvider.available = true;
  optOutProvider.next = { text: "provider must not be called" };
  const reply = await optOutWindow.CampusAI.ask("What time does the library close?", { sessionId: "explicit-opt-out" });
  check("campus provider remains unused unless explicitly opted in", optOutProvider.calls === 0 && /4:30pm/.test(reply.answer));
}

function buildPlanFor(targetWindow, question, language = "en") {
  const intent = targetWindow.EchoAI.IntentRouter.classify(question);
  const resolution = targetWindow.EchoAI.KnowledgeEngine.resolve(question);
  const place = resolution.place;
  const premise = place ? targetWindow.EchoAI.PremiseChecker.check(question, place, []) : { status: "UNKNOWN", day: "" };
  const plan = targetWindow.EchoAI.AnswerPlanner.plan({ question, language, intent, resolution, previous: null, premise, asOf: undefined });
  return { plan, options: { day: premise.day } };
}

const buildPlan = (question, language = "en") => buildPlanFor(window, question, language);

function validSequenceFor(clausePlan, transitionId = "NONE") {
  const sequence = [];
  clausePlan.clauses.forEach((clause, index) => {
    if (index > 0) sequence.push({ type: "transition", id: transitionId });
    sequence.push({ type: "clause", id: clause.clauseId });
  });
  return { answerMode: clausePlan.answerMode, language: clausePlan.language, sequence };
}

function validSequenceFromMessages(messages, transitionId = "NONE") {
  const input = JSON.parse(messages[1].content);
  const sequence = [];
  input.clauses.forEach((clause, index) => {
    if (index > 0) sequence.push({ type: "transition", id: transitionId });
    sequence.push({ type: "clause", id: clause.id });
  });
  return JSON.stringify({ answerMode: input.answerMode, language: input.language, sequence });
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// --- Ask Echo UI defense-in-depth: repeated suggestion clicks stay single-flight ---
{
  const windowListeners = {};
  let mountedPanel = null;
  let campusCalls = 0;
  let settleCampusAsk;
  let rejectNextAsk = false;
  const makeElement = tagName => ({
    tagName,
    children: [],
    className: "",
    textContent: "",
    disabled: false,
    hidden: false,
    classList: { add() {}, remove() {} },
    setAttribute() {},
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, handler) { this[`on${type}`] = handler; },
    remove() { this.removed = true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  });
  const messages = makeElement("div");
  messages.scrollHeight = 0;
  messages.querySelector = () => null;
  const submitButton = makeElement("button");
  const input = { value: "" };
  const form = makeElement("form");
  form.elements = [input];
  form.reset = () => { input.value = ""; };
  form.querySelector = selector => selector === "button[type=submit]" ? submitButton : null;
  const suggestionButtons = ["Where is the library?", "Show sports facilities", "Where is the cafeteria?"].map(label => {
    const button = makeElement("button");
    button.textContent = label;
    return button;
  });
  const closeButton = makeElement("button");
  const panel = makeElement("section");
  panel.querySelector = selector => selector === ".ai-messages" ? messages
    : selector === "form" ? form
      : selector === ".ai-assistant-close" ? closeButton
        : null;
  panel.querySelectorAll = selector => selector === ".ai-suggestions button" ? suggestionButtons : [];
  const document = {
    body: { appendChild(element) { mountedPanel = element; } },
    createElement: tagName => tagName === "section" ? panel : makeElement(tagName),
    getElementById: id => id === "ai-assistant" ? mountedPanel : null,
    addEventListener() {},
  };
  const immediateTimeout = callback => { callback(); return 0; };
  const uiWindow = {
    window: null,
    document,
    setTimeout: immediateTimeout,
    requestAnimationFrame: callback => callback(),
    addEventListener(type, handler) { windowListeners[type] = handler; },
    CampusAI: {
      ask: () => {
        campusCalls += 1;
        if (rejectNextAsk) return Promise.reject(new Error("expected UI test failure"));
        return new Promise(resolve => { settleCampusAsk = resolve; });
      },
    },
    EchoAI: { MapAction: { validate: () => false } },
  };
  uiWindow.window = uiWindow;
  const uiContext = { window: uiWindow, document, console, setTimeout: immediateTimeout, requestAnimationFrame: uiWindow.requestAnimationFrame };
  vm.createContext(uiContext);
  vm.runInContext(read("services/ai-assistant.js"), uiContext, { filename: "services/ai-assistant.js" });
  windowListeners.DOMContentLoaded();

  suggestionButtons[0].onclick();
  input.value = "What time does KOOP close?";
  form.onsubmit({ preventDefault() {} });
  suggestionButtons[1].onclick();
  check("rapid submit and suggestion events start only one CampusAI request", campusCalls === 1);
  check("submit and every suggestion control are disabled while Ask Echo is pending", submitButton.disabled && suggestionButtons.every(button => button.disabled));
  settleCampusAsk({ answer: "Library answer", actions: [] });
  await wait(0);
  check("Ask Echo controls restore after a successful request", !submitButton.disabled && suggestionButtons.every(button => !button.disabled));

  rejectNextAsk = true;
  suggestionButtons[1].onclick();
  await wait(0);
  check("Ask Echo controls restore after a failed request", campusCalls === 2 && !submitButton.disabled && suggestionButtons.every(button => !button.disabled));
}

providerState.available = false;

// --- Eligibility: only DIRECT/FOLLOW_UP/CORRECTION/safe-PARTIAL-with-facts are provider-eligible ---
const { plan: libraryHoursPlan, options: libraryHoursOptions } = buildPlan("What time does the library close?");
check("Library hours DIRECT plan is provider-eligible", window.EchoAI.FactLockedRenderer.isEligible(libraryHoursPlan));

const { plan: correctionPlan } = buildPlan("Library opens Friday at 8am, right?");
check("false-premise CORRECTION plan is provider-eligible", correctionPlan.answerMode === "CORRECTION" && window.EchoAI.FactLockedRenderer.isEligible(correctionPlan));

const { plan: laundryPlan } = buildPlan("DIY Laundry");
check("safe PARTIAL plan with real selected facts is provider-eligible", laundryPlan.answerMode === "PARTIAL" && laundryPlan.facts.length > 0 && window.EchoAI.FactLockedRenderer.isEligible(laundryPlan));

const { plan: cafeAdminConflictPlan } = buildPlan("What time does Cafe Admin close?");
check("CONFLICT plan is never provider-eligible", cafeAdminConflictPlan.answerMode === "CONFLICT" && !window.EchoAI.FactLockedRenderer.isEligible(cafeAdminConflictPlan));

const { plan: basketballPlan } = buildPlan("What time does basketball court close?");
check("UNSUPPORTED plan is never provider-eligible", basketballPlan.answerMode === "UNSUPPORTED" && !window.EchoAI.FactLockedRenderer.isEligible(basketballPlan));

const { plan: parentOnlyPlan } = buildPlan("Blok A1");
check("PARENT_ONLY plan is never provider-eligible", parentOnlyPlan.content.primary === "PARENT_ONLY" && !window.EchoAI.FactLockedRenderer.isEligible(parentOnlyPlan));

const { plan: diningDiscoveryPlan } = buildPlan("Where is the cafeteria?");
check("discovery/category plan is never provider-eligible", diningDiscoveryPlan.content.primary === "DINING_DISCOVERY" && !window.EchoAI.FactLockedRenderer.isEligible(diningDiscoveryPlan));

const { plan: surauPlan } = buildPlan("Surau");
check("Surau unsupported plan is never provider-eligible", !window.EchoAI.FactLockedRenderer.isEligible(surauPlan));

const { plan: readingRoomPlan } = buildPlan("Reading Room");
check("Reading Room unsupported plan is never provider-eligible", !window.EchoAI.FactLockedRenderer.isEligible(readingRoomPlan));

for (const name of ["Court A", "Court C"]) {
  const { plan: courtPlan } = buildPlan(name);
  check(`${name} unsupported plan is never provider-eligible`, !window.EchoAI.FactLockedRenderer.isEligible(courtPlan));
}

// --- Provider disabled / unavailable => deterministic route, byte-identical answer ---
providerState.available = false;
{
  const deterministic = window.EchoAI.AnswerRenderer.render(libraryHoursPlan, "en", libraryHoursOptions);
  const rendered = await window.EchoAI.FactLockedRenderer.render(libraryHoursPlan, "en", libraryHoursOptions);
  check("provider unavailable falls back to the deterministic route", rendered.route === "deterministic");
  check("provider unavailable produces byte-identical deterministic text", rendered.text === deterministic);
}

// --- Provider enabled but throws / times out => deterministic fallback, route reflects an attempt ---
providerState.available = true;
providerState.next = { throw: new Error("provider timeout") };
{
  const deterministic = window.EchoAI.AnswerRenderer.render(libraryHoursPlan, "en", libraryHoursOptions);
  const rendered = await window.EchoAI.FactLockedRenderer.render(libraryHoursPlan, "en", libraryHoursOptions);
  check("provider timeout/throw falls back to the deterministic answer", rendered.text === deterministic);
  check("provider timeout/throw is reported as a rejected-fallback attempt", rendered.route === "provider_rejected_fallback");
}

// --- Malformed / invalid provider responses all fall back safely ---
const malformedCases = [
  ["non-JSON text", "not json at all"],
  ["JSON missing sequence", JSON.stringify({ answerMode: "DIRECT", language: "en" })],
  ["wrong answerMode", JSON.stringify({ answerMode: "CORRECTION", language: "en", sequence: [] })],
  ["wrong language", JSON.stringify({ answerMode: "DIRECT", language: "ms", sequence: [] })],
];
for (const [label, text] of malformedCases) {
  providerState.available = true;
  providerState.next = { text };
  const rendered = await window.EchoAI.FactLockedRenderer.render(libraryHoursPlan, "en", libraryHoursOptions);
  check(`${label} falls back to deterministic text`, rendered.text === window.EchoAI.AnswerRenderer.render(libraryHoursPlan, "en", libraryHoursOptions));
  check(`${label} is reported as provider_rejected_fallback`, rendered.route === "provider_rejected_fallback");
}

// --- Structural attacks against a genuine multi-clause plan are rejected for the intended reason ---
{
  const { plan, options } = buildPlan("Library");
  const clausePlan = window.EchoAI.FactLockedRenderer.buildClausePlan(plan, "en", options);
  check("Library information fixture is provider-eligible with at least two clauses", clausePlan.clauses.length >= 2);

  const valid = validSequenceFor(clausePlan);
  const validate = payload => window.EchoAI.FactLockedRenderer.validateSequence(payload, clausePlan);
  check("a fully compliant multi-clause sequence validates", validate(valid).valid === true);

  const droppedClause = { ...valid, sequence: valid.sequence.slice(0, -1) };
  check("dropping a clause is rejected as an illegal structure", validate(droppedClause).reason === "ILLEGAL_STRUCTURE");

  const duplicateClause = { ...valid, sequence: valid.sequence.map((item, index) => index === 2 ? { type: "clause", id: clausePlan.clauses[0].clauseId } : item) };
  check("duplicating a clause at the expected length reaches clause-order validation", validate(duplicateClause).reason === "UNKNOWN_CLAUSE");

  const reorderedSequence = valid.sequence.map(item => ({ ...item }));
  [reorderedSequence[0], reorderedSequence[2]] = [reorderedSequence[2], reorderedSequence[0]];
  check("reordering clauses at the expected length reaches clause-order validation", validate({ ...valid, sequence: reorderedSequence }).reason === "UNKNOWN_CLAUSE");

  const unknownClauseSequence = valid.sequence.map((item, index) => index === 2 ? { type: "clause", id: "C_FAKE" } : item);
  check("an unknown clause at the expected length is rejected", validate({ ...valid, sequence: unknownClauseSequence }).reason === "UNKNOWN_CLAUSE");

  const missingTransition = { ...valid, sequence: valid.sequence.filter((_, index) => index !== 1) };
  check("a missing transition is rejected as an illegal structure", validate(missingTransition).reason === "ILLEGAL_STRUCTURE");

  const duplicateTransition = { ...valid, sequence: [...valid.sequence.slice(0, 2), { ...valid.sequence[1] }, ...valid.sequence.slice(2)] };
  check("a duplicate transition is rejected as an illegal structure", validate(duplicateTransition).reason === "ILLEGAL_STRUCTURE");

  const illegalTransitionSequence = valid.sequence.map((item, index) => index === 1 ? { type: "transition", id: "B_FAKE" } : item);
  check("an illegal transition id reaches transition validation", validate({ ...valid, sequence: illegalTransitionSequence }).reason === "ILLEGAL_STRUCTURE");

  const transitionBeforeFirst = valid.sequence.map((item, index) => index === 0 ? { type: "transition", id: "NONE" } : item);
  check("a transition before the first clause is rejected", validate({ ...valid, sequence: transitionBeforeFirst }).reason === "UNKNOWN_CLAUSE");

  const transitionAfterLast = valid.sequence.map((item, index) => index === valid.sequence.length - 1 ? { type: "transition", id: "NONE" } : item);
  check("a transition after the last clause is rejected", validate({ ...valid, sequence: transitionAfterLast }).reason === "UNKNOWN_CLAUSE");

  const withAction = { ...valid, actions: [{ type: "OPEN_MAP", placeId: "library", buildingId: "B_PUSTAKA" }] };
  check("a provider-generated actions field is rejected", validate(withAction).reason === "PROVIDER_ACTION");
}

// --- A valid provider sequence is accepted, but content stays fact-locked: ---
// injected free text on the payload is never read; assembled output is built
// only from the pre-approved exact clause text.
for (const [language, question] of [["en", "What time does the library close?"], ["ms", "Library tutup pukul berapa?"], ["zh", "图书馆几点关门？"]]) {
  const { plan, options } = buildPlan(question, language);
  check(`${language} Library hours plan is provider-eligible`, window.EchoAI.FactLockedRenderer.isEligible(plan));
  const clausePlan = window.EchoAI.FactLockedRenderer.buildClausePlan(plan, language, options);
  const valid = validSequenceFor(clausePlan, "ALSO");
  valid.sequence[0] = { ...valid.sequence[0], text: "FABRICATED UNSUPPORTED FACT" };
  providerState.available = true;
  providerState.next = { text: JSON.stringify(valid) };
  const rendered = await window.EchoAI.FactLockedRenderer.render(plan, language, options);
  check(`${language} safe rendering accepts a valid provider sequence`, rendered.route === "provider_accepted");
  check(`${language} assembled answer ignores provider-injected free text`, !rendered.text.includes("FABRICATED"));
  check(`${language} assembled answer contains only the pre-approved clause text`, clausePlan.clauses.every(clause => rendered.text.includes(clause.exactText)));
  const providerPayload = JSON.parse(providerState.lastMessages[1].content);
  check(`${language} provider payload excludes entity, fact, provenance, and Map identifiers`, Object.keys(providerPayload).sort().join(",") === "allowedTransitionIds,answerMode,clauses,language" && providerPayload.clauses.every(clause => Object.keys(clause).sort().join(",") === "id,text"));
}

// --- Approximate facts and correction prefixes remain fixed inside the clause, never provider-editable ---
{
  const { plan, options } = buildPlan("What time does Cafe A close?");
  const clausePlan = window.EchoAI.FactLockedRenderer.buildClausePlan(plan, "en", options);
  check("Cafe A approximate wording is baked into the clause text itself", clausePlan.clauses.some(clause => /around/i.test(clause.exactText)));
}
{
  const clausePlan = window.EchoAI.FactLockedRenderer.buildClausePlan(correctionPlan, "en", {});
  check("CORRECTION clause carries the fixed 'No.' prefix inside its own exact text", /^No\. /.test(clausePlan.clauses[0].exactText));
}

// --- Full end-to-end CampusAI.ask() wiring: provider disabled by default (deterministic), matches existing behavior ---
providerState.available = false;
{
  const reply = await window.CampusAI.ask("What time does the library close?", { sessionId: "phase4-e2e-deterministic" });
  check("end-to-end ask() with provider unavailable renders the same friendly Library hours text", /4:30pm/.test(reply.answer) && !/exam|6 May|May 2026/i.test(reply.answer));
}

// --- Full end-to-end CampusAI.ask() wiring: provider enabled and returns a valid sequence ---
providerState.available = true;
{
  const { plan, options } = buildPlan("What time does the library close?");
  const clausePlan = window.EchoAI.FactLockedRenderer.buildClausePlan(plan, "en", options);
  providerState.next = { text: JSON.stringify(validSequenceFor(clausePlan, "ALSO")) };
  const reply = await window.CampusAI.ask("What time does the library close?", { sessionId: "phase4-e2e-provider" });
  check("end-to-end ask() accepts a valid provider sequence and keeps the same verified hours", /4:30pm/.test(reply.answer));
}
providerState.available = false;

// --- Actual timeout: a pending provider loses the real ProviderAdapter timer race ---
{
  const { window: timeoutWindow, providerState: timeoutProvider } = buildSandbox({ campusRendering: true, providerTimeoutMs: 25 });
  const { plan, options } = buildPlanFor(timeoutWindow, "What time does the library close?");
  const deterministic = timeoutWindow.EchoAI.AnswerRenderer.render(plan, "en", options);
  let releaseProvider;
  let providerStarted = false;
  let renderSettled = false;
  let providerMessages;
  timeoutProvider.available = true;
  timeoutProvider.handler = messages => {
    providerStarted = true;
    providerMessages = messages;
    return new Promise(resolve => { releaseProvider = resolve; });
  };

  const renderPromise = timeoutWindow.EchoAI.FactLockedRenderer.render(plan, "en", options).then(result => {
    renderSettled = true;
    return result;
  });
  await wait(5);
  check("real-timeout provider call is still pending before the short timeout", providerStarted && !renderSettled);
  const timedOutResult = await renderPromise;
  check("real delayed provider triggers deterministic fallback text", timedOutResult.text === deterministic);
  check("real delayed provider triggers provider_rejected_fallback route", timedOutResult.route === "provider_rejected_fallback");

  const visibleText = timedOutResult.text;
  releaseProvider(validSequenceFromMessages(providerMessages, "ALSO"));
  await wait(0);
  check("late provider resolution cannot mutate the returned visible result", timedOutResult.text === visibleText && Object.isFrozen(timedOutResult));

  let releaseContextProvider;
  let contextMessages;
  timeoutProvider.handler = messages => {
    contextMessages = messages;
    return new Promise(resolve => { releaseContextProvider = resolve; });
  };
  const timeoutReply = await timeoutWindow.CampusAI.ask("What time does the library close?", { sessionId: "late-timeout-context" });
  check("timed-out CampusAI request commits its deterministic Library context", timeoutWindow.EchoAI.ConversationContext.get("late-timeout-context")?.activeEntityId === "library");
  releaseContextProvider(validSequenceFromMessages(contextMessages));
  await wait(0);
  check("late provider completion cannot corrupt conversation context", timeoutWindow.EchoAI.ConversationContext.get("late-timeout-context")?.activeEntityId === "library" && /4:30pm/.test(timeoutReply.answer));
}

function installGatedProvider(targetState) {
  const calls = [];
  targetState.available = true;
  targetState.handler = messages => new Promise(resolve => {
    calls.push({
      resolve: (transitionId = "NONE") => resolve(validSequenceFromMessages(messages, transitionId)),
    });
  });
  return calls;
}

// --- Same-session generations: latest-started owns context writes regardless of completion order ---
{
  const { window: raceWindow, providerState: raceProvider } = buildSandbox({ campusRendering: true, providerTimeoutMs: 250 });
  const calls = installGatedProvider(raceProvider);
  const libraryRequest = raceWindow.CampusAI.ask("What time does the library close?", { sessionId: "same-session-late-old" });
  const koopRequest = raceWindow.CampusAI.ask("What time does KOOP close?", { sessionId: "same-session-late-old" });
  await wait(0);
  check("same-session race starts both provider requests without serializing them", calls.length === 2);
  calls[1].resolve();
  await koopRequest;
  const newerContext = JSON.stringify(raceWindow.EchoAI.ConversationContext.get("same-session-late-old"));
  calls[0].resolve();
  await libraryRequest;
  check("older Library completion cannot overwrite newer KOOP context", raceWindow.EchoAI.ConversationContext.get("same-session-late-old")?.activeEntityId === "koop-mart");
  check("stale completion leaves the newer session context byte-identical", JSON.stringify(raceWindow.EchoAI.ConversationContext.get("same-session-late-old")) === newerContext);
}

{
  const { window: raceWindow, providerState: raceProvider } = buildSandbox({ campusRendering: true, providerTimeoutMs: 250 });
  const calls = installGatedProvider(raceProvider);
  const libraryRequest = raceWindow.CampusAI.ask("What time does the library close?", { sessionId: "same-session-early-old" });
  const koopRequest = raceWindow.CampusAI.ask("What time does KOOP close?", { sessionId: "same-session-early-old" });
  await wait(0);
  calls[0].resolve();
  await libraryRequest;
  check("older Library request cannot write context even when it completes first", raceWindow.EchoAI.ConversationContext.get("same-session-early-old")?.activeEntityId !== "library");
  calls[1].resolve();
  await koopRequest;
  check("newer KOOP request owns context when it completes after the stale request", raceWindow.EchoAI.ConversationContext.get("same-session-early-old")?.activeEntityId === "koop-mart");
}

// --- Request generations are isolated per session id ---
{
  const { window: raceWindow, providerState: raceProvider } = buildSandbox({ campusRendering: true, providerTimeoutMs: 250 });
  const calls = installGatedProvider(raceProvider);
  const libraryRequest = raceWindow.CampusAI.ask("What time does the library close?", { sessionId: "independent-library" });
  const koopRequest = raceWindow.CampusAI.ask("What time does KOOP close?", { sessionId: "independent-koop" });
  await wait(0);
  calls[1].resolve();
  await koopRequest;
  calls[0].resolve();
  await libraryRequest;
  check("different sessions retain independent Library context", raceWindow.EchoAI.ConversationContext.get("independent-library")?.activeEntityId === "library");
  check("different sessions retain independent KOOP context", raceWindow.EchoAI.ConversationContext.get("independent-koop")?.activeEntityId === "koop-mart");
}

// ---------------------------------------------------------------------------
// Required regression cases — Phase 4 wiring must not change any of these,
// whether or not the provider path is reachable for that answer mode.
// ---------------------------------------------------------------------------
const hasPlace = (reply, placeId) => reply.resolvedPlaces.some(place => place.placeId === placeId);
let reply;

reply = await window.CampusAI.ask("When does Cafe Admin close?");
check("REGRESSION Cafe Admin remains an unresolved CONFLICT", reply.answerPlan.mode === "CONFLICT" && /3:00pm/.test(reply.answer) && /4:00pm/.test(reply.answer) && reply.actions.length === 0);

reply = await window.CampusAI.ask("What time does the library close?");
check("REGRESSION Library current L1 schedule is unchanged", /4:30pm/.test(reply.answer));
check("REGRESSION expired April-May 2026 Library exception does not return", !/exam|6 May|May 2026/i.test(reply.answer));

reply = await window.CampusAI.ask("Koperassi buka Jumaat pukul berapa?");
check("REGRESSION KOOP deterministic schedule remains authoritative", /9:00am–5:30pm/.test(reply.answer));

reply = await window.CampusAI.ask("What time does basketball court close?");
check("REGRESSION Basketball verified hours remain unavailable", reply.answerPlan.mode === "UNSUPPORTED" && /unavailable/.test(reply.answer) && !/17:30|5:30pm/.test(reply.answer));

for (const [name, parentBuilding] of [["Blok A1", "B_SERI_PALAS"], ["Blok A2", "B_SERI_PALAS"], ["Blok B1", "B_SERI_TEMIN"], ["Blok B2", "B_SERI_TEMIN"], ["Blok C2", "B_SERI_LAKA"]]) {
  reply = await window.CampusAI.ask(name);
  check(`REGRESSION ${name} still navigates only to its verified parent area`, reply.actions[0]?.buildingId === parentBuilding && reply.actions[0]?.targetType === "PARENT_ONLY");
}

reply = await window.CampusAI.ask("Surau");
check("REGRESSION Surau still does not become Masjid", hasPlace(reply, "surau") && /Masjid Khulafa Ar Rasyidin/.test(reply.answer) && reply.actions.length === 0);

reply = await window.CampusAI.ask("Reading Room");
check("REGRESSION Reading Room is still not substituted for Library/Resource Centre/Study Room", /won.t substitute/i.test(reply.answer) && reply.resolvedPlaces[0]?.mapState === "DISABLED");

for (const name of ["Court A", "Court C"]) {
  reply = await window.CampusAI.ask(name);
  check(`REGRESSION ${name} remains unverified/disabled`, reply.resolvedPlaces[0]?.mapState === "DISABLED" && reply.actions.length === 0);
}

console.log(`\n${passed}/${passed} assertions passed.`);
