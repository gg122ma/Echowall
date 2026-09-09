(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};
  const FIELDS = Object.freeze(["hours", "location", "rules", "content"]);

  function normalized(value) {
    return window.EchoAI.Normalizer.normalize(value);
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
      for (const field of FIELDS) {
        const variants = new Map();
        authoritative.forEach(record => {
          const value = normalized(record[field]);
          if (value && !/not available/.test(value)) {
            if (!variants.has(value)) variants.set(value, []);
            variants.get(value).push(record);
          }
        });
        if (variants.size > 1) {
          const dated = authoritative.filter(record => /^\d{4}-\d{2}-\d{2}$/.test(String(record.sourceDate || "")));
          const dates = [...new Set(dated.map(record => record.sourceDate))].sort();
          const newestDate = dates.at(-1);
          const newest = dated.filter(record => record.sourceDate === newestDate);
          const resolvedRecord = newest.length === 1 && dates.length > 1 ? newest[0] : null;
          conflicts.push(Object.freeze({ canonicalId, field, status: resolvedRecord ? "RESOLVED_NEWER_SOURCE" : "UNRESOLVED", resolvedRecord, records: authoritative }));
        }
      }
    });
    return conflicts;
  }

  function forRecord(record, allRecords) {
    if (!record) return [];
    return detect(allRecords).filter(conflict => conflict.canonicalId === record.canonicalId);
  }

  window.EchoAI.ConflictDetector = Object.freeze({ detect, forRecord });
}());
