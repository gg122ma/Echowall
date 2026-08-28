(function initializeCampusGuidePromptFocus() {
  "use strict";

  const NORMAL_HOLD_MS = 150;
  const PROMPT_FOCUS_MS = 620;
  const RETURN_AT_MS = 310;
  const RESTORE_AT_MS = 480;
  const BETWEEN_PROMPTS_MS = 80;
  const TOTAL_DURATION_MS = 3000;
  const PROMPT_ORDER = Object.freeze(["library", "sports", "cafeteria"]);

  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  const stage = document.getElementById("focus-stage");
  const mount = document.getElementById("prompt-clone-mount");
  const contactShadow = document.getElementById("prompt-contact-shadow");
  const status = document.getElementById("sequence-status");
  let activeSource = null;

  function positionFocusedPrompt(source) {
    if (!source || !mount || !contactShadow) return false;
    const rect = source.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    mount.style.left = `${rect.left}px`;
    mount.style.top = `${rect.top}px`;
    mount.style.width = `${rect.width}px`;
    mount.style.height = `${rect.height}px`;

    contactShadow.style.left = `${rect.left + rect.width * .12}px`;
    contactShadow.style.top = `${rect.bottom - 7}px`;
    contactShadow.style.width = `${rect.width * .76}px`;
    contactShadow.style.height = "18px";
    return true;
  }

  function mountFocusedPrompt(source) {
    if (!source || !stage || !mount || !positionFocusedPrompt(source)) return false;
    const clone = source.cloneNode(true);
    clone.removeAttribute("data-prompt");
    clone.removeAttribute("tabindex");
    clone.classList.remove("quick-prompt", "is-source-hidden");
    clone.classList.add("prompt-focus-clone");
    clone.setAttribute("aria-hidden", "true");

    mount.replaceChildren(clone);
    activeSource = source;
    activeSource.classList.add("is-source-hidden");
    stage.classList.add("is-mounted");
    void stage.offsetWidth;
    return true;
  }

  function restorePage() {
    document.body.classList.remove("is-focusing");
    stage?.classList.remove("is-active", "is-returning");
  }

  function unmountFocusedPrompt() {
    activeSource?.classList.remove("is-source-hidden");
    activeSource = null;
    mount?.replaceChildren();
    stage?.classList.remove("is-mounted", "is-active", "is-returning");
  }

  async function focusPrompt(source, promptName) {
    if (!mountFocusedPrompt(source)) return false;

    document.body.classList.add("is-focusing");
    stage.classList.add("is-active");
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.activePrompt = promptName;
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.observedOrder.push(promptName);
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.state = `${promptName}-active`;
    status.textContent = `${source.textContent.trim()} selected.`;

    await wait(RETURN_AT_MS);
    stage.classList.remove("is-active");
    stage.classList.add("is-returning");
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.state = `${promptName}-returning`;

    await wait(RESTORE_AT_MS - RETURN_AT_MS);
    restorePage();
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.state = `${promptName}-restoring`;

    await wait(PROMPT_FOCUS_MS - RESTORE_AT_MS);
    unmountFocusedPrompt();
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.activePrompt = null;
    return true;
  }

  async function runSequence() {
    await wait(NORMAL_HOLD_MS);
    let elapsed = NORMAL_HOLD_MS;

    for (let index = 0; index < PROMPT_ORDER.length; index += 1) {
      const promptName = PROMPT_ORDER[index];
      const source = document.querySelector(`[data-prompt="${promptName}"]`);
      const completed = await focusPrompt(source, promptName);
      if (!completed) {
        window.__AI_CAMPUS_GUIDE_PROMPT_QA__.state = "error-missing-prompt";
        window.__AI_CAMPUS_GUIDE_PROMPT_QA__.animationStopped = true;
        restorePage();
        unmountFocusedPrompt();
        return;
      }
      elapsed += PROMPT_FOCUS_MS;

      if (index < PROMPT_ORDER.length - 1) {
        await wait(BETWEEN_PROMPTS_MS);
        elapsed += BETWEEN_PROMPTS_MS;
      }
    }

    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.state = "final-page-restored";
    status.textContent = "Normal Echo Wall page restored.";
    await wait(Math.max(0, TOTAL_DURATION_MS - elapsed));
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.animationStopped = true;
    window.__AI_CAMPUS_GUIDE_PROMPT_QA__.state = "complete-static-frame";
  }

  function start() {
    const prompts = Array.from(document.querySelectorAll(".quick-prompt"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.__AI_CAMPUS_GUIDE_PROMPT_QA__ = {
      standalone: true,
      productionConnected: false,
      aiRequestTriggered: false,
      promptCount: prompts.length,
      expectedOrder: [...PROMPT_ORDER],
      observedOrder: [],
      activePrompt: null,
      normalHoldMs: NORMAL_HOLD_MS,
      promptFocusMs: PROMPT_FOCUS_MS,
      betweenPromptsMs: BETWEEN_PROMPTS_MS,
      totalDurationMs: TOTAL_DURATION_MS,
      animationStopped: reducedMotion,
      reducedMotion,
      state: reducedMotion ? "reduced-motion-final-page" : "normal-page",
    };

    if (reducedMotion) {
      status.textContent = "Reduced motion: normal final Echo Wall page.";
      return;
    }

    runSequence();
  }

  window.addEventListener("resize", () => {
    if (activeSource) positionFocusedPrompt(activeSource);
  }, { passive: true });

  requestAnimationFrame(() => requestAnimationFrame(start));
}());
