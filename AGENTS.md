# Echo Wall Repository Guidelines

## Project direction

Echo Wall is the primary project. Preserve:

- HTML
- CSS
- Vanilla JavaScript
- Hash Router
- Leaflet
- LocalStorage prototype data

Do not migrate to React, Next.js, Vue, TypeScript or Vite unless explicitly approved.

The KMK Digital Twin is read-only reference material. It may help derive building names, descriptions, outlines and map grouping, but Echo Wall must own a lightweight static snapshot and must not depend on the Digital Twin at runtime.

## Current approved product model

```text
Community -> Batch -> Major -> Community Wall
Building Profile -> Dedicated Building Wall
```

A building wall does not require batch or major selection.

The building profile should show:

- building description
- basic metadata
- a bird's-eye outline
- the highest-scoring visible notes
- an entry to the building-specific wall

Map region redesign is deferred. Do not turn Echo Wall into a navigation system.

## Current priorities

1. Stable documentation and collaboration rules.
2. Building profiles and building-specific walls.
3. Registration and login requirement before posting.
4. Anonymous or named publishing for signed-in users.
5. Flexible note placement and improved shapes.
6. Photo crop scale and fit controls.
7. English, Bahasa Melayu and Chinese language system in `i18n/`.
8. Original/translated user-note toggle through a replaceable translation endpoint.
9. Light, dark and system theme.
10. Integration preparation for BISHENG and Cloudinary.

Do not change unrelated architecture or the existing map regions during these stages.

## Module boundaries

Use the existing application files and the following focused folders:

```text
config/
data/
i18n/
services/
docs/
```

Preserve script order in `index.html` because browser globals are shared.

## Security

- The local user account provider is prototype-only.
- The existing admin login is prototype-only.
- Never place Cloudinary API Secret, Supabase service-role keys, BISHENG private credentials or translation provider secrets in frontend JavaScript.
- Production authentication must use a server-side provider such as Supabase Auth with database authorization policies.
- Cloudinary uploads must use a backend signature endpoint.
- Treat all user content as untrusted and escape it before HTML rendering.

## Development process

For each stage:

1. Inspect the current implementation.
2. Define one focused objective.
3. Compare at least two solutions for substantial changes.
4. Choose the least disruptive option.
5. Modify only relevant files.
6. Run tests.
7. Update `CHANGELOG.md`, `HANDOFF.md`, `OPTIMIZATION_LOG.md` and `CODE_AUDIT.md`.
8. Record rollback instructions.
9. Stop before the next stage unless approved.

## Git safety

- Inspect `git status` and branch before work.
- Do not discard user changes.
- Do not use `git reset --hard` or `git clean`.
- Do not rewrite history.
- Do not push or commit unless explicitly requested.
- One branch should solve one objective.

## Testing

After JavaScript changes:

```powershell
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Also test:

- duplicate HTML IDs
- local asset paths
- CSS structure
- desktop and mobile layouts
- sign-up, sign-in and sign-out
- posting blocked while signed out
- anonymous and named posting
- building profile and building wall routes
- note position persistence
- every note shape
- photo crop scale and fit
- three languages
- original/translated toggle
- light, dark and system themes
- LocalStorage reload persistence
- console errors

Report honestly when a browser or integration test could not be executed.


---

# Task execution policy

## Task granularity

- One Codex task must have exactly **one primary objective**.
- Never combine unrelated features, UI redesigns, refactors, data migration or architecture changes in the same task.
- Prefer tasks that can be completed within **15–20 minutes**.

## Time limit

If a task exceeds approximately **20 minutes**:

1. Stop development immediately.
2. Report:
   - Completed work
   - Remaining work
   - Current blocker
   - Modified files
3. Wait for explicit user approval before continuing.

Never continue automatically.

## Development workflow

Every approved task should follow this order:

1. Implement one objective.
2. Run only the tests related to that objective.
3. Let the user manually preview the result.
4. Wait for user approval.
5. Start the next objective.

Never begin the next planned stage automatically.

## Browser testing

If an automated browser is unavailable:

- Do not repeatedly retry browser setup.
- Explain the limitation once.
- Provide manual verification steps.
- Wait for user confirmation.

## Documentation

Update CHANGELOG.md, HANDOFF.md, CODE_AUDIT.md and OPTIMIZATION_LOG.md only after the current objective is complete.

Avoid spending excessive time repeatedly updating documentation during implementation.
