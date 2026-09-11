(function () {
  const t = (key, fallback) => {
    const translated = window.I18n?.t?.(key);
    return translated && translated !== key ? translated : fallback;
  };
  let panel;
  let messages;
  let form;

  function addMessage(role, text, action) {
    const item = document.createElement("article");
    item.className = `ai-message ai-message-${role}`;
    const content = document.createElement("p");
    content.textContent = text;
    item.appendChild(content);
    if (action) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ai-message-action";
      button.textContent = action.label;
      button.addEventListener("click", action.onClick);
      item.appendChild(button);
    }
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function addThinkingMessage() {
    const item = document.createElement("article");
    item.className = "ai-message ai-message-assistant ai-message-thinking";
    item.setAttribute("aria-label", t("assistant.thinking", "Echo is thinking"));
    item.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  function displayAction(action) {
    if (!window.EchoAI?.MapAction?.validate?.(action)) return null;
    return {
      label: action.label || t("assistant.openMap", "Show on Echo Map"),
      onClick: () => window.EchoAI.MapAction.execute(action),
    };
  }

  async function ask(query) {
    const question = query.trim();
    if (!question) return;
    addMessage("user", question);
    form.reset();
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    const thinking = addThinkingMessage();
    try {
      if (!window.CampusAI?.ask) throw new Error("Campus assistant is unavailable.");
      const [payload] = await Promise.all([window.CampusAI.ask(question), wait(250)]);
      thinking.remove();
      addMessage("assistant", payload.answer, displayAction(payload.actions[0]));
    } catch {
      thinking.remove();
      addMessage("assistant", t("assistant.fallback", "I can’t complete that request right now. Please try again."));
    } finally {
      submit.disabled = false;
    }
  }

  function openAssistant() {
    panel.hidden = false;
    // Force reflow so the browser registers the initial hidden state before transitioning
    void panel.offsetWidth;
    panel.classList.add("ai-assistant--visible");
    document.body.classList.add("ai-assistant-open");
    requestAnimationFrame(() => panel.querySelector("input")?.focus());
  }

  function closeAssistant() {
    panel.classList.remove("ai-assistant--visible");
    document.body.classList.remove("ai-assistant-open");
    setTimeout(() => { panel.hidden = true; }, 300);
    document.getElementById("bisheng-launcher")?.focus();
  }

  function updatePanelText() {
    if (!panel) return;
    
    panel.setAttribute("aria-label", t("assistant.title", "KMK campus assistant"));
    const eyebrow = panel.querySelector(".ai-assistant-header p");
    const title = panel.querySelector(".ai-assistant-header h2");
    const closeBtn = panel.querySelector(".ai-assistant-close");
    const input = panel.querySelector("#ai-assistant-input");
    const sendBtn = panel.querySelector(".ai-assistant-form button[type=submit]");
    const disclaimer = panel.querySelector(".ai-assistant-disclaimer");
    const suggestionBtns = panel.querySelectorAll(".ai-suggestions button");
    
    if (eyebrow) eyebrow.textContent = t("assistant.eyebrow", "Echo Wall · KMK guide");
    if (title) title.textContent = t("assistant.title", "Ask Echo");
    if (closeBtn) closeBtn.setAttribute("aria-label", t("common.close", "Close"));
    if (input) input.placeholder = t("assistant.placeholder", "Ask about KMK campus...");
    if (sendBtn) sendBtn.setAttribute("aria-label", t("assistant.send", "Send"));
    if (disclaimer) disclaimer.textContent = t("assistant.disclaimer", "Campus guide responses use public KMK information.");
    
    const prompts = [
      "assistant.promptLibrary",
      "assistant.promptSports", 
      "assistant.promptCafeteria"
    ];
    suggestionBtns.forEach((btn, i) => {
      if (prompts[i]) btn.textContent = t(prompts[i], btn.textContent);
    });
    
    // Update welcome message if it's the first message
    const firstMessage = messages.querySelector(".ai-message-assistant");
    if (firstMessage && !firstMessage.classList.contains("ai-message-thinking")) {
      const welcomeText = t("assistant.welcome", "Hi! I'm Echo, your KMK campus guide. Ask me anything about our campus buildings, facilities, or student services.");
      firstMessage.querySelector("p").textContent = welcomeText;
    }
  }

  function mount() {
    if (document.getElementById("ai-assistant")) return;
    panel = document.createElement("section");
    panel.id = "ai-assistant";
    panel.className = "ai-assistant";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", t("assistant.title", "KMK campus assistant"));
    panel.innerHTML = `
      <header class="ai-assistant-header">
        <div class="ai-assistant-avatar" aria-hidden="true">✦</div>
        <div><p>${t("assistant.eyebrow", "Echo Wall · KMK guide")}</p><h2>${t("assistant.title", "Ask Echo")}</h2></div>
        <button class="ai-assistant-close" type="button" aria-label="${t("common.close", "Close")}">×</button>
      </header>
      <div class="ai-assistant-body">
        <div class="ai-messages" aria-live="polite"></div>
        <div class="ai-suggestions" aria-label="Suggested questions">
          <button type="button">${t("assistant.promptLibrary", "Where is the library?")}</button>
          <button type="button">${t("assistant.promptSports", "Show sports facilities")}</button>
          <button type="button">${t("assistant.promptCafeteria", "Where is the cafeteria?")}</button>
        </div>
      </div>
      <form class="ai-assistant-form">
        <label class="visually-hidden" for="ai-assistant-input">${t("assistant.inputLabel", "Ask a question")}</label>
        <input id="ai-assistant-input" maxlength="500" autocomplete="off" placeholder="${t("assistant.placeholder", "Ask about KMK campus...")}" />
        <button type="submit" aria-label="${t("assistant.send", "Send")}">↑</button>
      </form>
      <p class="ai-assistant-disclaimer">${t("assistant.disclaimer", "Campus guide responses use public KMK information.")}</p>`;
    document.body.appendChild(panel);
    messages = panel.querySelector(".ai-messages");
    form = panel.querySelector("form");
    addMessage("assistant", t("assistant.welcome", "Hi! I'm Echo, your KMK campus guide. Ask me anything about our campus buildings, facilities, or student services."));
    panel.querySelector(".ai-assistant-close").addEventListener("click", closeAssistant);
    form.addEventListener("submit", event => { event.preventDefault(); ask(form.elements[0].value); });
    panel.querySelectorAll(".ai-suggestions button").forEach(button => button.addEventListener("click", () => ask(button.textContent)));
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) closeAssistant(); });
    window.addEventListener("echo:open-ai-assistant", openAssistant);
    
    // Listen for language changes
    window.addEventListener("echo:languagechange", () => {
      console.log("[AI Assistant] Language changed to:", window.I18n?.getLanguage?.());
      updatePanelText();
    });
  }

  window.EchoAssistant = { open: openAssistant, close: closeAssistant };
  window.addEventListener("DOMContentLoaded", mount);
})();
