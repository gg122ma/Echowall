# ECHOWALL WRITER REFERENCE

> Quick factual reference for future competition-material writers.  
> This is **not an Abstract, not an Abstract draft, and not proposed submission wording**.  
> Current-product audit date: 2026-08-28.

## WHAT IS ECHOWALL?

EchoWall is a browser-based campus knowledge prototype that connects:

1. a detailed KMK campus map and building information;
2. place-linked Building Walls;
3. All KM, College and Jurusan student communities;
4. Echo Library academic-resource discovery; and
5. a bounded, local knowledge-base campus guide called Ask Echo.

Its defining interaction is that a student can select an eligible KMK building footprint, publish a place-linked note, see a public map label, and open the same note in that building’s wall.

## CORE PROBLEM ADDRESSED

Campus knowledge is often fragmented by place, college, jurusan, chat group and file folder. EchoWall gives that knowledge an explicit destination: practical place information belongs to a building, broad discussion can reach All KM, focused discussion can stay within a College/Jurusan scope, and academic files can be found through programme–semester–subject structure.

This is a **supported problem/solution relationship**, not evidence that real users have already experienced measurable improvement.

## TOP 5 FUNCTIONS

1. **Echo Map and Building Knowledge** — browse KMK footprints, search 13 focus buildings, inspect schedule-based status, and open one of 32 building profiles/walls.
2. **Map-to-Wall Contribution** — publish a Discussion or Question at one of 19 eligible footprints; the note becomes a map label and a Building Wall post.
3. **Layered Communities** — use All KM Students, 12 College landings and 33 Jurusan wall routes for different audiences.
4. **Community Q&A** — publish Discussion/Question posts and, on Community posts, add comments, one-level replies and solved state.
5. **Echo Library** — browse/search/filter 2,284 publishable metadata records and open/download the 377 records that have real mapped files.

## TOP 5 SELLING POINTS

1. **One continuous place-knowledge loop:** map → building profile/wall → contribution → map label → same wall.
2. **Broad and focused community scopes:** All KM, College and Jurusan are represented in one system.
3. **Structured academic retrieval:** Jurusan → Semester → Subject Code → category/year/resource, including available question–scheme relationships.
4. **Reusable peer knowledge:** Questions can receive comments/replies and be marked solved instead of remaining undifferentiated posts.
5. **Practical access support:** EN/BM/Chinese, Light/Dark/System themes, responsive layouts, keyboard-supporting interactions and bounded campus guidance.

## BEST PRACTICAL FEATURES

- Search/focus a KMK building and move directly to its details or wall.
- Show schedule-based open/closed information from static hours.
- Search/filter/sort Echo Library and honestly distinguish available from unavailable files.
- Open 363 mapped PDFs and download 8 PPTX/6 DOCX files.
- Follow available question-paper ↔ answer-scheme links.
- Publish, comment, reply and resolve an eligible Community Question.
- Use three interface languages and theme/device-friendly layouts.

## BEST IMPACT-SUPPORTING FEATURES

- All KM Students provides a cross-college knowledge scope.
- College/Jurusan spaces let information target the students most likely to need it.
- Building Walls preserve practical knowledge around a physical campus location.
- Community Questions, comments, replies and solved state can make peer answers reusable.
- Echo Library can reduce fragmentation of academic-resource discovery.
- Named/anonymous and photo options can lower contribution friction.

Use “supports,” “can help,” or “is designed to” unless separate real evaluation evidence proves adoption or outcomes.

## BEST IDEA-SUPPORTING FEATURES

- Treating a campus building as both a navigable place and a community knowledge point.
- Creating one place-linked note that appears on both map and Building Wall.
- Combining global, college, jurusan and building knowledge scopes in one product.
- Turning visual sticky notes into Discussion/Question objects with answer and solved behaviour.
- Linking academic questions and schemes inside a course-structured resource library.

## SUPPORTING FEATURES

- 32 KMK building profiles/walls.
- Building descriptions; purpose for 14; Special Notes for 10.
- 18 mapped gallery photos across 10 buildings.
- Ask Echo local retrieval from 41 curated campus records; 12 can link to Building Detail.
- Named/anonymous, category, shape, colour and photo contribution options.
- Local register/login/profile.
- PDF upload with signature validation, SHA-256 exact-duplicate block and pending local review.
- Scoped admin/moderation/audit interfaces.
- Reduced-motion, keyboard, ARIA and image-failure support in multiple major flows.

## FEATURES NOT WORTH EMPHASIZING

- Home statistics (`1,017`, `53`) and college/building display counts.
- Seed vote totals, Hot ranking or generated engagement values.
- Legacy route redirects or legacy pin storage.
- College General direct routes, because normal UI discovery is missing.
- Other-college maps/building pages, because all 11 non-KMK registries are empty.
- Empty Events sections and the empty Computer Science library framework.
- Detailed role/scope/audit mechanics unless discussing engineering architecture.
- Cloudinary, Translation, Bisheng, OpenRouter or Supabase adapters, because current required endpoints/configuration are absent.

## CLAIMS TO AVOID

- “1,017 real posts/users/students.”
- “593 College contributions” or “412 Building Wall posts.” Those totals come from display-only override tables.
- “67 students posted in All KM Students.” The 67 starting posts are seed data.
- “The visible votes show real engagement.” Current seed/default scores are fabricated demo values in a 0–87 range.
- “Seed author names are real registered users.” Auth storage starts empty; seed names are content labels, not accounts.
- “EchoWall has 12 complete campus maps.” Only KMK is detailed.
- “Fourteen map focus buildings.” Current source has 13, despite incorrect UI copy.
- “Live/realtime opening status.” It is computed from static schedules and browser time.
- “Every building has a footprint, gallery, purpose and Special Notes.” Coverage varies.
- “2,284 downloadable files.” There are 2,284 publishable metadata records but 377 real mapped files.
- “Resources are verified.” All 2,468 manifest records currently state `unverified`.
- “377 files prove adoption or academic impact.” File presence is capability evidence only.
- “Advanced/generative/Bisheng-powered AI assistant.” Ask Echo is local retrieval/template guidance; external AI endpoints are unconfigured.
- “Working automatic post translation.” The endpoint is empty.
- “Students can report posts.” No user-facing Report action exists.
- “AI automatically moderates content.” Current assistance is rule-based flagging for local review.
- “Cloud storage, realtime sync, production authentication or secure institution accounts.” Current state is browser-local.
- “WCAG compliant” or “fully accessible.” Supporting behaviours exist, but no formal audit/certification exists.
- Any adoption, reach, time saved, grade improvement, satisfaction or impact result without separate real evidence.

## PROTOTYPE LIMITATIONS

- Most accounts, posts, comments, replies, votes, map anchors, preferences, roles and moderation state persist only in `localStorage` in one browser.
- Academic uploads and their review lifecycle persist in IndexedDB in that same browser.
- There is no active shared backend, cross-device sync or realtime multi-user state.
- Local authentication and front-end role checks are not production security.
- No demo account is pre-created; a visitor must register in that browser before using login-gated actions.
- Community activity is heavily seeded: 763 runtime seed posts plus 19 defaults produce 782 displayed notes in an empty browser.
- Only 12 of 33 Jurusan walls and 8 of 32 Building Walls start with content; all 12 College General walls start empty.
- Building comments/replies are absent; those interactions are available on Community posts.
- Ordinary users cannot currently edit/delete their own published posts; removal is an authorised-admin action.
- Voting is per-browser and does not require login.
- The detailed map/building dataset is KMK-only; 11 other college maps are framework previews.
- The Library has 1,907 publishable records without a real file mapping, and all built-in records are unverified.
- A submitter receives an inline pending result, but there is no user-facing submission-history/status dashboard.
- Ask Echo is static/local and partially localised; it has no live data or general AI reasoning.
- Automatic post translation, user reporting, current events, private map-note creation and external cloud providers are not working product capabilities.
- No fresh interactive browser/device/screen-reader pass was available during this audit; automated/runtime-source checks passed, but formal accessibility and deployment validation remain outside the evidence.

## NUMBERS WRITERS MAY USE — ONLY WITH THEIR QUALIFIERS

| Number | Safe meaning |
|---:|---|
| 74 | Major current user/admin-facing feature units identified by this audit |
| 12 | Configured College Community landings/switcher states, not 12 complete maps |
| 33 | Configured Jurusan wall routes; only 12 begin seeded |
| 32 | KMK building profiles and Building Walls |
| 19 | Interactive KMK footprints eligible for map focus/direct placement |
| 13 | Actual Map focus/search list entries |
| 41 | Local Ask Echo knowledge records |
| 2,468 | Full Echo Library manifest records; all unverified |
| 2,284 | Publishable metadata records, not downloadable files |
| 377 | Existing mapped files: 363 PDF, 8 PPTX, 6 DOCX; not adoption evidence |
| 782 | Empty-browser displayed note total from 763 runtime seeds + 19 defaults; not real activity |

## BOTTOM LINE FOR FUTURE WRITERS

Emphasise the **place-linked knowledge loop**, **layered student communities**, **Community Q&A**, and **structured Echo Library with an honest real-file subset**. Treat multilingual/theme/accessibility support and Ask Echo as practical supporting capabilities. Always describe local storage, seeded interaction, incomplete non-KMK data, unverified library metadata and unconfigured external services plainly; never convert demo richness into adoption or impact claims.
