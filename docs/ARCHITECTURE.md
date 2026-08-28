# Architecture

## Preserved foundation

- Static HTML pages
- Vanilla JavaScript browser globals
- Hash-based routing
- Leaflet for the existing map
- LocalStorage for the current prototype
- No framework migration and no package manager dependency

Script order in `index.html` remains intentional. Configuration, locale files, services and building data load before the original application files.

## New module boundaries

```text
config/
  app-config.js               Public integration switches only
data/
  campus-buildings.js         Echo Wall-owned building snapshot
i18n/
  index.js                    Locale selection and translation lookup
  locales/en.js
  locales/ms.js
  locales/zh.js
services/
  auth-service.js             Replaceable auth provider interface
  auth-ui.js                  Registration/login UI
  theme-service.js            Light/dark/system preference
  translation-service.js      User-note translation endpoint adapter
  cloudinary-adapter.js       Signed upload adapter
  bisheng-adapter.js          AI assistant bridge
app-place.js                  Building directory and profile rendering
```

## Routes

```text
#/                              Home
#/org/:orgId                    Community context selection
#/wall/:orgId/:batchId/:majorId Community wall
#/places                        Building directory
#/place/:placeId                Building profile
#/place/:placeId/wall           Dedicated building wall
#/admin                         Prototype admin
```

## Building profile and wall

The building profile is separate from the wall. It shows localized building information and up to five highest-scoring visible building notes over a generated bird's-eye outline. The wall route does not request a batch or major.

## Integration rule

No secret is stored in frontend JavaScript. BISHENG, translation, Cloudinary signature generation and production authentication must be reached through approved public endpoints or backend functions.
