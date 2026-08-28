/**
 * Single source of truth for the demo/prototype "notes count" shown on
 * College Community and KMK Building entry points (cards, previews, detail
 * pages, wall headers). This is a DISPLAY-ONLY override layer — it never
 * touches real note/post data, LocalStorage, IndexedDB, moderation, or
 * Admin counts. Every UI spot that shows one of these counts should read it
 * through getCollegeDisplayCount()/getBuildingDisplayCount() below instead
 * of hand-computing or hardcoding its own number, so the same entity always
 * shows the same figure no matter which page/component renders it.
 *
 * Keyed by canonical org id (see `organizations` in app-data.js) and
 * canonical building id (see `CAMPUS_BUILDINGS` in data/campus-buildings.js)
 * — never by display name/label, which can change or be localized.
 *
 * An entity with no entry here is intentionally left alone: the helpers
 * return the caller-supplied real/fallback count unchanged, never 0.
 */
window.COLLEGE_DISPLAY_COUNTS = {
  1: 203,  // KMK
  2: 48,   // KMKK
  3: 86,   // KMPP
  4: 37,   // KMPK
  5: 24,   // KMP
  6: 17,   // KMM
  7: 28,   // KMNS
  8: 10,   // KML
  9: 43,   // KMJ
  10: 15,  // KMPH
  13: 48,  // KMS
  14: 34,  // KMKT
};

window.BUILDING_DISPLAY_COUNTS = {
  B_MASJID: 83,               // Masjid Khulafa Ar Rasyidin
  B_DEWAN_MAHAWANGSA: 67,      // Dewan Mahawangsa
  B_DEWAN_KULIAH: 59,          // Kompleks Dewan Kuliah
  B_PUSTAKA: 43,               // Pustaka (Perpustakaan)
  B_LANGKASUKA: 17,            // Bangunan Langkasuka
  B_ASTAKA: 11,                // Astaka
  B_SERI_JERAI: 18,            // Bangunan Seri Jerai
  B_KEDIAMAN_PENGARAH: 21,     // Kediaman Pengarah
  B_BLOK_TUTORAN_MAKMAL: 58,   // Bilik Tutorial dan Makmal Sains
  B_SERAMBI: 35,                // Serambi Aktiviti Pelajar
};

window.getCollegeDisplayCount = function getCollegeDisplayCount(orgId, fallback) {
  const key = Number(orgId);
  return Object.prototype.hasOwnProperty.call(window.COLLEGE_DISPLAY_COUNTS, key)
    ? window.COLLEGE_DISPLAY_COUNTS[key]
    : fallback;
};

window.getBuildingDisplayCount = function getBuildingDisplayCount(buildingId, fallback) {
  const key = String(buildingId || "");
  return Object.prototype.hasOwnProperty.call(window.BUILDING_DISPLAY_COUNTS, key)
    ? window.BUILDING_DISPLAY_COUNTS[key]
    : fallback;
};
