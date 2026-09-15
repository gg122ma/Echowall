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

  const EXPLICIT_RULE_REQUEST = /^(?:(?:can|may) i (?:bring|eat|borrow|enter|take)|(?:is|are) (?:food|snacks?|eating|this|that|it) allowed|what food can i (?:bring|take))\b/i;

  function isHostelStudyNeed(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const hostelContext = /\b(?:hostel|dorm|dormitory|asrama|hostel residents?|dorm residents?|residents?)\b|宿舍/.test(normalized);
    const studyNeed = /\b(?:study|self study|study space|study room|study area|belajar|ulang kaji)\b|自习|读书|学习/.test(normalized);
    const serviceQuestion = /\b(?:where|is there|any|place|space|room|area|mana|ada|boleh|tempat)\b|哪里|哪儿|有.+吗/.test(normalized);
    return hostelContext && studyNeed && serviceQuestion;
  }

  function legacyServiceNeedEntityId(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const serviceQuestion = /\b(?:where|go|need|somewhere|place|can|could|may|how|about|cost|any|ada|tempat|mana|dekat|boleh|nak|students?)\b|哪里|哪儿|去哪|可以|能|有/.test(normalized)
      || normalized === "diy laundry";
    if (!serviceQuestion) return "";
    if (isHostelStudyNeed(normalized)) return "hostel-study-room";

    const borrowNeed = /\b(?:borrow|loan|rent|hire|pinjam|sewa)\b|借|租/.test(normalized);
    const equipmentConcept = /\b(?:equipment|gear|stuff|barang|peralatan)\b/.test(normalized) || /器材|用品/.test(normalized);
    const identityEvidence = window.EchoAI.Retriever.analyzeIdentityEvidence(normalized);
    const referencedPlace = identityEvidence.status === "known" ? window.EchoAI.PlaceRegistry.getById(identityEvidence.entityId) : null;
    const sportsConcept = equipmentConcept && (/\b(?:sport|sports|sporting|sukan)\b/.test(normalized)
      || /运动|体育/.test(normalized) || referencedPlace?.category === "sports");
    const bicycleConcept = /\b(?:bike|bicycle|basikal)\b|自行车|脚踏车/.test(normalized);
    const laundryNeed = (/\b(?:wash|washing|laundry|dobi|basuh)\b|洗衣/.test(normalized))
      && (/\b(?:clothes|clothing|baju|laundry|dobi|basuh|wash|washing)\b|洗衣/.test(normalized));
    const printingNeed = /\b(?:print|photocopy|cetak|fotostat)\b|打印|复印/.test(normalized);
    const ironingNeed = /\b(?:iron|ironing)\b|熨衣/.test(normalized);
    const dailySuppliesNeed = /\b(?:buy|purchase|get)\b[^.!?]{0,40}\b(?:daily (?:things|items|supplies)|groceries|necessities)\b|\bbeli\b[^.!?]{0,40}\b(?:barang|keperluan)\b/.test(normalized);

    if (borrowNeed && sportsConcept) return "sports-equipment-store";
    if (borrowNeed && bicycleConcept) return "bicycle-service";
    if (laundryNeed) return "hostel-laundry";
    if (ironingNeed) return "hostel-iron-room";
    if (printingNeed) return "pos-mini";
    if (dailySuppliesNeed) return "koop-mart";
    return "";
  }

  function serviceNeedEntityId(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const borrowAction = /\b(?:borrow(?:ed|ing)?|loan|rent(?:ed|al|ing)?|hire(?:d|ing)?|(?:di)?pinjam|sewa)\b|\u501f|\u79df/.test(normalized);
    const printAction = /\b(?:print(?:ed|ing)?|photocop(?:y|ied|ying)|(?:di)?cetak|fotostat)\b|\u6253\u5370|\u590d\u5370/.test(normalized);
    const washAction = /\b(?:wash(?:ed|ing)?|launder(?:ed|ing)?|laundry|dobi|(?:di)?basuh)\b|\u6d17\u8863/.test(normalized);
    const ironAction = /\b(?:iron(?:ed|ing)?|(?:di)?seterika)\b|\u71a8\u8863/.test(normalized);
    const equipmentConcept = /\b(?:equipment|gear|stuff|barang|peralatan)\b|\u5668\u6750|\u7528\u54c1/.test(normalized);
    const documentConcept = /\b(?:document|documents|paper|papers|page|pages|sheets?|notes?|assignment|assignments|worksheet|worksheets|something|anything|dokumen|kertas|nota|tugasan)\b|\u6587\u4ef6|\u8d44\u6599|\u4f5c\u4e1a/.test(normalized);
    const clothesConcept = /\b(?:clothes|clothing|garments?|laundry|baju|pakaian)\b|\u8863\u670d|\u8863\u7269/.test(normalized);
    const bicycleConcept = /\b(?:bike|bicycle|basikal)\b|\u81ea\u884c\u8f66|\u811a\u8e0f\u8f66/.test(normalized);
    const identityEvidence = window.EchoAI.Retriever.analyzeIdentityEvidence(normalized);
    const referencedPlace = identityEvidence.status === "known" ? window.EchoAI.PlaceRegistry.getById(identityEvidence.entityId) : null;
    const sportsConcept = equipmentConcept && (/\b(?:sport|sports|sporting|sukan)\b|\u8fd0\u52a8|\u4f53\u80b2/.test(normalized)
      || referencedPlace?.category === "sports");
    const requestSignal = /\b(?:need|needs|needed|want|wants|wanted|require|requires|required|nak|perlu|hendak)\b|\u9700\u8981|\u8981/.test(normalized);
    const semanticEntityId = borrowAction && sportsConcept ? "sports-equipment-store"
      : borrowAction && bicycleConcept ? "bicycle-service"
        : washAction && clothesConcept ? "hostel-laundry"
          : ironAction && clothesConcept ? "hostel-iron-room"
            : printAction && documentConcept ? "pos-mini"
              : requestSignal && sportsConcept ? "sports-equipment-store" : "";
    const candidateEntityId = semanticEntityId || legacyServiceNeedEntityId(normalized);
    if (!candidateEntityId) return "";

    const serviceCue = /^(?:borrow(?:ed|ing)?|loan|rent(?:ed|al|ing)?|hire(?:d|ing)?|(?:di)?pinjam|sewa|print(?:ed|ing)?|photocop(?:y|ied|ying)|(?:di)?cetak|fotostat|wash(?:ed|ing)?|launder(?:ed|ing)?|laundry|dobby|dobi|(?:di)?basuh|iron(?:ed|ing)?|(?:di)?seterika|equipment|gear|sport|sports|sporting|sukan|bike|bicycle|basikal)$/;
    const focusTokens = window.EchoAI.Normalizer.tokens(normalized).filter(token => serviceCue.test(token));
    const targetEvidence = window.EchoAI.Retriever.analyzeIdentityEvidence(message, {
      detectUnaliasedNamedSpan: true,
      namedSpanFocusTokens: focusTokens,
    });
    if (targetEvidence.status === "unknown_qualified") {
      const targetTokens = window.EchoAI.Normalizer.tokens(targetEvidence.target);
      const allowedByEntity = {
        "sports-equipment-store": /^(?:borrow(?:ed|ing)?|loan|rent(?:ed|al|ing)?|hire(?:d|ing)?|(?:di)?pinjam|sewa|equipment|gear|stuff|barang|peralatan|sport|sports|sporting|sukan)$/,
        "bicycle-service": /^(?:borrow(?:ed|ing)?|loan|rent(?:ed|al|ing)?|hire(?:d|ing)?|(?:di)?pinjam|sewa|bike|bicycle|basikal)$/,
        "hostel-laundry": /^(?:diy|wash(?:ed|ing)?|launder(?:ed|ing)?|laundry|dobi|(?:di)?basuh|clothes|clothing|garments?|baju|pakaian)$/,
        "hostel-iron-room": /^(?:iron(?:ed|ing)?|(?:di)?seterika|clothes|clothing|garments?|baju|pakaian)$/,
        "pos-mini": /^(?:print(?:ed|ing)?|photocop(?:y|ied|ying)|(?:di)?cetak|fotostat|documents?|papers?|pages?|sheets?|notes?|assignments?|worksheets?|something|anything|dokumen|kertas|nota|tugasan)$/,
      };
      const allowed = allowedByEntity[candidateEntityId];
      const normalizedTarget = window.EchoAI.Normalizer.normalize(targetEvidence.target);
      const targetIndex = normalized.indexOf(normalizedTarget);
      const prefix = targetIndex > 0 ? normalized.slice(0, targetIndex).trim() : "";
      const suffix = targetIndex >= 0 ? normalized.slice(targetIndex + normalizedTarget.length).trim() : "";
      const actionAfterSubject = /^(?:borrow(?:ed|ing)?|loan|rent(?:ed|al|ing)?|hire(?:d|ing)?|(?:di)?pinjam|sewa|print(?:ed|ing)?|photocop(?:y|ied|ying)|(?:di)?cetak|fotostat|wash(?:ed|ing)?|launder(?:ed|ing)?|(?:di)?basuh|iron(?:ed|ing)?|(?:di)?seterika)$/;
      const hasGrammaticalSubject = targetTokens.length >= 3
        && /\b(?:do|does|did|can|could|may|might|will|would|should)\s*$/.test(prefix)
        && actionAfterSubject.test(targetTokens[1])
        && targetTokens.slice(1).every(token => allowed?.test(token));
      const serviceGrammar = /^(?:a|an|the|any|some|these|those|i|im|me|my|we|our|you|your|need|needs|needed|require|requires|required|want|wants|wanted|much|cost|costs|price|prices|ah|lah)$/;
      const serviceObject = {
        "sports-equipment-store": /^(?:equipment|gear|stuff|barang|peralatan)$/,
        "bicycle-service": /^(?:bike|bicycle|basikal)$/,
        "hostel-laundry": /^(?:clothes|clothing|garments?|laundry|baju|pakaian)$/,
        "hostel-iron-room": /^(?:clothes|clothing|garments?|baju|pakaian)$/,
        "pos-mini": /^(?:documents?|papers?|pages?|sheets?|notes?|assignments?|worksheets?|something|anything|dokumen|kertas|nota|tugasan)$/,
      }[candidateEntityId];
      const objectIndex = targetTokens.findIndex(token => serviceObject?.test(token));
      const actionIndex = targetTokens.findIndex(token => actionAfterSubject.test(token));
      const objectFirstNeed = Boolean(semanticEntityId && objectIndex >= 0 && actionIndex > objectIndex
        && targetTokens.slice(objectIndex + 1, actionIndex).some(token => /^(?:need|needs|needed|require|requires|required|to|be)$/i.test(token)));
      const firstFocusIndex = targetTokens.findIndex(token => focusTokens.includes(token));
      const trailingObjectNeed = Boolean(semanticEntityId && objectIndex >= 0 && firstFocusIndex >= 0
        && /^(?:(?:is|are|was|were|be)\s+)?(?:needed|required|wanted)\b/.test(suffix));
      const semanticStart = objectFirstNeed ? objectIndex : trailingObjectNeed ? firstFocusIndex : hasGrammaticalSubject ? 1 : 0;
      const semanticTokens = targetTokens.slice(semanticStart).filter(token => !serviceGrammar.test(token));
      if (!allowed || !semanticTokens.length || semanticTokens.some(token => !allowed.test(token))) return "";
    }
    return candidateEntityId;
  }

  function classify(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    if (!normalized) return "unknown";
    if (patterns.campus_comparison.test(String(message || "")) || patterns.campus_comparison.test(normalized)) return "campus_comparison";
    const identityEvidence = window.EchoAI.Retriever.analyzeIdentityEvidence(message);
    if (identityEvidence.targetKind === "discovery") return "campus_discovery";
    if (identityEvidence.status === "unknown_qualified") {
      if (identityEvidence.targetKind === "hours") return "campus_hours";
      if (identityEvidence.targetKind === "navigation") return "campus_navigation";
      return "campus_location";
    }
    if (identityEvidence.status === "known" && identityEvidence.targetKind === "navigation") return "campus_navigation";
    if (identityEvidence.status === "known" && identityEvidence.targetKind === "location" && identityEvidence.entityId !== "bicycle-service") return "campus_location";
    if (patterns.campus_fees.test(String(message || "")) || patterns.campus_fees.test(normalized)) return "campus_fees";
    if (serviceNeedEntityId(normalized)) return "campus_services";
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

  window.EchoAI.IntentRouter = Object.freeze({ classify, requestsMapAction, serviceNeedEntityId });
}());
