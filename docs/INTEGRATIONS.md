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
  cloudName: "...",
  signatureEndpoint: "https://your-backend.example/cloudinary/sign",
  uploadFolder: "echo-wall"
};
```

The signature endpoint must return `apiKey`, `timestamp`, `signature` and optional `folder`. The API secret must never be placed in the browser. The adapter uploads the already-compressed image and stores the secure URL and public ID.

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

`AuthService` is intentionally replaceable. The current provider is `local-prototype`. A production provider must keep the same public methods:

```js
register({ email, displayName, password })
signIn({ email, password })
signOut()
getCurrentUser()
isAuthenticated()
```
