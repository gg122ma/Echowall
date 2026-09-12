(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  function local(value, language) {
    if (!value || typeof value !== "object") return String(value || "");
    return value[language] || value.en || "";
  }

  function formatClock(value) {
    const [hourText, minute = "00"] = String(value || "").split(":");
    const hour = Number(hourText);
    if (!Number.isInteger(hour)) return String(value || "");
    return `${hour % 12 || 12}:${minute}${hour >= 12 ? "pm" : "am"}`;
  }

  function rangeText(value) {
    const match = String(value || "").match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    return match ? `${formatClock(match[1])}–${formatClock(match[2])}` : String(value || "");
  }

  function scheduleText(schedule, language) {
    if (!schedule) return "";
    const groups = [];
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].forEach(day => {
      const value = schedule[day];
      if (!value) return;
      const previous = groups.at(-1);
      if (previous?.value === value) previous.end = day;
      else groups.push({ start: day, end: day, value });
    });
    return groups.map(group => {
      const start = window.EchoAI.Language.dayLabel(group.start, language);
      const end = window.EchoAI.Language.dayLabel(group.end, language);
      const days = group.start === group.end ? start : `${start}–${end}`;
      if (group.value === "closed") return language === "ms" ? `${days} ditutup` : language === "zh" ? `${days}关闭` : `${days} closed`;
      return `${days} ${rangeText(group.value)}`;
    }).join(language === "zh" ? "；" : "; ");
  }

  function hoursFactText(fact, language, day = "") {
    const schedule = fact.value.schedule;
    if (schedule && day && schedule[day]) {
      const dayName = window.EchoAI.Language.dayLabel(day, language);
      const value = schedule[day];
      if (value === "closed") return language === "ms" ? `${dayName} ditutup.` : language === "zh" ? `${dayName}关闭。` : `It is closed on ${dayName}.`;
      return language === "ms" ? `${dayName}: ${rangeText(value)}.` : language === "zh" ? `${dayName}开放时间为${rangeText(value)}。` : `On ${dayName}, it is open ${rangeText(value)}.`;
    }
    if (schedule) return `${scheduleText(schedule, language)}${language === "zh" ? "。" : "."}`;
    if (fact.approximate || /^around /.test(fact.value.label || "")) {
      const range = rangeText(String(fact.value.label || "").match(/\d{2}:\d{2}-\d{2}:\d{2}/)?.[0] || "07:00-22:00");
      return language === "ms" ? `Waktu yang disokong ialah sekitar ${range} setiap hari.` : language === "zh" ? `资料支持的时间是每天约${range}。` : `The supported hours are around ${range} daily.`;
    }
    const range = rangeText(fact.value.label || "");
    return language === "ms" ? `Waktu yang disokong ialah ${range}.` : language === "zh" ? `资料支持的时间为${range}。` : `The supported hours are ${range}.`;
  }

  function factText(fact, language, plan) {
    if (["purpose", "service", "identity", "fee"].includes(fact.type)) return local(fact.value, language);
    if (fact.type === "hours") return hoursFactText(fact, language, plan.premiseDay);
    if (fact.type === "rule" && fact.value.restricted) {
      const group = fact.value.restricted === "female"
        ? (language === "ms" ? "Pelajar perempuan" : language === "zh" ? "女生" : "Female students")
        : (language === "ms" ? "Pelajar lelaki" : language === "zh" ? "男生" : "Male students");
      return language === "ms" ? `${group} tidak dibenarkan selepas ${formatClock(fact.value.after)}.` : language === "zh" ? `${group}在${formatClock(fact.value.after)}后受限制。` : `${group} are not allowed after ${formatClock(fact.value.after)}.`;
    }
    if (fact.type === "rule") return local(fact.value, language);
    return local(fact.value, language);
  }

  function correctionPrefix(language) {
    return language === "ms" ? "Tidak. " : language === "zh" ? "不对。" : "No. ";
  }

  function conflictText(language) {
    if (language === "ms") return "Sumber semasa yang dibekalkan bercanggah tentang waktu Cafe Admin. Satu menyenaraikan 3:00pm, manakala satu lagi menyenaraikan 4:00pm pada hari bekerja dan ditutup pada hujung minggu. Semak notis terkini atau maklumat di lokasi.";
    if (language === "zh") return "现有资料对 Cafe Admin 的营业时间有冲突。一份列为下午3:00，另一份列为工作日下午4:00关闭、周末休息。前往前请查看最新通知或现场信息。";
    return "Current supplied sources disagree about Cafe Admin’s hours. One lists 3:00pm, while another lists 4:00pm on weekdays and closed on weekends. Check the latest notice or on-site information.";
  }

  function unsupportedText(plan, language) {
    const id = plan.place?.canonicalId;
    if (id === "surau") return language === "ms" ? "Sumber KMK semasa tidak mengesahkan Surau yang berasingan. Sumber mengesahkan Masjid Khulafa Ar Rasyidin, tetapi saya tidak akan menganggap kedua-duanya tempat yang sama tanpa bukti." : language === "zh" ? "当前 KMK 资料无法确认独立的 Surau。资料确认 Masjid Khulafa Ar Rasyidin 存在，但没有依据时我不会把两者视为同一地点。" : "I can’t verify a separate KMK Surau from the current sources. The sources confirm Masjid Khulafa Ar Rasyidin, but I won’t treat them as the same place without evidence.";
    if (id === "reading-room") return language === "ms" ? "Saya tidak dapat mengesahkan Reading Room sebagai kemudahan KMK yang berasingan, jadi saya tidak akan menggantikannya dengan Perpustakaan, Pusat Sumber atau Study Room." : language === "zh" ? "我无法确认 Reading Room 是独立的 KMK 设施，因此不会用图书馆、资源中心或 Study Room 替代它。" : "I can’t verify Reading Room as a separate KMK facility, so I won’t substitute the Library, Resource Centre, or Study Room.";
    if (id === "court-a" || id === "court-c") return language === "ms" ? `Pemetaan ${plan.place.title} tidak dapat disahkan daripada sumber KMK semasa, jadi saya tidak akan meneka lokasi.` : language === "zh" ? `当前 KMK 资料无法确认 ${plan.place.title} 的地图位置，因此我不会猜测。` : `I can’t verify ${plan.place.title}’s mapping from the current KMK sources, so I won’t guess a location.`;
    if (plan.content.primary === "UNSUPPORTED_HOURS") return language === "ms" ? `Waktu semasa yang disahkan untuk ${plan.place?.title || "tempat ini"} tidak tersedia.` : language === "zh" ? `目前没有可核实的${plan.place?.title || "该地点"}开放时间。` : `Verified current hours for ${plan.place?.title || "this place"} are unavailable.`;
    if (plan.place) return language === "ms" ? `Saya tidak dapat mengesahkan maklumat itu untuk ${plan.place.title} daripada sumber KMK semasa.` : language === "zh" ? `当前 KMK 资料无法确认${plan.place.title}的这项信息。` : `I can’t verify that information for ${plan.place.title} from the current KMK sources.`;
    return language === "ms" ? "Saya tidak dapat mengesahkannya daripada sumber kampus KMK semasa, jadi saya tidak akan meneka." : language === "zh" ? "当前 KMK 校园资料无法确认这一点，因此我不会猜测。" : "I can’t verify that from the current KMK campus sources, so I won’t guess.";
  }

  function specialText(plan, language) {
    if (plan.content.primary === "DINING_DISCOVERY") return language === "ms" ? "KMK mempunyai beberapa tempat makan: Cafe A, Cafe B, Cafe C dan Cafe Admin. Kafe yang mana satu anda mahu saya tunjukkan?" : language === "zh" ? "KMK 有多个用餐地点：Cafe A、Cafe B、Cafe C 和 Cafe Admin。你想让我显示哪一家？" : "KMK has several dining locations: Cafe A, Cafe B, Cafe C, and Cafe Admin. Which cafe would you like me to show?";
    if (plan.content.primary === "SPORTS_DISCOVERY") return language === "ms" ? "Anda boleh menggunakan Astaka dan Basketball Court untuk aktiviti sukan. Pinjaman peralatan sukan juga tersedia melalui Stor Sukan. Anda mahu tahu yang mana satu?" : language === "zh" ? "你可以在 Astaka 和 Basketball Court 进行体育活动。Stor Sukan 也提供体育器材借用服务。你想了解哪一个？" : "You can use Astaka and the Basketball Court for sports activities. Sports-equipment borrowing is also available through Stor Sukan. Which one would you like to know more about?";
    if (plan.content.primary === "DINING_OPTIONS") return language === "ms" ? "Jika anda lapar di kampus, sumber menyenaraikan Cafe A, Cafe B, Cafe C dan Cafe Admin sebagai pilihan makan. Saya tidak dapat mengesahkan menu langsung atau status buka sekarang." : language === "zh" ? "如果你在校园里饿了，资料列出的用餐选择包括 Cafe A、Cafe B、Cafe C 和 Cafe Admin。我无法确认实时菜单或当前营业状态。" : "If you’re hungry on campus, the sources list Cafe A, Cafe B, Cafe C, and Cafe Admin as dining options. I can’t verify live menus or open-now status.";
    if (plan.content.primary === "PARENT_ONLY") {
      const parent = plan.place.parentTitle;
      return language === "ms" ? `${plan.place.title} dikaitkan dengan kawasan kediaman ${parent}. Peta semasa mengesahkan kawasan induk ${parent}, bukan tapak tepat ${plan.place.title}.` : language === "zh" ? `${plan.place.title} 属于 ${parent} 宿舍区域。当前地图确认的是 ${parent} 父级区域，并非 ${plan.place.title} 的精确轮廓。` : `${plan.place.title} belongs to the ${parent} residential area. The current map confirms the ${parent} parent area, not the exact ${plan.place.title} footprint.`;
    }
    if (plan.content.primary === "P5_UNMAPPED") return language === "ms" ? "Blok P5 disebut dalam maklumat asrama, tetapi kompleks induk dan sasaran petanya belum disahkan." : language === "zh" ? "宿舍资料提到 Blok P5，但其父级区域和地图目标尚未核实。" : "Blok P5 is mentioned in the hostel information, but its parent complex and Map target are not verified.";
    if (plan.content.primary === "FACTS_EXHAUSTED") return language === "ms" ? `Saya telah merangkumi maklumat utama yang disahkan untuk ${plan.place.title}.` : language === "zh" ? `我已经介绍了目前可核实的 ${plan.place.title} 主要信息。` : `I've covered the main verified information I currently have for ${plan.place.title}.`;
    return "";
  }

  function render(plan, language, options = {}) {
    if (!plan) return "";
    if (plan.answerMode === "CONFLICT") return conflictText(language);
    if (plan.answerMode === "UNSUPPORTED") return unsupportedText(plan, language);
    const special = specialText(plan, language);
    if (special) return special;
    const day = options.day || "";
    const renderPlan = { ...plan, premiseDay: day };
    let sentences = plan.facts.map(item => factText(item, language, renderPlan)).filter(Boolean);
    if (plan.answerMode === "CORRECTION" && sentences.length) sentences[0] = `${correctionPrefix(language)}${sentences[0]}`;
    if (plan.place?.mapState === "UNMAPPED" && window.EchoAI.IntentRouter.requestsMapAction(plan.intent)) {
      sentences.push(language === "ms" ? "Sasaran tepat Echo Map belum disahkan." : language === "zh" ? "其准确的 Echo Map 目标尚未核实。" : "Its exact Echo Map target has not been verified.");
    } else if (plan.place?.mapState === "AMBIGUOUS" && window.EchoAI.IntentRouter.requestsMapAction(plan.intent)) {
      sentences.push(language === "ms" ? "Sumber tidak mengesahkan satu lokasi peta yang unik." : language === "zh" ? "资料未确认唯一的地图位置。" : "The sources do not confirm one unique Map location.");
    }
    return sentences.slice(0, 3).join(" ").trim() || unsupportedText(plan, language);
  }

  window.EchoAI.AnswerRenderer = Object.freeze({ render, factText, scheduleText, rangeText });
}());
