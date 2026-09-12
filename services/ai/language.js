(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const MALAY_WORDS = new Set([
    "apa", "bila", "boleh", "buka", "dekat", "dengan", "di", "hari", "jam",
    "jumaat", "kafe", "kafeteria", "kalau", "kat", "kemudahan", "lapar", "makan",
    "mana", "paling", "peraturan", "pukul", "sabtu", "saya", "sukan", "tempat",
    "tunjukkan", "tutup", "waktu", "yang", "bersukan",
  ]);

  function detect(message) {
    const raw = String(message || "");
    if (/[\u3400-\u9fff]/.test(raw)) return "zh";
    const words = window.EchoAI.Normalizer.tokens(raw);
    const malayHits = words.reduce((sum, word) => sum + (MALAY_WORDS.has(word) ? 1 : 0), 0);
    return malayHits >= 1 ? "ms" : "en";
  }

  function field(record, base, language) {
    if (!record) return "";
    if (language === "ms") return record[`${base}Ms`] || record[base] || "";
    if (language === "zh") return record[`${base}Zh`] || record[base] || "";
    return record[base] || "";
  }

  const DAY_LABELS = Object.freeze({
    en: Object.freeze({ sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" }),
    ms: Object.freeze({ sun: "Ahad", mon: "Isnin", tue: "Selasa", wed: "Rabu", thu: "Khamis", fri: "Jumaat", sat: "Sabtu" }),
    zh: Object.freeze({ sun: "星期日", mon: "星期一", tue: "星期二", wed: "星期三", thu: "星期四", fri: "星期五", sat: "星期六" }),
  });

  function dayLabel(day, language) {
    return DAY_LABELS[language]?.[day] || DAY_LABELS.en[day] || day;
  }

  window.EchoAI.Language = Object.freeze({ detect, field, dayLabel });
}());
