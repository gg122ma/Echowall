(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};
  const DAY_ORDER = Object.freeze(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
  const DAY_ALIASES = Object.freeze({
    sun: "sun", sunday: "sun", ahad: "sun",
    mon: "mon", monday: "mon", isnin: "mon",
    tue: "tue", tuesday: "tue", selasa: "tue",
    wed: "wed", wednesday: "wed", rabu: "wed",
    thu: "thu", thursday: "thu", khamis: "thu",
    fri: "fri", friday: "fri", jumaat: "fri", jumat: "fri",
    sat: "sat", saturday: "sat", sabtu: "sat",
  });

  function normalizedFactValue(value) {
    return window.EchoAI.Normalizer.normalize(String(value || "").replace(/[–—]/g, "-"));
  }

  function normalizedClock(hour, minute, meridiem) {
    let numericHour = Number(hour);
    const numericMinute = Number(minute || 0);
    const suffix = String(meridiem || "").toLowerCase();
    if (!Number.isInteger(numericHour) || !Number.isInteger(numericMinute) || numericMinute > 59) return "";
    if (suffix) {
      if (numericHour < 1 || numericHour > 12) return "";
      if (suffix === "pm" && numericHour < 12) numericHour += 12;
      if (suffix === "am" && numericHour === 12) numericHour = 0;
    }
    if (numericHour < 0 || numericHour > 23) return "";
    return `${String(numericHour).padStart(2, "0")}:${String(numericMinute).padStart(2, "0")}`;
  }

  function normalizedHoursValue(value) {
    const raw = String(value || "").trim().replace(/[–—]/g, "-");
    const normalized = normalizedFactValue(raw);
    if (/^(?:closed|not open|tutup|ditutup|关闭|休息)$/.test(normalized)) return "closed";
    if (/^(?:24\s*hours?|24\s*jam|24\s*小时)$/.test(normalized)) return "24-hours";
    const range = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!range) return normalized;
    const start = normalizedClock(range[1], range[2], range[3]);
    const end = normalizedClock(range[4], range[5], range[6]);
    return start && end ? `${start}-${end}` : normalized;
  }

  function dayRange(start, end = start) {
    const first = DAY_ORDER.indexOf(start);
    const last = DAY_ORDER.indexOf(end);
    if (first < 0 || last < first) return [];
    return DAY_ORDER.slice(first, last + 1);
  }

  function addFact(facts, key, value) {
    const normalizedValue = String(key || "").startsWith("hours.")
      ? normalizedHoursValue(value)
      : normalizedFactValue(value);
    if (!key || !normalizedValue || /not available|tidak dinyatakan|tidak tersedia/.test(normalizedValue)) return;
    facts.set(String(key), normalizedValue);
  }

  function extractHoursFacts(record, facts) {
    if (record?.schedule && typeof record.schedule === "object") {
      DAY_ORDER.forEach(day => addFact(facts, `hours.${day}`, record.schedule[day]));
    }

    const hours = String(record?.hours || "").trim().replace(/[–—]/g, "-");
    if (!hours || /not available/i.test(hours)) return;
    let foundDayFact = false;
    hours.split(";").map(part => part.trim()).filter(Boolean).forEach(part => {
      const match = part.match(/^(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|ahad|isnin|selasa|rabu|khamis|jumaat|jumat|sabtu)(?:\s*-\s*(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|ahad|isnin|selasa|rabu|khamis|jumaat|jumat|sabtu))?\s+(.+)$/i);
      if (!match) return;
      const start = DAY_ALIASES[match[1].toLowerCase()];
      const end = DAY_ALIASES[(match[2] || match[1]).toLowerCase()];
      dayRange(start, end).forEach(day => addFact(facts, `hours.${day}`, match[3]));
      foundDayFact = true;
    });
    if (!foundDayFact && /(?:\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}|24\s*hours?|closed|tutup)/i.test(hours)) {
      addFact(facts, "hours.default", hours);
    }
  }

  function extractExplicitFacts(record, facts) {
    const explicit = record?.semanticFacts || record?.facts;
    if (!explicit || typeof explicit !== "object" || Array.isArray(explicit)) return;
    Object.entries(explicit).forEach(([key, value]) => addFact(facts, key, value));
  }

  function extractFacts(record) {
    const facts = new Map();
    extractHoursFacts(record, facts);
    extractExplicitFacts(record, facts);
    return facts;
  }

  function detect(records) {
    const conflicts = [];
    const groups = new Map();
    (records || []).forEach(record => {
      const key = String(record?.canonicalId || record?.id || "");
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });
    groups.forEach((group, canonicalId) => {
      if (group.length < 2) return;
      const bestRank = Math.min(...group.map(record => Number(record.authority) || 99));
      const authoritative = group.filter(record => (Number(record.authority) || 99) === bestRank);
      const factsByKey = new Map();
      authoritative.forEach(record => {
        extractFacts(record).forEach((value, factKey) => {
          if (!factsByKey.has(factKey)) factsByKey.set(factKey, new Map());
          const variants = factsByKey.get(factKey);
          if (!variants.has(value)) variants.set(value, []);
          variants.get(value).push(record);
        });
      });
      factsByKey.forEach((variants, factKey) => {
        const assertingRecords = [...new Set([...variants.values()].flat())];
        if (variants.size > 1 && assertingRecords.length > 1) {
          const dated = assertingRecords.filter(record => /^\d{4}-\d{2}-\d{2}$/.test(String(record.sourceDate || "")));
          const dates = [...new Set(dated.map(record => record.sourceDate))].sort();
          const newestDate = dates.at(-1);
          const newest = dated.filter(record => record.sourceDate === newestDate);
          const resolvedRecord = newest.length === 1 && dates.length > 1 ? newest[0] : null;
          conflicts.push(Object.freeze({
            canonicalId,
            field: factKey,
            factKey,
            status: resolvedRecord ? "RESOLVED_NEWER_SOURCE" : "UNRESOLVED",
            resolvedRecord,
            records: Object.freeze(assertingRecords),
          }));
        }
      });
    });
    return conflicts;
  }

  function forRecord(record, allRecords) {
    if (!record) return [];
    return detect(allRecords).filter(conflict => conflict.canonicalId === record.canonicalId);
  }

  window.EchoAI.ConflictDetector = Object.freeze({ detect, forRecord });
}());
