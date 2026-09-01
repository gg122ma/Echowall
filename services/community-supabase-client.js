/**
 * Community-only Supabase boundary.
 *
 * Canonical production uses the browser-safe public configuration embedded in
 * EchoConfig. Local staging keeps the verified Phase 5 loopback + explicit
 * LocalStorage activation contract. All other origins stay Local.
 */
(function () {
  const SDK_VERSION = "2.57.4";
  const SDK_URL = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SDK_VERSION}/dist/umd/supabase.min.js`;
  const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  let clientPromise = null;

  function communityConfig() {
    return window.EchoConfig?.community || {};
  }

  function boundary() {
    return communityConfig().staging || {};
  }

  function productionBoundary() {
    return communityConfig().production || {};
  }

  function isTrustedLoopbackOrigin() {
    const protocol = String(window.location?.protocol || "").toLowerCase();
    if (protocol && protocol !== "http:" && protocol !== "https:") return false;
    return LOOPBACK_HOSTS.has(String(window.location?.hostname || "").toLowerCase());
  }

  function isCanonicalProduction() {
    const production = productionBoundary();
    const origin = String(window.location?.origin || "");
    const pathname = String(window.location?.pathname || "");
    const basePath = String(production.basePath || "");
    return origin === production.origin
      && basePath === "/Echowall/"
      && (pathname === basePath || pathname === `${basePath}index.html`);
  }

  function isStagingRequested() {
    if (!isTrustedLoopbackOrigin()) return false;
    try {
      return localStorage.getItem(boundary().activationStorageKey) === "supabase-staging";
    } catch {
      return false;
    }
  }

  function validPublicConfig(url, publishableKey, expectedUrl) {
    const normalizedUrl = String(url || "").replace(/\/$/, "");
    const normalizedExpectedUrl = String(expectedUrl || "").replace(/\/$/, "");
    const normalizedKey = String(publishableKey || "").trim();
    if (normalizedUrl !== normalizedExpectedUrl || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(normalizedKey)) return null;
    return Object.freeze({ url: normalizedUrl, publishableKey: normalizedKey });
  }

  function readPublicConfig() {
    if (isCanonicalProduction()) {
      const production = productionBoundary();
      return validPublicConfig(production.url, production.publishableKey, production.url);
    }
    try {
      const staging = boundary();
      const parsed = JSON.parse(localStorage.getItem(staging.configStorageKey) || "null");
      return validPublicConfig(parsed?.url, parsed?.publishableKey, staging.url);
    } catch {
      return null;
    }
  }

  function getActivationState() {
    if (isCanonicalProduction()) {
      const config = readPublicConfig();
      return Object.freeze({
        mode: config ? "supabase-production" : "blocked",
        requested: true,
        configured: Boolean(config),
        projectRef: productionBoundary().projectRef || "",
      });
    }
    const requested = isStagingRequested();
    const config = requested ? readPublicConfig() : null;
    return Object.freeze({
      mode: requested ? (config ? "supabase-staging" : "blocked") : "local",
      requested,
      configured: Boolean(config),
      projectRef: boundary().projectRef || "",
    });
  }

  function activationError() {
    const error = new Error("Community Supabase is not configured for this browser.");
    error.code = "COMMUNITY_STAGING_NOT_CONFIGURED";
    return error;
  }

  function loadPinnedSdk() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    if (!window.document?.head) return Promise.reject(activationError());
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-echo-supabase-version="${SDK_VERSION}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.supabase), { once: true });
        existing.addEventListener("error", () => reject(new Error("Community is temporarily unavailable.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.dataset.echoSupabaseVersion = SDK_VERSION;
      script.onload = () => window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error("Community is temporarily unavailable."));
      script.onerror = () => reject(new Error("Community is temporarily unavailable."));
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    const config = readPublicConfig();
    const activation = getActivationState();
    if (!activation.mode.startsWith("supabase-") || !config) throw activationError();
    if (!clientPromise) {
      clientPromise = loadPinnedSdk().then(sdk => sdk.createClient(config.url, config.publishableKey, {
        db: { schema: "api" },
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })).catch(error => {
        clientPromise = null;
        throw error;
      });
    }
    return clientPromise;
  }

  window.CommunitySupabaseClient = Object.freeze({
    SDK_VERSION,
    SDK_URL,
    isTrustedLoopbackOrigin,
    isCanonicalProduction,
    getActivationState,
    getClient,
  });
})();
