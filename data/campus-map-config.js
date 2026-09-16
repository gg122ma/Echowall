/**
 * Shared campus-map configuration.
 *
 * KMK keeps its existing production renderer (map.html + echomap.js), but is
 * represented in the capability registry so the Phase 1 contract is explicit:
 * KMK alone supports nested maps. Every other campus is rendered by the shared
 * engine in app-campus-map.js and differs only through data/configuration.
 */
window.CAMPUS_MAP_CAPABILITIES = Object.freeze({
  1: Object.freeze({ supportsSubmaps:true, renderer:"kmk-production" }),
  2: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  3: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  4: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  5: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  6: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  7: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  8: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  9: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  10: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  13: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
  14: Object.freeze({ supportsSubmaps:false, renderer:"shared-campus-map" }),
});

window.CAMPUS_MAP_CONFIGS = Object.freeze([
  Object.freeze({ orgId:2, lat:5.878962195225826, lng:100.50937972001351, zoom:17 }),
  Object.freeze({ orgId:3, lat:5.491023157308734, lng:100.43573844873228, zoom:16 }),
  Object.freeze({ orgId:4, lat:4.444770565668238, lng:101.1310510925541, zoom:16 }),
  Object.freeze({ orgId:5, lat:6.442928096793216, lng:100.27951130484695, zoom:17 }),
  Object.freeze({ orgId:6, lat:2.332470195150849, lng:102.08959532273354, zoom:17 }),
  Object.freeze({ orgId:7, lat:2.714313156685322, lng:102.24136579146763, zoom:16 }),
  Object.freeze({ orgId:8, lat:5.3597389329787495, lng:115.22525318324817, zoom:17 }),
  Object.freeze({ orgId:9, lat:2.285761965109349, lng:102.56338111624734, zoom:16 }),
  Object.freeze({ orgId:10, lat:3.7214564749816996, lng:103.07503936293114, zoom:16 }),
  Object.freeze({ orgId:13, lat:2.821893665409882, lng:101.44247589987678, zoom:16 }),
  Object.freeze({ orgId:14, lat:5.927561435779196, lng:102.28582615095893, zoom:16 }),
]);

window.getCampusMapCapabilities = function getCampusMapCapabilities(orgId) {
  return window.CAMPUS_MAP_CAPABILITIES[Number(orgId)] || null;
};

window.getCampusMapConfig = function getCampusMapConfig(orgId) {
  const canonicalOrgId = Number(orgId);
  const config = window.CAMPUS_MAP_CONFIGS.find(item => item.orgId === canonicalOrgId);
  if (!config) return null;
  return Object.freeze({ ...config, ...window.getCampusMapCapabilities(canonicalOrgId) });
};
