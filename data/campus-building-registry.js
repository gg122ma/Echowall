/**
 * Phase 1 top-level campus objects for non-KMK colleges.
 *
 * sourceAuthority and geometryState are internal QA fields. Public UI code
 * must not render them. Null geometry is intentional and the map engine must
 * not substitute a marker or placeholder polygon.
 */
(function initializeCampusBuildingRegistry() {
  const AUTHORITY = Object.freeze({
    OWNER:"VERIFIED_OWNER_SOURCE", OFFICIAL:"VERIFIED_OFFICIAL",
    SECONDARY:"SECONDARY_CONFIRMED", SPATIAL:"SPATIAL_CROSSCHECK_ONLY",
    UNRESOLVED:"UNRESOLVED",
  });
  const STATE = Object.freeze({
    PRODUCTION:"PRODUCTION", CLICKABLE:"PROVISIONAL_CLICKABLE",
    MARKER:"MARKER_TARGET_READY", CANDIDATE:"CANDIDATE",
    HISTORICAL:"HISTORICAL_GEOMETRY", PENDING:"PENDING",
  });
  const polygon = (osmWayId, coordinates) => Object.freeze({
    provider:"OpenStreetMap", type:"way", id:String(osmWayId),
    retrievedAt:"2026-09-16",
    coordinates:Object.freeze(coordinates.map(point => Object.freeze(point))),
  });
  const record = (campusId, buildingId, name, options = {}) => Object.freeze({
    campusId, buildingId, name, category:options.category || null,
    coordinates:options.coordinates ? Object.freeze(options.coordinates) : null,
    geometry:options.geometry || null, description:null, knowledge:null, wallEnabled:false,
    sourceAuthority:Object.freeze(options.sourceAuthority || { name:AUTHORITY.OFFICIAL, geometry:AUTHORITY.UNRESOLVED }),
    geometryState:options.geometryState || STATE.PENDING,
  });
  const supported = (campusId, buildingId, name, category, lat, lng, wayId, coordinates, nameSourceDate = null) => record(campusId, buildingId, name, {
    category, coordinates:{ lat, lng }, geometry:polygon(wayId, coordinates),
    sourceAuthority:{ name:AUTHORITY.OFFICIAL, nameSourceDate, geometry:AUTHORITY.SPATIAL }, geometryState:STATE.CLICKABLE,
  });
  const pending = (campusId, buildingId, name, geometryState = STATE.PENDING) => record(campusId, buildingId, name, { geometryState });
  const batch = (campusId, prefix, pairs, geometryState = STATE.PENDING) => pairs.map(([id, name]) => pending(campusId, `${prefix}_${id}`, name, geometryState));

  const registry = {
    2:batch(2,"KMKK_B",[
      ["PENTADBIRAN","Blok Pentadbiran"],["AKADEMIK","Blok Akademik"],["DEWAN_KULIAH","Dewan Kuliah"],
      ["PERPUSTAKAAN","Perpustakaan"],["SURAU","Surau"],["KAFETERIA","Kafeteria"],["MAKMAL_SAINS","Makmal Sains"],
      ["MAKMAL_AUTOCAD","Makmal AutoCAD"],["BENGKEL_ELEKTRIK","Bengkel Kejuruteraan Elektrik & Elektronik"],
      ["BENGKEL_AWAM","Bengkel Kejuruteraan Awam"],["BENGKEL_MEKANIKAL","Bengkel Kejuruteraan Mekanikal"],
      ["STUDIO_LUKISAN","Studio Lukisan"],["KEDIAMAN_LELAKI","Kediaman Lelaki"],["KEDIAMAN_PEREMPUAN","Kediaman Perempuan"],
      ["GARAJ_BAS","Garaj Bas"],["PONDOK_PENGAWAL","Pondok Pengawal"],
    ]),
    3:batch(3,"KMPP_B",[
      ["DATARAN_PELAJAR","Dataran Pelajar"],["SURAU_AN_NUR","Surau An-Nur"],["PERPUSTAKAAN","Perpustakaan"],
      ["DEWAN_KULIAH","Dewan Kuliah"],["DEWAN_AL_FARABI","Dewan Al-Farabi"],["SERBAGUNA","Bangunan Serbaguna"],
      ["MAKMAL_SAINS","Makmal Sains"],["MAKMAL_KOMPUTER","Makmal Komputer"],["GALERI_ASTRONOMI","Galeri Astronomi"],
      ["ASTAKA","Astaka"],["PADANG_BOLA","Padang Bola"],["KEDIAMAN","Blok Kediaman"],["KAFETERIA","Kafeteria"],
      ["PERKHIDMATAN_PELAJAR","Kawasan Perkhidmatan Pelajar dan Koperasi"],
    ]),
    4:[
      supported(4,"KMPK_B_PUSAT_SUMBER","Pusat Sumber","Library",4.44421,101.12948,"963726705",[[4.4444363,101.1293557],[4.444119,101.1297206],[4.4439813,101.1296001],[4.4442985,101.1292352],[4.4444363,101.1293557]]),
      ...batch(4,"KMPK_B",[["DEWAN_SERI_KINTA","Dewan Seri Kinta"],["MASJID_AL_MAGHFIRAH","Masjid Al-Maghfirah"],["DEWAN_KULIAH","Dewan Kuliah"],["HEP","HEP"],["BLOK_PENSYARAH","Blok Pensyarah"],["PENTADBIRAN","Pentadbiran"],["SERBAGUNA","Bangunan Serbaguna"],["PADANG","Padang"]]),
      ...batch(4,"KMPK_B",[["MAKMAL_SAINS","Makmal Sains"],["KOMPLEKS_SUKAN","Kompleks Sukan"],["DATARAN_AKADEMIK","Dataran Akademik"]],STATE.CANDIDATE),
      ...batch(4,"KMPK_R",[["SERI_ISKANDAR","Seri Iskandar"],["SERI_IPOH","Seri Ipoh"],["SERI_KERIAN","Seri Kerian"],["SERI_INTAN","Seri Intan"],["SERI_TEJA","Seri Teja"]]),
    ],
    5:[
      supported(5,"KMP_B_PUSAT_PELAJAR","Pusat Pelajar","Student centre",6.44378,100.27897,"1393737972",[[6.4438213,100.2788003],[6.4438932,100.2790913],[6.443752,100.2791409],[6.443672,100.2788325],[6.4438199,100.2787896],[6.4438213,100.2788003]]),
      supported(5,"KMP_B_DEWAN_SRI_KAYANGAN","Dewan Sri Kayangan","Hall",6.44281,100.27972,"737230759",[[6.4429635,100.2794968],[6.4429731,100.2795347],[6.4430491,100.279515],[6.443127,100.2798193],[6.4430245,100.2798458],[6.4430174,100.2798181],[6.4425744,100.2799328],[6.442494,100.2796184],[6.4429635,100.2794968]]),
      supported(5,"KMP_B_PEPERIKSAAN","Bangunan Peperiksaan","Academic building",6.44242,100.28104,"737230762",[[6.4422242,100.2808646],[6.4422186,100.2812847],[6.4423894,100.281287],[6.4423888,100.2811877],[6.4424051,100.281186],[6.442459,100.2811839],[6.4424584,100.2812253],[6.4426058,100.2812273],[6.4426114,100.2808001],[6.4424679,100.2807982],[6.4424663,100.2809171],[6.4424139,100.2809164],[6.4424146,100.2808672],[6.4423865,100.2808689],[6.4422242,100.2808646]]),
      ...batch(5,"KMP_B",[["MAKMAL_BAHASA_KOMPUTER","Makmal Bahasa & Makmal Komputer"],["ASTAKA","Astaka"],["BLOK_PENSYARAH","Blok Pensyarah"],["TASIK","Tasik KMP"],["KOMSAS","Komsas / Asrama Pelajar"],["PERPUSTAKAAN","Perpustakaan"],["MASJID_AL_FALAH","Masjid Al Falah"],["KAFETERIA","Kafeteria A & B"],["PENTADBIRAN","Blok Pentadbiran"],["MAKMAL_SAINS","Makmal Sains"]]),
    ],
    6:[
      supported(6,"KMM_B_TUTORAN_1","Blok Tutoran 1","Academic building",2.33160,102.08830,"992743843",[[2.3315339,102.088076],[2.3317688,102.088461],[2.3316741,102.0885189],[2.3314391,102.088134],[2.3315339,102.088076]],"2026-05-14"),
      supported(6,"KMM_B_TUTORAN_2","Blok Tutoran 2","Academic building",2.33177,102.08893,"992743842",[[2.3319198,102.0887038],[2.3317317,102.0891879],[2.3316527,102.0891572],[2.3316257,102.0891467],[2.3318137,102.0886625],[2.3319198,102.0887038]],"2026-05-14"),
      supported(6,"KMM_B_BSA","Blok BSA","Academic building",2.33056,102.08902,"992743848",[[2.3307549,102.0888138],[2.3307324,102.088861],[2.3306891,102.0888403],[2.3305264,102.0891815],[2.3305721,102.0892033],[2.3305278,102.089296],[2.3303738,102.0892225],[2.3306031,102.0887414],[2.3307549,102.0888138]],"2026-05-14"),
      supported(6,"KMM_B_BSB","Blok BSB","Academic building",2.33054,102.08947,"992743849",[[2.3307503,102.0895296],[2.3306866,102.0896349],[2.3303242,102.0894153],[2.3303879,102.0893099],[2.3307503,102.0895296]],"2026-05-14"),
      supported(6,"KMM_B_DEWAN_KULIAH","Dewan Kuliah","Lecture hall",2.33092,102.08918,"992743920",[[2.3309585,102.0894205],[2.3309328,102.0894047],[2.3309137,102.0893814],[2.3309031,102.0893531],[2.3309023,102.0893229],[2.3309114,102.0892941],[2.3309293,102.0892698],[2.3309542,102.0892527],[2.3309832,102.0892446],[2.3310133,102.0892464],[2.3310412,102.0892579],[2.3310639,102.0892778],[2.3310788,102.0893041],[2.3310844,102.0893337],[2.3310801,102.0893636],[2.3311484,102.089393],[2.3311698,102.0893431],[2.3311815,102.0893159],[2.3311148,102.0892872],[2.3310414,102.0891577],[2.3308967,102.0888584],[2.3308919,102.0888496],[2.3308687,102.0888623],[2.3306541,102.0889799],[2.3308201,102.0892831],[2.3306941,102.0893522],[2.330784,102.0895163],[2.3309585,102.0894205]],"2026-05-14"),
      supported(6,"KMM_B_DEWAN_UTAMA","Dewan Utama","Hall",2.33097,102.08757,"992743834",[[2.3312245,102.0874279],[2.3310672,102.0878045],[2.3310186,102.0877742],[2.3309847,102.0878288],[2.3309361,102.0878084],[2.3307168,102.0877166],[2.3308823,102.0873207],[2.3309462,102.0873475],[2.330959,102.0873168],[2.3312245,102.0874279]],"2026-05-14"),
      ...["A1","A2","A3","A4","A5","B1","B2","B3","B4","B5","C4","C5"].map(code => pending(6,`KMM_R_${code}`,`Kediaman ${code}`)),
      ...batch(6,"KMM_B",[["DEWAN_TERBUKA","Dewan Terbuka"],["PUSAT_SUMBER","Pusat Sumber"],["MAKMAL_SAINS","Makmal Sains"],["OASISWA","Oasiswa"],["SURAU","Surau"],["HEP_KAUNSELING","Pusat Khidmat Pelajar (HEP & Kaunseling)"],["ICT","Unit ICT"],["PENTADBIRAN_KEWANGAN","Pentadbiran dan Kewangan"],["KAFE_A","Kafe A"],["KAFE_B","Kafe B"],["KAFE_C","Kafe C"]]),
    ],
    7:[
      ...["A1","A2","A3","A4","A5","B1","B2","B3","B4","B5","C1","C2","C3","C4","C5"].map(code => pending(7,`KMNS_R_${code}`,`Kediaman ${code}`,STATE.HISTORICAL)),
      ...batch(7,"KMNS_B",[["DEWAN_KULIAH","Dewan Kuliah"],["DEWAN_SERBAGUNA","Dewan Serbaguna"],["SURAU","Surau"],["DATARAN_PERDANA","Dataran Perdana"],["PENTADBIRAN","Pentadbiran"],["MAKMAL_SAINS","Makmal Sains"],["PUSAT_PELAJAR","Pusat Pelajar"],["BLOK_TUTORAN","Blok Tutoran"],["BANGUNAN_SERBAGUNA","Bangunan Serbaguna"],["PADANG_ASTAKA","Padang / Astaka"],["TENIS","Tenis"],["BOLA_JARING","Bola Jaring"]],STATE.HISTORICAL),
    ],
    8:batch(8,"KML_B",[["KEDIAMAN","Kolej Kediaman"],["KAFETARIA","Kafetaria"],["DEWAN_KULIAH","Dewan Kuliah"],["MAKMAL_SAINS","Makmal Sains"],["MAKMAL_BAHASA","Makmal Bahasa"],["MAKMAL_KOMPUTER","Makmal Komputer"],["PEMBANGUNAN_PELAJAR","Pusat Pembangunan Pelajar"],["ONE_STOP_CENTRE","One Stop Centre"],["PUSAT_SUMBER","Pusat Sumber"],["DEWAN_SERBAGUNA","Dewan Serbaguna"],["KOMPLEKS_SUKAN","Kompleks Sukan"],["SURAU","Surau"],["DEWAN_MUTIARA","Dewan Mutiara"],["SURAU_AL_IRFAN","Surau Al-Irfan"],["DATARAN_KAWAD","Dataran Kawad"],["PADANG","Padang Kolej Matrikulasi Labuan"]]),
    9:batch(9,"KMJ_B",[["PUSAT_SUMBER_ZAABA","Pusat Sumber Zaaba"],["DEWAN_SERI_LEDANG","Dewan Seri Ledang"],["MASJID_AN_NUR","Masjid An-Nur"],["BILIK_PEPERIKSAAN","Bilik Peperiksaan"],["DATARAN_WAWASAN","Dataran Wawasan"],["LAMAN_KASTURI","Laman Kasturi"],["ASTAKA","Astaka"],["PADANG","Padang"],["TENIS","Tenis"],["SEPAK_TAKRAW","Sepak Takraw"],["BOLA_TAMPAR","Bola Tampar"],["SKUASY","Skuasy"],["BOLA_JARING","Bola Jaring"],["KOMPLEKS_TUTORAN","Kompleks Tutoran"],["KEDIAMAN","Kolej Kediaman"]]),
    10:[
      supported(10,"KMPH_B_DEWAN_MAT_KILAU","Dewan Mat Kilau","Hall",3.72230,103.07473,"963740531",[[3.7224796,103.0749167],[3.722428,103.074916],[3.7224275,103.0749542],[3.7223435,103.0749531],[3.722344,103.0749146],[3.7222485,103.0749133],[3.7222479,103.0749539],[3.7221635,103.0749528],[3.7221641,103.0749108],[3.7221129,103.0749096],[3.7219886,103.0747972],[3.7219886,103.0746684],[3.7221147,103.0745572],[3.7221635,103.0745574],[3.7221637,103.0745202],[3.7222106,103.0745205],[3.7222108,103.0744979],[3.7223807,103.0744988],[3.7223806,103.0745195],[3.7224268,103.0745198],[3.7224265,103.0745614],[3.7224751,103.0745617],[3.7226033,103.0746748],[3.7226028,103.0748049],[3.7224796,103.0749167]],"2026-05-18"),
      ...batch(10,"KMPH_B",[["PENTADBIRAN","Bangunan Pentadbiran"],["R_A1","Kediaman A1"],["R_A2","Kediaman A2"],["R_B1","Kediaman B1"],["R_B2","Kediaman B2"],["R_C1","Kediaman C1"],["R_C2","Kediaman C2"],["PUSAT_SUMBER","Pusat Sumber"],["DEWAN_KULIAH","Dewan Kuliah"],["MAKMAL_SAINS","Makmal Sains"],["TUTORAN","Bangunan Tutoran"],["PUSAT_PELAJAR","Student Center"],["GARAJ_BAS","Garaj Bas"],["PENYELIA_ASRAMA","Pejabat Penyelia Asrama"],["SURAU_AL_MUTTAQIN","Surau Al-Muttaqin"],["PADANG_SUKAN","Padang / Kawasan Sukan"]]),
    ],
    13:[
      ...[1,2,3,4,5].map(number => pending(13,`KMS_R_${number}`,`Blok Kediaman ${number}`)),
      ...["A","B","C"].map(code => pending(13,`KMS_B_KAFETERIA_${code}`,`Kafeteria ${code}`)),
      ...batch(13,"KMS_B",[["MASJID","Masjid"],["PUSAT_PELAJAR","Pusat Pelajar"],["DEWAN_KULIAH","Kompleks Dewan Kuliah"],["MAKMAL_SAINS","Kompleks Makmal Sains"],["PUSAT_SUMBER","Pusat Sumber"],["DEWAN_SERBAGUNA","Dewan Serbaguna"],["PADANG_BOLA","Padang Bola"],["PADANG_HOKI","Padang Hoki"],["GELANGGANG","Gelanggang Sukan"]]),
    ],
    14:batch(14,"KMKT_B",[["AKADEMIK_PENTADBIRAN","Bangunan Akademik dan Pentadbiran"],["PENGINAPAN_PELAJAR","Penginapan Pelajar"],["PENGINAPAN_PENSYARAH","Penginapan Pensyarah"],["PUSAT_SEHENTI","Pusat Sehenti Pelajar"],["KAFETERIA","Kafeteria"],["DEWAN_SERBAGUNA","Bangunan / Dewan Serbaguna"],["DATARAN_ILMU","Dataran Ilmu"],["TREK_OLAHRAGA","Trek Olahraga"],["PADANG_HOKI","Padang Hoki"],["PADANG_BOLA_RAGBI","Padang Bola / Ragbi"],["GELANGGANG_SERBAGUNA","Gelanggang Serbaguna"]]),
  };

  Object.keys(registry).forEach(key => { registry[key] = Object.freeze(registry[key]); });
  window.CAMPUS_BUILDING_AUTHORITY = AUTHORITY;
  window.CAMPUS_GEOMETRY_STATE = STATE;
  window.CAMPUS_BUILDING_REGISTRY = Object.freeze(registry);
  window.getCampusBuildingRegistry = orgId => window.CAMPUS_BUILDING_REGISTRY[Number(orgId)] || [];
  window.getCampusBuildingByOrgAndId = (orgId, buildingId) => {
    const candidateId = String(buildingId || "");
    return window.getCampusBuildingRegistry(orgId).find(building => building.buildingId === candidateId) || null;
  };
  window.getCampusMapBuildings = orgId => window.getCampusBuildingRegistry(orgId).filter(building =>
    (building.geometryState === STATE.PRODUCTION || building.geometryState === STATE.CLICKABLE) &&
    Array.isArray(building.geometry?.coordinates) && building.geometry.coordinates.length >= 4
  );
})();
