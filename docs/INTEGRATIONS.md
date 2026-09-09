# Integration Contracts

## Translation

Set `EchoConfig.translation.endpoint` to a backend endpoint that accepts:

```json
{
  "text": "Original note",
  "sourceLanguage": "auto",
  "targetLanguage": "zh"
}
```

Expected response:

```json
{ "translatedText": "Translated note" }
```

The UI caches results locally and lets users switch between original and translated text.

## Cloudinary

Set:

```js
EchoConfig.cloudinary = {
  cloudName: "das8chiyz",
  uploadPreset: "EchoWall",
  mode: "unsigned",
  overwrite: false
};
```

This release uses the owner-configured unsigned preset. The adapter uploads the
already re-encoded image and validates the returned secure URL, public ID,
dimensions, byte count, and format. The API secret must never be placed in the
browser. Because an unsigned preset is publicly callable, account verification
inside EchoWall does not make the Cloudinary endpoint private; see
`docs/PHOTO_PIPELINE.md`.

## BISHENG

Set:

```js
EchoConfig.bisheng = {
  enabled: true,
  endpoint: "https://your-backend.example/bisheng/message",
  appId: "echo-wall-assistant",
  publicToken: ""
};
```

The bridge sends the message together with route, language, page title and a minimal signed-in user context. The recommended production design is a backend proxy so private BISHENG credentials are not exposed.

## Authentication

`AuthService` remains the local/prototype adapter. Canonical Community routes
use `SupabaseAuthProvider`, which retains `email_confirmed_at` and session
expiry and accepts confirmation-required signup results without an immediate
session. See `docs/AUTH_VERIFICATION.md`.

```js
register({ email, displayName, password })
signIn({ email, password })
signOut()
getCurrentUser()
isAuthenticated()
```
