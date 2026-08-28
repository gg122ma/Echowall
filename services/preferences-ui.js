(function () {
  const controls = [];
  let openControl = null;

  const configurations = {
    language: {
      getValue: () => window.I18n?.getLanguage(),
      setValue: value => window.I18n?.setLanguage(value),
      labels: { en: "EN", ms: "BM", zh: "中文" },
      accessibleName: "Language",
    },
    theme: {
      getValue: () => window.ThemeService?.getPreference(),
      setValue: value => window.ThemeService?.setTheme(value),
      labels: { system: "Auto", light: "Light", dark: "Dark" },
      accessibleName: "Theme",
    },
  };

  function updateControl(control) {
    const value = control.configuration.getValue();
    const label = control.configuration.labels[value] || value;
    control.currentValue.textContent = label;
    control.trigger.setAttribute("aria-label", `${control.configuration.accessibleName}: ${label}`);
    control.options.forEach(option => {
      const selected = option.dataset.value === value;
      option.setAttribute("aria-checked", String(selected));
      option.classList.toggle("is-selected", selected);
    });
  }

  function updateAllControls() {
    controls.forEach(updateControl);
  }

  function closeControl(control, restoreFocus = false) {
    if (!control) return;
    control.root.classList.remove("is-open");
    control.trigger.setAttribute("aria-expanded", "false");
    control.menu.hidden = true;
    if (openControl === control) openControl = null;
    if (restoreFocus) control.trigger.focus();
  }

  function openMenu(control, focusOption = false) {
    if (openControl && openControl !== control) closeControl(openControl);
    updateControl(control);
    control.root.classList.add("is-open");
    control.trigger.setAttribute("aria-expanded", "true");
    control.menu.hidden = false;
    openControl = control;
    if (focusOption) {
      const selected = control.options.find(option => option.getAttribute("aria-checked") === "true");
      (selected || control.options[0])?.focus();
    }
  }

  function moveOptionFocus(control, currentOption, direction) {
    const currentIndex = control.options.indexOf(currentOption);
    const nextIndex = (currentIndex + direction + control.options.length) % control.options.length;
    control.options[nextIndex]?.focus();
  }

  function initializeControl(root) {
    if (root.dataset.preferencesReady === "true") return;
    const configuration = configurations[root.dataset.preferenceMenu];
    const trigger = root.querySelector(".preference-trigger");
    const menu = root.querySelector(".preference-options");
    const currentValue = root.querySelector(".preference-current");
    const options = Array.from(root.querySelectorAll("[role='menuitemradio']"));
    if (!configuration || !trigger || !menu || !currentValue || !options.length) return;

    const control = { root, configuration, trigger, menu, currentValue, options };
    controls.push(control);
    root.dataset.preferencesReady = "true";
    updateControl(control);

    trigger.addEventListener("click", () => {
      if (openControl === control) closeControl(control);
      else openMenu(control);
    });
    trigger.addEventListener("keydown", event => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      openMenu(control, true);
    });
    root.addEventListener("focusout", event => {
      if (openControl === control && !root.contains(event.relatedTarget)) closeControl(control);
    });

    options.forEach(option => {
      option.addEventListener("click", () => {
        configuration.setValue(option.dataset.value);
        updateAllControls();
        closeControl(control, true);
      });
      option.addEventListener("keydown", event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveOptionFocus(control, option, event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          control.options[event.key === "Home" ? 0 : control.options.length - 1]?.focus();
        }
      });
    });
  }

  function initialize(root = document) {
    root.querySelectorAll("[data-preference-menu]").forEach(initializeControl);
    updateAllControls();
  }

  document.addEventListener("pointerdown", event => {
    if (openControl && !openControl.root.contains(event.target)) closeControl(openControl);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && openControl) {
      event.preventDefault();
      closeControl(openControl, true);
    }
  });
  window.addEventListener("echo:languagechange", updateAllControls);
  window.addEventListener("echo:themechange", updateAllControls);

  window.PreferencesUI = { initialize };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initialize());
  else initialize();
})();
