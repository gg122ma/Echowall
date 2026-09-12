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

// A minimal, hand-rolled FreeAIAdapter stub — Phase 4 must not depend on the
// real RAG adapter's behavior, only on the {isAIModelEnabled, sendStructuredPrompt}
// shape ProviderAdapter/FactLockedRenderer consume.
function makeFreeAIAdapterStub() {
  const state = { available: false, next: { text: "" } };
  return {
    state,
    adapter: {
      isAIModelEnabled: () => state.available,
      sendStructuredPrompt: async () => {
        const next = state.next;
        if (next && next.throw) throw next.throw;
        if (typeof next.text === "function") return next.text();
        return next.text;
      },
    },
  };
}

function buildSandbox({ campusRendering } = { campusRendering: true }) {
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
  for (const file of AI_FILES) vm.runInContext(read(file), context, { filename: file });
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

  const onWindow = { EchoConfig: { freeAI: {} } };
  onWindow.window = onWindow;
  const onContext = { window: onWindow, Object };
  vm.createContext(onContext);
  vm.runInContext(read("services/ai/config.js"), onContext, { filename: "services/ai/config.js" });
  check("provider-rendering config flag defaults on (opt-out, like other Config switches)", onContext.window.EchoAI.Config.campusProviderRenderingEnabled === true);
}

// ---------------------------------------------------------------------------
// Sandbox with the provider config flag ON; FreeAIAdapter availability/response
// is toggled per test to exercise every fallback path.
// ---------------------------------------------------------------------------
const { window, providerState } = buildSandbox({ campusRendering: true });

function buildPlan(question, language = "en") {
  const intent = window.EchoAI.IntentRouter.classify(question);
  const resolution = window.EchoAI.KnowledgeEngine.resolve(question);
  const place = resolution.place;
  const premise = place ? window.EchoAI.PremiseChecker.check(question, place, []) : { status: "UNKNOWN", day: "" };
  const plan = window.EchoAI.AnswerPlanner.plan({ question, language, intent, resolution, previous: null, premise, asOf: undefined });
  return { plan, options: { day: premise.day } };
}

function validSequenceFor(clausePlan, transitionId = "NONE") {
  const sequence = [];
  clausePlan.clauses.forEach((clause, index) => {
    if (index > 0) sequence.push({ type: "transition", id: transitionId });
    sequence.push({ type: "clause", id: clause.clauseId });
  });
  return { answerMode: clausePlan.answerMode, language: clausePlan.language, sequence };
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

// --- Structural attacks against a real clause plan are all rejected ---
{
  const clausePlan = window.EchoAI.FactLockedRenderer.buildClausePlan(libraryHoursPlan, "en", libraryHoursOptions);
  check("Library hours clause plan has at least one clause", clausePlan.clauses.length >= 1);

  const unknownClause = { answerMode: "DIRECT", language: "en", sequence: [{ type: "clause", id: "C_FAKE" }] };
  check("unknown clause id is rejected", window.EchoAI.FactLockedRenderer.validateSequence(unknownClause, clausePlan).reason === "UNKNOWN_CLAUSE");

  const droppedClause = { answerMode: "DIRECT", language: "en", sequence: validSequenceFor(clausePlan).sequence.slice(0, -1) };
  if (clausePlan.clauses.length > 1) {
    check("dropping a clause is rejected as an illegal structure", window.EchoAI.FactLockedRenderer.validateSequence(droppedClause, clausePlan).reason === "ILLEGAL_STRUCTURE");
  }

  const illegalTransition = { answerMode: "DIRECT", language: "en", sequence: [{ type: "clause", id: clausePlan.clauses[0].clauseId }, { type: "transition", id: "B_FAKE" }, { type: "clause", id: clausePlan.clauses[0].clauseId }] };
  check("an unapproved transition id (attempted B_* leakage vector) is rejected", window.EchoAI.FactLockedRenderer.validateSequence(illegalTransition, clausePlan).reason === "ILLEGAL_STRUCTURE");

  const withAction = { ...validSequenceFor(clausePlan), actions: [{ type: "OPEN_MAP", placeId: "library", buildingId: "B_PUSTAKA" }] };
  check("a provider-generated action is rejected", window.EchoAI.FactLockedRenderer.validateSequence(withAction, clausePlan).reason === "PROVIDER_ACTION");

  const duplicateClause = { answerMode: "DIRECT", language: "en", sequence: [{ type: "clause", id: clausePlan.clauses[0].clauseId }, { type: "clause", id: clausePlan.clauses[0].clauseId }] };
  check("a duplicated clause is rejected as an illegal structure", window.EchoAI.FactLockedRenderer.validateSequence(duplicateClause, clausePlan).reason !== undefined && !window.EchoAI.FactLockedRenderer.validateSequence(duplicateClause, clausePlan).valid);

  const valid = validSequenceFor(clausePlan);
  check("a fully compliant sequence validates", window.EchoAI.FactLockedRenderer.validateSequence(valid, clausePlan).valid === true);
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

for (const [name, parentBuilding] of [["Blok A1", "B_SERI_PALAS"], ["Blok B2", "B_SERI_TEMIN"], ["Blok C2", "B_SERI_LAKA"]]) {
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
