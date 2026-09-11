(function () {
  "use strict";

  const freeze = value => Object.freeze(value);
  const source = (sourceId, file, page, authority, sourceDate = null) => freeze({ sourceId, file, page, authority, sourceDate });
  const fact = (factId, entityId, type, value, provenance, options = {}) => freeze({
    factId,
    entityId,
    type,
    value: freeze(value),
    provenance: freeze(provenance),
    effectiveFrom: options.effectiveFrom || null,
    effectiveTo: options.effectiveTo || null,
    timeSensitive: Boolean(options.timeSensitive),
    requiresReview: Boolean(options.requiresReview),
    confidence: options.confidence || "high",
    status: options.status || "SUPPORTED",
    semanticKey: options.semanticKey || `${entityId}.${type}`,
    approximate: Boolean(options.approximate),
    conflicts: freeze(options.conflicts || []),
    dimension: options.dimension || type,
  });

  const SOURCES = freeze({
    schoolEnvironment: source("school-environment", "school-environment.pdf.pdf", null, "L1"),
    dormGuide: source("jk-blok-about-dorm", "JK Blok & About Dorm.pdf", null, "L1"),
    programmeRules: source("programme-rules-2025", "Peraturan Pelajar Program Matrikulasi KPM — Edisi Ke-22 Tahun 2025", null, "L1", "2025-06-22"),
    sportsGuide: source("pal-krs-ajk-moralkoku", "PAL + KRS + AJK MoralKoku.pdf", null, "L1"),
    mapData: source("echowall-map", "data/campus-buildings.js", null, "L3"),
    legacyKnowledge: source("legacy-kmk-kb", "data/kmk-knowledge-base.js", null, "L3"),
  });

  const ENTITIES = freeze([
    freeze({ id: "library", title: "Library", aliases: freeze(["library", "pustaka", "perpustakaan", "图书馆"]), mapState: "EXACT", buildingId: "B_PUSTAKA" }),
    freeze({ id: "koop-mart", title: "KOOP", aliases: freeze(["koop", "koop mart", "koperasi"]), mapState: "EXACT", buildingId: "B_KOOP" }),
    freeze({ id: "cafe-admin", title: "Cafe Admin", aliases: freeze(["cafe admin", "admin cafe", "kafe admin", "kafeteria pentadbiran"]), mapState: "EXACT", buildingId: "B_KAFETERIA_PENTADBIRAN" }),
    freeze({ id: "cafe-a", title: "Cafe A", aliases: freeze(["cafe a", "kafe a", "kafeteria a"]), mapState: "EXACT", buildingId: "B_KAFETERIA_A" }),
    freeze({ id: "cafe-b", title: "Cafe B", aliases: freeze(["cafe b", "kafe b", "kafeteria b"]), mapState: "EXACT", buildingId: "B_KAFETERIA_B" }),
    freeze({ id: "cafe-c", title: "Cafe C", aliases: freeze(["cafe c", "kafe c", "kafeteria c"]), mapState: "EXACT", buildingId: "B_KAFETERIA_C" }),
    freeze({ id: "serambi", title: "Serambi", aliases: freeze(["serambi", "hep", "student affairs", "hal ehwal pelajar"]), mapState: "EXACT", buildingId: "B_SERAMBI" }),
    freeze({ id: "astaka", title: "Astaka", aliases: freeze(["astaka", "pavilion"]), mapState: "EXACT", buildingId: "B_ASTAKA", aliasNotes: freeze({ pavilion: "descriptive" }) }),
    freeze({ id: "blok-tutorial-makmal-sains", title: "Blok Tutorial dan Makmal Sains", aliases: freeze(["blok tutorial dan makmal sains", "blok tutoran dan makmal sains", "blok sains", "science block"]), mapState: "EXACT", buildingId: "B_BLOK_TUTORAN_MAKMAL" }),
    freeze({ id: "masjid", title: "Masjid Khulafa Ar Rasyidin", aliases: freeze(["masjid khulafa ar rasyidin", "masjid", "mosque", "清真寺"]), mapState: "EXACT", buildingId: "B_MASJID" }),
    freeze({ id: "resource-centre", title: "Bangunan Pusat Sumber dan Makmal Komputer", aliases: freeze(["bangunan pusat sumber dan makmal komputer", "pusat sumber", "resource centre", "resource center"]), mapState: "UNMAPPED", buildingId: "" }),
    freeze({ id: "hostel-laundry", title: "Dobby", aliases: freeze(["dobby", "hostel laundry", "diy laundry", "laundry", "wash my clothes", "wash clothes", "basuh baju", "dobi", "洗衣", "洗衣房"]), mapState: "AMBIGUOUS", buildingId: "" }),
    freeze({ id: "hostel-study-room", title: "Study Room", aliases: freeze(["hostel study room", "dorm study room"]), mapState: "AMBIGUOUS", buildingId: "" }),
    freeze({ id: "hostel-iron-room", title: "Iron Room", aliases: freeze(["hostel iron room", "dorm iron room", "ironing room"]), mapState: "AMBIGUOUS", buildingId: "" }),
    freeze({ id: "sports-equipment-store", title: "Stor Sukan", aliases: freeze(["stor sukan", "sports equipment store", "sports equipment borrowing"]), mapState: "UNMAPPED", buildingId: "" }),
    freeze({ id: "pos-mini", title: "Pos Mini", aliases: freeze(["pos mini", "parcel collection centre", "parcel collection center", "parcel centre", "parcel center", "collection centre", "collection center", "pusat penerimaan barang", "collect a parcel", "collect parcel", "parcel pickup"]), mapState: "UNMAPPED", buildingId: "" }),
    freeze({ id: "basketball-court", title: "Basketball Court", aliases: freeze(["basketball", "basketball court", "gelanggang bola keranjang"]), mapState: "EXACT", buildingId: "B_BASKETBALL_NW" }),
  ]);

  const SPECIAL_ENTITIES = freeze([
    freeze({ id: "blok-a1", title: "Blok A1", aliases: freeze(["blok a1", "block a1", "a1"]), mapState: "PARENT_ONLY", buildingId: "B_SERI_PALAS", parentTitle: "Seri Palas" }),
    freeze({ id: "blok-a2", title: "Blok A2", aliases: freeze(["blok a2", "block a2", "a2"]), mapState: "PARENT_ONLY", buildingId: "B_SERI_PALAS", parentTitle: "Seri Palas" }),
    freeze({ id: "blok-b1", title: "Blok B1", aliases: freeze(["blok b1", "block b1", "b1"]), mapState: "PARENT_ONLY", buildingId: "B_SERI_TEMIN", parentTitle: "Seri Temin" }),
    freeze({ id: "blok-b2", title: "Blok B2", aliases: freeze(["blok b2", "block b2", "b2"]), mapState: "PARENT_ONLY", buildingId: "B_SERI_TEMIN", parentTitle: "Seri Temin" }),
    freeze({ id: "blok-c2", title: "Blok C2", aliases: freeze(["blok c2", "block c2", "c2"]), mapState: "PARENT_ONLY", buildingId: "B_SERI_LAKA", parentTitle: "Seri Laka" }),
    freeze({ id: "blok-p5", title: "Blok P5", aliases: freeze(["blok p5", "block p5", "p5"]), mapState: "UNMAPPED", buildingId: "" }),
    freeze({ id: "surau", title: "Surau", aliases: freeze(["surau", "prayer room", "musolla"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "reading-room", title: "Reading Room", aliases: freeze(["reading room", "bilik bacaan", "阅览室"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "court-a", title: "Court A", aliases: freeze(["court a", "gelanggang a"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "court-c", title: "Court C", aliases: freeze(["court c", "gelanggang c"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "kowawa", title: "KOWAWA", aliases: freeze(["kowawa"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "gymnasium", title: "Gymnasium", aliases: freeze(["gymnasium", "gym"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "pool", title: "Pool", aliases: freeze(["pool", "swimming pool", "kolam renang"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "dewan-seri-melur", title: "Dewan Seri Melur", aliases: freeze(["dewan seri melur"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
    freeze({ id: "waimau", title: "WAIMAU", aliases: freeze(["waimau"]), mapState: "DISABLED", buildingId: "", status: "UNSUPPORTED" }),
  ]);

  const p = (key, page) => freeze({ ...SOURCES[key], page });
  const FACTS = freeze([
    fact("library.purpose", "library", "purpose", { en: "The KMK Library is used for reading and self-study.", ms: "Perpustakaan KMK digunakan untuk membaca dan belajar sendiri.", zh: "KMK 图书馆用于阅读和自习。" }, [p("schoolEnvironment", 10)], { dimension: "purpose" }),
    fact("library.hours.regular", "library", "hours", { schedule: freeze({ sun: "08:00-16:30", mon: "08:00-16:30", tue: "08:00-16:30", wed: "08:00-16:30", thu: "08:00-16:30", fri: "closed", sat: "closed" }) }, [p("schoolEnvironment", 10)], { timeSensitive: true, requiresReview: true, semanticKey: "library.hours.regular", dimension: "hours" }),
    fact("library.hours.exam-2026", "library", "hours_exception", { en: "Extended exam-period hours were published for 1 April to 6 May 2026.", ms: "Waktu lanjutan musim peperiksaan pernah diterbitkan untuk 1 April hingga 6 Mei 2026.", zh: "2026年4月1日至5月6日曾发布考试期间延长开放时间。" }, [p("schoolEnvironment", 10)], { effectiveFrom: "2026-04-01", effectiveTo: "2026-05-06", timeSensitive: true, status: "STALE", semanticKey: "library.hours.exception", dimension: "historical-hours" }),
    fact("library.hours.legacy-l3", "library", "hours", { label: "Mon-Thu 08:30-21:30; Sat 08:30-17:00" }, [SOURCES.legacyKnowledge], { timeSensitive: true, requiresReview: true, confidence: "low", status: "STALE", semanticKey: "library.hours.regular", dimension: "hours" }),
    fact("library.rule.bag", "library", "rule", { en: "Backpacks stay on the outside racks; carry valuables with you.", ms: "Beg perlu diletakkan di rak luar; bawa barang berharga bersama anda.", zh: "书包须放在外面的架子上；贵重物品请随身携带。" }, [p("schoolEnvironment", 10)], { timeSensitive: true, requiresReview: true, dimension: "rules" }),
    fact("library.rule.card", "library", "rule", { en: "Program Matrikulasi KPM rules require the Matrik Card to be displayed when using the Library or Resource Centre.", ms: "Peraturan Program Matrikulasi KPM mewajibkan Kad Matrik dipamerkan semasa menggunakan Perpustakaan atau Pusat Sumber.", zh: "马来西亚教育部大学预科课程规定，使用图书馆或资源中心时须出示学生证。" }, [p("programmeRules", null)], { effectiveFrom: "2025-06-22", timeSensitive: true, requiresReview: true, dimension: "rules" }),
    fact("library.rule.borrowing", "library", "rule", { en: "Program Matrikulasi KPM rules allow up to four open-shelf books for two weeks, with at most two renewals.", ms: "Peraturan Program Matrikulasi KPM membenarkan sehingga empat buku rak terbuka selama dua minggu, dengan maksimum dua pembaharuan.", zh: "大学预科课程规定，开架书一次最多借四本、借期两周，最多续借两次。" }, [p("programmeRules", null)], { effectiveFrom: "2025-06-22", timeSensitive: true, requiresReview: true, dimension: "borrowing" }),
    fact("library.rule.counter-close", "library", "rule", { en: "The internet and circulation counter closes 10 minutes before the Library closes.", ms: "Kaunter internet dan sirkulasi ditutup 10 minit sebelum Perpustakaan ditutup.", zh: "网络与借还柜台在图书馆闭馆前10分钟停止服务。" }, [p("programmeRules", null)], { effectiveFrom: "2025-06-22", timeSensitive: true, requiresReview: true, dimension: "rules" }),
    fact("library.fee.overdue", "library", "fee", { en: "The programme rules list an overdue fine of RM0.20 per day, capped at RM15.", ms: "Peraturan program menyenaraikan denda lewat RM0.20 sehari, maksimum RM15.", zh: "课程规定列出的逾期罚款为每天 RM0.20，最高 RM15。" }, [p("programmeRules", null)], { effectiveFrom: "2025-06-22", timeSensitive: true, requiresReview: true, dimension: "fees" }),
    fact("koop.hours.regular", "koop-mart", "hours", { schedule: freeze({ sun: "08:00-17:30", mon: "08:00-17:30", tue: "08:00-17:30", wed: "08:00-17:30", thu: "08:00-17:30", fri: "09:00-17:30", sat: "09:00-17:30" }) }, [p("schoolEnvironment", 11)], { timeSensitive: true, requiresReview: true, semanticKey: "koop.hours.regular", dimension: "hours" }),
    fact("koop.hours.legacy-l3", "koop-mart", "hours", { label: "Mon-Fri 08:30-17:30" }, [SOURCES.legacyKnowledge], { timeSensitive: true, requiresReview: true, confidence: "low", status: "STALE", semanticKey: "koop.hours.regular", dimension: "hours" }),
    fact("koop.services.supplies", "koop-mart", "service", { en: "KOOP sells groceries and daily supplies.", ms: "KOOP menjual barangan runcit dan keperluan harian.", zh: "KOOP 售卖杂货和日常用品。" }, [p("schoolEnvironment", 11)], { dimension: "services" }),
    fact("koop.services.bus", "koop-mart", "service", { en: "KOOP also arranges student bus services.", ms: "KOOP juga mengurus perkhidmatan bas pelajar.", zh: "KOOP 也安排学生巴士服务。" }, [p("schoolEnvironment", 11)], { timeSensitive: true, requiresReview: true, dimension: "services" }),
    fact("koop.rule.qr-minimum", "koop-mart", "rule", { en: "The listed QR Pay minimum is RM5.", ms: "Minimum QR Pay yang disenaraikan ialah RM5.", zh: "资料列出的 QR Pay 最低消费为 RM5。" }, [p("schoolEnvironment", 11)], { timeSensitive: true, requiresReview: true, dimension: "rules" }),
    fact("cafe-admin.hours.source-a", "cafe-admin", "hours", { schedule: freeze({ default: "08:00-15:00" }), label: "08:00-15:00" }, [p("schoolEnvironment", 9)], { timeSensitive: true, requiresReview: true, status: "CONFLICTING", semanticKey: "cafe-admin.hours.current", conflicts: ["cafe-admin.hours.source-b"], dimension: "hours" }),
    fact("cafe-admin.hours.source-b", "cafe-admin", "hours", { schedule: freeze({ weekdays: "08:00-16:00", weekends: "closed" }), label: "weekdays 08:00-16:00; weekends closed" }, [p("dormGuide", 15)], { timeSensitive: true, requiresReview: true, status: "CONFLICTING", semanticKey: "cafe-admin.hours.current", conflicts: ["cafe-admin.hours.source-a"], dimension: "hours" }),
    ...["a", "b", "c"].flatMap(letter => [
      fact(`cafe-${letter}.hours.approx`, `cafe-${letter}`, "hours", { label: "around 07:00-22:00 daily" }, [p("dormGuide", null)], { timeSensitive: true, requiresReview: true, approximate: true, dimension: "hours" }),
      fact(`cafe-${letter}.rule.after-19`, `cafe-${letter}`, "rule", { restricted: letter === "a" ? "female" : "male", after: "19:00" }, [p("dormGuide", null)], { timeSensitive: true, requiresReview: true, dimension: "rules" }),
    ]),
    fact("serambi.hours", "serambi", "hours", { label: "08:00-17:00" }, [p("schoolEnvironment", 7)], { timeSensitive: true, requiresReview: true, dimension: "hours" }),
    fact("serambi.service.hep", "serambi", "service", { en: "Serambi is the HEP/student-affairs area and handles matters such as leave applications.", ms: "Serambi ialah kawasan HEP/hal ehwal pelajar dan mengurus perkara seperti permohonan cuti.", zh: "Serambi 是 HEP/学生事务区域，办理请假申请等事务。" }, [p("schoolEnvironment", 7)], { dimension: "services" }),
    fact("astaka.identity", "astaka", "identity", { en: "Pavilion is a descriptive alias for Astaka.", ms: "Pavilion ialah nama deskriptif bagi Astaka.", zh: "Pavilion 是 Astaka 的描述性别名。" }, [SOURCES.mapData], { confidence: "medium", dimension: "identity" }),
    fact("science-block.identity", "blok-tutorial-makmal-sains", "identity", { en: "Blok Sains is shorthand for Blok Tutorial dan Makmal Sains.", ms: "Blok Sains ialah nama ringkas bagi Blok Tutorial dan Makmal Sains.", zh: "Blok Sains 是 Blok Tutorial dan Makmal Sains 的简称。" }, [SOURCES.mapData], { confidence: "medium", dimension: "identity" }),
    fact("resource-centre.identity", "resource-centre", "identity", { en: "The source name is Bangunan Pusat Sumber dan Makmal Komputer.", ms: "Nama dalam sumber ialah Bangunan Pusat Sumber dan Makmal Komputer.", zh: "资料中的名称是 Bangunan Pusat Sumber dan Makmal Komputer。" }, [p("schoolEnvironment", null)], { dimension: "identity" }),
    fact("pos-mini.services", "pos-mini", "service", { en: "Pos Mini provides postal and parcel receiving, photocopying, printing, binding, lamination, and stationery services.", ms: "Pos Mini menyediakan perkhidmatan pos dan penerimaan parsel, fotostat, cetakan, penjilidan, laminasi dan alat tulis.", zh: "Pos Mini 提供邮政与包裹接收、复印、打印、装订、覆膜和文具服务。" }, [p("schoolEnvironment", 17)], { dimension: "services" }),
    fact("laundry.source-name", "hostel-laundry", "identity", { en: "The source labels the hostel laundry facility as Dobby; “DIY Laundry” is only a search alias.", ms: "Sumber menamakan kemudahan dobi asrama sebagai Dobby; “DIY Laundry” hanyalah alias carian.", zh: "资料把宿舍洗衣设施称为 Dobby；“DIY Laundry”只是搜索别名。" }, [p("dormGuide", null)], { dimension: "identity" }),
    fact("laundry.equipment", "hostel-laundry", "service", { en: "The source lists washing machines, dryers, and a coin-exchange machine.", ms: "Sumber menyenaraikan mesin basuh, pengering dan mesin tukar syiling.", zh: "资料列有洗衣机、烘干机和硬币兑换机。" }, [p("dormGuide", null)], { dimension: "services" }),
    fact("laundry.fee.wash", "hostel-laundry", "fee", { en: "The listed washing-machine fee is RM3 per use.", ms: "Yuran mesin basuh yang disenaraikan ialah RM3 setiap penggunaan.", zh: "资料列出的洗衣机费用为每次 RM3。" }, [p("dormGuide", null)], { timeSensitive: true, requiresReview: true, dimension: "fees" }),
    fact("laundry.fee.dryer", "hostel-laundry", "fee", { en: "The listed dryer rate is RM0.10 per 3 minutes.", ms: "Kadar pengering yang disenaraikan ialah RM0.10 bagi setiap 3 minit.", zh: "资料列出的烘干机费率为每3分钟 RM0.10。" }, [p("dormGuide", null)], { timeSensitive: true, requiresReview: true, dimension: "fees" }),
    fact("laundry.fee.coins", "hostel-laundry", "fee", { en: "The coin-exchange minimum is listed as RM5.", ms: "Minimum pertukaran syiling yang disenaraikan ialah RM5.", zh: "资料列出的硬币兑换最低金额为 RM5。" }, [p("dormGuide", null)], { timeSensitive: true, requiresReview: true, dimension: "fees" }),
    fact("hostel-study-room.exists", "hostel-study-room", "service", { en: "A Study Room is listed as a hostel facility, but the specific block is not stated.", ms: "Study Room disenaraikan sebagai kemudahan asrama, tetapi blok khusus tidak dinyatakan.", zh: "资料列有宿舍 Study Room，但未说明具体楼栋。" }, [p("dormGuide", null)], { status: "PARTIAL", dimension: "services" }),
    fact("hostel-iron-room.exists", "hostel-iron-room", "service", { en: "An Iron Room is listed as a hostel facility, but the specific block is not stated.", ms: "Iron Room disenaraikan sebagai kemudahan asrama, tetapi blok khusus tidak dinyatakan.", zh: "资料列有宿舍 Iron Room，但未说明具体楼栋。" }, [p("dormGuide", null)], { status: "PARTIAL", dimension: "services" }),
    fact("sports-store.service", "sports-equipment-store", "service", { en: "The source supports sports-equipment and bicycle borrowing through Stor Sukan/Stor Basikal, but current availability is not verified.", ms: "Sumber menyokong pinjaman peralatan sukan dan basikal melalui Stor Sukan/Stor Basikal, tetapi ketersediaan semasa belum disahkan.", zh: "资料支持通过 Stor Sukan/Stor Basikal 借用体育器材和自行车，但当前可用情况尚未核实。" }, [p("sportsGuide", null)], { status: "PARTIAL", timeSensitive: true, requiresReview: true, dimension: "services" }),
    fact("basketball.hours.phase1-misread", "basketball-court", "hours", { label: "08:30-17:30" }, [SOURCES.legacyKnowledge], { confidence: "low", status: "UNSUPPORTED", semanticKey: "basketball.hours.current", dimension: "hours" }),
  ]);

  window.KMK_AI_PHASE3 = freeze({
    schemaVersion: "3.0",
    masterEntityCount: 58,
    sources: SOURCES,
    entities: ENTITIES,
    specialEntities: SPECIAL_ENTITIES,
    facts: FACTS,
  });
}());
