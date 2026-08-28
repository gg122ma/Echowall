/**
 * Public integration configuration.
 * Never place private API secrets in this file.
 */
window.EchoConfig = Object.freeze({
  auth: {
    provider: "local-prototype",
  },
  translation: {
    endpoint: "",
    requestHeaders: {},
  },
  cloudinary: {
    cloudName: "",
    signatureEndpoint: "",
    uploadFolder: "echo-wall",
  },
  bisheng: {
    enabled: true,
    endpoint: "",
    appId: "",
    publicToken: "",
  },
  freeAI: {
    enabled: true,
    provider: "local",
    openRouterToken: "",
    model: "openrouter/auto-beta",
  },
});
