(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const patterns = Object.freeze({
    campus_navigation: /\b(take me|show me|show it|navigate|directions?|how (?:do|can) i (?:get|go)|how to find|bring me|can i (?:go|get) (?:to\s+)?there|can i (?:go|get) to|(?:drop|place) a pin|pin (?:it|this|that)|(?:show|open)[^.!?]{0,60}\b(?:echo )?map|(?:echo )?map\b|peta\b|bawa saya|tunjuk(?:kan)?|letak pin|cara (?:ke|pergi)|macam mana (?:nak )?(?:cari|pergi))\b|带我去|导航|怎么去|如何去|地图[^。？！?!]{0,30}(?:显示|打开)|(?:显示|打开)[^。？！?!]{0,30}地图/i,
    campus_nearby: /\b(near|nearby|nearest|next to|around|dekat|berhampiran|paling dekat|sebelah)\b|附近|旁边|最近/i,
    campus_comparison: /\b(compare|versus|vs\.?|which (?:is|one|place|places|facility|facilities)|where are\b[^.!?]{0,80}\b(?:and|dan)|banding|bezanya|mana lebih)\b|比较|哪个/i,
    campus_hours: /\b(open|opens|opening|close|closes|closing|closed|hours?|time|today|tomorrow|tonight|buka|tutup|waktu|pukul|jam|midnight|noon|ahad|isnin|selasa|rabu|khamis|jumaat|sabtu|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|几点|开放|开门|关门|关闭|今天|明天|今晚|星期|周[一二三四五六日天]/i,
    campus_fees: /\b(fee|fees|cost|costs|price|prices|how much|charge|charges|yuran|harga|berapa ringgit)\b|费用|收费|多少钱/i,
    campus_services: /\b(service|services|purpose|used for|what can|what does|function|fungsi|perkhidmatan|buat apa|kegunaan|hungry|food|eat|makan|lapar|stock|stationery|supplies|laundry|dobby|dobi|wash (?:my )?(?:clothes|baju)|iron(?:ing)? (?:clothes|room)|study (?:in|at) (?:the )?hostel|place to study (?:in|at) (?:the )?hostel|borrow sports (?:equipment|stuff)|sports stuff|print(?:ing)?|photocopy|buy (?:daily )?(?:things|items|supplies)|collect (?:a )?parcel|parcel pickup|diy laundry)\b|服务|用途|做什么|提供什么|饿|吃饭|洗衣|熨衣|取包裹/i,
    campus_rules: /\b(rule|rules|allowed|allow|enter|access|can (?:i|girls|boys|men|women|males|females)|may i|bag|backpack|minimum|dress code|uniform|attire|after 7(?:pm)?|qr (?:code )?(?:pay|payment)|dibenarkan|boleh|peraturan|beg|kod pakaian|selepas 7)\b|规定|规则|可以|允许|背包|着装|晚上七点/i,
    campus_location: /\b(where|where is|wheres|location|locate|find|kat mana|di mana|lokasi)\b|在哪里|哪儿|位置/i,
  });

  const EXPLICIT_RULE_REQUEST = /^(?:(?:can|may) i (?:bring|eat|borrow|enter|take)|(?:is|are) (?:food|snacks?|eating|this|that|it) allowed|what food can i (?:bring|take))\b/i;
  const DIRECT_NEED_SIGNAL = /\b(?:need|needs|needed|want|wants|wanted|require|requires|required|nak|perlu|hendak)\b|需要|(?:我|我们)(?:要|想)/u;
  const REQUEST_GRAMMAR_SIGNAL = /^(?:where\b|which\b|how much\b|how\s+(?:can|could|do)\s+(?:i|we)\b|(?:can|could|may)\s+(?:i|we)\b|what about\b|how about\b|any\b|is there\s+(?:a\s+)?(?:place|somewhere)\b)|\b(?:mana|boleh)\b|哪里|哪儿|去哪|(?:可以|能|有).*吗$/u;

  function evidence(regex, text, type) {
    const match = regex.exec(text);
    return match ? Object.freeze({ type, span: Object.freeze({ start: match.index, end: match.index + match[0].length }), text: match[0] }) : null;
  }

  function analyzeServiceFrame(message) {
    const text = window.EchoAI.Normalizer.normalize(message);
    if (!text) return Object.freeze({ state: "NONE", requestState: "NONE", frames: Object.freeze([]), evidence: Object.freeze([]) });
    const explicitQuestion = /[?？]\s*$/u.test(String(message || ""));
    const request = evidence(DIRECT_NEED_SIGNAL, text, "NEED")
      || evidence(REQUEST_GRAMMAR_SIGNAL, text, "REQUEST")
      || explicitQuestion && evidence(/\b(?:any|ada)\b|有/u, text, "QUESTION");
    const concepts = Object.freeze({
      borrow: evidence(/\b(?:borrow(?:ed|ing)?|loan|rent(?:ed|al|ing)?|hire(?:d|ing)?|(?:di)?pinjam|sewa)\b|借|租/u, text, "BORROW"),
      print: evidence(/\b(?:print(?:ed|ing)?|photocop(?:y|ied|ying)|(?:di)?cetak|(?:di)?fotostat)\b|打印|复印/u, text, "PRINT"),
      wash: evidence(/\b(?:wash(?:ed|ing)?|launder(?:ed|ing)?|(?:di)?basuh)\b|洗衣/u, text, "WASH"),
      iron: evidence(/\b(?:iron(?:ed|ing)?|(?:di)?seterika)\b|熨衣/u, text, "IRON"),
      study: evidence(/\b(?:study|self study|belajar|ulang kaji)\b|自习|读书|学习/u, text, "STUDY"),
      buy: evidence(/\b(?:buy|purchase|sell|sells|selling|beli|jual)\b/u, text, "BUY"),
      collect: evidence(/\b(?:collect|pickup|pick up|ambil)\b|取/u, text, "COLLECT"),
      document: evidence(/\b(?:document|documents|paper|papers|page|pages|sheets?|handouts?|chapters?|thesis|notes?|assignment|assignments|worksheet|worksheets|something|anything|dokumen|kertas|nota|tugasan)\b|文件|资料|作业/u, text, "DOCUMENT"),
      clothes: evidence(/\b(?:clothes|clothing|garments?|uniforms?|shirts?|laundry|baju|pakaian)\b|衣服|衣物/u, text, "CLOTHES"),
      bicycle: evidence(/\b(?:bike|bicycle|basikal)\b|自行车|脚踏车/u, text, "BICYCLE"),
      equipment: evidence(/\b(?:equipment|gear|stuff|barang|peralatan)\b|器材|用品/u, text, "EQUIPMENT"),
      sports: evidence(/\b(?:sport|sports|sporting|sukan)\b|运动|体育/u, text, "SPORTS"),
      hostel: evidence(/\b(?:hostel|dorm|dormitory|asrama|hostel residents?|dorm residents?|residents?)\b|宿舍/u, text, "HOSTEL"),
      supplies: evidence(/\b(?:daily (?:things|items|supplies)|groceries|necessities|barang|keperluan)\b|日用品/u, text, "SUPPLIES"),
      parcel: evidence(/\b(?:parcel|package|bungkusan)\b|包裹/u, text, "PARCEL"),
      laundry: evidence(/\b(?:laundry|dobby|dobi)\b|洗衣房/u, text, "LAUNDRY"),
      food: evidence(/\b(?:hungry|food|eat|makan|lapar)\b|饿|吃饭/u, text, "FOOD"),
    });
    const relation = evidence(/\b(?:need|needs|needed|require|requires|required)\b|需要/u, text, "RELATION");
    const imperative = /^(?:borrow|loan|rent|hire|pinjam|sewa|print|photocopy|cetak|fotostat|wash|basuh|iron|seterika)\b|^(?:借|租|打印|复印|洗衣|熨衣)/u.test(text);
    const comparisonSignal = /\b(?:which|compare)\b[^.!?]*\b(?:and|versus|vs)\b/u.test(text);
    const objectFirstRelation = (action, object) => {
      if (!action || !object || object.span.end > action.span.start) return false;
      return /\b(?:to(?: be)?|untuk)\b/u.test(text.slice(object.span.end, action.span.start));
    };
    const requestsFrame = (action, object) => Boolean(request || relation || imperative || objectFirstRelation(action, object));
    const frames = [];
    const add = (kind, action, object, parts, inferred = false, requested = true) => {
      if (!frames.some(frame => frame.kind === kind)) frames.push(Object.freeze({ kind, action, object, inferred, requested, evidence: Object.freeze(parts.filter(Boolean)) }));
    };
    if (concepts.print && concepts.document && requestsFrame(concepts.print, concepts.document)) add("PRINT_DOCUMENT", "PRINT", "DOCUMENT", [request, relation, concepts.print, concepts.document]);
    if (comparisonSignal && concepts.print) add("PRINT_DOCUMENT", "PRINT", "DOCUMENT", [request, concepts.print], true, false);
    if (concepts.wash && concepts.clothes && requestsFrame(concepts.wash, concepts.clothes)) add("WASH_CLOTHES", "WASH", "CLOTHES", [request, relation, concepts.wash, concepts.clothes]);
    if (concepts.iron && concepts.clothes && requestsFrame(concepts.iron, concepts.clothes)) add("IRON_CLOTHES", "IRON", "CLOTHES", [request, relation, concepts.iron, concepts.clothes]);
    if (concepts.borrow && concepts.bicycle && requestsFrame(concepts.borrow, concepts.bicycle)) add("BORROW_BICYCLE", "BORROW", "BICYCLE", [request, relation, concepts.borrow, concepts.bicycle]);
    if (concepts.borrow && concepts.sports && concepts.equipment && requestsFrame(concepts.borrow, concepts.equipment)) add("BORROW_SPORTS_EQUIPMENT", "BORROW", "SPORTS_EQUIPMENT", [request, relation, concepts.borrow, concepts.sports, concepts.equipment]);
    if (request && concepts.bicycle && !concepts.sports) add("BORROW_BICYCLE", "BORROW", "BICYCLE", [request, concepts.bicycle], true);
    if (request && concepts.sports && concepts.equipment) add("BORROW_SPORTS_EQUIPMENT", "BORROW", "SPORTS_EQUIPMENT", [request, concepts.sports, concepts.equipment], true);
    if (request && concepts.laundry && /\bdo\b/.test(text)) add("WASH_CLOTHES", "WASH", "CLOTHES", [request, concepts.laundry], true);
    if (request && concepts.wash && /洗衣/u.test(text)) add("WASH_CLOTHES", "WASH", "CLOTHES", [request, concepts.wash], true);
    if (request && concepts.wash && /\b(?:cost|costs|fee|fees|price|prices)\b/.test(text)) add("WASH_CLOTHES", "WASH", "CLOTHES", [request, concepts.wash], true);
    if (request && concepts.iron) add("IRON_CLOTHES", "IRON", "CLOTHES", [request, concepts.iron], true);
    if (text === "diy laundry") add("WASH_CLOTHES", "WASH", "CLOTHES", [concepts.laundry], true);
    if (request && concepts.study && concepts.hostel) add("HOSTEL_STUDY", "STUDY", "HOSTEL_SPACE", [request, concepts.study, concepts.hostel]);
    if (request && concepts.buy && concepts.supplies) add("BUY_DAILY_SUPPLIES", "BUY", "DAILY_SUPPLIES", [request, concepts.buy, concepts.supplies]);
    if (request && concepts.collect && concepts.parcel) add("COLLECT_PARCEL", "COLLECT", "PARCEL", [request, concepts.collect, concepts.parcel]);
    if (concepts.food && (/\b(?:hungry|lapar)\b|饿/u.test(text) || /\b(?:where|somewhere|place|mana)\b|哪里|哪儿/u.test(text))) add("FIND_FOOD", "FIND", "FOOD", [request, concepts.food], true);
    return Object.freeze({ state: frames.length ? "COMPLETE" : "NONE", requestState: frames.some(frame => frame.requested) ? "REQUESTED" : "NONE", frames: Object.freeze(frames), evidence: Object.freeze(Object.values(concepts).filter(Boolean)) });
  }

  function classify(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const source = String(message || "");
    if (!normalized) return "unknown";
    if (patterns.campus_comparison.test(source) || patterns.campus_comparison.test(normalized)) return "campus_comparison";
    if (patterns.campus_fees.test(source) || patterns.campus_fees.test(normalized)) return "campus_fees";
    if (EXPLICIT_RULE_REQUEST.test(source.trim()) || EXPLICIT_RULE_REQUEST.test(normalized)) return "campus_rules";
    if (analyzeServiceFrame(message).state === "COMPLETE") return "campus_services";
    if (patterns.campus_navigation.test(source) || patterns.campus_navigation.test(normalized)) return "campus_navigation";
    for (const intent of ["campus_nearby", "campus_fees", "campus_services", "campus_rules", "campus_hours", "campus_location"]) {
      if (patterns[intent].test(source) || patterns[intent].test(normalized)) return intent;
    }
    if (/\b(campus|college|kmk|building|facility|cafe|kafe|library|pustaka|koop|masjid|surau|hostel|asrama|pavilion|astaka|court|blok|block|resource centre|reading room)\b|校园|校内|学院|食堂|图书馆|清真寺|阅览室/i.test(source)) return "campus_info";
    return "general";
  }

  function requestsMapAction(intent) {
    return intent === "campus_navigation" || intent === "campus_location";
  }

  window.EchoAI.IntentRouter = Object.freeze({ classify, requestsMapAction, analyzeServiceFrame });
}());
