# EchoWall Campus Assistant Guide

## Purpose

EchoWall's campus assistant is a source-grounded KMK guide. It answers known
campus questions deterministically and only uses a configured language model
for general phrasing or synthesis. Provider output never receives permission
to navigate the browser directly.

## Architecture

The browser-global modules in `services/ai/` separate configuration,
normalization, language detection, source registration, place resolution,
conversation context, intent routing, retrieval, premise checking, conflict
detection, Map actions, provider handling, and response validation. The public
entry point is `CampusAI.ask(message, { sessionId })`.

Every result is normalized to:

```js
{
  answer,
  intent,
  confidence,
  premise,
  resolvedPlaces,
  grounding,
  conflicts,
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
CUBIC, Cafe Admin, KOOP, Cafe A/B, and Dewan Kuliah facts remain grounded in
the supplied campus source. Unknown places such as “Quantum Tower” are not
turned into synthetic locations or markers.

## Reliability behavior

- Premises are classified `SUPPORTED`, `CONTRADICTED`, `UNKNOWN`, or
  `AMBIGUOUS`. A Friday-at-8 premise for the Library is corrected because the
  current source says Friday is closed.
- Conflicting authoritative structured values are retained as conflict
  metadata. A clearly newer dated authoritative record may resolve a conflict;
  otherwise the answer states uncertainty.
- English, Bahasa Melayu, and Chinese are detected from the latest meaningful
  message. Proper campus names remain canonical.
- Aliases and conservative typo repair support names such as Pustaka,
  Perpustakaan, 图书馆, Koop Mart, Kafe, and common misspellings. Multiple
  plausible matches are not navigated.
- Short-lived in-session context keeps the latest confidently resolved entity
  for follow-ups such as “Kalau Jumaat?” or “那里几点关？”. A clear topic
  change replaces or clears stale context.
- Nearby answers require an explicit source relation or existing map relation;
  no made-up meter distances are emitted.
- Prompt-injection wording cannot override campus-source authority.

## Feature and failure handling

`EchoConfig.features.campusAssistant` is the rollback switch. Provider timeout,
offline/rate-limit responses, malformed JSON, invalid actions, and source
conflicts are converted to safe structured responses. Stack traces, raw
provider payloads, and credentials are never displayed.

Focused regression coverage is in `scripts/test-campus-ai.mjs` and
`scripts/test-ai-map-actions.mjs`.
