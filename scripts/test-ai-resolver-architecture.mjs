#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
let passed = 0;
const check = (label, condition) => {
  assert.ok(condition, label);
  passed += 1;
  console.log(`PASS - ${label}`);
};

const sources = Object.freeze({
  router: read("services/ai/intent-router.js"),
  engine: read("services/ai/knowledge-engine.js"),
  context: read("services/ai/conversation-context.js"),
  planner: read("services/ai/answer-planner.js"),
  map: read("services/ai/map-action.js"),
  resolver: read("services/ai/retriever.js"),
  index: read("services/ai/index.js"),
});

check("legacy identity-authority helpers are removed", !/localAliasSpan|fallbackQualifiedIdentity|fallbackNamedSpan|SUBJECT_REFERENCE_TOKENS|PREDICATE_AUXILIARIES|IDENTITY_ACTION_TOKENS|SAFE_TARGET_MODIFIERS/.test(Object.values(sources).join("\n")));
check("IntentRouter exposes service concepts rather than canonical IDs", /analyzeServiceFrame/.test(sources.router) && !/serviceNeedEntityId|legacyServiceNeedEntityId|pos-mini|hostel-laundry|bicycle-service|sports-equipment-store/.test(sources.router));
check("KnowledgeEngine consumes canonical resolution and performs no retrieval", /KnowledgeEngine\.resolve requires a canonical resolution result/.test(sources.engine) && !/EchoAI\.Retriever|EchoAI\.IntentRouter|discoveryCategory\(/.test(sources.engine));
check("ConversationContext stores state but cannot resolve places", !/PlaceRegistry|getEntity|CanonicalResolver|KnowledgeEngine/.test(sources.context));
check("AnswerPlanner forwards only canonical Map provenance", /MapAction\.create\(canonical\?\.map/.test(sources.planner) && !/MapAction\.create\(place/.test(sources.planner));
check("MapAction requires an eligible resolver Map decision", /function create\(map,/.test(sources.map) && /map\?\.eligible/.test(sources.map) && !/KnowledgeEngine/.test(sources.map));
check("request orchestration invokes the canonical resolver exactly once", (sources.index.match(/CanonicalResolver\.resolve/g) || []).length === 1 && !/KnowledgeEngine\.getEntity/.test(sources.index));
check("only the canonical resolver maps service concepts to entity IDs", /SERVICE_ENTITY_BY_FRAME/.test(sources.resolver) && !Object.entries(sources).filter(([name]) => name !== "resolver").some(([, source]) => /SERVICE_ENTITY_BY_FRAME/.test(source)));

const files = [
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
  "services/ai/map-action.js",
  "services/ai/knowledge-engine.js",
];
const window = { sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, location: { href: "index.html" } };
window.window = window;
const sandbox = { window, Map, Set, Object, Number, String, Boolean, Date, Math, RegExp, JSON, console };
vm.createContext(sandbox);
files.forEach(file => vm.runInContext(read(file), sandbox, { filename: file }));

const resolve = (question, options = {}) => window.EchoAI.CanonicalResolver.resolve(question, {
  intent: window.EchoAI.IntentRouter.classify(question),
  ...options,
});
const exact = resolve("Where is Library?");
check("exact verified target is the sole exact Map source", exact.target.state === "EXACT_KNOWN_TARGET" && exact.canonical.basis === "EXACT_TARGET" && exact.map.eligible === true && exact.map.placeId === "library");
const mention = resolve("Library: what time does it close?");
check("known predicate mention resolves for facts without Map confidence", mention.target.state === "KNOWN_ENTITY_MENTION" && mention.canonical.entityId === "library" && mention.map.eligible === false);
const ambiguous = resolve("Students appreciate Library.");
check("undecidable free-form mention is intentionally ambiguous", ambiguous.target.state === "AMBIGUOUS_NAMED_REFERENCE" && ambiguous.canonical.state === "AMBIGUOUS" && ambiguous.map.eligible === false);
const fictional = resolve("Locate Mossvale Library Gallery.");
check("known alias inside a larger Latin target is unresolved", fictional.target.state === "UNRESOLVED_NAMED_TARGET" && !fictional.canonical.entityId && !fictional.map.eligible);
const untemplatedFictional = resolve("Cedar Library Arcade closes early.");
check("intent words cannot authorize an untemplated larger name", untemplatedFictional.target.state === "AMBIGUOUS_NAMED_REFERENCE" && !untemplatedFictional.canonical.entityId && !untemplatedFictional.map.eligible);
const cjk = resolve("海湾图书馆侧馆在哪里？");
check("pure-CJK qualified target is unresolved", cjk.target.state === "UNRESOLVED_NAMED_TARGET" && !cjk.canonical.entityId && !cjk.map.eligible);
const mixed = resolve("枫谷library侧馆在哪里？");
check("mixed-script qualified target is unresolved", mixed.target.state === "UNRESOLVED_NAMED_TARGET" && !mixed.canonical.entityId && !mixed.map.eligible);
const offsetEvidence = window.EchoAI.Retriever.collectAliasEvidence("枫谷library侧馆").matches.find(item => item.entityId === "library");
check("Unicode alias evidence preserves exact source offsets", Boolean(offsetEvidence) && "枫谷library侧馆".slice(offsetEvidence.span.start, offsetEvidence.span.end).toLocaleLowerCase() === "library");
const service = resolve("Documents are needed to be printed.");
check("object-first service grammar resolves only in the canonical engine", service.service.state === "SERVICE_NEED" && service.canonical.basis === "SERVICE" && service.canonical.entityId === "pos-mini" && !service.map.eligible);
const modifiedService = resolve("My seminar handout pages require printing.");
check("complete service frames tolerate non-identity predicate modifiers", modifiedService.canonical.entityId === "pos-mini" && modifiedService.canonical.basis === "SERVICE" && !modifiedService.map.eligible);
check("service analyzer frames contain concepts and no canonical entity ID", service.service.frames.every(frame => !Object.hasOwn(frame, "entityId")));
const fakeService = resolve("I need Alder Print Studio.");
check("fictional service-like target blocks service fallback", fakeService.target.state === "UNRESOLVED_NAMED_TARGET" && !fakeService.canonical.entityId && !fakeService.map.eligible);
const contextual = resolve("What time does it close?", { previousEntityId: "library", contextReference: true });
check("context is applied once and never gains exact Map provenance", contextual.context.state === "CONTEXT_REFERENCE" && contextual.canonical.basis === "CONTEXT" && contextual.canonical.entityId === "library" && !contextual.map.eligible);
const approximate = resolve("Locate libary.");
check("approximate target may resolve for facts but never for Map", approximate.canonical.basis === "APPROXIMATE_TARGET" && approximate.canonical.entityId === "library" && !approximate.map.eligible);
const special = resolve("Locate Reading Room.");
check("special entity uses the same exact-target path", special.target.state === "EXACT_KNOWN_TARGET" && special.canonical.entityId === "reading-room" && !special.map.eligible);
const parent = resolve("Locate B1.");
check("verified parent mapping keeps exact requested identity provenance", parent.target.state === "EXACT_KNOWN_TARGET" && parent.canonical.entityId === "blok-b1" && parent.map.confidence === "VERIFIED_PARENT_TARGET" && parent.map.buildingId === "B_SERI_TEMIN");
const lower = resolve("Locate amberfield library annex.");
const upper = resolve("Locate AMBERFIELD LIBRARY ANNEX.");
check("case changes do not alter target safety", lower.target.state === upper.target.state && lower.canonical.state === upper.canonical.state && !lower.canonical.entityId && !upper.canonical.entityId);
check("canonical result and nested decisions are immutable", Object.isFrozen(exact) && Object.isFrozen(exact.target) && Object.isFrozen(exact.canonical) && Object.isFrozen(exact.map));
check("MapAction rejects an arbitrary resolved place without resolver provenance", window.EchoAI.MapAction.create(window.EchoAI.PlaceRegistry.getById("library")) === null);

console.log(`\n${passed}/${passed} assertions passed.`);
