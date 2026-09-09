(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const TYPO_REPLACEMENTS = Object.freeze({
    libary: "library",
    librery: "library",
    koperassi: "koperasi",
    cafee: "cafe",
    serammbi: "serambi",
  });

  function normalize(value) {
    let text = String(value || "").toLocaleLowerCase();
    try { text = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch {}
    text = text.replace(/[’']/g, "").replace(/[^a-z0-9\u3400-\u9fff]+/g, " ").trim().replace(/\s+/g, " ");
    return text.split(" ").map(token => TYPO_REPLACEMENTS[token] || token).join(" ");
  }

  function tokens(value) {
    return normalize(value).split(" ").filter(Boolean);
  }

  function editDistance(left, right) {
    const a = String(left || "");
    const b = String(right || "");
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const saved = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = saved;
      }
    }
    return row[b.length];
  }

  function isConservativeTypoMatch(queryToken, aliasToken) {
    if (queryToken.length < 5 || aliasToken.length < 5) return false;
    if (queryToken[0] !== aliasToken[0]) return false;
    const limit = Math.min(queryToken.length, aliasToken.length) >= 8 ? 2 : 1;
    return Math.abs(queryToken.length - aliasToken.length) <= limit && editDistance(queryToken, aliasToken) <= limit;
  }

  window.EchoAI.Normalizer = Object.freeze({ normalize, tokens, editDistance, isConservativeTypoMatch });
}());
