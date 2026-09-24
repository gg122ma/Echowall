(function () {
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  let isOpen = false;
  let lastFocusedElement = null;

  function elements() {
    const root = document.querySelector("[data-mobile-settings]");
    const panel = document.getElementById("mobile-settings-panel");
    return {
      root,
      trigger: root?.querySelector(".mobile-settings-trigger"),
      panel,
      backdrop: document.querySelector(".mobile-settings-backdrop"),
      close: panel?.querySelector(".mobile-settings-close"),
    };
  }

  function syncSelections() {
    const { panel, backdrop, close } = elements();
    if (!panel) return;
    const language = window.I18n?.getLanguage?.();
    const theme = window.ThemeService?.getPreference?.();
    panel.querySelectorAll("[data-mobile-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.mobileLanguage === language));
    });
    panel.querySelectorAll("[data-mobile-theme]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.mobileTheme === theme));
    });
    const closeLabel = window.I18n?.t?.("common.close") || "Close";
    if (close) close.setAttribute("aria-label", closeLabel);
    if (backdrop) backdrop.setAttribute("aria-label", closeLabel);
  }

  function closeSettings(restoreFocus = true) {
    const { trigger, panel, backdrop } = elements();
    if (!trigger || !panel || !backdrop) return;
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
    panel.hidden = true;
    backdrop.hidden = true;
    if (restoreFocus && document.contains(lastFocusedElement)) lastFocusedElement.focus({ preventScroll: true });
    lastFocusedElement = null;
  }

  function openSettings() {
    const { trigger, panel, backdrop, close } = elements();
    if (!mobileQuery.matches || !trigger || !panel || !backdrop || isOpen) return;
    isOpen = true;
    lastFocusedElement = document.activeElement;
    syncSelections();
    trigger.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    backdrop.hidden = false;
    close?.focus({ preventScroll: true });
  }

  function syncViewport() {
    const { root } = elements();
    if (!root) return;
    root.hidden = !mobileQuery.matches;
    if (!mobileQuery.matches && isOpen) closeSettings(false);
  }

  function keepFocusInside(event) {
    if (!isOpen || event.key !== "Tab") return;
    const { panel } = elements();
    const focusable = Array.from(panel?.querySelectorAll("button:not([disabled])") || []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initialize() {
    const { root, trigger, panel, backdrop, close } = elements();
    if (!root || !trigger || !panel || !backdrop || root.dataset.mobileSettingsReady === "true") return;
    root.dataset.mobileSettingsReady = "true";
    document.body.append(backdrop, panel);
    syncViewport();
    syncSelections();
    window.I18n?.apply?.(root);
    window.I18n?.apply?.(panel);

    trigger.addEventListener("click", () => isOpen ? closeSettings() : openSettings());
    [backdrop, close].forEach(button => button?.addEventListener("click", () => closeSettings()));
    panel.querySelectorAll("[data-mobile-language]").forEach(button => {
      button.addEventListener("click", () => window.I18n?.setLanguage?.(button.dataset.mobileLanguage));
    });
    panel.querySelectorAll("[data-mobile-theme]").forEach(button => {
      button.addEventListener("click", () => window.ThemeService?.setTheme?.(button.dataset.mobileTheme));
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeSettings();
        return;
      }
      keepFocusInside(event);
    });
    mobileQuery.addEventListener?.("change", syncViewport);
    window.addEventListener("echo:languagechange", () => {
      window.I18n?.apply?.(root);
      window.I18n?.apply?.(panel);
      syncSelections();
    });
    window.addEventListener("echo:themechange", syncSelections);

    document.addEventListener("focusin", event => {
      if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) {
        document.body.classList.add("mobile-text-entry-open");
      }
    });
    document.addEventListener("focusout", event => {
      if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) {
        window.setTimeout(() => {
          if (!document.activeElement?.matches?.("input, textarea, select, [contenteditable='true']")) {
            document.body.classList.remove("mobile-text-entry-open");
          }
        }, 0);
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
