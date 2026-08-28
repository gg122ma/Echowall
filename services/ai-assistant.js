(function () {
  const t = (key, fallback) => {
    const translated = window.I18n?.t?.(key);
    return translated && translated !== key ? translated : fallback;
  };
  let panel;
  let messages;
  let form;

  function buildingText(building, field) {
    return window.getLocalizedBuildingText?.(building, field) || building?.[field]?.en || building?.[field] || "";
  }

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

  function getBuildingMatch(query) {
    const normalized = query.toLowerCase();
    return (window.CAMPUS_BUILDINGS || []).find(building => {
      const searchText = [building.name, building.category, building.zoneId, ...Object.values(building.tags || {}).flat()]
        .join(" ").toLowerCase();
      return normalized.split(/\s+/).some(term => term.length > 2 && searchText.includes(term));
    });
  }

  function localReply(query) {
    const normalized = query.toLowerCase().trim();
    const building = getBuildingMatch(normalized);
    if (building) {
      const zone = window.CAMPUS_ZONES?.[building.zoneId]?.en || building.zoneId;
      const hours = building.hours ? ` Opening hours: ${building.hours}.` : "";
      return {
        text: `${building.name} is in the ${zone} area. ${buildingText(building, "description")}${hours}`,
        action: { label: t("assistant.openBuilding", "Open building profile"), onClick: () => window.navigate?.(`#/place/${encodeURIComponent(building.id)}`) },
      };
    }
    if (/\b(map|direction|where|location|find)\b/.test(normalized)) {
      return { text: t("assistant.mapReply", "Open the KMK Echo Map to explore building locations and their dedicated walls."), action: { label: t("assistant.openMap", "Open Echo Map"), onClick: () => { window.location.href = "map.html"; } } };
    }
    if (/\b(building|place|facility|facilities|campus)\b/.test(normalized)) {
      const names = (window.CAMPUS_BUILDINGS || []).slice(0, 6).map(item => item.name).join(", ");
      return { text: `${t("assistant.buildingsReply", "I can help with KMK buildings, including")} ${names}. ${t("assistant.buildingsMore", "Ask for a specific place or open the building directory.")}`, action: { label: t("assistant.openBuildings", "Browse buildings"), onClick: () => window.navigate?.("#/places") } };
    }
    if (/\b(note|post|wall|share)\b/.test(normalized)) return { text: t("assistant.notesReply", "You can read public notes without signing in. Sign in to publish a note, vote, or report content.") };
    return { text: t("assistant.fallback", "I currently answer questions about KMK buildings, campus facilities, or student services. Try asking \"Where is the library?\" or \"Show sports facilities.\"") };
  }

  function responseText(payload) {
    if (typeof payload === "string") return payload;
    return payload?.reply || payload?.answer || payload?.message || payload?.output || "";
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
      // 1) Free AI adapter (local RAG or Hugging Face) — primary
      if (window.FreeAIAdapter?.isConfigured?.()) {
        const [payload] = await Promise.all([
          window.FreeAIAdapter.sendMessage(question),
          wait(450),
        ]);
        const reply = payload?.reply || payload?.output || payload?.message || "";
        thinking.remove();
        if (reply) addMessage("assistant", reply, payload?.action);
        else {
          const local = localReply(question);
          addMessage("assistant", local.text, local.action);
        }
      // 2) Bisheng adapter — legacy / enterprise fallback
      } else if (window.BishengAdapter?.isConfigured?.()) {
        const [payload] = await Promise.all([
          window.BishengAdapter.sendMessage(question),
          wait(450),
        ]);
        const reply = responseText(payload);
        thinking.remove();
        if (reply) addMessage("assistant", reply);
        else {
          const local = localReply(question);
          addMessage("assistant", local.text, local.action);
        }
      // 3) Local keyword fallback — no API at all
      } else {
        await wait(450);
        const local = localReply(question);
        thinking.remove();
        addMessage("assistant", local.text, local.action);
      }
    } catch {
      thinking.remove();
      const local = localReply(question);
      addMessage("assistant", local.text, local.action);
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