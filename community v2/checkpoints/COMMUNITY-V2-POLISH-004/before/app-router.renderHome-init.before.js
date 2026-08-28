/* Verbatim pre-POLISH-004 state of the pointer-glow init code in
   app-router.js (as it stood after HOMEPAGE-POLISH-002B, before this
   stage's refactor into a shared engine). Captured from this session's own
   prior Edit tool calls, not reconstructed from memory. */

function initializeHomeCommunityCard() {
  const card = document.querySelector("[data-home-community-card]");
  if (!card) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;

  const DAMPING = 0.18;
  let rect = card.getBoundingClientRect();
  let current = { x: 50, y: 50 };
  let target = { x: 50, y: 50 };
  let raf = null;

  const apply = () => {
    card.style.setProperty("--pointer-x", `${current.x}%`);
    card.style.setProperty("--pointer-y", `${current.y}%`);
  };

  const step = () => {
    current.x += (target.x - current.x) * DAMPING;
    current.y += (target.y - current.y) * DAMPING;
    apply();
    if (Math.abs(target.x - current.x) > 0.15 || Math.abs(target.y - current.y) > 0.15) {
      raf = requestAnimationFrame(step);
    } else {
      current = { x: target.x, y: target.y };
      apply();
      raf = null;
    }
  };
  const scheduleStep = () => { if (!raf) raf = requestAnimationFrame(step); };

  const percentFromEvent = event => {
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    return {
      x: Math.max(0, Math.min(100, (px / rect.width) * 100)),
      y: Math.max(0, Math.min(100, (py / rect.height) * 100)),
    };
  };

  card.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch") return;
    rect = card.getBoundingClientRect();
    current = percentFromEvent(event);
    target = { x: current.x, y: current.y };
    apply();
  });
  card.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    target = percentFromEvent(event);
    scheduleStep();
  });
  card.addEventListener("pointerleave", event => {
    if (event.pointerType === "touch") return;
    target = { x: 50, y: 50 };
    scheduleStep();
  });
  window.addEventListener("resize", () => { rect = card.getBoundingClientRect(); }, { passive: true });
}

/* initializeRenderedPage() before this stage only called this one function
   for page === "home"; there was no "community-hub" branch at all. */
