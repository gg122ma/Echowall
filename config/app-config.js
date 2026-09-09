/**
 * Public integration configuration.
 * Never place private API secrets in this file.
 */
window.EchoConfig = Object.freeze({
  features: Object.freeze({
    campusAssistant: true,
    photoUploads: true,
  }),
  community: Object.freeze({
    provider: "supabase-production",
    production: Object.freeze({
      projectRef: "iavndheqyzphcppfisil",
      url: "https://iavndheqyzphcppfisil.supabase.co",
      publishableKey: "sb_publishable_82w_LcSTk9gvgprREncwnw_ZlHOCW_V",
      origin: "https://gg122ma.github.io",
      basePath: "/Echowall/",
    }),
    staging: Object.freeze({
      projectRef: "iavndheqyzphcppfisil",
      url: "https://iavndheqyzphcppfisil.supabase.co",
      activationStorageKey: "echo-wall-community-staging:v1",
      configStorageKey: "echo-wall-community-staging-config:v1",
    }),
  }),
  auth: {
    provider: "local-prototype",
  },
  translation: {
    endpoint: "",
    requestHeaders: {},
  },
  cloudinary: Object.freeze({
    cloudName: "das8chiyz",
    uploadPreset: "EchoWall",
    mode: "unsigned",
    overwrite: false,
  }),
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
