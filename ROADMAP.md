# Echo Wall Roadmap

## Product direction

Echo Wall remains a static HTML, CSS, vanilla JavaScript, Hash Router and Leaflet project. The KMK Digital Twin is a read-only reference source. The map redesign is deferred; current priority is account access, building-specific walls, flexible notes, multilingual UI, theme support and future integration adapters.

## Target user flow

1. User opens a KMK building profile.
2. The profile shows a short building description, basic information and popular notes over a bird's-eye outline.
3. User enters the dedicated wall for that building.
4. User signs in before posting.
5. User may publish anonymously or with their account display name.
6. User chooses the note position, shape, optional photo crop scale and photo fit.
7. Readers may view the original note or request a translation.

## Delivery stages

### F0 — Baseline and collaboration foundation

- Freeze a working baseline.
- Maintain `AGENTS.md`, `CHANGELOG.md`, `HANDOFF.md`, `TEST_PLAN.md` and append-only logs.
- One branch and one objective per stage.

### F1 — Feature foundation — implemented in this package

- Building directory, building profiles and building-specific walls.
- Popular building notes displayed over a bird's-eye building outline.
- Local prototype registration and sign-in adapter.
- Sign-in required before all new wall and map-note posting.
- Anonymous or named publishing for authenticated users.
- User-selected note position.
- Ten note shapes with improved shape styling.
- Photo crop scale and `cover` / `contain` selection.
- English, Bahasa Melayu and Chinese UI framework in a separate `i18n/` folder.
- Original/translated note toggle with a pluggable translation endpoint.
- Light, dark and system theme.
- BISHENG integration bridge.
- Cloudinary signed-upload adapter after client-side compression.

### F2 — Production authentication and data

- Replace local prototype accounts with Supabase Auth or another approved server-side provider.
- Store users, building notes, votes and moderation records in a database.
- Add RLS or equivalent authorization rules.
- Preserve anonymous public display while retaining authenticated ownership internally.

### F3 — Translation service

- Connect `TranslationService` to an approved backend translation endpoint.
- Add rate limits, caching, language detection and failure handling.
- Support translation on wall cards, note modal and moderation view.

### F4 — Cloudinary production media

- Add a server-side signature endpoint.
- Upload already-compressed images directly from the browser to Cloudinary.
- Store secure URL, public ID, dimensions and moderation metadata.
- Add authorized deletion through a backend function.

### F5 — BISHENG assistant

- Connect the bridge to the group member's BISHENG application endpoint.
- Pass route, building, language and signed-in user context.
- Add a chat panel without changing the main wall architecture.

### F6 — Map-to-building connection — deferred

- Improve map regions only after the earlier functions are stable.
- Use Digital Twin data to refine region grouping.
- Region or building clicks may open the existing building profile route.
- Do not turn Echo Wall into a navigation system.

## Definition of done for every stage

- Focused scope and documented decision.
- JavaScript syntax checks.
- HTML ID and local asset checks.
- Desktop and mobile manual verification.
- Light/dark and three-language verification where affected.
- Storage migration test when data changes.
- `OPTIMIZATION_LOG.md`, `CODE_AUDIT.md`, `CHANGELOG.md` and `HANDOFF.md` updated.
- Rollback instructions recorded.
