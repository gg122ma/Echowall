# Implementation Report — Feature Foundation

Date: 2026-07-13

## Scope delivered

- Preserved HTML, CSS, vanilla JavaScript, Hash Router and Leaflet.
- Added 30 KMK building profiles from a lightweight Echo Wall-owned snapshot.
- Added building directory, building profile and building-specific wall routes.
- Added five seed building notes so the popular-note overview can be demonstrated.
- Added local prototype registration and login.
- Blocked community, building and map-note posting for signed-out users.
- Added authenticated anonymous or named publishing.
- Added user-selected note coordinates.
- Added ten note shapes.
- Added photo crop scale and `cover` / `contain` controls.
- Added English, Bahasa Melayu and Chinese locale files.
- Added note translation original/translated toggle through a backend adapter.
- Added light, dark and system theme.
- Added Cloudinary signed-upload and BISHENG assistant adapters.
- Added migration backup and schema markers for note schema version 2.

## Routes verified

```text
#/                              home
#/places                        building directory
#/place/B_PUSTAKA               building profile
#/place/B_PUSTAKA/wall          building wall
#/org/1                         community selection
#/wall/1/1/1                    community wall
```

## Automated checks

- 18 JavaScript files passed `node --check`.
- `index.html`: 28 IDs, zero duplicates, zero missing local assets.
- `map.html`: 6 IDs, zero duplicates, zero missing local assets.
- All three CSS files have balanced braces.
- Runtime harness verified:
  - 30 building records
  - 19 seed notes
  - building-note migration
  - local account registration and login
  - theme and language persistence interfaces
  - translation configuration guard
  - Cloudinary local fallback
- Local HTTP checks returned 200 for both pages and critical module files.

## Not claimed as complete

- Full browser visual regression could not be completed because the available headless Chromium process did not exit reliably in the build container.
- Production authentication is not active.
- Live user-note translation is not active until a translation endpoint is configured.
- Cloudinary upload is not active until cloud name and signature endpoint are configured.
- BISHENG chat is not active until the group member provides the deployed endpoint and credential strategy.
- Map-region redesign and map-to-building click connection remain deferred.

## Manual acceptance checklist

1. Run `python -m http.server 8000`.
2. Register a test user.
3. Open `#/places` and inspect multiple building profiles.
4. Enter a building wall and publish anonymous and named notes.
5. Test all shapes and multiple note positions.
6. Test image crop scale and fit.
7. Switch all three languages.
8. Switch light, dark and system themes.
9. Confirm signed-out users cannot post.
10. Check mobile layout and browser console.
