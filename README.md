# Echo Wall — Feature Foundation

This version preserves the original HTML, CSS, vanilla JavaScript, Hash Router and Leaflet architecture while adding building-specific walls, account gating, flexible notes, multilingual UI, themes and integration adapters.

## Run locally

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/index.html
```

Do not open the HTML directly from `file://` because local authentication uses Web Crypto and the site is designed for HTTP serving.

## Main routes

```text
#/places
#/place/B_PUSTAKA
#/place/B_PUSTAKA/wall
```

## Prototype credentials

There are no default user credentials. Register a local user from the navbar. The separate admin prototype remains unchanged.

## Production requirements

- Replace local auth with Supabase Auth or another approved backend provider.
- Connect a translation proxy.
- Configure a Cloudinary signature endpoint.
- Configure the BISHENG backend bridge.
- Move notes, votes and moderation records out of LocalStorage.

See `ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` and `docs/INTEGRATIONS.md`.
