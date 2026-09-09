(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const CANONICAL_EQUIVALENTS = Object.freeze({
    "service-library": "library",
  });

  function parseSource(source) {
    const value = String(source || "").trim();
    const pageMatch = value.match(/\bp\.?\s*(\d+)\b/i);
    const filename = value.split(",")[0]?.trim() || "";
    return Object.freeze({ label: value, filename, page: pageMatch ? Number(pageMatch[1]) : null });
  }

  function authorityFor(record) {
    const ranks = window.EchoAI.Config.sourceAuthority;
    return /school-environment\.pdf/i.test(String(record?.source || "")) ? ranks.ownerSource : ranks.campusKnowledge;
  }

  function normalizeRecord(record) {
    const sourceRef = parseSource(record.source);
    return Object.freeze({
      ...record,
      canonicalId: CANONICAL_EQUIVALENTS[record.canonicalId || record.id] || String(record.canonicalId || record.id || ""),
      authority: Number(record.authority) || authorityFor(record),
      sourceRef,
    });
  }

  function getRecords(additionalRecords = []) {
    const documents = Array.isArray(window.KMK_KNOWLEDGE_BASE?.documents) ? window.KMK_KNOWLEDGE_BASE.documents : [];
    return [...documents, ...additionalRecords].map(normalizeRecord).filter(record => record.canonicalId);
  }

  function getGrounding(record) {
    if (!record) return null;
    return Object.freeze({
      recordId: record.canonicalId,
      authority: record.authority,
      source: record.sourceRef?.filename || record.source || "EchoWall campus knowledge",
      page: record.sourceRef?.page ?? null,
      dataStatus: record.dataStatus || "unspecified",
    });
  }

  window.EchoAI.SourceRegistry = Object.freeze({ parseSource, normalizeRecord, getRecords, getGrounding });
}());
