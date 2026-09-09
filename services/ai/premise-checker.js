(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const DAY_PATTERNS = Object.freeze({
    sun: /\b(sunday|sun|ahad)\b|星期日|星期天|周日|周天/i,
    mon: /\b(monday|mon|isnin)\b|星期一|周一/i,
    tue: /\b(tuesday|tue|selasa)\b|星期二|周二/i,
    wed: /\b(wednesday|wed|rabu)\b|星期三|周三/i,
    thu: /\b(thursday|thu|khamis)\b|星期四|周四/i,
    fri: /\b(friday|fri|jumaat|jumat)\b|星期五|周五/i,
    sat: /\b(saturday|sat|sabtu)\b|星期六|周六/i,
  });

  function extractDay(message) {
    return Object.entries(DAY_PATTERNS).find(([, pattern]) => pattern.test(String(message || "")))?.[0] || "";
  }

  function isAssertion(message) {
    return /\b(right|correct|isnt it|isn't it|kan|betul|memang)\b|对吗|是吧|不是吗/i.test(String(message || ""));
  }

  function assertedClosed(message) {
    return /\b(closed|close on|tutup)\b|关闭|不开/i.test(String(message || ""));
  }

  function check(message, place, conflicts = []) {
    if (!place) return Object.freeze({ status: "UNKNOWN", day: "", actual: "" });
    if (conflicts.some(conflict => conflict.status === "UNRESOLVED")) {
      return Object.freeze({ status: "AMBIGUOUS", day: extractDay(message), actual: "" });
    }
    const day = extractDay(message);
    if (!day || !place.schedule?.[day]) return Object.freeze({ status: "SUPPORTED", day, actual: "" });
    const actual = place.schedule[day];
    if (!isAssertion(message)) return Object.freeze({ status: "SUPPORTED", day, actual });
    const actualClosed = actual === "closed";
    const claimClosed = assertedClosed(message);
    return Object.freeze({ status: actualClosed === claimClosed ? "SUPPORTED" : "CONTRADICTED", day, actual });
  }

  window.EchoAI.PremiseChecker = Object.freeze({ extractDay, check });
}());
