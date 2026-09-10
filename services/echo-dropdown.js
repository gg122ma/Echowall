(function (global) {
  "use strict";

  const documentRef = global.document;
  let activeDropdown = null;
  let listenersReady = false;

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function computeMenuLayout(rect, viewport, contentHeight, preferredMinWidth) {
    const margin = 8;
    const gap = 6;
    const maxMenuHeight = 280;
    const viewportWidth = Math.max(0, Number(viewport.width) || 0);
    const viewportHeight = Math.max(0, Number(viewport.height) || 0);
    const availableWidth = Math.max(0, viewportWidth - margin * 2);
    const width = Math.min(Math.max(Number(rect.width) || 0, preferredMinWidth || 140), availableWidth);
    const left = clamp(Number(rect.left) || 0, margin, Math.max(margin, viewportWidth - width - margin));
    const roomBelow = Math.max(0, viewportHeight - Number(rect.bottom || 0) - margin - gap);
    const roomAbove = Math.max(0, Number(rect.top || 0) - margin - gap);
    const wantedHeight = Math.min(Math.max(0, Number(contentHeight) || maxMenuHeight), maxMenuHeight);
    const opensAbove = roomBelow < Math.min(wantedHeight, 120) && roomAbove > roomBelow;
    const availableHeight = opensAbove ? roomAbove : roomBelow;
    const maxHeight = Math.max(0, Math.min(maxMenuHeight, availableHeight));
    const renderedHeight = Math.min(wantedHeight, maxHeight);
    const top = opensAbove
      ? Math.max(margin, Number(rect.top || 0) - gap - renderedHeight)
      : Math.min(Number(rect.bottom || 0) + gap, Math.max(margin, viewportHeight - margin - renderedHeight));
    return { left, top, width, maxHeight, opensAbove };
  }

  function getEnabledIndexes(options) {
    return options.reduce((indexes, option, index) => {
      if (!option.disabled) indexes.push(index);
      return indexes;
    }, []);
  }

  function nextEnabledIndex(options, currentIndex, direction) {
    const enabled = getEnabledIndexes(options);
    if (!enabled.length) return -1;
    const currentPosition = enabled.indexOf(currentIndex);
    if (direction === "home") return enabled[0];
    if (direction === "end") return enabled[enabled.length - 1];
    if (currentPosition === -1) return direction < 0 ? enabled[enabled.length - 1] : enabled[0];
    return enabled[clamp(currentPosition + direction, 0, enabled.length - 1)];
  }

  function optionFromTarget(target, menu) {
    let node = target;
    while (node && node !== menu) {
      if (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, "echoOptionIndex")) return node;
      node = node.parentElement;
    }
    return null;
  }

  function setActiveIndex(index, scrollIntoView) {
    if (!activeDropdown) return;
    const options = Array.from(activeDropdown.select.options);
    if (!options[index] || options[index].disabled) return;
    activeDropdown.activeIndex = index;
    const renderedOptions = Array.from(activeDropdown.menu.querySelectorAll("[data-echo-option-index]"));
    renderedOptions.forEach((option, optionIndex) => option.classList.toggle("is-active", optionIndex === index));
    const activeOption = renderedOptions[index];
    activeDropdown.trigger.setAttribute("aria-activedescendant", activeOption.id);
    if (scrollIntoView) activeOption.scrollIntoView({ block: "nearest" });
  }

  function positionActiveMenu() {
    if (!activeDropdown) return;
    const { trigger, menu } = activeDropdown;
    if (!trigger.isConnected) {
      close(false);
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const layout = computeMenuLayout(rect, {
      width: global.innerWidth,
      height: global.innerHeight,
    }, menu.scrollHeight, 140);
    menu.style.left = `${layout.left}px`;
    menu.style.top = `${layout.top}px`;
    menu.style.width = `${layout.width}px`;
    menu.style.maxHeight = `${layout.maxHeight}px`;
    menu.classList.toggle("opens-up", layout.opensAbove);
  }

  function close(returnFocus) {
    if (!activeDropdown) return;
    const { trigger, menu } = activeDropdown;
    menu.remove();
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-activedescendant");
    activeDropdown = null;
    if (returnFocus && trigger.isConnected) trigger.focus();
  }

  function syncTrigger(select, trigger) {
    const selected = select.options[select.selectedIndex] || select.options[0];
    trigger.querySelector(".echo-select-value").textContent = selected ? selected.textContent : "";
    trigger.disabled = Boolean(select.disabled);
    trigger.classList.toggle("is-empty", !select.value);
  }

  function selectOption(index) {
    if (!activeDropdown) return;
    const { select, trigger } = activeDropdown;
    const nativeOption = select.options[index];
    if (!nativeOption || nativeOption.disabled) return;
    const changed = select.value !== nativeOption.value;
    select.value = nativeOption.value;
    syncTrigger(select, trigger);
    close(true);
    if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function open(wrapper, select, trigger) {
    if (select.disabled) return;
    close(false);
    const menu = documentRef.createElement("div");
    menu.id = `${select.id}-listbox`;
    menu.className = "echo-select-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-labelledby", trigger.id);

    Array.from(select.options).forEach((nativeOption, index) => {
      const option = documentRef.createElement("div");
      option.id = `${select.id}-option-${index}`;
      option.className = "echo-select-option";
      option.dataset.echoOptionIndex = String(index);
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === select.selectedIndex));
      option.setAttribute("aria-disabled", String(Boolean(nativeOption.disabled)));
      option.textContent = nativeOption.textContent;
      menu.appendChild(option);
    });

    menu.addEventListener("pointerdown", event => {
      const option = optionFromTarget(event.target, menu);
      if (!option || option.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
    });
    menu.addEventListener("pointermove", event => {
      const option = optionFromTarget(event.target, menu);
      if (!option || option.getAttribute("aria-disabled") === "true") return;
      setActiveIndex(Number(option.dataset.echoOptionIndex), false);
    });
    menu.addEventListener("click", event => {
      const option = optionFromTarget(event.target, menu);
      if (!option || option.getAttribute("aria-disabled") === "true") return;
      selectOption(Number(option.dataset.echoOptionIndex));
    });

    documentRef.body.appendChild(menu);
    activeDropdown = {
      wrapper,
      select,
      trigger,
      menu,
      activeIndex: Math.max(0, select.selectedIndex),
    };
    trigger.setAttribute("aria-expanded", "true");
    positionActiveMenu();
    const options = Array.from(select.options);
    const initialIndex = options[activeDropdown.activeIndex]?.disabled
      ? nextEnabledIndex(options, -1, 1)
      : activeDropdown.activeIndex;
    setActiveIndex(initialIndex, true);
  }

  function handleTriggerKeydown(event, wrapper, select, trigger) {
    const isOpen = activeDropdown && activeDropdown.trigger === trigger;
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      if (isOpen) close(false);
      return;
    }
    if (!["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (!isOpen) {
      open(wrapper, select, trigger);
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    } else if (event.key === "Enter" || event.key === " ") {
      selectOption(activeDropdown.activeIndex);
      return;
    }
    if (!activeDropdown) return;
    const options = Array.from(select.options);
    const direction = event.key === "ArrowDown" ? 1
      : event.key === "ArrowUp" ? -1
        : event.key === "Home" ? "home" : "end";
    setActiveIndex(nextEnabledIndex(options, activeDropdown.activeIndex, direction), true);
  }

  function enhanceOne(wrapper) {
    if (wrapper.getAttribute("data-echo-select-ready") === "true") return;
    const select = wrapper.querySelector("select");
    if (!select || !select.id) return;
    const labelId = select.getAttribute("aria-labelledby") || wrapper.dataset.echoSelectLabelledby || "";
    const trigger = documentRef.createElement("button");
    const value = documentRef.createElement("span");
    const chevron = documentRef.createElement("span");
    trigger.id = `${select.id}-trigger`;
    trigger.type = "button";
    trigger.className = "echo-select-trigger";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${select.id}-listbox`);
    value.id = `${select.id}-value`;
    value.className = "echo-select-value";
    chevron.className = "echo-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-labelledby", [labelId, value.id].filter(Boolean).join(" "));
    trigger.appendChild(value);
    trigger.appendChild(chevron);
    wrapper.appendChild(trigger);

    select.classList.add("echo-select-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    wrapper.classList.add("is-enhanced");
    wrapper.setAttribute("data-echo-select-ready", "true");
    syncTrigger(select, trigger);
    select.addEventListener("change", () => syncTrigger(select, trigger));
    trigger.addEventListener("click", () => {
      if (activeDropdown && activeDropdown.trigger === trigger) close(true);
      else open(wrapper, select, trigger);
    });
    trigger.addEventListener("keydown", event => handleTriggerKeydown(event, wrapper, select, trigger));
  }

  function ensureGlobalListeners() {
    if (listenersReady || !documentRef) return;
    listenersReady = true;
    documentRef.addEventListener("pointerdown", event => {
      if (!activeDropdown) return;
      if (!activeDropdown.wrapper.contains(event.target) && !activeDropdown.menu.contains(event.target)) close(false);
    });
    global.addEventListener("resize", positionActiveMenu);
    global.addEventListener("scroll", positionActiveMenu, true);
    global.addEventListener("hashchange", () => close(false));
    global.addEventListener("pagehide", () => close(false));
  }

  function enhance(root) {
    if (!documentRef) return 0;
    close(false);
    ensureGlobalListeners();
    const scope = root || documentRef;
    const wrappers = Array.from(scope.querySelectorAll("[data-echo-select]"));
    wrappers.forEach(enhanceOne);
    return wrappers.length;
  }

  global.EchoDropdown = Object.freeze({
    enhance,
    close,
    computeMenuLayout,
    nextEnabledIndex,
  });
})(window);
