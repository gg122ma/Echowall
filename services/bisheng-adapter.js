(function () {
  function isConfigured() {
    const config = window.EchoConfig?.bisheng || {};
    return Boolean(config.enabled && config.endpoint);
  }

  function buildContext() {
    const route = typeof getRoute === "function" ? getRoute() : { page: "unknown" };
    const user = window.AuthService?.getCurrentUser?.() || null;
    return {
      route,
      language: window.I18n?.getLanguage?.() || "en",
      user: user ? { id: user.id, displayName: user.displayName } : null,
      pageTitle: document.title,
    };
  }

  async function sendMessage(message, conversationId = "") {
    if (!isConfigured()) {
      const error = new Error("BISHENG_NOT_CONFIGURED");
      error.code = "BISHENG_NOT_CONFIGURED";
      throw error;
    }
    const config = window.EchoConfig.bisheng;
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.publicToken ? { Authorization: `Bearer ${config.publicToken}` } : {}),
      },
      body: JSON.stringify({ appId: config.appId, message, conversationId, context: buildContext() }),
    });
    if (!response.ok) throw new Error(`BISHENG request failed (${response.status}).`);
    return response.json();
  }

  function mountButton() {
    if (document.getElementById("bisheng-launcher")) return;
    const button = document.createElement("button");
    button.id = "bisheng-launcher";
    button.type = "button";
    button.className = "bisheng-launcher";
    button.innerHTML = '<span aria-hidden="true">✦</span><span class="visually-hidden">AI assistant</span>';
    button.setAttribute("aria-label", I18n?.t("integration.ai") || "AI assistant");
    button.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("echo:open-ai-assistant"));
    });
    document.body.appendChild(button);
  }

  window.BishengAdapter = { isConfigured, sendMessage, buildContext, mountButton };
  window.addEventListener("DOMContentLoaded", mountButton);
})();
