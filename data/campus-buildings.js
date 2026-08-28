/**
 * Echo Wall-owned read-only building snapshot derived from the auxiliary KMK Digital Twin data.
 * It is intentionally lightweight and does not create a runtime dependency on the Digital Twin project.
 */
window.CAMPUS_ZONES = {
  "learning": {
    "en": "Learning & Teaching",
    "ms": "Pembelajaran & Pengajaran",
    "zh": "学习与教学区"
  },
  "student-life": {
    "en": "Student Life",
    "ms": "Kehidupan Pelajar",
    "zh": "学生生活区"
  },
  "residence": {
    "en": "Residence & Dining",
    "ms": "Kediaman & Makan",
    "zh": "宿舍与餐饮区"
  },
  "sports": {
    "en": "Sports & Activity",
    "ms": "Sukan & Aktiviti",
    "zh": "体育与活动区"
  },
  "services": {
    "en": "Administration & Staff",
    "ms": "Pentadbiran & Staf",
    "zh": "行政与教职员区"
  },
  "mobility": {
    "en": "Access & Security",
    "ms": "Akses & Keselamatan",
    "zh": "出入口与保安区"
  }
};
window.CAMPUS_BUILDINGS = [
  {
    "id": "B_MASJID",
    "name": "Masjid Khulafa Ar Rasyidin",
    "category": "masjid",
    "zoneId": "student-life",
    "emoji": "🕌",
    "photos": [
      { "src": "assets/buildings/B_MASJID/cover-01.jpg", "alt": "Masjid Khulafa Ar Rasyidin at Kolej Matrikulasi Kedah", "fit": "cover" },
      { "src": "assets/buildings/B_MASJID/gallery-02.jpg", "alt": "Exterior view of Masjid Khulafa Ar Rasyidin", "fit": "cover" },
      { "src": "assets/buildings/B_MASJID/gallery-03.jpg", "alt": "Masjid Khulafa Ar Rasyidin campus view", "fit": "cover" },
      { "src": "assets/buildings/B_MASJID/gallery-04.jpg", "alt": "Grounds of Masjid Khulafa Ar Rasyidin", "fit": "cover" },
      { "src": "assets/buildings/B_MASJID/gallery-05.jpg", "alt": "Masjid Khulafa Ar Rasyidin building", "fit": "cover" }
    ],
    "description": {
      "zh": "Masjid Khulafa Ar Rasyidin——KMK 校园地标，有醒目的绿色圆顶与宣礼塔，宽敞的祈祷空间服务全体师生。",
      "ms": "Masjid Khulafa Ar Rasyidin — mercu tanda kampus KMK dengan kubah hijau besar dan menara (minaret). Ruang solat luas untuk seluruh warga kolej.",
      "en": "Masjid Khulafa Ar Rasyidin — KMK's landmark mosque, with a striking green dome and minaret. A spacious prayer hall serves the whole college community."
    },
    "purpose": {
      "zh": "礼拜、宗教活动与社群使用。",
      "ms": "Solat, aktiviti keagamaan dan kegunaan komuniti.",
      "en": "Prayer, religious activities and community use."
    },
    "tags": {
      "zh": [
        "清真寺",
        "礼拜",
        "宗教",
        "圆顶",
        "宣礼塔",
        "主麻日",
        "哈里发",
        "Ar Rasyidin"
      ],
      "ms": [
        "masjid",
        "solat",
        "agama",
        "kubah",
        "minaret",
        "jumaat",
        "khulafa",
        "ar rasyidin"
      ],
      "en": [
        "mosque",
        "prayer",
        "religion",
        "dome",
        "minaret",
        "Friday prayer",
        "Khulafa",
        "Ar Rasyidin"
      ]
    },
    "floors": 2,
    "hours": "24 jam · Solat Jumaat 12:45",
    "center": [
      -72.73,
      -27.189999999999998
    ],
    "overviewPolygon": [
      [
        24.11,
        92.0
      ],
      [
        19.98,
        79.88
      ],
      [
        18.13,
        80.73
      ],
      [
        9.88,
        56.51
      ],
      [
        11.94,
        55.55
      ],
      [
        8.0,
        43.97
      ],
      [
        28.7,
        34.48
      ],
      [
        36.29,
        30.99
      ],
      [
        34.82,
        26.66
      ],
      [
        45.99,
        21.54
      ],
      [
        47.12,
        24.87
      ],
      [
        59.9,
        19.01
      ],
      [
        60.84,
        18.58
      ],
      [
        59.6,
        14.93
      ],
      [
        74.72,
        8.0
      ],
      [
        79.19,
        21.18
      ],
      [
        64.35,
        27.98
      ],
      [
        63.13,
        24.37
      ],
      [
        58.37,
        26.56
      ],
      [
        71.65,
        65.69
      ],
      [
        77.64,
        62.94
      ],
      [
        76.2,
        58.72
      ],
      [
        87.81,
        53.4
      ],
      [
        92.0,
        65.72
      ],
      [
        78.48,
        71.91
      ],
      [
        77.2,
        68.16
      ],
      [
        63.85,
        74.29
      ],
      [
        65.75,
        79.85
      ],
      [
        55.06,
        84.74
      ],
      [
        53.01,
        78.74
      ],
      [
        46.79,
        81.59
      ]
    ],
    "mapFootprint": [
      [6.424903, 100.418499],
      [6.424813, 100.418463],
      [6.424819, 100.418447],
      [6.424640, 100.418375],
      [6.424632, 100.418393],
      [6.424547, 100.418359],
      [6.424476, 100.418539],
      [6.424450, 100.418605],
      [6.424418, 100.418592],
      [6.424380, 100.418689],
      [6.424405, 100.418699],
      [6.424361, 100.418809],
      [6.424358, 100.418818],
      [6.424331, 100.418807],
      [6.424279, 100.418938],
      [6.424377, 100.418977],
      [6.424428, 100.418848],
      [6.424401, 100.418837],
      [6.424417, 100.418796],
      [6.424708, 100.418911],
      [6.424687, 100.418963],
      [6.424656, 100.418951],
      [6.424616, 100.419052],
      [6.424708, 100.419088],
      [6.424754, 100.418971],
      [6.424726, 100.418960],
      [6.424772, 100.418844],
      [6.424813, 100.418860],
      [6.424849, 100.418767],
      [6.424805, 100.418750],
      [6.424826, 100.418696]
    ],
    "mapTarget": { "lat": 6.424591, "lng": 100.418724 },
    "wallKey": "building:B_MASJID"
  },
  {
    "id": "B_DEWAN_MAHAWANGSA",
    "name": "Dewan Mahawangsa",
    "category": "dewan",
    "zoneId": "learning",
    "emoji": "🎓",
    "photos": [
      { "src": "assets/buildings/B_DEWAN_MAHAWANGSA/cover-01.jpg", "alt": "Dewan Mahawangsa at Kolej Matrikulasi Kedah", "fit": "cover" }
    ],
    "description": {
      "zh": "KMK 最大的主礼堂，屋顶高挑、中间无柱。用于毕业典礼、大型集会、讲座和官方仪式。",
      "ms": "Dewan utama dan terbesar di KMK. Bumbung tinggi tanpa tiang tengah. Digunakan untuk konvokesyen, perhimpunan besar, ceramah dan majlis rasmi.",
      "en": "KMK's largest and main hall, with a tall column-free roof spanning the whole space. Used for convocations, large assemblies, talks and official ceremonies."
    },
    "purpose": {
      "zh": "举办 programme；也用于部分室内运动，包括 pingpong、badminton。",
      "ms": "Menganjurkan program dan acara; turut digunakan untuk sukan dalam dewan seperti pingpong dan badminton.",
      "en": "Hosting programmes and events; also used for indoor sports such as pingpong and badminton."
    },
    "specialNotes": {
      "zh": "场地可能依活动安排使用，来源未提供固定预约或开放规则。",
      "ms": "Penggunaan bergantung kepada jadual acara; sumber tidak menyediakan peraturan tempahan atau capaian tetap.",
      "en": "Usage depends on event scheduling; the source does not provide fixed booking or access rules."
    },
    "tags": {
      "zh": [
        "礼堂",
        "仪式",
        "毕业典礼",
        "集会"
      ],
      "ms": [
        "dewan",
        "majlis",
        "konvokesyen",
        "perhimpunan"
      ],
      "en": [
        "hall",
        "ceremony",
        "convocation",
        "assembly"
      ]
    },
    "floors": 2,
    "hours": "Mengikut acara · 08:00–22:00",
    "center": [
      -124.63499999999999,
      -157.73
    ],
    "overviewPolygon": [
      [
        22.01,
        78.79
      ],
      [
        21.99,
        63.52
      ],
      [
        13.53,
        63.54
      ],
      [
        8.0,
        63.55
      ],
      [
        8.0,
        36.46
      ],
      [
        13.3,
        36.45
      ],
      [
        21.61,
        36.43
      ],
      [
        21.58,
        21.18
      ],
      [
        40.73,
        21.11
      ],
      [
        40.71,
        8.07
      ],
      [
        46.61,
        8.07
      ],
      [
        50.66,
        8.03
      ],
      [
        54.59,
        8.02
      ],
      [
        59.41,
        8.0
      ],
      [
        59.43,
        10.3
      ],
      [
        59.44,
        20.93
      ],
      [
        91.9,
        20.85
      ],
      [
        91.97,
        68.53
      ],
      [
        92.0,
        80.34
      ],
      [
        60.64,
        80.44
      ],
      [
        60.67,
        91.93
      ],
      [
        40.7,
        92.0
      ],
      [
        40.69,
        78.76
      ]
    ],
    "mapFootprint": [
      [6.425922, 100.418057],
      [6.425838, 100.418056],
      [6.425838, 100.417997],
      [6.425839, 100.417958],
      [6.425689, 100.417958],
      [6.425689, 100.417995],
      [6.425689, 100.418054],
      [6.425605, 100.418054],
      [6.425605, 100.418189],
      [6.425533, 100.418189],
      [6.425533, 100.418230],
      [6.425533, 100.418259],
      [6.425533, 100.418287],
      [6.425533, 100.418321],
      [6.425545, 100.418321],
      [6.425604, 100.418321],
      [6.425603, 100.418550],
      [6.425866, 100.418551],
      [6.425931, 100.418551],
      [6.425932, 100.418329],
      [6.425995, 100.418330],
      [6.425995, 100.418189],
      [6.425922, 100.418189]
    ],
    "mapTarget": { "lat": 6.425764, "lng": 100.418254 },
    "wallKey": "building:B_DEWAN_MAHAWANGSA"
  },
  {
    "id": "B_DEWAN_KULIAH",
    "name": "Kompleks Dewan Kuliah",
    "category": "academic",
    "zoneId": "learning",
    "emoji": "📐",
    "photos": [
      { "src": "assets/buildings/B_DEWAN_KULIAH/cover-01.jpg", "alt": "Kompleks Dewan Kuliah at Kolej Matrikulasi Kedah", "fit": "cover" }
    ],
    "description": {
      "zh": "主教学楼群——多间大型讲堂与导修室环绕着中央庭院。",
      "ms": "Kompleks dewan kuliah utama — beberapa dewan kuliah besar dan bilik tutorial mengelilingi laman dalaman.",
      "en": "The main lecture-hall complex — several large lecture halls and tutorial rooms arranged around a central courtyard."
    },
    "purpose": {
      "zh": "上课（kuliah）。",
      "ms": "Menghadiri kuliah.",
      "en": "Attending lectures (kuliah)."
    },
    "specialNotes": {
      "zh": "备注：设有空调（aircon）。",
      "ms": "Dewan ini berhawa dingin (aircon).",
      "en": "The hall is air-conditioned."
    },
    "tags": {
      "zh": [
        "讲堂",
        "授课",
        "讲座"
      ],
      "ms": [
        "dewan kuliah",
        "kuliah",
        "lecture"
      ],
      "en": [
        "lecture hall",
        "lectures",
        "lecture"
      ]
    },
    "floors": 3,
    "hours": "Isnin–Sabtu 07:30–18:00",
    "center": [
      -249.005,
      -36.3
    ],
    "overviewPolygon": [
      [
        8.79,
        80.98
      ],
      [
        8.38,
        48.62
      ],
      [
        8.0,
        17.05
      ],
      [
        35.23,
        16.82
      ],
      [
        35.13,
        9.47
      ],
      [
        45.71,
        9.4
      ],
      [
        45.78,
        13.22
      ],
      [
        69.01,
        13.01
      ],
      [
        68.96,
        8.07
      ],
      [
        78.08,
        8.0
      ],
      [
        78.17,
        14.61
      ],
      [
        84.51,
        14.55
      ],
      [
        91.18,
        14.5
      ],
      [
        91.58,
        48.74
      ],
      [
        92.0,
        84.92
      ],
      [
        80.49,
        85.0
      ],
      [
        80.58,
        91.9
      ],
      [
        68.24,
        92.0
      ],
      [
        68.16,
        84.8
      ],
      [
        56.05,
        84.89
      ],
      [
        46.39,
        84.98
      ],
      [
        46.45,
        88.9
      ],
      [
        34.39,
        88.99
      ],
      [
        34.31,
        80.74
      ]
    ],
    "mapFootprint": [
      [6.424862, 100.416917],
      [6.424665, 100.416915],
      [6.424472, 100.416913],
      [6.424470, 100.417054],
      [6.424425, 100.417053],
      [6.424425, 100.417108],
      [6.424448, 100.417108],
      [6.424447, 100.417228],
      [6.424417, 100.417228],
      [6.424416, 100.417275],
      [6.424457, 100.417276],
      [6.424456, 100.417309],
      [6.424456, 100.417343],
      [6.424665, 100.417345],
      [6.424887, 100.417347],
      [6.424887, 100.417288],
      [6.424929, 100.417288],
      [6.424930, 100.417224],
      [6.424886, 100.417224],
      [6.424886, 100.417161],
      [6.424887, 100.417111],
      [6.424911, 100.417112],
      [6.424911, 100.417049],
      [6.424861, 100.417049]
    ],
    "mapTarget": { "lat": 6.424673, "lng": 100.417130 },
    "wallKey": "building:B_DEWAN_KULIAH"
  },
  {
    "id": "B_PUSTAKA",
    "name": "Pustaka (Perpustakaan)",
    "category": "library",
    "zoneId": "learning",
    "emoji": "📚",
    "photos": [
      { "src": "assets/buildings/B_PUSTAKA/6077934093636145753.jpg", "alt": "Pustaka at sunset across the Kolej Matrikulasi Kedah courtyard", "fit": "cover" },
      { "src": "assets/buildings/B_PUSTAKA/cover-01.jpg", "alt": "Pustaka Kolej Matrikulasi Kedah", "fit": "cover" },
      { "src": "assets/buildings/B_PUSTAKA/6077934093636145763.jpg", "alt": "Study area inside Pustaka at Kolej Matrikulasi Kedah", "fit": "cover" }
    ],
    "localizedAlias": {
      "zh": "图书馆",
      "ms": "Perpustakaan",
      "en": "Library"
    },
    "description": {
      "zh": "KMK 主图书馆，设有学术藏书、小组学习区、静音自习区与阅读空间。",
      "ms": "Perpustakaan utama KMK. Koleksi buku akademik, zon belajar berkumpulan, zon senyap dan ruang baca.",
      "en": "KMK's main library. Academic book collections, group study zones, a silent study zone and reading spaces."
    },
    "purpose": {
      "zh": "阅读、自习。",
      "ms": "Membaca dan belajar sendiri.",
      "en": "Reading and self-study."
    },
    "specialNotes": {
      "zh": "书包不能带进 library，可放在外面架子；贵重物品要随身携带。考试前一个月可能采用特别营业时间。",
      "ms": "Beg tidak boleh dibawa masuk ke perpustakaan; pelajar boleh meletakkan beg di rak luar, tetapi barang berharga perlu dibawa bersama. Waktu operasi khas mungkin dikenakan sebelum peperiksaan.",
      "en": "Bags cannot be brought into the library; students may leave bags on the racks outside, but valuables should stay with them. Special operating hours may apply during the exam period."
    },
    "tags": {
      "zh": [
        "图书馆",
        "藏书",
        "书籍",
        "学习",
        "wifi"
      ],
      "ms": [
        "perpustakaan",
        "pustaka",
        "buku",
        "belajar",
        "wifi"
      ],
      "en": [
        "library",
        "books",
        "books",
        "study",
        "wifi"
      ]
    },
    "floors": 3,
    "hours": "Isnin–Khamis 08:30–21:30 · Sabtu 08:30–17:00",
    "center": [
      -261.96000000000004,
      45.415
    ],
    "mapFootprint": [
      [6.424101, 100.416688],
      [6.423950, 100.416685],
      [6.423934, 100.416685],
      [6.423915, 100.416685],
      [6.423792, 100.416682],
      [6.423788, 100.416875],
      [6.423690, 100.416873],
      [6.423574, 100.416871],
      [6.423568, 100.417201],
      [6.423565, 100.417339],
      [6.423793, 100.417343],
      [6.423794, 100.417311],
      [6.423849, 100.417312],
      [6.423849, 100.417285],
      [6.423939, 100.417286],
      [6.424036, 100.417288],
      [6.424036, 100.417309],
      [6.424083, 100.417310],
      [6.424083, 100.417339],
      [6.424304, 100.417344],
      [6.424305, 100.417309],
      [6.424313, 100.416885],
      [6.424097, 100.416881],
      [6.424100, 100.416703]
    ],
    "overviewPolygon": [
      [
        8.78,
        68.14
      ],
      [
        8.4,
        51.26
      ],
      [
        8.36,
        49.41
      ],
      [
        8.31,
        47.28
      ],
      [
        8.0,
        33.48
      ],
      [
        32.51,
        33.06
      ],
      [
        32.27,
        22.02
      ],
      [
        31.97,
        9.03
      ],
      [
        73.93,
        8.3
      ],
      [
        91.37,
        8.0
      ],
      [
        91.94,
        33.58
      ],
      [
        87.81,
        33.66
      ],
      [
        87.95,
        39.84
      ],
      [
        84.5,
        39.9
      ],
      [
        84.73,
        49.97
      ],
      [
        84.97,
        60.89
      ],
      [
        87.6,
        60.84
      ],
      [
        87.73,
        66.19
      ],
      [
        91.46,
        66.13
      ],
      [
        92.0,
        91.0
      ],
      [
        87.55,
        91.08
      ],
      [
        33.75,
        92.0
      ],
      [
        33.2,
        67.72
      ],
      [
        10.64,
        68.1
      ]
    ],
    "mapTarget": { "lat": 6.423939, "lng": 100.417013 },
    "wallKey": "building:B_PUSTAKA"
  },
  {
    "id": "B_LANGKASUKA",
    "name": "Bangunan Langkasuka",
    "category": "academic",
    "zoneId": "learning",
    "emoji": "🏫",
    "photos": [
      { "src": "assets/buildings/B_LANGKASUKA/cover-01.jpg", "alt": "Bangunan Langkasuka at Kolej Matrikulasi Kedah", "fit": "cover" }
    ],
    "description": {
      "zh": "Langkasuka 楼——附加讲堂、实验室、系办公室与讲师办公室。",
      "ms": "Bangunan Langkasuka — bilik kuliah tambahan, makmal, pejabat jabatan dan pejabat pensyarah.",
      "en": "Bangunan Langkasuka — additional lecture rooms, laboratories, department offices and lecturer offices."
    },
    "purpose": {
      "zh": "上课、考试。",
      "ms": "Kelas dan peperiksaan.",
      "en": "Classes and examinations."
    },
    "tags": {
      "zh": [
        "授课",
        "讲师",
        "系",
        "Langkasuka"
      ],
      "ms": [
        "kuliah",
        "pensyarah",
        "jabatan",
        "langkasuka"
      ],
      "en": [
        "lectures",
        "lecturer",
        "department",
        "Langkasuka"
      ]
    },
    "floors": 3,
    "hours": "Isnin–Sabtu 07:30–18:00",
    "center": [
      -251.785,
      119.97
    ],
    "overviewPolygon": [
      [
        15.6,
        82.39
      ],
      [
        8.19,
        82.43
      ],
      [
        8.15,
        75.8
      ],
      [
        8.0,
        16.14
      ],
      [
        13.94,
        16.1
      ],
      [
        13.92,
        8.1
      ],
      [
        28.53,
        8.0
      ],
      [
        28.55,
        16.72
      ],
      [
        33.68,
        16.69
      ],
      [
        91.8,
        16.24
      ],
      [
        91.96,
        74.98
      ],
      [
        92.0,
        83.31
      ],
      [
        62.43,
        83.55
      ],
      [
        28.41,
        83.8
      ],
      [
        28.44,
        91.88
      ],
      [
        15.63,
        92.0
      ]
    ],
    "mapFootprint": [
      [6.423418, 100.416839],
      [6.423418, 100.416781],
      [6.423388, 100.416781],
      [6.423114, 100.416780],
      [6.423114, 100.416826],
      [6.423077, 100.416826],
      [6.423076, 100.416939],
      [6.423116, 100.416939],
      [6.423116, 100.416979],
      [6.423114, 100.417428],
      [6.423384, 100.417430],
      [6.423422, 100.417430],
      [6.423423, 100.417201],
      [6.423425, 100.416938],
      [6.423462, 100.416938],
      [6.423462, 100.416839]
    ],
    "mapTarget": { "lat": 6.423269, "lng": 100.417105 },
    "wallKey": "building:B_LANGKASUKA"
  },
  {
    "id": "B_SERAMBI",
    "name": "Serambi Aktiviti Pelajar",
    "category": "hub",
    "zoneId": "student-life",
    "emoji": "✨",
    "description": {
      "zh": "学生活动中心，设有开放式内庭，内设学生事务处（HEP）、辅导室与活动空间。",
      "ms": "Pusat aktiviti pelajar dengan ruang dalaman terbuka. Termasuk Pejabat HEP, kaunseling dan ruang aktiviti.",
      "en": "Student activity hub with an open central courtyard. Houses the Student Affairs Office (HEP), counselling services and activity spaces."
    },
    "purpose": {
      "zh": "办理 HEP 相关事务，例如申请假期。",
      "ms": "Urusan pentadbiran berkaitan HEP, termasuk permohonan cuti pelajar.",
      "en": "HEP-related administrative matters, including student leave applications."
    },
    "tags": {
      "zh": [
        "学生事务处",
        "辅导",
        "学生",
        "活动"
      ],
      "ms": [
        "HEP",
        "kaunseling",
        "pelajar",
        "aktiviti"
      ],
      "en": [
        "student affairs",
        "counselling",
        "students",
        "activities"
      ]
    },
    "floors": 2,
    "hours": "Isnin–Jumaat 08:00–17:00",
    "center": [
      -249.325,
      -141.025
    ],
    "overviewPolygon": [
      [
        8.0,
        91.28
      ],
      [
        90.18,
        92.0
      ],
      [
        90.95,
        57.63
      ],
      [
        92.0,
        8.72
      ],
      [
        9.89,
        8.0
      ]
    ],
    "mapFootprint": [
      [6.425702, 100.417073],
      [6.425703, 100.417179],
      [6.425630, 100.417180],
      [6.425526, 100.417181],
      [6.425525, 100.417075]
    ],
    "mapTarget": { "lat": 6.425614, "lng": 100.417127 },
    "wallKey": "building:B_SERAMBI"
  },
  {
    "id": "B_GARAJ",
    "name": "Garaj Bas",
    "category": "admin",
    "zoneId": "services",
    "emoji": "🚌",
    "description": {
      "zh": "校车车库与停放处。",
      "ms": "Garaj dan tempat letak bas kolej.",
      "en": "Garage and parking bay for the college buses."
    },
    "tags": {
      "zh": [
        "巴士",
        "交通",
        "车库"
      ],
      "ms": [
        "bas",
        "pengangkutan",
        "garaj"
      ],
      "en": [
        "bus",
        "transport",
        "garage"
      ]
    },
    "floors": 1,
    "hours": "06:00–22:00",
    "center": [
      162.56,
      -91.225
    ],
    "overviewPolygon": [
      [
        8.15,
        92.0
      ],
      [
        8.0,
        36.52
      ],
      [
        28.27,
        35.8
      ],
      [
        28.18,
        10.14
      ],
      [
        91.78,
        8.0
      ],
      [
        92.0,
        89.08
      ]
    ],
    "wallKey": "building:B_GARAJ"
  },
  {
    "id": "B_ASTAKA",
    "name": "Astaka",
    "category": "sports",
    "zoneId": "sports",
    "emoji": "🏟️",
    "photos": [
      { "src": "assets/buildings/B_ASTAKA/cover-01.jpg", "alt": "Astaka at Kolej Matrikulasi Kedah", "fit": "cover" },
      { "src": "assets/buildings/B_ASTAKA/gallery-02.jpg", "alt": "Astaka overlooking the campus field", "fit": "cover" }
    ],
    "description": {
      "zh": "主看台，正对操场和田径跑道。",
      "ms": "Astaka utama menghadap padang dan litar olahraga.",
      "en": "The main pavilion overlooking the field and running track."
    },
    "tags": {
      "zh": [
        "体育",
        "看台",
        "集会"
      ],
      "ms": [
        "sukan",
        "astaka",
        "perhimpunan"
      ],
      "en": [
        "sports",
        "pavilion",
        "assembly"
      ]
    },
    "floors": 2,
    "hours": "06:00–22:00",
    "center": [
      -247.54,
      -294.01
    ],
    "overviewPolygon": [
      [
        8.26,
        92.0
      ],
      [
        8.0,
        8.2
      ],
      [
        72.99,
        8.03
      ],
      [
        91.71,
        8.0
      ],
      [
        92.0,
        91.86
      ],
      [
        58.94,
        91.92
      ]
    ],
    "mapTarget": {
      "lat": 6.426983,
      "lng": 100.417148
    },
    "mapFootprint": [
      [6.427122, 100.417041],
      [6.426855, 100.417040],
      [6.426854, 100.417200],
      [6.426854, 100.417246],
      [6.427122, 100.417247],
      [6.427122, 100.417165]
    ],
    "wallKey": "building:B_ASTAKA"
  },
  {
    "id": "B_SERI_LAKA",
    "name": "Kediaman Seri Laka",
    "category": "residence",
    "zoneId": "residence",
    "emoji": "🛏️",
    "description": {
      "zh": "Kediaman Seri Laka 是校园内的学生宿舍区域。地图显示整个宿舍区域范围。",
      "ms": "Kediaman Seri Laka ialah kawasan kediaman pelajar di kampus. Peta memaparkan kawasan kediaman secara keseluruhan.",
      "en": "Kediaman Seri Laka is a student residential area on campus. The map shows the residence area as a whole."
    },
    "purpose": {
      "zh": "学生住宿。",
      "ms": "Penginapan pelajar.",
      "en": "Student accommodation."
    },
    "specialNotes": {
      "zh": "禁止进入异性宿舍区域，包括走廊。",
      "ms": "Dilarang memasuki kawasan kediaman jantina bertentangan, termasuk koridor.",
      "en": "Entry into residence areas of the opposite gender, including corridors, is prohibited."
    },
    "tags": {
      "zh": [
        "宿舍",
        "Seri Laka",
        "宿舍",
        "学生"
      ],
      "ms": [
        "asrama",
        "seri laka",
        "kediaman",
        "pelajar"
      ],
      "en": [
        "dormitory",
        "Seri Laka",
        "residence",
        "students"
      ]
    },
    "floors": 4,
    "hours": "24 jam (residen sahaja)",
    "center": [
      78.505,
      -15.82
    ],
    "overviewPolygon": [
      [
        11.57,
        33.45
      ],
      [
        11.56,
        36.61
      ],
      [
        8.25,
        36.57
      ],
      [
        8.24,
        40.05
      ],
      [
        11.69,
        40.1
      ],
      [
        11.68,
        42.21
      ],
      [
        9.08,
        42.19
      ],
      [
        8.97,
        84.39
      ],
      [
        11.43,
        84.41
      ],
      [
        11.43,
        86.54
      ],
      [
        8.01,
        86.52
      ],
      [
        8.0,
        89.83
      ],
      [
        11.62,
        89.86
      ],
      [
        11.62,
        91.87
      ],
      [
        34.15,
        92.0
      ],
      [
        34.16,
        90.11
      ],
      [
        36.49,
        90.13
      ],
      [
        36.5,
        86.96
      ],
      [
        34.34,
        86.95
      ],
      [
        34.34,
        84.05
      ],
      [
        37.24,
        84.06
      ],
      [
        37.26,
        49.31
      ],
      [
        34.92,
        49.31
      ],
      [
        34.92,
        43.85
      ],
      [
        43.51,
        43.86
      ],
      [
        43.51,
        45.17
      ],
      [
        44.66,
        45.25
      ],
      [
        47.16,
        45.2
      ],
      [
        50.54,
        45.16
      ],
      [
        50.54,
        43.76
      ],
      [
        59.59,
        43.75
      ],
      [
        59.58,
        39.3
      ],
      [
        60.8,
        39.3
      ],
      [
        60.82,
        59.8
      ],
      [
        59.67,
        59.8
      ],
      [
        59.68,
        64.93
      ],
      [
        90.01,
        64.8
      ],
      [
        90.01,
        60.85
      ],
      [
        92.0,
        60.83
      ],
      [
        91.94,
        13.46
      ],
      [
        90.35,
        13.48
      ],
      [
        90.34,
        8.0
      ],
      [
        75.82,
        8.09
      ],
      [
        60.99,
        8.17
      ],
      [
        61.03,
        33.39
      ],
      [
        60.53,
        33.39
      ],
      [
        60.52,
        29.15
      ],
      [
        51.17,
        29.22
      ],
      [
        51.16,
        27.07
      ],
      [
        42.09,
        27.13
      ],
      [
        42.1,
        28.66
      ],
      [
        32.52,
        28.73
      ],
      [
        32.53,
        35.47
      ],
      [
        30.44,
        39.1
      ],
      [
        25.44,
        39.04
      ],
      [
        25.46,
        33.63
      ]
    ],
    "mapTarget": { "lat": 6.424489, "lng": 100.420091 },
    "mapFootprint": [
      [
        [6.424334, 100.419386],
        [6.424363, 100.419385],
        [6.424363, 100.419325],
        [6.424396, 100.419325],
        [6.424396, 100.419388],
        [6.424416, 100.419388],
        [6.424416, 100.419340],
        [6.424812, 100.419338],
        [6.424812, 100.419383],
        [6.424832, 100.419383],
        [6.424832, 100.419320],
        [6.424863, 100.419320],
        [6.424863, 100.419387],
        [6.424882, 100.419386],
        [6.424883, 100.419800],
        [6.424866, 100.419800],
        [6.424866, 100.419843],
        [6.424836, 100.419843],
        [6.424836, 100.419803],
        [6.424809, 100.419803],
        [6.424809, 100.419856],
        [6.424483, 100.419857],
        [6.424483, 100.419814],
        [6.424431, 100.419814],
        [6.424431, 100.419972],
        [6.424444, 100.419972],
        [6.424445, 100.419993],
        [6.424444, 100.420039],
        [6.424444, 100.420101],
        [6.424431, 100.420101],
        [6.424430, 100.420267],
        [6.424389, 100.420266],
        [6.424389, 100.420289],
        [6.424581, 100.420289],
        [6.424581, 100.420268],
        [6.424629, 100.420268],
        [6.424628, 100.420825],
        [6.424591, 100.420825],
        [6.424591, 100.420861],
        [6.424146, 100.420860],
        [6.424146, 100.420831],
        [6.424095, 100.420831],
        [6.424096, 100.420564],
        [6.424096, 100.420292],
        [6.424333, 100.420293],
        [6.424333, 100.420284],
        [6.424293, 100.420284],
        [6.424294, 100.420112],
        [6.424274, 100.420112],
        [6.424274, 100.419946],
        [6.424289, 100.419946],
        [6.424289, 100.419770],
        [6.424353, 100.419770],
        [6.424387, 100.419732],
        [6.424386, 100.419640],
        [6.424335, 100.419640]
      ],
      [
        [6.424482, 100.419424],
        [6.424482, 100.419476],
        [6.424525, 100.419476],
        [6.424525, 100.419499],
        [6.424695, 100.419499],
        [6.424695, 100.419466],
        [6.424743, 100.419466],
        [6.424743, 100.419425],
        [6.424800, 100.419425],
        [6.424800, 100.419445],
        [6.424759, 100.419445],
        [6.424759, 100.419748],
        [6.424813, 100.419748],
        [6.424813, 100.419775],
        [6.424740, 100.419775],
        [6.424740, 100.419734],
        [6.424690, 100.419734],
        [6.424690, 100.419721],
        [6.424534, 100.419721],
        [6.424534, 100.419730],
        [6.424488, 100.419730],
        [6.424488, 100.419796],
        [6.424477, 100.419796],
        [6.424477, 100.419767],
        [6.424426, 100.419767],
        [6.424426, 100.419693],
        [6.424470, 100.419693],
        [6.424470, 100.419454],
        [6.424423, 100.419454],
        [6.424423, 100.419424]
      ],
      [
        [6.424494, 100.420433],
        [6.424528, 100.420433],
        [6.424528, 100.420421],
        [6.424199, 100.420424],
        [6.424200, 100.420446],
        [6.424240, 100.420446],
        [6.424241, 100.420506],
        [6.424255, 100.420506],
        [6.424256, 100.420661],
        [6.424242, 100.420661],
        [6.424242, 100.420703],
        [6.424201, 100.420703],
        [6.424201, 100.420724],
        [6.424537, 100.420721],
        [6.424537, 100.420699],
        [6.424498, 100.420700],
        [6.424498, 100.420660],
        [6.424473, 100.420661],
        [6.424471, 100.420489],
        [6.424494, 100.420488]
      ]
    ],
    "wallKey": "building:B_SERI_LAKA"
  },
  {
    "id": "B_SERI_PALAS",
    "name": "Kediaman Seri Palas",
    "category": "residence",
    "zoneId": "residence",
    "emoji": "🛏️",
    "description": {
      "zh": "Kediaman Seri Palas 是校园内的学生宿舍区域。地图显示整个宿舍区域范围。",
      "ms": "Kediaman Seri Palas ialah kawasan kediaman pelajar di kampus. Peta memaparkan kawasan kediaman secara keseluruhan.",
      "en": "Kediaman Seri Palas is a student residential area on campus. The map shows the residence area as a whole."
    },
    "purpose": {
      "zh": "学生住宿。",
      "ms": "Penginapan pelajar.",
      "en": "Student accommodation."
    },
    "specialNotes": {
      "zh": "禁止进入异性宿舍区域，包括走廊。",
      "ms": "Dilarang memasuki kawasan kediaman jantina bertentangan, termasuk koridor.",
      "en": "Entry into residence areas of the opposite gender, including corridors, is prohibited."
    },
    "tags": {
      "zh": [
        "宿舍",
        "Seri Palas",
        "宿舍",
        "学生"
      ],
      "ms": [
        "asrama",
        "seri palas",
        "kediaman",
        "pelajar"
      ],
      "en": [
        "dormitory",
        "Seri Palas",
        "residence",
        "students"
      ]
    },
    "floors": 4,
    "hours": "24 jam (residen sahaja)",
    "center": [
      -116.315,
      108.08
    ],
    "overviewPolygon": [
      [
        11.38,
        65.8
      ],
      [
        11.38,
        62.67
      ],
      [
        8.07,
        62.67
      ],
      [
        8.07,
        59.23
      ],
      [
        11.52,
        59.23
      ],
      [
        11.52,
        57.14
      ],
      [
        8.92,
        57.12
      ],
      [
        8.95,
        15.36
      ],
      [
        11.42,
        15.38
      ],
      [
        11.42,
        13.27
      ],
      [
        8.0,
        13.25
      ],
      [
        8.0,
        9.96
      ],
      [
        11.62,
        9.99
      ],
      [
        11.63,
        8.0
      ],
      [
        34.19,
        8.14
      ],
      [
        34.19,
        10.02
      ],
      [
        36.53,
        10.04
      ],
      [
        36.52,
        13.17
      ],
      [
        34.36,
        13.15
      ],
      [
        34.35,
        16.02
      ],
      [
        37.25,
        16.05
      ],
      [
        37.15,
        50.44
      ],
      [
        34.81,
        50.4
      ],
      [
        34.79,
        55.81
      ],
      [
        43.4,
        55.92
      ],
      [
        43.4,
        54.62
      ],
      [
        45.54,
        54.59
      ],
      [
        47.53,
        54.56
      ],
      [
        50.45,
        54.72
      ],
      [
        50.44,
        56.1
      ],
      [
        59.48,
        56.22
      ],
      [
        59.47,
        60.62
      ],
      [
        60.69,
        60.64
      ],
      [
        60.78,
        40.36
      ],
      [
        59.63,
        40.34
      ],
      [
        59.65,
        35.26
      ],
      [
        90.02,
        35.78
      ],
      [
        90.01,
        39.69
      ],
      [
        92.0,
        39.73
      ],
      [
        91.77,
        86.6
      ],
      [
        90.18,
        86.56
      ],
      [
        90.16,
        92.0
      ],
      [
        75.86,
        91.73
      ],
      [
        60.78,
        91.45
      ],
      [
        60.9,
        66.5
      ],
      [
        60.4,
        66.49
      ],
      [
        60.38,
        70.68
      ],
      [
        51.0,
        70.5
      ],
      [
        50.99,
        72.62
      ],
      [
        41.92,
        72.44
      ],
      [
        41.93,
        70.93
      ],
      [
        32.34,
        70.75
      ],
      [
        32.37,
        64.07
      ],
      [
        30.8,
        61.34
      ],
      [
        30.3,
        60.46
      ],
      [
        25.29,
        60.46
      ],
      [
        25.29,
        65.81
      ]
    ],
    "mapFootprint": [
      [
        [6.423526, 100.417622],
        [6.423496, 100.417622],
        [6.423496, 100.417561],
        [6.423464, 100.417561],
        [6.423464, 100.417624],
        [6.423444, 100.417624],
        [6.423444, 100.417577],
        [6.423048, 100.417577],
        [6.423048, 100.417622],
        [6.423028, 100.417623],
        [6.423027, 100.417560],
        [6.422996, 100.417560],
        [6.422997, 100.417626],
        [6.422978, 100.417626],
        [6.422979, 100.418040],
        [6.422997, 100.418040],
        [6.422997, 100.418083],
        [6.423027, 100.418083],
        [6.423027, 100.418043],
        [6.423054, 100.418043],
        [6.423054, 100.418096],
        [6.423380, 100.418094],
        [6.423380, 100.418051],
        [6.423431, 100.418051],
        [6.423432, 100.418209],
        [6.423420, 100.418209],
        [6.423420, 100.418248],
        [6.423419, 100.418284],
        [6.423421, 100.418338],
        [6.423434, 100.418338],
        [6.423435, 100.418503],
        [6.423477, 100.418503],
        [6.423477, 100.418525],
        [6.423285, 100.418527],
        [6.423284, 100.418506],
        [6.423236, 100.418506],
        [6.423241, 100.419063],
        [6.423278, 100.419063],
        [6.423279, 100.419099],
        [6.423723, 100.419095],
        [6.423723, 100.419066],
        [6.423775, 100.419066],
        [6.423772, 100.418803],
        [6.423769, 100.418527],
        [6.423533, 100.418529],
        [6.423533, 100.418520],
        [6.423572, 100.418520],
        [6.423571, 100.418348],
        [6.423591, 100.418348],
        [6.423589, 100.418181],
        [6.423575, 100.418182],
        [6.423573, 100.418006],
        [6.423510, 100.418006],
        [6.423484, 100.417978],
        [6.423475, 100.417968],
        [6.423475, 100.417877],
        [6.423526, 100.417877]
      ],
      [
        [6.423379, 100.417661],
        [6.423379, 100.417713],
        [6.423335, 100.417714],
        [6.423335, 100.417737],
        [6.423165, 100.417738],
        [6.423165, 100.417705],
        [6.423117, 100.417705],
        [6.423116, 100.417664],
        [6.423060, 100.417664],
        [6.423060, 100.417684],
        [6.423101, 100.417684],
        [6.423103, 100.417987],
        [6.423049, 100.417987],
        [6.423050, 100.418014],
        [6.423123, 100.418014],
        [6.423122, 100.417973],
        [6.423172, 100.417972],
        [6.423172, 100.417959],
        [6.423328, 100.417958],
        [6.423328, 100.417967],
        [6.423374, 100.417967],
        [6.423374, 100.418033],
        [6.423385, 100.418033],
        [6.423385, 100.418004],
        [6.423436, 100.418004],
        [6.423435, 100.417930],
        [6.423392, 100.417930],
        [6.423390, 100.417691],
        [6.423438, 100.417690],
        [6.423437, 100.417661]
      ],
      [
        [6.423373, 100.418671],
        [6.423339, 100.418671],
        [6.423339, 100.418658],
        [6.423667, 100.418659],
        [6.423667, 100.418681],
        [6.423627, 100.418681],
        [6.423627, 100.418741],
        [6.423612, 100.418741],
        [6.423612, 100.418896],
        [6.423626, 100.418897],
        [6.423626, 100.418938],
        [6.423667, 100.418938],
        [6.423667, 100.418959],
        [6.423332, 100.418958],
        [6.423332, 100.418937],
        [6.423370, 100.418937],
        [6.423370, 100.418898],
        [6.423395, 100.418898],
        [6.423396, 100.418726],
        [6.423373, 100.418726]
      ]
    ],
    "mapTarget": { "lat": 6.423376, "lng": 100.418330 },
    "wallKey": "building:B_SERI_PALAS"
  },
  {
    "id": "B_SERI_TEMIN",
    "name": "Kediaman Seri Temin",
    "category": "residence",
    "zoneId": "residence",
    "emoji": "🛏️",
    "description": {
      "zh": "Kediaman Seri Temin 是校园内的学生宿舍区域。地图显示整个宿舍区域范围。",
      "ms": "Kediaman Seri Temin ialah kawasan kediaman pelajar di kampus. Peta memaparkan kawasan kediaman secara keseluruhan.",
      "en": "Kediaman Seri Temin is a student residential area on campus. The map shows the residence area as a whole."
    },
    "purpose": {
      "zh": "学生住宿。",
      "ms": "Penginapan pelajar.",
      "en": "Student accommodation."
    },
    "specialNotes": {
      "zh": "禁止进入异性宿舍区域，包括走廊。",
      "ms": "Dilarang memasuki kawasan kediaman jantina bertentangan, termasuk koridor.",
      "en": "Entry into residence areas of the opposite gender, including corridors, is prohibited."
    },
    "tags": {
      "zh": [
        "宿舍",
        "Seri Temin",
        "宿舍",
        "学生"
      ],
      "ms": [
        "asrama",
        "seri temin",
        "kediaman",
        "pelajar"
      ],
      "en": [
        "dormitory",
        "Seri Temin",
        "residence",
        "students"
      ]
    },
    "floors": 4,
    "hours": "24 jam (residen sahaja)",
    "center": [
      76.845,
      88.36500000000001
    ],
    "overviewPolygon": [
      [
        11.38,
        65.8
      ],
      [
        11.38,
        62.68
      ],
      [
        8.07,
        62.68
      ],
      [
        8.07,
        59.23
      ],
      [
        11.52,
        59.24
      ],
      [
        11.52,
        57.15
      ],
      [
        8.92,
        57.14
      ],
      [
        8.95,
        15.37
      ],
      [
        11.42,
        15.37
      ],
      [
        11.42,
        13.26
      ],
      [
        8.0,
        13.25
      ],
      [
        8.0,
        9.97
      ],
      [
        11.63,
        9.99
      ],
      [
        11.63,
        8.0
      ],
      [
        34.19,
        8.14
      ],
      [
        34.19,
        10.02
      ],
      [
        36.53,
        10.04
      ],
      [
        36.52,
        13.18
      ],
      [
        34.36,
        13.15
      ],
      [
        34.35,
        16.02
      ],
      [
        37.25,
        16.05
      ],
      [
        37.15,
        50.44
      ],
      [
        34.81,
        50.41
      ],
      [
        34.79,
        55.82
      ],
      [
        43.39,
        55.91
      ],
      [
        43.4,
        54.63
      ],
      [
        46.26,
        54.54
      ],
      [
        48.26,
        54.49
      ],
      [
        50.44,
        54.72
      ],
      [
        50.44,
        56.1
      ],
      [
        59.48,
        56.23
      ],
      [
        59.47,
        60.63
      ],
      [
        60.69,
        60.64
      ],
      [
        60.78,
        40.37
      ],
      [
        59.63,
        40.34
      ],
      [
        59.65,
        35.27
      ],
      [
        90.02,
        35.78
      ],
      [
        90.01,
        39.7
      ],
      [
        92.0,
        39.73
      ],
      [
        91.77,
        86.61
      ],
      [
        90.18,
        86.58
      ],
      [
        90.16,
        92.0
      ],
      [
        76.81,
        91.75
      ],
      [
        60.78,
        91.46
      ],
      [
        60.9,
        66.51
      ],
      [
        60.4,
        66.5
      ],
      [
        60.38,
        70.69
      ],
      [
        51.0,
        70.51
      ],
      [
        50.99,
        72.62
      ],
      [
        41.92,
        72.45
      ],
      [
        41.93,
        70.94
      ],
      [
        32.34,
        70.77
      ],
      [
        32.38,
        64.08
      ],
      [
        31.34,
        62.27
      ],
      [
        30.3,
        60.46
      ],
      [
        25.28,
        60.45
      ],
      [
        25.28,
        65.81
      ]
    ],
    "mapFootprint": [
      [
        [6.423703, 100.419368],
        [6.423673, 100.419368],
        [6.423673, 100.419307],
        [6.423641, 100.419307],
        [6.423641, 100.419370],
        [6.423621, 100.419371],
        [6.423621, 100.419323],
        [6.423225, 100.419323],
        [6.423225, 100.419369],
        [6.423205, 100.419369],
        [6.423205, 100.419306],
        [6.423174, 100.419306],
        [6.423174, 100.419372],
        [6.423155, 100.419372],
        [6.423156, 100.419786],
        [6.423174, 100.419786],
        [6.423174, 100.419829],
        [6.423204, 100.419829],
        [6.423204, 100.419789],
        [6.423231, 100.419789],
        [6.423231, 100.419842],
        [6.423557, 100.419840],
        [6.423557, 100.419797],
        [6.423608, 100.419797],
        [6.423609, 100.419955],
        [6.423597, 100.419955],
        [6.423596, 100.420007],
        [6.423596, 100.420044],
        [6.423598, 100.420084],
        [6.423611, 100.420084],
        [6.423612, 100.420249],
        [6.423654, 100.420249],
        [6.423654, 100.420272],
        [6.423462, 100.420273],
        [6.423462, 100.420252],
        [6.423413, 100.420252],
        [6.423418, 100.420809],
        [6.423456, 100.420809],
        [6.423456, 100.420845],
        [6.423900, 100.420841],
        [6.423900, 100.420812],
        [6.423952, 100.420812],
        [6.423949, 100.420567],
        [6.423946, 100.420273],
        [6.423710, 100.420275],
        [6.423710, 100.420266],
        [6.423749, 100.420266],
        [6.423748, 100.420094],
        [6.423768, 100.420094],
        [6.423766, 100.419928],
        [6.423752, 100.419928],
        [6.423750, 100.419752],
        [6.423687, 100.419753],
        [6.423670, 100.419734],
        [6.423652, 100.419715],
        [6.423652, 100.419623],
        [6.423703, 100.419623]
      ],
      [
        [6.423556, 100.419407],
        [6.423556, 100.419459],
        [6.423512, 100.419460],
        [6.423512, 100.419483],
        [6.423343, 100.419484],
        [6.423342, 100.419451],
        [6.423294, 100.419451],
        [6.423294, 100.419410],
        [6.423237, 100.419410],
        [6.423237, 100.419430],
        [6.423279, 100.419430],
        [6.423281, 100.419733],
        [6.423227, 100.419733],
        [6.423227, 100.419760],
        [6.423300, 100.419760],
        [6.423300, 100.419719],
        [6.423349, 100.419718],
        [6.423349, 100.419706],
        [6.423505, 100.419704],
        [6.423505, 100.419713],
        [6.423551, 100.419713],
        [6.423551, 100.419779],
        [6.423563, 100.419779],
        [6.423562, 100.419750],
        [6.423613, 100.419750],
        [6.423613, 100.419676],
        [6.423569, 100.419676],
        [6.423568, 100.419437],
        [6.423615, 100.419437],
        [6.423615, 100.419407]
      ],
      [
        [6.423550, 100.420417],
        [6.423516, 100.420417],
        [6.423516, 100.420404],
        [6.423844, 100.420405],
        [6.423844, 100.420427],
        [6.423804, 100.420427],
        [6.423804, 100.420487],
        [6.423789, 100.420487],
        [6.423789, 100.420643],
        [6.423803, 100.420643],
        [6.423803, 100.420684],
        [6.423844, 100.420685],
        [6.423844, 100.420705],
        [6.423509, 100.420704],
        [6.423509, 100.420683],
        [6.423547, 100.420683],
        [6.423547, 100.420644],
        [6.423573, 100.420644],
        [6.423573, 100.420472],
        [6.423550, 100.420472]
      ]
    ],
    "mapTarget": { "lat": 6.423553, "lng": 100.420076 },
    "wallKey": "building:B_SERI_TEMIN"
  },
  {
    "id": "B_SERI_JERAI",
    "name": "Bangunan Seri Jerai",
    "category": "academic",
    "zoneId": "learning",
    "emoji": "🏫",
    "photos": [
      { "src": "assets/buildings/B_SERI_JERAI/cover-01.jpg", "alt": "Bangunan Seri Jerai at Kolej Matrikulasi Kedah", "fit": "cover" },
      { "src": "assets/buildings/B_SERI_JERAI/gallery-02.jpg", "alt": "Exterior view of Bangunan Seri Jerai", "fit": "cover" }
    ],
    "description": {
      "zh": "Seri Jerai 楼——学术楼，设有讲堂与学生活动空间。",
      "ms": "Bangunan Seri Jerai — blok akademik yang menempatkan bilik kuliah dan ruang aktiviti pelajar.",
      "en": "Bangunan Seri Jerai — an academic block housing lecture rooms and student activity spaces."
    },
    "tags": {
      "zh": [
        "学术",
        "Seri Jerai",
        "授课"
      ],
      "ms": [
        "akademik",
        "seri jerai",
        "kuliah"
      ],
      "en": [
        "academic",
        "Seri Jerai",
        "lectures"
      ]
    },
    "floors": 3,
    "hours": "Isnin–Sabtu 07:30–18:00",
    "center": [
      -247.695,
      -149.87
    ],
    "overviewPolygon": [
      [
        8.0,
        91.26
      ],
      [
        8.08,
        83.7
      ],
      [
        8.25,
        62.62
      ],
      [
        8.74,
        8.0
      ],
      [
        43.45,
        8.29
      ],
      [
        43.36,
        18.69
      ],
      [
        43.34,
        21.58
      ],
      [
        40.8,
        21.66
      ],
      [
        36.34,
        21.62
      ],
      [
        35.9,
        62.06
      ],
      [
        77.1,
        62.5
      ],
      [
        77.14,
        59.7
      ],
      [
        81.39,
        59.75
      ],
      [
        92.0,
        59.9
      ],
      [
        91.72,
        92.0
      ]
    ],
    "mapTarget": { "lat": 6.425869, "lng": 100.416961 },
    "mapFootprint": [
      [6.425988, 100.416839],
      [6.425934, 100.416840],
      [6.425934, 100.416784],
      [6.425934, 100.416747],
      [6.425784, 100.416746],
      [6.425784, 100.416784],
      [6.425784, 100.416819],
      [6.425783, 100.416841],
      [6.425393, 100.416844],
      [6.425395, 100.417095],
      [6.425470, 100.417094],
      [6.425490, 100.417094],
      [6.425491, 100.417076],
      [6.425491, 100.417043],
      [6.425779, 100.417040],
      [6.425783, 100.417337],
      [6.425763, 100.417338],
      [6.425763, 100.417368],
      [6.425764, 100.417445],
      [6.425993, 100.417443]
    ],
    "wallKey": "building:B_SERI_JERAI"
  },
  {
    "id": "B_BLOK_KETUA_JABATAN",
    "name": "Blok Kediaman Ketua Jabatan",
    "category": "staff_house",
    "zoneId": "services",
    "emoji": "🏠",
    "description": {
      "zh": "系主任宿舍楼——KMK 各系系主任的官方住所。",
      "ms": "Blok Kediaman Ketua Jabatan — kediaman rasmi untuk ketua-ketua jabatan KMK.",
      "en": "Blok Kediaman Ketua Jabatan — official housing for KMK's heads of department."
    },
    "tags": {
      "zh": [
        "宿舍",
        "系主任",
        "教职员"
      ],
      "ms": [
        "kediaman",
        "ketua jabatan",
        "staf"
      ],
      "en": [
        "residence",
        "head of department",
        "staff"
      ]
    },
    "floors": 2,
    "hours": "Kediaman peribadi",
    "center": [
      315.105,
      97.00999999999999
    ],
    "overviewPolygon": [
      [
        56.35,
        92.0
      ],
      [
        50.91,
        83.48
      ],
      [
        46.48,
        85.03
      ],
      [
        38.03,
        71.73
      ],
      [
        40.97,
        70.69
      ],
      [
        36.28,
        63.35
      ],
      [
        49.35,
        58.77
      ],
      [
        42.04,
        47.25
      ],
      [
        29.09,
        51.8
      ],
      [
        23.87,
        43.61
      ],
      [
        19.93,
        44.96
      ],
      [
        10.28,
        29.77
      ],
      [
        12.84,
        28.87
      ],
      [
        8.0,
        21.24
      ],
      [
        45.81,
        8.0
      ],
      [
        65.05,
        38.27
      ],
      [
        56.8,
        41.18
      ],
      [
        57.91,
        42.96
      ],
      [
        66.4,
        39.98
      ],
      [
        72.22,
        49.12
      ],
      [
        63.27,
        52.25
      ],
      [
        64.36,
        54.0
      ],
      [
        73.69,
        50.72
      ],
      [
        92.0,
        79.53
      ]
    ],
    "wallKey": "building:B_BLOK_KETUA_JABATAN"
  },
  {
    "id": "B_KP_P1",
    "name": "Kediaman Pensyarah P1",
    "category": "staff_house",
    "zoneId": "services",
    "emoji": "🏡",
    "description": {
      "zh": "P1 讲师宿舍——位于校园东侧、Jalan Bunga Lawang 沿线的讲师与教职员住所。",
      "ms": "Kediaman Pensyarah P1 — kediaman pensyarah dan staf akademik di zon timur kampus, sepanjang Jalan Bunga Lawang.",
      "en": "Kediaman Pensyarah P1 — lecturer and academic staff housing on the eastern side of campus, along Jalan Bunga Lawang."
    },
    "tags": {
      "zh": [
        "宿舍",
        "讲师",
        "教职员"
      ],
      "ms": [
        "kediaman",
        "pensyarah",
        "staf"
      ],
      "en": [
        "residence",
        "lecturer",
        "staff"
      ]
    },
    "floors": 2,
    "hours": "Kawasan kediaman",
    "center": [
      206.365,
      116.07999999999998
    ],
    "overviewPolygon": [
      [
        8.0,
        73.38
      ],
      [
        22.16,
        41.58
      ],
      [
        29.48,
        44.04
      ],
      [
        31.01,
        40.59
      ],
      [
        23.6,
        38.09
      ],
      [
        37.01,
        8.0
      ],
      [
        52.66,
        13.27
      ],
      [
        50.09,
        19.03
      ],
      [
        69.11,
        25.46
      ],
      [
        71.53,
        20.02
      ],
      [
        92.0,
        26.89
      ],
      [
        77.82,
        58.67
      ],
      [
        59.82,
        52.63
      ],
      [
        59.03,
        54.35
      ],
      [
        76.27,
        60.17
      ],
      [
        62.1,
        92.0
      ],
      [
        38.75,
        84.12
      ],
      [
        40.97,
        79.13
      ],
      [
        30.81,
        75.71
      ],
      [
        28.72,
        80.38
      ]
    ],
    "wallKey": "building:B_KP_P1"
  },
  {
    "id": "B_KP_P2",
    "name": "Kediaman Pensyarah P2",
    "category": "staff_house",
    "zoneId": "services",
    "emoji": "🏡",
    "description": {
      "zh": "P2 讲师宿舍——位于校园东侧、Jalan Bunga Lawang 沿线的讲师与教职员住所。",
      "ms": "Kediaman Pensyarah P2 — kediaman pensyarah dan staf akademik di zon timur kampus, sepanjang Jalan Bunga Lawang.",
      "en": "Kediaman Pensyarah P2 — lecturer and academic staff housing on the eastern side of campus, along Jalan Bunga Lawang."
    },
    "tags": {
      "zh": [
        "宿舍",
        "讲师",
        "教职员"
      ],
      "ms": [
        "kediaman",
        "pensyarah",
        "staf"
      ],
      "en": [
        "residence",
        "lecturer",
        "staff"
      ]
    },
    "floors": 2,
    "hours": "Kawasan kediaman",
    "center": [
      258.74,
      67.92999999999999
    ],
    "overviewPolygon": [
      [
        92.0,
        58.58
      ],
      [
        61.61,
        74.81
      ],
      [
        58.71,
        68.0
      ],
      [
        55.4,
        69.77
      ],
      [
        58.35,
        76.66
      ],
      [
        29.58,
        92.0
      ],
      [
        23.37,
        77.48
      ],
      [
        28.87,
        74.54
      ],
      [
        21.33,
        56.85
      ],
      [
        16.14,
        59.62
      ],
      [
        8.0,
        40.64
      ],
      [
        38.41,
        24.41
      ],
      [
        45.56,
        41.14
      ],
      [
        47.21,
        40.26
      ],
      [
        40.38,
        24.23
      ],
      [
        70.8,
        8.0
      ],
      [
        80.06,
        29.68
      ],
      [
        75.29,
        32.24
      ],
      [
        79.33,
        41.7
      ],
      [
        83.77,
        39.31
      ]
    ],
    "wallKey": "building:B_KP_P2"
  },
  {
    "id": "B_KP_P3",
    "name": "Kediaman Pensyarah P3",
    "category": "staff_house",
    "zoneId": "services",
    "emoji": "🏡",
    "description": {
      "zh": "P3 讲师宿舍——位于校园东侧、Jalan Bunga Lawang 沿线的讲师与教职员住所。",
      "ms": "Kediaman Pensyarah P3 — kediaman pensyarah dan staf akademik di zon timur kampus, sepanjang Jalan Bunga Lawang.",
      "en": "Kediaman Pensyarah P3 — lecturer and academic staff housing on the eastern side of campus, along Jalan Bunga Lawang."
    },
    "tags": {
      "zh": [
        "宿舍",
        "讲师",
        "教职员"
      ],
      "ms": [
        "kediaman",
        "pensyarah",
        "staf"
      ],
      "en": [
        "residence",
        "lecturer",
        "staff"
      ]
    },
    "floors": 2,
    "hours": "Kawasan kediaman",
    "center": [
      259.88,
      13.760000000000002
    ],
    "overviewPolygon": [
      [
        92.0,
        36.55
      ],
      [
        59.75,
        22.71
      ],
      [
        57.35,
        30.17
      ],
      [
        53.85,
        28.66
      ],
      [
        56.28,
        21.11
      ],
      [
        25.74,
        8.0
      ],
      [
        20.6,
        23.92
      ],
      [
        26.47,
        26.44
      ],
      [
        20.22,
        45.85
      ],
      [
        14.7,
        43.48
      ],
      [
        8.0,
        64.31
      ],
      [
        40.23,
        78.17
      ],
      [
        46.15,
        59.8
      ],
      [
        47.93,
        60.57
      ],
      [
        42.28,
        78.11
      ],
      [
        74.53,
        92.0
      ],
      [
        82.19,
        68.21
      ],
      [
        77.15,
        66.03
      ],
      [
        80.47,
        55.66
      ],
      [
        85.21,
        57.7
      ]
    ],
    "wallKey": "building:B_KP_P3"
  },
  {
    "id": "B_KP_P4",
    "name": "Kediaman Pensyarah P4",
    "category": "staff_house",
    "zoneId": "services",
    "emoji": "🏡",
    "description": {
      "zh": "P4 讲师宿舍——位于校园东侧、Jalan Bunga Lawang 沿线的讲师与教职员住所。",
      "ms": "Kediaman Pensyarah P4 — kediaman pensyarah dan staf akademik di zon timur kampus, sepanjang Jalan Bunga Lawang.",
      "en": "Kediaman Pensyarah P4 — lecturer and academic staff housing on the eastern side of campus, along Jalan Bunga Lawang."
    },
    "tags": {
      "zh": [
        "宿舍",
        "讲师",
        "教职员"
      ],
      "ms": [
        "kediaman",
        "pensyarah",
        "staf"
      ],
      "en": [
        "residence",
        "lecturer",
        "staff"
      ]
    },
    "floors": 2,
    "hours": "Kawasan kediaman",
    "center": [
      209.155,
      -30.47
    ],
    "overviewPolygon": [
      [
        8.0,
        26.01
      ],
      [
        21.77,
        58.11
      ],
      [
        29.2,
        55.73
      ],
      [
        30.69,
        59.21
      ],
      [
        23.17,
        61.63
      ],
      [
        36.2,
        92.0
      ],
      [
        52.08,
        86.91
      ],
      [
        49.59,
        81.09
      ],
      [
        68.92,
        74.87
      ],
      [
        71.28,
        80.38
      ],
      [
        92.0,
        73.72
      ],
      [
        78.23,
        41.62
      ],
      [
        59.98,
        47.51
      ],
      [
        59.2,
        45.74
      ],
      [
        76.69,
        40.12
      ],
      [
        62.92,
        8.0
      ],
      [
        39.23,
        15.61
      ],
      [
        41.38,
        20.65
      ],
      [
        31.06,
        23.97
      ],
      [
        29.04,
        19.27
      ]
    ],
    "wallKey": "building:B_KP_P4"
  },
  {
    "id": "B_KEDIAMAN_PENGARAH",
    "name": "Kediaman Pengarah",
    "category": "staff_house",
    "zoneId": "services",
    "emoji": "🏡",
    "photos": [
      { "src": "assets/buildings/B_KEDIAMAN_PENGARAH/cover-01.jpg", "alt": "Kediaman Pengarah at Kolej Matrikulasi Kedah", "fit": "cover" }
    ],
    "description": {
      "zh": "KMK 院长官邸，位于校园东南角。",
      "ms": "Kediaman rasmi Pengarah KMK di sudut tenggara kampus.",
      "en": "The official residence of the KMK Director, at the southeast corner of campus."
    },
    "tags": {
      "zh": [
        "宿舍",
        "院长",
        "主任"
      ],
      "ms": [
        "kediaman",
        "pengarah",
        "direktur"
      ],
      "en": [
        "residence",
        "director",
        "director"
      ]
    },
    "floors": 2,
    "hours": "Kawasan kediaman",
    "center": [
      275.35,
      131.6
    ],
    "overviewPolygon": [
      [
        36.0,
        82.68
      ],
      [
        8.0,
        56.16
      ],
      [
        63.74,
        8.0
      ],
      [
        92.0,
        34.76
      ],
      [
        68.12,
        55.35
      ],
      [
        86.29,
        72.55
      ],
      [
        63.68,
        92.0
      ],
      [
        45.4,
        74.66
      ]
    ],
    "wallKey": "building:B_KEDIAMAN_PENGARAH"
  },
  {
    "id": "B_KAFETERIA_A",
    "name": "Kafeteria A",
    "category": "dining",
    "zoneId": "residence",
    "emoji": "🍽️",
    "description": {
      "zh": "A 食堂——学生主要食堂之一，供应早餐、午餐与晚餐。",
      "ms": "Kafeteria A — salah satu kafeteria utama pelajar untuk sarapan, makan tengah hari dan makan malam.",
      "en": "Kafeteria A — one of the main student cafeterias, serving breakfast, lunch and dinner."
    },
    "purpose": {
      "zh": "餐饮。",
      "ms": "Makan minum.",
      "en": "Dining."
    },
    "specialNotes": {
      "zh": "女生过了 7:00pm 不能前往该区域。",
      "ms": "Pelajar perempuan tidak dibenarkan memasuki kawasan ini selepas 7:00 malam.",
      "en": "Female students are not allowed to enter this area after 7:00 PM."
    },
    "tags": {
      "zh": [
        "食堂",
        "用餐",
        "学生"
      ],
      "ms": [
        "kafeteria",
        "makan",
        "pelajar"
      ],
      "en": [
        "cafeteria",
        "dining",
        "students"
      ]
    },
    "floors": 1,
    "hours": "06:30–22:00",
    "center": [
      -116.1,
      137.215
    ],
    "overviewPolygon": [
      [
        29.19,
        92.0
      ],
      [
        28.66,
        70.28
      ],
      [
        9.58,
        70.45
      ],
      [
        8.0,
        8.74
      ],
      [
        90.45,
        8.0
      ],
      [
        92.0,
        69.07
      ],
      [
        73.36,
        69.24
      ],
      [
        73.92,
        91.61
      ],
      [
        55.21,
        91.74
      ],
      [
        42.28,
        91.83
      ]
    ],
    "mapFootprint": [
      [6.423317, 100.418271],
      [6.423212, 100.418269],
      [6.423213, 100.418214],
      [6.422915, 100.418209],
      [6.422911, 100.418449],
      [6.423207, 100.418454],
      [6.423207, 100.418400],
      [6.423315, 100.418401],
      [6.423316, 100.418347],
      [6.423316, 100.418309]
    ],
    "mapTarget": { "lat": 6.423114, "lng": 100.418331 },
    "wallKey": "building:B_KAFETERIA_A"
  },
  {
    "id": "B_KAFETERIA_B",
    "name": "Kafeteria B",
    "category": "dining",
    "zoneId": "residence",
    "emoji": "🍽️",
    "description": {
      "zh": "B 食堂——靠近宿舍的学生食堂，课余时间的热门去处。",
      "ms": "Kafeteria B — kafeteria pelajar berhampiran kediaman, tumpuan pelajar waktu rehat.",
      "en": "Kafeteria B — a student cafeteria near the residential halls, a popular spot between classes."
    },
    "purpose": {
      "zh": "餐饮。",
      "ms": "Makan minum.",
      "en": "Dining."
    },
    "specialNotes": {
      "zh": "男生过了 7:00pm 不能前往该区域。",
      "ms": "Pelajar lelaki tidak dibenarkan memasuki kawasan ini selepas 7:00 malam.",
      "en": "Male students are not allowed to enter this area after 7:00 PM."
    },
    "tags": {
      "zh": [
        "食堂",
        "用餐",
        "学生"
      ],
      "ms": [
        "kafeteria",
        "makan",
        "pelajar"
      ],
      "en": [
        "cafeteria",
        "dining",
        "students"
      ]
    },
    "floors": 1,
    "hours": "06:30–22:00",
    "center": [
      77.055,
      117.225
    ],
    "overviewPolygon": [
      [
        29.16,
        92.0
      ],
      [
        28.67,
        70.28
      ],
      [
        9.55,
        70.47
      ],
      [
        8.0,
        8.74
      ],
      [
        90.48,
        8.0
      ],
      [
        92.0,
        69.07
      ],
      [
        73.38,
        69.24
      ],
      [
        73.91,
        91.57
      ],
      [
        56.31,
        91.74
      ],
      [
        41.85,
        91.87
      ]
    ],
    "mapFootprint": [
      [6.423497, 100.420017],
      [6.423392, 100.420015],
      [6.423393, 100.419960],
      [6.423095, 100.419955],
      [6.423091, 100.420195],
      [6.423386, 100.420200],
      [6.423387, 100.420146],
      [6.423495, 100.420147],
      [6.423496, 100.420096],
      [6.423496, 100.420054]
    ],
    "mapTarget": { "lat": 6.423294, "lng": 100.420078 },
    "wallKey": "building:B_KAFETERIA_B"
  },
  {
    "id": "B_KAFETERIA_C",
    "name": "Kafeteria C",
    "category": "dining",
    "zoneId": "residence",
    "emoji": "🍽️",
    "description": {
      "zh": "Kafeteria C 是位于 Blok C 宿舍区域附近的校园餐饮设施。",
      "ms": "Kafeteria C ialah kemudahan makanan kampus yang terletak berhampiran kawasan kediaman Blok C.",
      "en": "Kafeteria C is a campus dining facility located near the Blok C residential area."
    },
    "purpose": {
      "zh": "餐饮。",
      "ms": "Makan minum.",
      "en": "Dining."
    },
    "specialNotes": {
      "zh": "男生过了 7:00pm 不能前往该区域。",
      "ms": "Pelajar lelaki tidak dibenarkan memasuki kawasan ini selepas 7:00 malam.",
      "en": "Male students are not allowed to enter this area after 7:00 PM."
    },
    "tags": {
      "zh": [
        "食堂",
        "用餐",
        "学生"
      ],
      "ms": [
        "kafeteria",
        "makan",
        "pelajar"
      ],
      "en": [
        "cafeteria",
        "dining",
        "students"
      ]
    },
    "floors": 1,
    "hours": "06:30–22:00",
    "center": [
      77.34,
      -48.864999999999995
    ],
    "overviewPolygon": [
      [
        26.52,
        8.41
      ],
      [
        27.08,
        30.12
      ],
      [
        8.0,
        30.31
      ],
      [
        9.55,
        92.0
      ],
      [
        92.0,
        91.22
      ],
      [
        90.45,
        30.18
      ],
      [
        71.84,
        30.34
      ],
      [
        71.25,
        8.0
      ],
      [
        55.77,
        8.13
      ],
      [
        42.18,
        8.26
      ]
    ],
    "mapFootprint": [
      [6.424585, 100.420012],
      [6.424690, 100.420013],
      [6.424691, 100.419958],
      [6.424989, 100.419962],
      [6.424985, 100.420203],
      [6.424690, 100.420198],
      [6.424691, 100.420144],
      [6.424583, 100.420142],
      [6.424584, 100.420097],
      [6.424584, 100.420057]
    ],
    "mapTarget": { "lat": 6.424786, "lng": 100.420080 },
    "wallKey": "building:B_KAFETERIA_C"
  },
  {
    "id": "B_KAFETERIA_PENTADBIRAN",
    "name": "Kafeteria Pentadbiran",
    "category": "cafe",
    "zoneId": "residence",
    "emoji": "☕",
    "description": {
      "zh": "Kafeteria Pentadbiran 是校园行政区附近的餐饮设施。地图显示组成同一地点的三个区域。",
      "ms": "Kafeteria Pentadbiran ialah kemudahan makanan berhampiran kawasan pentadbiran kampus. Peta memaparkan tiga bahagian yang membentuk lokasi yang sama.",
      "en": "Kafeteria Pentadbiran is a campus dining facility near the administrative area. The map shows three components that form the same location."
    },
    "purpose": {
      "zh": "餐饮。",
      "ms": "Makan minum.",
      "en": "Dining."
    },
    "tags": {
      "zh": [
        "食堂",
        "行政",
        "教职员"
      ],
      "ms": [
        "kafeteria",
        "pentadbiran",
        "staf"
      ],
      "en": [
        "cafeteria",
        "admin",
        "staff"
      ]
    },
    "floors": 1,
    "hours": "Sila semak waktu operasi semasa",
    "center": [
      -233.38,
      -110.93
    ],
    "overviewPolygon": [
      [
        8.0,
        82.92
      ],
      [
        8.0,
        8.0
      ],
      [
        92.0,
        8.0
      ],
      [
        92.0,
        92.0
      ],
      [
        20.39,
        91.92
      ],
      [
        20.39,
        82.92
      ]
    ],
    "mapFootprint": [
      [
        [
          [6.425382, 100.417214],
          [6.425294, 100.417214],
          [6.425294, 100.417329],
          [6.425393, 100.417329],
          [6.425392, 100.417231],
          [6.425382, 100.417231]
        ]
      ],
      [
        [
          [6.425595, 100.417242],
          [6.425469, 100.417243],
          [6.425434, 100.417243],
          [6.425436, 100.417414],
          [6.425597, 100.417413],
          [6.425596, 100.417367]
        ]
      ],
      [
        [
          [6.425287, 100.417227],
          [6.425247, 100.417227],
          [6.425248, 100.417362],
          [6.425287, 100.417362]
        ]
      ]
    ],
    "mapTarget": { "lat": 6.425441, "lng": 100.417310 },
    "wallKey": "building:B_KAFETERIA_PENTADBIRAN"
  },
  {
    "id": "B_PENCAWANG_1",
    "name": "Pencawang Elektrik 1",
    "category": "admin",
    "zoneId": "services",
    "emoji": "⚡",
    "description": {
      "zh": "校园变电站——KMK 的电力供应设施。",
      "ms": "Pencawang elektrik kampus — infrastruktur bekalan kuasa KMK.",
      "en": "Campus electrical substation — part of KMK's power supply infrastructure."
    },
    "tags": {
      "zh": [
        "设施",
        "电力"
      ],
      "ms": [
        "utiliti",
        "elektrik"
      ],
      "en": [
        "utility",
        "electrical"
      ]
    },
    "floors": 1,
    "hours": "Kawasan larangan",
    "center": [
      -328.12,
      67.185
    ],
    "overviewPolygon": [
      [
        9.69,
        92.0
      ],
      [
        8.0,
        65.27
      ],
      [
        19.15,
        65.22
      ],
      [
        15.36,
        8.26
      ],
      [
        86.43,
        8.0
      ],
      [
        92.0,
        91.72
      ]
    ],
    "wallKey": "building:B_PENCAWANG_1"
  },
  {
    "id": "B_PENCAWANG_2",
    "name": "Pencawang Elektrik 2",
    "category": "admin",
    "zoneId": "services",
    "emoji": "⚡",
    "description": {
      "zh": "校园变电站——KMK 的电力供应设施。",
      "ms": "Pencawang elektrik kampus — infrastruktur bekalan kuasa KMK.",
      "en": "Campus electrical substation — part of KMK's power supply infrastructure."
    },
    "tags": {
      "zh": [
        "设施",
        "电力"
      ],
      "ms": [
        "utiliti",
        "elektrik"
      ],
      "en": [
        "utility",
        "electrical"
      ]
    },
    "floors": 1,
    "hours": "Kawasan larangan",
    "center": [
      151.935,
      138.08499999999998
    ],
    "overviewPolygon": [
      [
        9.07,
        92.0
      ],
      [
        8.0,
        14.16
      ],
      [
        90.98,
        8.0
      ],
      [
        92.0,
        85.84
      ]
    ],
    "wallKey": "building:B_PENCAWANG_2"
  },
  {
    "id": "B_BLOK_TUTORAN_MAKMAL",
    "name": "Blok Tutoran dan Makmal Sains",
    "category": "academic",
    "zoneId": "learning",
    "emoji": "🔬",
    "photos": [
      { "src": "assets/buildings/B_BLOK_TUTORAN_MAKMAL/cover-01.jpg", "alt": "Blok Tutoran dan Makmal Sains at Kolej Matrikulasi Kedah", "fit": "cover" }
    ],
    "description": {
      "zh": "导修与科学实验楼——设有导修室与科学实验室，中央为开放式庭院。",
      "ms": "Blok Tutoran dan Makmal Sains — bilik tutorial dan makmal sains dengan laman dalaman terbuka.",
      "en": "Blok Tutoran dan Makmal Sains — tutorial rooms and science laboratories built around an open central courtyard."
    },
    "purpose": {
      "zh": "上 tutorial 与进行实验（amali）。",
      "ms": "Kelas tutorial dan amali makmal sains.",
      "en": "Tutorial classes and science lab practicals (amali)."
    },
    "specialNotes": {
      "zh": "中午至下午时段的 tutorial 课室会比较热。",
      "ms": "Bilik tutorial boleh menjadi panas pada waktu tengah hari hingga petang.",
      "en": "Tutorial rooms can get warm around midday to afternoon."
    },
    "tags": {
      "zh": [
        "实验室",
        "导修",
        "科学",
        "学术"
      ],
      "ms": [
        "makmal",
        "tutorial",
        "sains",
        "akademik"
      ],
      "en": [
        "lab",
        "tutorial",
        "science",
        "academic"
      ]
    },
    "floors": 3,
    "hours": "Isnin–Sabtu 07:30–18:00",
    "center": [
      -165.745,
      -34.864999999999995
    ],
    "overviewPolygon": [
      [
        10.85,
        91.98
      ],
      [
        10.85,
        89.72
      ],
      [
        8.91,
        89.72
      ],
      [
        8.92,
        80.73
      ],
      [
        10.4,
        80.73
      ],
      [
        10.4,
        76.72
      ],
      [
        8.83,
        76.72
      ],
      [
        8.85,
        68.73
      ],
      [
        10.95,
        68.73
      ],
      [
        11.01,
        53.1
      ],
      [
        16.6,
        53.11
      ],
      [
        16.61,
        50.59
      ],
      [
        16.63,
        47.64
      ],
      [
        9.72,
        47.63
      ],
      [
        9.78,
        31.73
      ],
      [
        8.0,
        31.72
      ],
      [
        8.02,
        23.37
      ],
      [
        10.48,
        23.38
      ],
      [
        10.54,
        8.0
      ],
      [
        78.75,
        8.18
      ],
      [
        78.75,
        10.78
      ],
      [
        90.81,
        10.81
      ],
      [
        90.79,
        20.24
      ],
      [
        87.13,
        20.24
      ],
      [
        87.13,
        22.34
      ],
      [
        91.59,
        22.35
      ],
      [
        91.56,
        45.4
      ],
      [
        82.5,
        45.39
      ],
      [
        82.49,
        50.83
      ],
      [
        82.49,
        54.26
      ],
      [
        92.0,
        54.27
      ],
      [
        91.97,
        77.65
      ],
      [
        86.59,
        77.65
      ],
      [
        86.59,
        79.42
      ],
      [
        90.62,
        79.42
      ],
      [
        90.62,
        89.99
      ],
      [
        79.6,
        89.99
      ],
      [
        79.6,
        92.0
      ]
    ],
    "mapFootprint": [
      [
        [6.425058, 100.417558],
        [6.425037, 100.417558],
        [6.425037, 100.417542],
        [6.424951, 100.417542],
        [6.424951, 100.417555],
        [6.424913, 100.417555],
        [6.424913, 100.417542],
        [6.424838, 100.417542],
        [6.424838, 100.417559],
        [6.424690, 100.417560],
        [6.424690, 100.417606],
        [6.424666, 100.417606],
        [6.424638, 100.417606],
        [6.424638, 100.417549],
        [6.424487, 100.417550],
        [6.424487, 100.417535],
        [6.424408, 100.417535],
        [6.424408, 100.417555],
        [6.424262, 100.417556],
        [6.424264, 100.418121],
        [6.424289, 100.418121],
        [6.424289, 100.418221],
        [6.424378, 100.418220],
        [6.424378, 100.418190],
        [6.424398, 100.418190],
        [6.424398, 100.418227],
        [6.424617, 100.418227],
        [6.424616, 100.418152],
        [6.424668, 100.418152],
        [6.424701, 100.418152],
        [6.424701, 100.418230],
        [6.424922, 100.418230],
        [6.424922, 100.418186],
        [6.424939, 100.418186],
        [6.424939, 100.418219],
        [6.425039, 100.418219],
        [6.425039, 100.418128],
        [6.425058, 100.418128]
      ],
      [
        [6.424865, 100.417689],
        [6.424666, 100.417690],
        [6.424458, 100.417692],
        [6.424503, 100.417733],
        [6.424445, 100.417797],
        [6.424393, 100.417750],
        [6.424391, 100.418066],
        [6.424410, 100.418066],
        [6.424410, 100.418013],
        [6.424594, 100.418014],
        [6.424594, 100.418097],
        [6.424668, 100.418098],
        [6.424725, 100.418098],
        [6.424725, 100.418018],
        [6.424915, 100.418019],
        [6.424914, 100.418080],
        [6.424931, 100.418080],
        [6.424932, 100.417757],
        [6.424896, 100.417798],
        [6.424825, 100.417734]
      ]
    ],
    "mapTarget": { "lat": 6.424660, "lng": 100.417883 },
    "wallKey": "building:B_BLOK_TUTORAN_MAKMAL"
  },
  {
    "id": "B_BLOK_AKADEMIK_S",
    "name": "Blok Akademik Selatan",
    "category": "academic",
    "zoneId": "learning",
    "emoji": "🏫",
    "description": {
      "zh": "南学术楼——导修室、科学实验室与讲师办公室环绕中央庭院。",
      "ms": "Blok Akademik Selatan — bilik tutorial, makmal sains atau bilik pensyarah mengelilingi laman dalaman.",
      "en": "South Academic Block — tutorial rooms, science laboratories and lecturer offices arranged around a central courtyard."
    },
    "tags": {
      "zh": [
        "导修",
        "实验室",
        "学术"
      ],
      "ms": [
        "tutorial",
        "makmal",
        "akademik"
      ],
      "en": [
        "tutorial",
        "lab",
        "academic"
      ]
    },
    "floors": 3,
    "hours": "Isnin–Sabtu 07:30–18:00",
    "center": [
      -182.8,
      -293.365
    ],
    "overviewPolygon": [
      [
        12.49,
        79.53
      ],
      [
        8.28,
        79.53
      ],
      [
        8.09,
        37.3
      ],
      [
        8.0,
        18.2
      ],
      [
        14.16,
        18.13
      ],
      [
        16.93,
        15.94
      ],
      [
        21.4,
        13.51
      ],
      [
        27.73,
        11.08
      ],
      [
        34.66,
        9.22
      ],
      [
        41.14,
        8.32
      ],
      [
        48.22,
        8.0
      ],
      [
        55.78,
        8.0
      ],
      [
        61.79,
        8.89
      ],
      [
        63.78,
        9.3
      ],
      [
        68.42,
        10.27
      ],
      [
        74.89,
        12.38
      ],
      [
        79.97,
        14.97
      ],
      [
        84.44,
        17.8
      ],
      [
        87.53,
        20.55
      ],
      [
        89.84,
        23.55
      ],
      [
        91.23,
        27.28
      ],
      [
        92.0,
        71.35
      ],
      [
        90.31,
        76.77
      ],
      [
        88.84,
        78.46
      ],
      [
        85.83,
        81.87
      ],
      [
        80.75,
        85.28
      ],
      [
        71.96,
        89.0
      ],
      [
        63.18,
        90.95
      ],
      [
        54.85,
        92.0
      ],
      [
        44.68,
        92.0
      ],
      [
        37.9,
        91.19
      ],
      [
        31.57,
        89.89
      ],
      [
        25.87,
        87.87
      ],
      [
        20.42,
        85.25
      ],
      [
        16.32,
        82.6
      ]
    ],
    "wallKey": "building:B_BLOK_AKADEMIK_S"
  },
  {
    "id": "B_TENNIS_NW",
    "name": "Gelanggang Tenis",
    "category": "sports",
    "zoneId": "sports",
    "emoji": "🎾",
    "description": {
      "zh": "北侧网球场，靠近 Jalan Pelaga。",
      "ms": "Gelanggang tenis di sebelah utara, berdekatan Jalan Pelaga.",
      "en": "Tennis courts on the north side, near Jalan Pelaga."
    },
    "tags": {
      "zh": [
        "体育",
        "网球"
      ],
      "ms": [
        "sukan",
        "tenis"
      ],
      "en": [
        "sports",
        "tennis"
      ]
    },
    "floors": 1,
    "hours": "06:00–22:00",
    "center": [
      -225,
      -340
    ],
    "overviewPolygon": [
      [
        8.0,
        92.0
      ],
      [
        92.0,
        92.0
      ],
      [
        92.0,
        8.0
      ],
      [
        8.0,
        8.0
      ]
    ],
    "mapTarget": {
      "lat": 6.426440,
      "lng": 100.416925
    },
    "mapFootprint": [
      [
        [
          [6.426686, 100.416873],
          [6.426474, 100.416872],
          [6.426473, 100.416968],
          [6.426685, 100.416969]
        ]
      ],
      [
        [
          [6.426686, 100.417027],
          [6.426474, 100.417025],
          [6.426473, 100.417121],
          [6.426686, 100.417123]
        ]
      ],
      [
        [
          [6.426595, 100.416731],
          [6.426440, 100.416727],
          [6.426438, 100.416803],
          [6.426593, 100.416806]
        ]
      ],
      [
        [
          [6.426353, 100.416737],
          [6.426197, 100.416734],
          [6.426196, 100.416809],
          [6.426351, 100.416813]
        ]
      ],
      [
        [
          [6.426354, 100.416870],
          [6.426198, 100.416867],
          [6.426197, 100.416943],
          [6.426352, 100.416946]
        ]
      ],
      [
        [
          [6.426351, 100.417005],
          [6.426196, 100.417002],
          [6.426194, 100.417077],
          [6.426350, 100.417081]
        ]
      ]
    ],
    "wallKey": "building:B_TENNIS_NW"
  },
  {
    "id": "B_BASKETBALL_NW",
    "name": "Gelanggang Bola Keranjang",
    "category": "sports",
    "zoneId": "sports",
    "emoji": "??",
    "description": {
      "zh": "????",
      "ms": "Gelanggang Bola Keranjang.",
      "en": "Basketball Courts."
    },
    "tags": {
      "zh": [
        "??",
        "??"
      ],
      "ms": [
        "sukan",
        "bola keranjang"
      ],
      "en": [
        "sports",
        "basketball"
      ]
    },
    "mapTarget": {
      "lat": 6.426325,
      "lng": 100.418476
    },
    "mapFootprint": [
      [
        [
          [6.426445, 100.418257],
          [6.426448, 100.418386],
          [6.426200, 100.418391],
          [6.426197, 100.418262]
        ]
      ],
      [
        [
          [6.426448, 100.418409],
          [6.426450, 100.418538],
          [6.426202, 100.418544],
          [6.426200, 100.418415]
        ]
      ],
      [
        [
          [6.426450, 100.418560],
          [6.426453, 100.418690],
          [6.426205, 100.418695],
          [6.426202, 100.418566]
        ]
      ]
    ],
    "wallKey": "building:B_BASKETBALL_NW"
  },
  {
    "id": "B_KOOP",
    "name": "Koperasi & Pejabat Pos",
    "category": "koop",
    "zoneId": "student-life",
    "emoji": "🛒",
    "description": {
      "zh": "KMK 学生合作社，兼营书店、文具与校内邮政服务。",
      "ms": "Koperasi pelajar KMK, kedai buku, alat tulis dan pejabat pos kampus.",
      "en": "KMK's student cooperative — a shop for books and stationery, plus the on-campus post office counter."
    },
    "tags": {
      "zh": [
        "合作社",
        "邮局",
        "商店",
        "书籍"
      ],
      "ms": [
        "koperasi",
        "pos",
        "kedai",
        "buku"
      ],
      "en": [
        "co-op",
        "post office",
        "shop",
        "books"
      ]
    },
    "floors": 1,
    "hours": "Isnin–Jumaat 08:30–17:30",
    "center": [
      -185,
      145
    ],
    "overviewPolygon": [
      [
        8.0,
        92.0
      ],
      [
        92.0,
        92.0
      ],
      [
        92.0,
        8.0
      ],
      [
        8.0,
        8.0
      ]
    ],
    "wallKey": "building:B_KOOP"
  },
  {
    "id": "B_GUARD_W",
    "name": "Pondok Pengawal Barat",
    "category": "guard",
    "zoneId": "mobility",
    "emoji": "🛡️",
    "description": {
      "zh": "西侧入口警卫亭（Persiaran Kayu Manis）。",
      "ms": "Pondok pengawal pintu masuk barat (Persiaran Kayu Manis).",
      "en": "Security post at the west entrance (Persiaran Kayu Manis)."
    },
    "tags": {
      "zh": [
        "保安",
        "警卫",
        "入口"
      ],
      "ms": [
        "keselamatan",
        "pengawal",
        "masuk"
      ],
      "en": [
        "security",
        "guard",
        "entrance"
      ]
    },
    "floors": 1,
    "hours": "24 jam",
    "center": [
      -360,
      110
    ],
    "overviewPolygon": [
      [
        8.0,
        92.0
      ],
      [
        92.0,
        92.0
      ],
      [
        92.0,
        8.0
      ],
      [
        8.0,
        8.0
      ]
    ],
    "wallKey": "building:B_GUARD_W"
  },
  {
    "id": "B_GUARD_S",
    "name": "Pondok Pengawal Selatan",
    "category": "guard",
    "zoneId": "mobility",
    "emoji": "🛡️",
    "description": {
      "zh": "南侧入口警卫亭。",
      "ms": "Pondok pengawal pintu masuk selatan.",
      "en": "Security post at the south entrance."
    },
    "tags": {
      "zh": [
        "保安",
        "警卫",
        "出口"
      ],
      "ms": [
        "keselamatan",
        "pengawal",
        "keluar"
      ],
      "en": [
        "security",
        "guard",
        "exit"
      ]
    },
    "floors": 1,
    "hours": "24 jam",
    "center": [
      0,
      260
    ],
    "overviewPolygon": [
      [
        8.0,
        92.0
      ],
      [
        92.0,
        92.0
      ],
      [
        92.0,
        8.0
      ],
      [
        8.0,
        8.0
      ]
    ],
    "wallKey": "building:B_GUARD_S"
  },
  {
    "id": "B_PADANG_UTAMA",
    "name": "Padang Utama",
    "category": "sports",
    "zoneId": "sports",
    "emoji": "🏟️",
    "photos": [
      { "src": "assets/buildings/B_PADANG_UTAMA/cover-01.jpg", "alt": "Padang Utama at Kolej Matrikulasi Kedah", "fit": "cover" }
    ],
    "description": {
      "zh": "校园主操场及田径跑道。",
      "ms": "Padang utama kampus dan trek olahraga.",
      "en": "The main campus field and athletics track."
    },
    "tags": {
      "zh": [
        "体育",
        "操场",
        "田径"
      ],
      "ms": [
        "sukan",
        "padang",
        "olahraga"
      ],
      "en": [
        "sports",
        "field",
        "athletics"
      ]
    },
    "hours": "06:00–22:00",
    "mapTarget": {
      "lat": 6.426984,
      "lng": 100.418007
    },
    "mapFootprint": [
      [
        [
          [
            6.427549,
            100.417313
          ],
          [
            6.42638,
            100.417316
          ],
          [
            6.426373,
            100.417373
          ],
          [
            6.426272,
            100.417464
          ],
          [
            6.426211,
            100.417584
          ],
          [
            6.426177,
            100.417721
          ],
          [
            6.426195,
            100.417864
          ],
          [
            6.426254,
            100.417947
          ],
          [
            6.426334,
            100.418038
          ],
          [
            6.426419,
            100.418102
          ],
          [
            6.426568,
            100.418137
          ],
          [
            6.426898,
            100.418145
          ],
          [
            6.427247,
            100.418144
          ],
          [
            6.427498,
            100.418132
          ],
          [
            6.42763,
            100.418062
          ],
          [
            6.427722,
            100.417959
          ],
          [
            6.427767,
            100.417849
          ],
          [
            6.427787,
            100.41774
          ],
          [
            6.427791,
            100.417678
          ],
          [
            6.427764,
            100.417584
          ],
          [
            6.427724,
            100.417504
          ],
          [
            6.427651,
            100.417434
          ],
          [
            6.427598,
            100.417384
          ],
          [
            6.427548,
            100.41735
          ]
        ],
        [
          [
            6.427546,
            100.417453
          ],
          [
            6.427432,
            100.417403
          ],
          [
            6.427202,
            100.417402
          ],
          [
            6.426914,
            100.417399
          ],
          [
            6.426639,
            100.417404
          ],
          [
            6.426485,
            100.417407
          ],
          [
            6.426402,
            100.417464
          ],
          [
            6.426322,
            100.417544
          ],
          [
            6.426288,
            100.417625
          ],
          [
            6.426266,
            100.417764
          ],
          [
            6.426314,
            100.41789
          ],
          [
            6.42641,
            100.417979
          ],
          [
            6.426509,
            100.418048
          ],
          [
            6.426725,
            100.418067
          ],
          [
            6.427385,
            100.41807
          ],
          [
            6.42758,
            100.417992
          ],
          [
            6.427668,
            100.417871
          ],
          [
            6.427705,
            100.417775
          ],
          [
            6.4277,
            100.41767
          ],
          [
            6.427652,
            100.417568
          ],
          [
            6.427617,
            100.417517
          ],
          [
            6.427572,
            100.417472
          ]
        ]
      ],
      [
        [
          [
            6.427424,
            100.41745
          ],
          [
            6.427424,
            100.418014
          ],
          [
            6.426513,
            100.418014
          ],
          [
            6.426516,
            100.417453
          ]
        ]
      ],
      [
        [
          [
            6.427307,
            100.418207
          ],
          [
            6.426511,
            100.418212
          ],
          [
            6.426497,
            100.418701
          ],
          [
            6.427302,
            100.418698
          ]
        ]
      ]
    ],
    "wallKey": "building:B_PADANG_UTAMA"
  }
];

window.getCampusBuilding = function getCampusBuilding(id) {
  return window.CAMPUS_BUILDINGS.find(item => item.id === String(id || "")) || null;
};

window.getLocalizedBuildingText = function getLocalizedBuildingText(building, field) {
  if (!building) return "";
  const language = window.I18n?.getLanguage?.() || "en";
  const value = building[field];
  if (value && typeof value === "object" && !Array.isArray(value)) return value[language] || value.en || Object.values(value)[0] || "";
  return String(value || "");
};

window.getBuildingCanonicalName = function getBuildingCanonicalName(building) {
  const name = String(building?.name || "").trim();
  const match = name.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  return match ? match[1].trim() : name;
};

window.getLocalizedBuildingDisplayName = function getLocalizedBuildingDisplayName(building) {
  const canonicalName = window.getBuildingCanonicalName(building);
  const alias = String(window.getLocalizedBuildingText(building, "localizedAlias") || "").trim();
  return alias ? `${canonicalName} (${alias})` : canonicalName;
};
