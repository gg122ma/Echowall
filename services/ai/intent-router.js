(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const patterns = Object.freeze({
    campus_navigation: /\b(take me|show me|show it|navigate|directions?|how (?:do|can) i (?:get|go)|how to find|bring me|can i (?:go|get) (?:to\s+)?there|can i (?:go|get) to|(?:drop|place) a pin|pin (?:it|this|that)|(?:show|open)[^.!?]{0,60}\b(?:echo )?map|(?:echo )?map\b|peta\b|bawa saya|tunjuk(?:kan)?|letak pin|cara (?:ke|pergi)|macam mana (?:nak )?(?:cari|pergi))\b|带我去|导航|怎么去|如何去|地图[^。？！?!]{0,30}(?:显示|打开)|(?:显示|打开)[^。？！?!]{0,30}地图/i,
    campus_nearby: /\b(near|nearby|nearest|next to|around|dekat|berhampiran|paling dekat|sebelah)\b|附近|旁边|最近/i,
    campus_comparison: /\b(compare|versus|vs\.?|which (?:is|one|place|places|facility|facilities)|where are\b[^.!?]{0,80}\b(?:and|dan)|banding|bezanya|mana lebih)\b|比较|哪个/i,
    campus_hours: /\b(open|opens|opening|close|closes|closing|closed|hours?|time|buka|tutup|waktu|pukul|jam|midnight|noon|ahad|isnin|selasa|rabu|khamis|jumaat|sabtu|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|几点|开放|开门|关门|关闭|星期|周[一二三四五六日天]/i,
    campus_fees: /\b(fee|fees|cost|costs|price|prices|how much|charge|charges|yuran|harga|berapa ringgit)\b|费用|收费|多少钱/i,
    campus_services: /\b(service|services|purpose|used for|what can|what does|function|fungsi|perkhidmatan|buat apa|kegunaan|hungry|food|eat|makan|lapar|laundry|dobby|dobi|wash (?:my )?(?:clothes|baju)|iron(?:ing)? (?:clothes|room)|study (?:in|at) (?:the )?hostel|place to study (?:in|at) (?:the )?hostel|borrow sports (?:equipment|stuff)|sports stuff|print(?:ing)?|photocopy|buy (?:daily )?(?:things|items|supplies)|collect (?:a )?parcel|parcel pickup|diy laundry)\b|服务|用途|做什么|提供什么|饿|吃饭|洗衣|熨衣|取包裹/i,
    campus_rules: /\b(rule|rules|allowed|allow|can (?:i|girls|boys|men|women|males|females)|may i|bag|backpack|minimum|dress code|uniform|attire|after 7(?:pm)?|qr (?:code )?(?:pay|payment)|dibenarkan|boleh|peraturan|beg|kod pakaian|selepas 7)\b|规定|规则|可以|允许|背包|着装|晚上七点/i,
    campus_location: /\b(where|where is|wheres|location|locate|find|kat mana|di mana|lokasi)\b|在哪里|哪儿|位置/i,
  });

  const SERVICE_NEEDS = Object.freeze([
    /\b(?:(?:where (?:do|can|could) (?:i|we|students)?\s*|i need to )borrow (?:sports?|sporting) (?:equipment|gear|stuff)|where (?:can|could) (?:i|students) (?:rent|hire|borrow) (?:a )?(?:bike|bicycle))\b/i,
    /\b(?:(?:kat|di) mana (?:nak |boleh )?pinjam (?:barang|peralatan) sukan|(?:barang|peralatan) sukan boleh pinjam (?:di|kat) mana|boleh pinjam (?:barang sukan|peralatan sukan) (?:dekat|di|kat) mana|kat mana nak pinjam sports gear|where boleh pinjam sports (?:equipment|gear)|basikal boleh pinjam dekat mana)\b/i,
    /(?:哪里可以借运动器材|运动器材(?:去)?哪里借|哪里借运动器材|体育器材在哪里借|我去哪里借体育用品|sports gear 哪里 borrow)/i,
    /\b(?:where (?:can|may) (?:i|students|hostel residents) study (?:in|at) (?:the )?(?:hostel|asrama)|where can hostel residents study|where is there a hostel study space|a place to study in the dorm|any (?:place to study|study room) in (?:the )?hostel|is there somewhere to study in (?:the )?hostel|kat asrama ada study room tak)\b|宿舍(?:哪里可以自习|有自习室吗)/i,
  ]);

  const EXPLICIT_RULE_REQUEST = /^(?:(?:can|may) i (?:bring|eat|borrow|enter|take)|(?:is|are) (?:food|snacks?|eating|this|that|it) allowed|what food can i (?:bring|take))\b/i;

  function isHostelStudyNeed(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const hostelContext = /\b(?:hostel|dorm|dormitory|asrama|hostel residents?|dorm residents?|residents?)\b|宿舍/.test(normalized);
    const studyNeed = /\b(?:study|self study|study space|study room|study area|belajar|ulang kaji)\b|自习|读书|学习/.test(normalized);
    const serviceQuestion = /\b(?:where|where is|where do|where can|is there|any|place|space|room|area|mana|ada|boleh|tempat)\b|哪里|哪儿|有.+吗/.test(normalized);
    return hostelContext && studyNeed && serviceQuestion;
  }

  function isCompositionalServiceNeed(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const identityLookup = /^(?:where is|wheres|locate|find|show|open|navigate(?: to)?)\b/.test(normalized);
    const serviceQuestion = /\b(?:where|where do|where can|where could|where might|go|mana|dekat|need|students?)\b|哪里|哪儿|去哪/.test(normalized);
    if (!serviceQuestion || identityLookup) return false;
    const borrowNeed = /\b(?:borrow|loan|rent|hire|pinjam|sewa)\b|借|租/.test(normalized);
    const sportsConcept = (/\b(?:sport|sports|sporting|sukan)\b/.test(normalized) && /\b(?:equipment|gear|stuff|barang|peralatan)\b/.test(normalized))
      || /运动器材|体育器材|体育用品/.test(normalized);
    const bicycleConcept = /\b(?:bike|bicycle|basikal)\b|自行车|脚踏车/.test(normalized);
    const laundryNeed = /\b(?:wash|washing|laundry|dobi|basuh)\b|洗衣/.test(normalized);
    const printingNeed = /\b(?:print|photocopy|cetak|fotostat)\b|打印|复印/.test(normalized);
    return (borrowNeed && (sportsConcept || bicycleConcept)) || laundryNeed || printingNeed;
  }

  function isDirectIdentityLocation(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const target = normalized.replace(/^(?:where is|wheres) (?:the )?/, "");
    if (!target || target === normalized) return false;
    return window.EchoAI.PlaceRegistry.getPlaces().some(place => (place.identityAliases || place.aliases || [])
      .some(alias => window.EchoAI.Normalizer.normalize(alias) === target));
  }

  function classify(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    if (!normalized) return "unknown";
    if (isHostelStudyNeed(normalized) && !isDirectIdentityLocation(normalized)) return "campus_services";
    if (isCompositionalServiceNeed(normalized)) return "campus_services";
    if (SERVICE_NEEDS.some(pattern => pattern.test(String(message || "")) || pattern.test(normalized))) return "campus_services";
    if (patterns.campus_navigation.test(String(message || "")) || patterns.campus_navigation.test(normalized)) return "campus_navigation";
    if (EXPLICIT_RULE_REQUEST.test(String(message || "").trim()) || EXPLICIT_RULE_REQUEST.test(normalized)) return "campus_rules";
    for (const intent of ["campus_nearby", "campus_comparison", "campus_fees", "campus_services", "campus_rules", "campus_hours", "campus_location"]) {
      if (patterns[intent].test(String(message || "")) || patterns[intent].test(normalized)) return intent;
    }
    if (/\b(campus|college|kmk|building|facility|cafe|kafe|library|pustaka|koop|masjid|surau|hostel|asrama|pavilion|astaka|court|blok|block|resource centre|reading room)\b|校园|校内|学院|食堂|图书馆|清真寺|阅览室/i.test(String(message || ""))) return "campus_info";
    return "general";
  }

  function requestsMapAction(intent) {
    return intent === "campus_navigation" || intent === "campus_location";
  }

  window.EchoAI.IntentRouter = Object.freeze({ classify, requestsMapAction });
}());
