/**
 * Campus map center/zoom prototype configuration for non-KMK colleges.
 * KMK (orgId 1) is intentionally excluded — it keeps its full Echo Map (map.html + echomap.js).
 * Display names are not duplicated here; resolve them from `organizations` (app-data.js) by orgId.
 */
window.CAMPUS_MAP_CONFIGS = Object.freeze([
  Object.freeze({ orgId: 2, lat: 5.878962195225826, lng: 100.50937972001351, zoom: 17 }), // KMKK
  Object.freeze({ orgId: 3, lat: 5.491023157308734, lng: 100.43573844873228, zoom: 16 }), // KMPP
  Object.freeze({ orgId: 4, lat: 4.444770565668238, lng: 101.1310510925541, zoom: 16 }), // KMPK
  Object.freeze({ orgId: 5, lat: 6.442928096793216, lng: 100.27951130484695, zoom: 17 }), // KMP
  Object.freeze({ orgId: 6, lat: 2.332470195150849, lng: 102.08959532273354, zoom: 17 }), // KMM
  Object.freeze({ orgId: 7, lat: 2.714313156685322, lng: 102.24136579146763, zoom: 16 }), // KMNS
  Object.freeze({ orgId: 8, lat: 5.3597389329787495, lng: 115.22525318324817, zoom: 17 }), // KML
  Object.freeze({ orgId: 9, lat: 2.285761965109349, lng: 102.56338111624734, zoom: 16 }), // KMJ
  Object.freeze({ orgId: 10, lat: 3.7214564749816996, lng: 103.07503936293114, zoom: 16 }), // KMPH
  Object.freeze({ orgId: 13, lat: 2.821893665409882, lng: 101.44247589987678, zoom: 16 }), // KMS
  Object.freeze({ orgId: 14, lat: 5.927561435779196, lng: 102.28582615095893, zoom: 16 }), // KMKT
]);

window.getCampusMapConfig = function getCampusMapConfig(orgId) {
  const canonicalOrgId = Number(orgId);
  return window.CAMPUS_MAP_CONFIGS.find(config => config.orgId === canonicalOrgId) || null;
};
