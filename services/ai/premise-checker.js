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
    return /\b(right|correct|isnt it|isn't it|confirm|kan|ke|betul|memang)\b|对吗|是吧|不是吗/i.test(String(message || ""));
  }

  function assertedClosed(message) {
    return /\b(closed|close on|tutup)\b|关闭|不开/i.test(String(message || ""));
  }

  function claimedTime(message) {
    const text = String(message || "");
    if (/\bmidnight\b/i.test(text)) return "00:00";
    if (/\bnoon\b/i.test(text)) return "12:00";
    const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (!match) return "";
    let hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === "pm") hour += 12;
    return `${String(hour).padStart(2, "0")}:${match[2] || "00"}`;
  }

  function assertedEndpoint(message) {
    if (/\b(open|opens|opening|buka)\b|开门|开放/i.test(String(message || ""))) return "start";
    if (/\b(close|closes|closing|closed|tutup)\b|关门|关闭/i.test(String(message || ""))) return "end";
    return "";
  }

  function check(message, place, conflicts = []) {
    if (!place) return Object.freeze({ status: "UNKNOWN", day: "", actual: "" });
    if (conflicts.some(conflict => conflict.status === "UNRESOLVED")) {
      return Object.freeze({ status: "AMBIGUOUS", day: extractDay(message), actual: "" });
    }
    const day = extractDay(message);
    const assertedTime = claimedTime(message);
    const endpoint = assertedEndpoint(message);
    if (!day && isAssertion(message) && assertedTime && endpoint && place.schedule) {
      const endpointIndex = endpoint === "start" ? 0 : 1;
      const candidates = [...new Set(Object.values(place.schedule)
        .filter(value => value && value !== "closed")
        .map(value => String(value).split("-")[endpointIndex]))];
      if (candidates.length) return Object.freeze({ status: candidates.includes(assertedTime) ? "SUPPORTED" : "CONTRADICTED", day: "", actual: candidates.join(",") });
    }
    if (!day || !place.schedule?.[day]) return Object.freeze({ status: "SUPPORTED", day, actual: "" });
    const actual = place.schedule[day];
    if (!isAssertion(message)) return Object.freeze({ status: "SUPPORTED", day, actual });
    const actualClosed = actual === "closed";
    const claimClosed = assertedClosed(message);
    return Object.freeze({ status: actualClosed === claimClosed ? "SUPPORTED" : "CONTRADICTED", day, actual });
  }

  window.EchoAI.PremiseChecker = Object.freeze({ extractDay, check });
}());
