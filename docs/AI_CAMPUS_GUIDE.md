# EchoWall Campus Assistant Guide

## Purpose

EchoWall's campus assistant is a source-grounded KMK guide. It answers known
campus questions through the deterministic `AnswerRenderer`. The configured
provider is used only for non-campus general requests; external-LLM campus
rendering is not active. Provider output never receives permission to navigate
the browser directly.

## Architecture

The browser-global modules in `services/ai/` separate configuration,
normalization, language detection, source registration, place resolution,
conversation context, intent routing, retrieval, premise checking, conflict
detection, Map actions, provider handling, and response validation. The public
entry point is `CampusAI.ask(message, { sessionId })`.

Every result is normalized to:

```js
{
  schemaVersion,
  answer,
  intent,
  confidence,
  premise,
  resolvedPlaces,
  resolution,
  facts,
  selectedFactIds,
  answerPlan,
  grounding,
  conflicts,
  context,
  actions,
  error
}
```

Only `OPEN_MAP` actions created and validated by `EchoAI.MapAction` are shown.
The action must identify a known canonical place and a real Building target.
Information-only, ambiguous, and unknown queries have no Map action.

## Source authority

The enforced order is:

1. Owner-provided campus source material, including preserved PDF page refs.
2. Structured EchoWall campus knowledge (`data/kmk-knowledge-base.js`).
3. Existing EchoWall Map/Building data (`data/campus-buildings.js`).
4. Community posts, explicitly labelled as student opinion.
5. Generic model knowledge for language/reasoning only.

The source registry retains filename/page metadata. Known Library, Serambi,
CUBIC, Cafe Admin, KOOP, Cafe A/B/C, and Dewan Kuliah facts remain grounded in
the supplied campus source. A page is recorded only when owner-provided source
metadata identifies it; unresolved page metadata is marked for verification,
not guessed. Unknown places such as “Quantum Tower” are not turned into
synthetic locations or markers.

## Reliability behavior

- Premises are classified `SUPPORTED`, `CONTRADICTED`, `UNKNOWN`, or
  `AMBIGUOUS`. A Friday-at-8 premise for the Library is corrected because the
  current source says Friday is closed.
- Conflict detection compares values for the same semantic fact. Different
  descriptions, services, rules, translations, and complementary subsets do
  not conflict merely because their text differs. Incompatible same-day hours
  such as Friday `closed` versus Friday `08:00-16:30` do conflict. A clearly
  newer dated authoritative record may resolve a real conflict; otherwise the
  answer states uncertainty.
- Atomic conflicts are scoped by entity and by the requested semantic intent.
  Cafe Admin's hours conflict therefore does not replace its location,
  identity, or general-service answer.
- When no specific place is named, approved dining and sports category queries
  return a concise, structured candidate list. The planner asks the user to
  choose and emits no Map action; an explicit follow-up place then uses the
  normal exact-entity path. Unsupported legacy candidates are not promoted by
  category discovery.
- English, Bahasa Melayu, and Chinese are detected from the latest meaningful
  message. Proper campus names remain canonical.
- Aliases and conservative typo repair support names such as Pustaka,
  Perpustakaan, 图书馆, Koop Mart, Kafe, and common misspellings. Multiple
  plausible matches are not navigated.
- Short-lived in-session context keeps the latest confidently resolved entity
  only for clear refer-backs and elliptical follow-ups such as “Kalau Jumaat?”
  or “那里几点关？”. An explicit new place always resolves independently and
  overrides the prior entity.
- Nearby answers rank explicit source relations ahead of coordinate fallback.
  Coordinate fallback is labelled approximate map-coordinate proximity; no
  meter distances or exact physical-distance claims are emitted.
- Canonical place IDs are validated against `CAMPUS_BUILDINGS`. A knowledge
  place with no validated target remains answerable but cannot create a Map
  action. KOOP uses its explicit canonical `B_KOOP` building-preview target;
  Pos Mini remains unmapped and cannot inherit it.
- Prompt-injection wording cannot override campus-source authority.

## Feature and failure handling

`EchoConfig.features.campusAssistant` is the rollback switch. Provider timeout,
offline/rate-limit responses, malformed JSON, invalid actions, and source
conflicts are converted to safe structured responses. Stack traces, raw
provider payloads, and credentials are never displayed.

Focused regression coverage is in `scripts/test-campus-ai.mjs` (192 assertions) and
`scripts/test-ai-map-actions.mjs`.
