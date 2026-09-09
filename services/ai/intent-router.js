(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const patterns = Object.freeze({
    campus_navigation: /\b(take me|show me|navigate|directions?|how (?:do|can) i get|bring me|bawa saya|tunjuk(?:kan)?|cara (?:ke|pergi))\b|带我去|导航|怎么去|如何去/i,
    campus_nearby: /\b(near|nearby|nearest|next to|around|dekat|berhampiran|paling dekat|sebelah)\b|附近|旁边|最近/i,
    campus_comparison: /\b(compare|versus|vs\.?|which (?:is|one)|banding|bezanya|mana lebih)\b|比较|哪个/i,
    campus_hours: /\b(open|opens|opening|close|closes|closed|hours?|time|buka|tutup|waktu|pukul|jam|ahad|isnin|selasa|rabu|khamis|jumaat|sabtu|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b|几点|开放|开门|关门|关闭|星期|周[一二三四五六日天]/i,
    campus_rules: /\b(rule|rules|allowed|allow|can (?:i|girls|boys|men|women|males|females)|may i|bag|backpack|minimum|after 7(?:pm)?|dibenarkan|boleh|peraturan|beg|selepas 7)\b|规定|规则|可以|允许|背包|晚上七点/i,
    campus_services: /\b(service|services|purpose|used for|what can|what does|function|fungsi|perkhidmatan|buat apa|kegunaan)\b|服务|用途|做什么|提供什么/i,
    campus_location: /\b(where|where is|wheres|location|locate|find|kat mana|di mana|lokasi)\b|在哪里|哪儿|位置/i,
  });

  function classify(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    if (!normalized) return "unknown";
    for (const intent of ["campus_navigation", "campus_nearby", "campus_comparison", "campus_hours", "campus_rules", "campus_services", "campus_location"]) {
      if (patterns[intent].test(String(message || "")) || patterns[intent].test(normalized)) return intent;
    }
    if (/\b(campus|college|kmk|building|facility|cafe|kafe|library|pustaka|koop|masjid|hostel|asrama)\b|校园|校内|学院|食堂|图书馆|清真寺/i.test(String(message || ""))) return "campus_info";
    return "general";
  }

  function requestsMapAction(intent) {
    return intent === "campus_navigation" || intent === "campus_location";
  }

  window.EchoAI.IntentRouter = Object.freeze({ classify, requestsMapAction });
}());
