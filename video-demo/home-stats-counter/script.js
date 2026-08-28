(function initializeRecordingCounter() {
  "use strict";

  const DURATION_MS = 5000;
  const root = document.querySelector("[data-recording-stats]");
  if (!root) return;

  const counters = Array.from(root.querySelectorAll("[data-counter-target]")).map(element => ({
    element,
    target: Number(element.dataset.counterTarget || 0),
  })).filter(counter => Number.isFinite(counter.target));

  const showFinalValues = () => {
    counters.forEach(({ element, target }) => {
      element.textContent = String(target);
    });
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    showFinalValues();
    root.dataset.counterMotion = "reduced";
    root.dataset.counterElapsedMs = "0";
    root.dataset.counterState = "complete";
    return;
  }

  let startedAt = null;
  root.dataset.counterMotion = "animated";
  root.dataset.counterState = "running";

  const tick = now => {
    if (startedAt === null) startedAt = now;

    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / DURATION_MS);
    const eased = 1 - Math.pow(1 - progress, 5);

    counters.forEach(({ element, target }) => {
      const nextValue = progress === 1
        ? target
        : Math.min(Math.max(0, target - 1), Math.floor(target * eased));
      element.textContent = String(nextValue);
    });

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    showFinalValues();
    root.dataset.counterElapsedMs = String(Math.round(elapsed));
    root.dataset.counterState = "complete";
  };

  requestAnimationFrame(tick);
})();
