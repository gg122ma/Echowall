/**
 * Global Campus Space Configuration Schema
 * Array containing all operational single-page spaces
 */
const organizations = [
  { id: 1, name: "KMK",  type: "college", emoji: "🌾" },
  { id: 2, name: "KMKK", type: "college", emoji: "⚙️" },
  { id: 3, name: "KMPP", type: "college", emoji: "🌉" },
  { id: 4, name: "KMPK", type: "college", emoji: "⛰️" },
  { id: 5, name: "KMP",  type: "college", emoji: "🥭" },
  { id: 6, name: "KMM", type: "college", emoji: "🏫" },
  { id: 7, name: "KMNS", type: "college", emoji: "🏫" },
  { id: 8, name: "KML", type: "college", emoji: "🏫" },
  { id: 9, name: "KMJ", type: "college", emoji: "🏫" },
  { id: 10, name: "KMPH", type: "college", emoji: "🏫" },
  { id: 13, name: "KMS", type: "college", emoji: "🏫" },
  { id: 14, name: "KMKT", type: "college", emoji: "🏫" },
];

// BACKEND V2.3: single canonical source for "which college owns the
// currently-populated Building directory" (data/campus-buildings.js is
// KMK-only today — every app.building_scope_keys row is college_id=1). Any
// code that needs to send a Building post's college_id to Supabase reads
// this constant instead of hardcoding the literal 1.
const KMK_COLLEGE_ID = organizations.find(org => org.name === "KMK")?.id ?? 1;
window.KMK_COLLEGE_ID = KMK_COLLEGE_ID;

/**
 * Batches Mapping List
 * Links graduation timelines to their parent organizations
 */
const batches = [
  { id: 1,  year: 2024, label: "Batch 06", orgId: 1 },
  { id: 2,  year: 2025, label: "Batch 07", orgId: 1 },
  { id: 3,  year: 2026, label: "Batch 08", orgId: 1 },
  { id: 4,  year: 2024, label: "Batch 06", orgId: 2 },
  { id: 5,  year: 2025, label: "Batch 07", orgId: 2 },
  { id: 6,  year: 2026, label: "Batch 08", orgId: 2 },
  { id: 7,  year: 2024, label: "Batch 06", orgId: 3 },
  { id: 8,  year: 2025, label: "Batch 07", orgId: 3 },
  { id: 9,  year: 2026, label: "Batch 08", orgId: 3 },
  { id: 10, year: 2024, label: "Batch 06", orgId: 4 },
  { id: 11, year: 2025, label: "Batch 07", orgId: 4 },
  { id: 12, year: 2026, label: "Batch 08", orgId: 4 },
  { id: 13, year: 2024, label: "Batch 06", orgId: 5 },
  { id: 14, year: 2025, label: "Batch 07", orgId: 5 },
  { id: 15, year: 2026, label: "Batch 08", orgId: 5 },
];

/**
 * Academic Streams/Majors Database Schema
 * Distributes academic classifications across respective colleges
 */
const majors = [
  { id: 1, name: "Sains",                                   orgId: 1 },
  { id: 2, name: "Akaun",                                   orgId: 1 },
  { id: 3, name: "Sains Komputer",                          orgId: 1 },
  { id: 4, name: "Asas Kejuruteraan",                       orgId: 2 },
  { id: 5, name: "Kejuruteraan Awam",                       orgId: 2 },
  { id: 6, name: "Kejuruteraan Mekanikal",                  orgId: 2 },
  { id: 7, name: "Kejuruteraan Elektrik & Elektronik",     orgId: 2 },
  { id: 8, name: "Sains",                                   orgId: 3 },
  { id: 9, name: "Akaun",                                   orgId: 3 },
  { id: 10, name: "Sains",                                   orgId: 4 },
  { id: 11, name: "Akaun",                                   orgId: 4 },
  { id: 12, name: "Sains Komputer",                          orgId: 4 },
  { id: 13, name: "Sains",                                   orgId: 5 },
  { id: 14, name: "Akaun",                                   orgId: 5 },
  { id: 15, name: "Sains Komputer",                          orgId: 5 },
  { id: 16, name: "Sains",                                   orgId: 6 },
  { id: 17, name: "Akaun",                                   orgId: 6 },
  { id: 18, name: "Sains",                                   orgId: 7 },
  { id: 19, name: "Akaun",                                   orgId: 7 },
  { id: 20, name: "Sains Komputer",                          orgId: 7 },
  { id: 21, name: "Sains",                                   orgId: 8 },
  { id: 22, name: "Akaun",                                   orgId: 8 },
  { id: 23, name: "Sains Komputer",                          orgId: 8 },
  { id: 24, name: "Sains",                                   orgId: 9 },
  { id: 25, name: "Akaun",                                   orgId: 9 },
  { id: 26, name: "Sains Komputer",                          orgId: 9 },
  { id: 27, name: "Sains",                                   orgId: 10 },
  { id: 28, name: "Akaun",                                   orgId: 10 },
  { id: 37, name: "Sains",                                   orgId: 13 },
  { id: 38, name: "Akaun",                                   orgId: 13 },
  { id: 39, name: "Perakaunan Profesional",                  orgId: 13 },
  { id: 40, name: "Sains",                                   orgId: 14 },
  { id: 41, name: "Akaun",                                   orgId: 14 },
  { id: 42, name: "Sains Komputer",                          orgId: 14 },
];

/**
 * Profile-only education directory.
 * This is intentionally independent from community wall organizations and majors.
 */
const educationInstitutions = Object.freeze([
  { id: 1,  name: "Kolej Matrikulasi Kedah" },
  { id: 2,  name: "Kolej Matrikulasi Kejuruteraan Kedah" },
  { id: 3,  name: "Kolej Matrikulasi Pulau Pinang" },
  { id: 4,  name: "Kolej Matrikulasi Perak" },
  { id: 5,  name: "Kolej Matrikulasi Perlis" },
  { id: 6,  name: "Kolej Matrikulasi Melaka" },
  { id: 7,  name: "Kolej Matrikulasi Negeri Sembilan" },
  { id: 8,  name: "Kolej Matrikulasi Labuan" },
  { id: 9,  name: "Kolej Matrikulasi Johor" },
  { id: 10, name: "Kolej Matrikulasi Pahang" },
  { id: 11, name: "Kolej Matrikulasi Kejuruteraan Pahang" },
  { id: 12, name: "Kolej Matrikulasi Kejuruteraan Johor" },
  { id: 13, name: "Kolej Matrikulasi Selangor" },
  { id: 14, name: "Kolej Matrikulasi Kelantan" },
  { id: 15, name: "Kolej Matrikulasi Sarawak" },
  { id: 16, name: "Kolej MARA Kulim" },
  { id: 17, name: "Kolej MARA Kuala Nerang" },
].map(item => Object.freeze(item)));

const educationPrograms = Object.freeze([
  Object.freeze({ id: 1,  name: "Sains", legacyIds: Object.freeze([1, 8, 10, 13]) }),
  Object.freeze({ id: 2,  name: "Akaun", legacyIds: Object.freeze([2, 9, 11, 14]) }),
  Object.freeze({ id: 3,  name: "Sains Komputer", legacyIds: Object.freeze([3, 12, 15]) }),
  Object.freeze({ id: 16, name: "Kejuruteraan", legacyIds: Object.freeze([4, 5, 6, 7]) }),
]);

window.educationInstitutions = educationInstitutions;
window.educationPrograms = educationPrograms;

/**
 * Default Content Database Records
 * Provides sample records to render if localStorage is empty
 */
const SEED_NOTES = [
  { id:1,  orgId:1, batchId:1, majorId:1, category:"academic",    isAnonymous:false, authorNickname:"Alice",  shape:"square",   color:"#BFDBFE", rotation:-3, positionX:12, positionY:15, upvotes:45, downvotes:1,  score:44, userVote:null, createdAt:"2024-06-01T10:00:00Z", content:"Discrete Mathematics: do all the exercises in Chapter 3. Those question types appear repeatedly in the final exam. Dr. Ahmad's questions are almost identical to the textbook exercises." },
  { id:2,  orgId:1, batchId:1, majorId:1, category:"emotional",   isAnonymous:true,  authorNickname:null,     shape:"rect",     color:"#FEF08A", rotation: 4, positionX:35, positionY:10, upvotes:12, downvotes:2,  score:10, userVote:null, createdAt:"2024-06-02T11:00:00Z", content:"Jangan takut gagal. Saya juga pernah gugur dalam DS. Mengambil semula sebenarnya membantu saya faham dengan lebih baik. Kegagalan bukanlah akhir, ia adalah peluang untuk memulakan semula." },
  { id:3,  orgId:1, batchId:1, majorId:1, category:"koko",         isAnonymous:false, authorNickname:"Sam",    shape:"torn",     color:"#BBF7D0", rotation:-6, positionX:62, positionY: 8, upvotes:30, downvotes:0,  score:30, userVote:null, createdAt:"2024-06-03T09:00:00Z", content:"Joining the debate club truly changed me. I learned critical thinking and performed much better in interviews than my peers. Highly recommend joining!" },
  { id:4,  orgId:1, batchId:1, majorId:1, category:"campus_life", isAnonymous:true,  authorNickname:null,     shape:"square",   color:"#FED7AA", rotation: 2, positionX:78, positionY:20, upvotes:18, downvotes:1,  score:17, userVote:null, createdAt:"2024-06-04T14:00:00Z", content:"Kelas Dr. Lim mendapat gred akhir yang tinggi selagi anda hadir dan menandakan kehadiran. Gerai 3 di kantin mempunyai nasi goreng yang paling sedap." },
  { id:5,  orgId:1, batchId:1, majorId:1, category:"academic",    isAnonymous:false, authorNickname:"Ben",    shape:"circle",   color:"#93C5FD", rotation:-2, positionX:20, positionY:45, upvotes:22, downvotes:0,  score:22, userVote:null, createdAt:"2024-06-05T08:00:00Z", content:"For Database Systems, practice with PostgreSQL instead of relying only on MySQL. You'll thank yourself during your final-year internship." },
  { id:6,  orgId:1, batchId:1, majorId:1, category:"emotional",   isAnonymous:true,  authorNickname:null,     shape:"envelope", color:"#FCD34D", rotation: 5, positionX:48, positionY:38, upvotes:38, downvotes:2,  score:36, userVote:null, createdAt:"2024-06-06T16:00:00Z", content:"Surat kepada mereka yang akan datang: jangan bandingkan diri anda dengan orang lain. Setiap orang mempunyai kelajuan yang berbeza. Cari cara anda sendiri dan kekal padanya. Anda lebih capable daripada yang anda fikir." },
  { id:7,  orgId:1, batchId:1, majorId:1, category:"academic",    isAnonymous:false, authorNickname:"Mei",    shape:"rect",     color:"#DBEAFE", rotation:-4, positionX:70, positionY:50, upvotes:27, downvotes:1,  score:26, userVote:null, createdAt:"2024-06-07T10:00:00Z", content:"Algorithm class is hard at first, but once you get used to drawing diagrams to understand each step, it all clicks. I recommend Visualgo.net." },
  { id:8,  orgId:1, batchId:1, majorId:1, category:"campus_life", isAnonymous:true,  authorNickname:null,     shape:"square",   color:"#FFF7ED", rotation: 3, positionX:15, positionY:68, upvotes:15, downvotes:0,  score:15, userVote:null, createdAt:"2024-06-08T09:00:00Z", content:"Level 6 of the library has a quiet study room that is usually empty. During exam week, go early to claim a spot; it fills up by 7:30." },
  { id:9,  orgId:1, batchId:2, majorId:2, category:"academic",    isAnonymous:true,  authorNickname:null,     shape:"rect",     color:"#BFDBFE", rotation:-5, positionX:30, positionY:60, upvotes:20, downvotes:3,  score:17, userVote:null, createdAt:"2024-06-09T11:00:00Z", content:"For Software Engineering group projects, choosing the right teammates matters more than anything. Find proactive people; avoid those who only show up for photos." },
  { id:10, orgId:1, batchId:2, majorId:2, category:"koko",        isAnonymous:false, authorNickname:"Razif",  shape:"torn",     color:"#86EFAC", rotation: 6, positionX:55, positionY:72, upvotes:25, downvotes:0,  score:25, userVote:null, createdAt:"2024-06-10T14:00:00Z", content:"Saya telah menyertai hackathon dan tidak memenangi anugerah, tetapi saya bertemu dengan banyak orang yang berbakat. Pengalaman itu membantu saya mendapatkan internship pertama saya." },
  { id:11, orgId:2, batchId:4, majorId:4, category:"koko",        isAnonymous:false, authorNickname:"Zara",   shape:"square",   color:"#BBF7D0", rotation:-3, positionX:25, positionY:30, upvotes:33, downvotes:1,  score:32, userVote:null, createdAt:"2024-06-11T09:00:00Z", content:"Two years in the debate team was the best investment in university. My thinking, speaking, and stress management all improved. Just go for it, don't hesitate." },
  { id:12, orgId:2, batchId:4, majorId:5, category:"koko",        isAnonymous:true,  authorNickname:null,     shape:"circle",   color:"#4ADE80", rotation: 4, positionX:60, positionY:40, upvotes:19, downvotes:0,  score:19, userVote:null, createdAt:"2024-06-12T15:00:00Z", content:"The annual theatre performance is an unforgettable experience. Even if you don't act, backstage work is interesting. Be bold and try!" },
  { id:13, orgId:3, batchId:8, majorId:8, category:"academic",    isAnonymous:true,  authorNickname:null,     shape:"rect",     color:"#93C5FD", rotation:-2, positionX:20, positionY:25, upvotes:41, downvotes:1,  score:40, userVote:null, createdAt:"2024-06-13T08:00:00Z", content:"For anatomy, preview the material before class. Don't see those terms for the first time during the lecture. Netter's Atlas is essential. 30 minutes daily is better than cramming." },
  { id:14, orgId:3, batchId:8, majorId:8, category:"emotional",   isAnonymous:true,  authorNickname:null,     shape:"envelope", color:"#FEF08A", rotation: 5, positionX:65, positionY:35, upvotes:50, downvotes:2,  score:48, userVote:null, createdAt:"2024-06-14T10:00:00Z", content:"Medical school is stressful, but you chose this path for a reason. Take care of yourself; burnout won't help anyone." },
];


const SEED_BUILDING_NOTES = [
  { id:201, schemaVersion:2, contextType:"building", placeId:"B_PUSTAKA", category:"academic", isAnonymous:false, authorNickname:"Batch 08 Senior", authorUserId:"seed", shape:"polaroid", color:"#DBEAFE", rotation:-2, positionX:20, positionY:22, upvotes:31, downvotes:1, score:30, userVote:null, createdAt:"2026-06-01T09:00:00Z", content:"Semasa peperiksaan, datang sebelum 7 pagi. Tempat duduk berhampiran tingkap akan penuh terlebih dahulu. Makmal komputer sangat sejuk, jadi bawa jaket.", imageDataUrl:"", imageUrl:"", imageName:"", imageCropScale:1, imageFit:"cover" },
  { id:202, schemaVersion:2, contextType:"building", placeId:"B_DEWAN_KULIAH", category:"academic", isAnonymous:true, authorNickname:null, authorUserId:"seed", shape:"speech", color:"#FEF08A", rotation:3, positionX:58, positionY:18, upvotes:24, downvotes:0, score:24, userVote:null, createdAt:"2026-06-03T11:30:00Z", content:"Sebelum kuliah besar, pastikan nombor dewan. Kedua-dua pintu masuk akan sangat sesak waktu puncak.", imageDataUrl:"", imageUrl:"", imageName:"", imageCropScale:1, imageFit:"cover" },
  { id:203, schemaVersion:2, contextType:"building", placeId:"B_MASJID", category:"campus_life", isAnonymous:false, authorNickname:"Aiman", authorUserId:"seed", shape:"rounded", color:"#DCFCE7", rotation:-1, positionX:42, positionY:58, upvotes:19, downvotes:0, score:19, userVote:null, createdAt:"2026-06-05T13:15:00Z", content:"Solat Jumaat sangat ramai. Datang lebih awal dan letak kasut di tempat yang mudah diingat.", imageDataUrl:"", imageUrl:"", imageName:"", imageCropScale:1, imageFit:"cover" },
  { id:204, schemaVersion:2, contextType:"building", placeId:"B_KAFETERIA_A", category:"campus_life", isAnonymous:true, authorNickname:null, authorUserId:"seed", shape:"ticket", color:"#FED7AA", rotation:2, positionX:72, positionY:48, upvotes:16, downvotes:1, score:15, userVote:null, createdAt:"2026-06-07T07:45:00Z", content:"The lunch queue is longest after 12:30 PM. Arriving around 11:45 AM is much easier.", imageDataUrl:"", imageUrl:"", imageName:"", imageCropScale:1, imageFit:"cover" },
  { id:205, schemaVersion:2, contextType:"building", placeId:"B_ASTAKA", category:"koko", isAnonymous:false, authorNickname:"Sports Club", authorUserId:"seed", shape:"hexagon", color:"#BBF7D0", rotation:0, positionX:28, positionY:64, upvotes:14, downvotes:0, score:14, userVote:null, createdAt:"2026-06-09T17:20:00Z", content:"Around 6 PM is the best time for training; the weather is cooler, but the track edges are slippery after rain.", imageDataUrl:"", imageUrl:"", imageName:"", imageCropScale:1, imageFit:"cover" },
];

// Active State Cache
let notes = [];
let nextId = 100;
let noteStoreLoadError = null;
let noteStoreHasSuccessfulLoad = false;
const noteStoreListeners = new Set();
const DEFAULT_DEMO_SEED_PATH = "data/demo-seed-showcase.v1.json";
const DEFAULT_DEMO_SEED_WALL_KEYS = Object.freeze([
  "community:1:1",
  "community:1:2",
  "community:1:3",
  "building:B_SERI_JERAI",
  "building:B_PUSTAKA",
  "building:B_DEWAN_KULIAH",
  "building:B_LANGKASUKA",
  "building:B_BLOK_TUTORAN_MAKMAL",
  "community:2:4",
  "community:2:5",
  "community:2:6",
  "community:2:7",
  "community:3:8",
  "community:3:9",
  "community:4:10",
  "community:4:11",
  "community:4:12",
]);
let demoSeedRuntimeNotes = Object.freeze([]);
let demoSeedRuntimeStatus = "inactive";
let demoSeedRuntimeError = "";
let wallState = { contextType: "community", orgId: 0, majorId: 0, placeId: "", category: "all", sort: "hot", search: "", postType: "all" };
let selectedMajor = null;

// Palette configurations mapped to specific categories
const CATEGORY_COLORS = {
  academic:    ["#BFDBFE","#93C5FD","#60A5FA","#DBEAFE"],
  koko:        ["#BBF7D0","#86EFAC","#4ADE80","#DCFCE7"],
  campus_life: ["#FED7AA","#FDBA74","#FB923C","#FFF7ED"],
  emotional:   ["#FEF08A","#FDE68A","#FCD34D","#FEF9C3"],
};
const STICKY_NOTE_COLORS = Object.freeze([
  "#BFDBFE", "#FEF08A", "#BBF7D0", "#FBCFE8", "#FED7AA",
  "#FFF7ED", "#E9D5FF", "#CBD5E1", "#CFFAFE", "#FDE68A",
]);
const SHAPES = ["rounded","square","rect","circle","envelope","torn","speech","polaroid","ticket","hexagon"];
const POST_TYPES = Object.freeze(["discussion", "question"]);

// Canonical cross-surface contract. Community established this rule first:
// only the exact enum value "question" opts into Question; missing, legacy,
// or invalid values safely fall back to Discussion.
function normalizePostType(value) {
  return value === "question" ? "question" : "discussion";
}

window.EchoPostTypeContract = Object.freeze({
  values: POST_TYPES,
  defaultValue: "discussion",
  normalize: normalizePostType,
});

/**
 * Generates a random background hex-code based on the selected category palette
 * @param {string} cat - The selected note category
 * @returns {string} HEX color code
 */
function randomColor(cat) {
  const pool = CATEGORY_COLORS[cat] || ["#E5E7EB"];
  return pool[Math.floor(Math.random() * pool.length)];
}
function randomShape() { return SHAPES[Math.floor(Math.random() * SHAPES.length)]; }
function noteCount(orgId) { return getRuntimeNotes().filter(note => note.contextType === "community" && note.orgId === orgId && !note.isHidden).length; }

/**
 * Transforms an ISO timestamp into a user-friendly string format
 * @param {string} iso - The target timestamp string
 * @param {boolean} full - Whether to include detailed hours and minutes
 * @returns {string} Human readable formatted text
 */
function formatDate(iso, full) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  if (full) return d.toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Safely encodes untrusted text strings to prevent Cross-Site Scripting (XSS)
 * @param {string} str - The target raw text string
 * @returns {string} The HTML-safe text output
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Only allows raster image data URLs created by the local photo compressor.
 * This prevents manually edited localStorage values from becoming arbitrary URLs.
 */
function safeImageDataUrl(value) {
  const dataUrl = String(value || "");
  return /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(dataUrl) ? dataUrl : "";
}

const STORAGE_KEY = "echo-wall-notes";
const STORAGE_BACKUP_KEY = "echo-wall-notes-backup:v1";
const STORAGE_SCHEMA_KEY = "echo-wall-schema-version";
const BUILDING_SEED_KEY = "echo-wall-building-seed:v1";

function safeImageRemoteUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" ? url.href : "";
  } catch {
    return "";
  }
}

function getNoteImageSource(note) {
  return safeImageRemoteUrl(note?.imageUrl) || safeImageDataUrl(note?.imageDataUrl);
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function normalizeStoredNote(note) {
  if (!note || typeof note !== "object") return null;
  const contextType = note.contextType === "building" ? "building" : "community";
  if (contextType === "community") {
    // Community V2 (COM-V2-003): validation is scope-aware, not jurusan-only.
    // - majorId present  -> Jurusan: must resolve to a real major/org (and batch, if present) — unchanged legacy rule.
    // - majorId absent, orgId present -> College General: orgId must resolve to a real college.
    // - both absent -> Global: no cross-reference required.
    if (hasValue(note.majorId)) {
      const matchingMajor = majors.find(m => m.id === Number(note.majorId));
      const hasBatch = hasValue(note.batchId);
      const matchingBatch = hasBatch ? batches.find(b => b.id === Number(note.batchId)) : null;
      if (!matchingMajor || (hasBatch && !matchingBatch)) return null;
      if (matchingMajor.orgId !== Number(note.orgId) || (matchingBatch && matchingBatch.orgId !== Number(note.orgId))) return null;
    } else if (hasValue(note.orgId)) {
      if (!organizations.some(org => org.id === Number(note.orgId))) return null;
    }
  } else if (!window.getCampusBuilding?.(note.placeId)) {
    return null;
  }

  const normalized = {
    ...note,
    schemaVersion: contextType === "community" ? 3 : 2,
    contextType,
    id: Number(note.id),
    // Community V2 (COM-V2-003): orgId/majorId stay genuinely null for
    // College General / Global notes — never coerced to 0 (no magic values).
    orgId: contextType === "community" && hasValue(note.orgId) ? Number(note.orgId) : null,
    batchId: contextType === "community" && hasValue(note.batchId) ? Number(note.batchId) : null,
    majorId: contextType === "community" && hasValue(note.majorId) ? Number(note.majorId) : null,
    placeId: contextType === "building" ? String(note.placeId || "") : "",
    authorUserId: note.authorUserId ? String(note.authorUserId) : "",
    imageDataUrl: safeImageDataUrl(note.imageDataUrl),
    imageUrl: safeImageRemoteUrl(note.imageUrl),
    imagePublicId: note.imagePublicId ? String(note.imagePublicId).slice(0, 200) : "",
    imageName: note.imageName ? String(note.imageName).slice(0, 120) : "",
    imageCropScale: Math.max(1, Math.min(1.8, Number(note.imageCropScale || 1))),
    imageFit: note.imageFit === "contain" ? "contain" : "cover",
    positionX: Math.max(2, Math.min(86, Number(note.positionX || 10))),
    positionY: Math.max(4, Math.min(84, Number(note.positionY || 15))),
  };

  // Community V2 (COM-V2-001) compatibility backfill: never destructive,
  // never overwrites already-valid V3 fields, never touches building notes.
  if (contextType === "community") {
    const communityService = window.CommunityService;
    const existingKey = communityService?.isValidCommunityKey(normalized.communityKey) ? normalized.communityKey : "";
    const derivedKey = existingKey || communityService?.getCommunityKey("jurusan", normalized.orgId, normalized.majorId) || "";
    const parsedKey = communityService?.parseCommunityKey(derivedKey) || null;
    normalized.communityKey = derivedKey;
    normalized.communityScope = parsedKey ? parsedKey.scope : (note.communityScope ?? null);
    normalized.moderationStatus = ["published", "pending", "flagged", "rejected"].includes(note.moderationStatus)
      ? note.moderationStatus
      : "published";
    normalized.commentCount = Number.isFinite(Number(note.commentCount)) ? Number(note.commentCount) : 0;
    normalized.updatedAt = note.updatedAt || null;
  }

  normalized.postType = normalizePostType(note.postType);
  normalized.questionStatus = normalized.postType === "question"
    ? (note.questionStatus === "solved" ? "solved" : "open")
    : null;

  // Demo engagement is always recomputed from the canonical seed identity.
  // Never trust/preserve these internal display fields on an arbitrary stored
  // user note: assignDefaultSeedEngagementScores() adds them back only when
  // the complete immutable default-note signature matches.
  delete normalized.demoEngagementScore;
  delete normalized.demoEngagementOrder;

  return Number.isFinite(normalized.id) ? normalized : null;
}

function createNoteStoreCorruptionError() {
  const error = new Error('Stored notes are corrupted. Repair or remove the saved data before writing.');
  error.code = 'NOTE_STORE_CORRUPTED';
  return error;
}

const CHINESE_TO_ENGLISH_NOTE_MAP = {
  "考试周建议早上七点前来，靠窗位置最快满。电脑实验室冷气很强，记得带外套。": "During exam week, arrive by 7 AM. The window seats fill up fastest. The computer labs are very cold, so bring a jacket.",
  "大型讲座前先确认 Dewan 编号，两个入口在高峰时段会非常拥挤。": "Before a big lecture, confirm the Dewan number. Both entrances get extremely crowded during peak hours.",
  "周五祈祷时人很多，建议提早到，并把鞋子放在容易记住的位置。": "Friday prayers get very crowded. Arrive early and place your shoes somewhere easy to remember.",
  "午餐十二点半后队伍最长，十一点四十五分左右来会轻松很多。": "The lunch queue is longest after 12:30 PM. Arriving around 11:45 AM is much easier.",
  "傍晚六点前后最适合训练，天气较凉，但下雨后跑道边缘会比较滑。": "Around 6 PM is the best time for training; the weather is cooler, but the track edges are slippery after rain.",
  "离散数学一定要做第三章的习题！那些题型在期末考试重复出现。Dr. Ahmad 出的题目跟课本习题几乎一模一样。": "Discrete Mathematics: do all the exercises in Chapter 3. Those question types appear repeatedly in the final exam. Dr. Ahmad's questions are almost identical to the textbook exercises.",
  "别怕 fail，我当年也在 DS 挂了。重考一次反而搞清楚了。失败不是终点，是重新开始的机会。": "Don't be afraid to fail. I failed DS too. Retaking it actually helped me understand better. Failure is not the end; it's a chance to start again.",
  "辩论社的经历真的改变了我。学会了批判性思维，面试的时候比同学表现好很多。强烈推荐加入！": "Joining the debate club truly changed me. I learned critical thinking and performed much better in interviews than my peers. Highly recommend joining!",
  "Dr. Lim 的课期末给分都很高，只要你去上课打卡就行。食堂3号摊位的炒饭最好吃。": "Dr. Lim's classes have high final grades as long as you attend and check in. Stall 3 at the cafeteria has the best fried rice.",
  "Database Systems 推荐用 PostgreSQL 来练习，不要只靠 MySQL。大四实习的时候你会感谢自己的。": "For Database Systems, practice with PostgreSQL instead of relying only on MySQL. You'll thank yourself during your final-year internship.",
  "给后来者的一封信：不要拿自己和别人比。每个人的节奏不同。找到你的方式，然后坚持下去。你比你想象的更有能力。": "A letter to those who come later: don't compare yourself to others. Everyone's pace is different. Find your own way and stick with it. You are more capable than you think.",
  "Algorithm 课一开始很难，但坚持画图理解每个步骤之后就豁然开朗了。推荐 Visualgo.net 这个网站。": "Algorithm class is hard at first, but once you get used to drawing diagrams to understand each step, it all clicks. I recommend Visualgo.net.",
  "图书馆6楼有安静的自习室，平时没什么人。考试周记得早点去占位置，7点半就满了。": "Level 6 of the library has a quiet study room that is usually empty. During exam week, go early to claim a spot; it fills up by 7:30.",
  "Software Engineering 课的 group project 选好队友比什么都重要。找主动的人，避免只会拍照打卡的。": "For Software Engineering group projects, choosing the right teammates matters more than anything. Find proactive people; avoid those who only show up for photos.",
  "参加了编程马拉松（Hackathon），没拿奖但认识了很多厉害的人。那次经历让我拿到了第一份实习。": "I joined a hackathon and didn't win, but I met a lot of talented people. That experience helped me land my first internship.",
  "参加辩论队的两年是大学最值得的 investment。思维、表达、压力管理都提升了。去吧，不要犹豫。": "Two years in the debate team was the best investment in university. My thinking, speaking, and stress management all improved. Just go for it, don't hesitate.",
  "剧团的年度演出是人生难忘的经历。哪怕你不会演戏，幕后工作也很有意思。大胆去试！": "The annual theatre performance is an unforgettable experience. Even if you don't act, backstage work is interesting. Be bold and try!",
  "解剖课一定要提前预习，不要等上课才第一次看到那些名词。Netter's Atlas 是必备。每天30分钟，比临时抱佛脚好太多。": "For anatomy, preview the material before class. Don't see those terms for the first time during the lecture. Netter's Atlas is essential. 30 minutes daily is better than cramming.",
  "医学院压力很大，但你选择这条路是有理由的。记得照顾好自己，burnout 了帮不了任何人。": "Medical school is stressful, but you chose this path for a reason. Take care of yourself; burnout won't help anyone.",
};

function translateChineseNotesToEnglish(notes) {
  if (!Array.isArray(notes)) return notes;
  return notes.map(note => {
    if (!note || typeof note !== "object" || !note.content) return note;
    const translation = CHINESE_TO_ENGLISH_NOTE_MAP[note.content];
    if (translation) {
      return { ...note, content: translation };
    }
    return note;
  });
}

function inspectNoteStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) return null;
  if (saved === '') return createNoteStoreCorruptionError();
  try {
    return Array.isArray(JSON.parse(saved)) ? null : createNoteStoreCorruptionError();
  } catch {
    return createNoteStoreCorruptionError();
  }
}

function getRuntimeNotes() {
  return demoSeedRuntimeNotes.length ? notes.concat(demoSeedRuntimeNotes) : notes;
}

function getVisibleBuildingNotes(placeId) {
  const canonicalPlaceId = String(placeId || "");
  return getRuntimeNotes().filter(note => (
    note &&
    note.contextType === "building" &&
    note.placeId === canonicalPlaceId &&
    !note.isHidden
  ));
}

window.getVisibleBuildingNotes = getVisibleBuildingNotes;

function emitRuntimeNotesChange(change = {}) {
  if (typeof window.dispatchEvent !== "function" || typeof CustomEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("echo:runtimenoteschange", { detail:{ ...change } }));
}

function getDemoSeedRuntimeState() {
  return Object.freeze({
    enabled:true,
    status:demoSeedRuntimeStatus,
    count:demoSeedRuntimeNotes.length,
    error:demoSeedRuntimeError,
    wallKeys:DEFAULT_DEMO_SEED_WALL_KEYS,
  });
}

function validateShowcaseDemoSeedSnapshot(snapshot) {
  if (
    !snapshot
    || snapshot.snapshotId !== "demo-seed-showcase.v1"
    || snapshot.wallCount !== 14
    || snapshot.noteCount !== 588
    || !Array.isArray(snapshot.walls)
    || snapshot.walls.length !== 14
    || !Array.isArray(snapshot.notes)
    || snapshot.notes.length !== 588
  ) {
    throw new Error("The showcase demo seed snapshot must contain 14 walls and 588 notes.");
  }
  const allowedWalls = new Set(DEFAULT_DEMO_SEED_WALL_KEYS);
  const wallCounts = new Map(DEFAULT_DEMO_SEED_WALL_KEYS.map(wallKey => [wallKey, 0]));
  const keys = new Set();
  snapshot.notes.forEach((note, index) => {
    const derivedWallKey = note?.contextType === "building"
      ? `building:${String(note.placeId || "")}`
      : note?.contextType === "community"
        ? `community:${Number(note.orgId)}:${Number(note.majorId)}`
        : "";
    const wallNoteNumber = (wallCounts.get(note?.wallKey) || 0) + 1;
    if (
      !note
      || Object.prototype.hasOwnProperty.call(note, "id")
      || !allowedWalls.has(note.wallKey)
      || note.wallKey !== derivedWallKey
      || note.demoSeedKey !== `${note.seedBatchId}|${note.wallKey}|note${String(wallNoteNumber).padStart(3, "0")}`
      || note.seedGlobalOrder !== index + 1
      || note.batchId !== null
      || note.isDemoSeed !== true
      || note.imageUrl !== ""
      || note.imageDataUrl !== ""
      || note.imagePublicId !== ""
    ) {
      throw new Error(`The showcase demo seed snapshot is invalid at global order ${index + 1}.`);
    }
    keys.add(note.demoSeedKey);
    wallCounts.set(note.wallKey, wallNoteNumber);
  });
  if (keys.size !== 588 || [...wallCounts.values()].some(count => count !== 42)) {
    throw new Error("The showcase demo seed snapshot must have 588 unique keys and 42 notes per wall.");
  }
}

function validatePortableDemoSeedBundle(snapshot) {
  if (
    !snapshot
    || snapshot.snapshotId !== "demo-seed-bundle.v1"
    || snapshot.wallCount !== 17
    || snapshot.noteCount !== 696
    || !Array.isArray(snapshot.walls)
    || snapshot.walls.length !== 17
    || !Array.isArray(snapshot.notes)
    || snapshot.notes.length !== 696
  ) {
    throw new Error("The portable demo seed bundle must contain 17 walls and 696 notes.");
  }
  const keys = new Set();
  const wallCounts = new Map();
  snapshot.notes.forEach((note, index) => {
    const derivedWallKey = note?.contextType === "building"
      ? `building:${String(note.placeId || "")}`
      : note?.contextType === "community"
        ? `community:${Number(note.orgId)}:${Number(note.majorId)}`
        : "";
    if (
      !note
      || Object.prototype.hasOwnProperty.call(note, "id")
      || !DEFAULT_DEMO_SEED_WALL_KEYS.includes(note.wallKey)
      || note.wallKey !== derivedWallKey
      || !note.demoSeedKey
      || keys.has(note.demoSeedKey)
      || note.batchId !== null
      || note.isDemoSeed !== true
    ) {
      throw new Error(`The portable demo seed bundle is invalid at note ${index + 1}.`);
    }
    keys.add(note.demoSeedKey);
    wallCounts.set(note.wallKey, (wallCounts.get(note.wallKey) || 0) + 1);
  });
  if (
    wallCounts.get("community:1:1") !== 73
    || wallCounts.get("community:1:2") !== 25
    || wallCounts.get("community:1:3") !== 10
  ) {
    throw new Error("The portable demo seed bundle must contain KMK wall counts 73/25/10.");
  }
}

// COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY: minimal compatibility
// normalization for legacy seed/demo community notes (the 696-note bundle
// predates postType/communityKey/communityScope/moderationStatus -- none of
// those fields exist on its raw JSON) and for the All Student KM seed
// (data/demo-seed-all-student-km.v1.js), which already carries them
// explicitly. Never rewrites content/author/timestamp/scope -- only backfills
// the fields normal user posts (see handleFormSubmit in app-wall.js) always
// have, so seed posts are accepted by the exact same Post Detail / comment /
// filter code paths with zero seed-specific branching there. Idempotent: a
// note that already has a valid value for a field keeps it unchanged.
function normalizeDemoSeedCommunityFields(note) {
  if (!note || note.contextType !== "community") return note;
  const contract = window.EchoPostTypeContract;
  const postType = contract ? contract.normalize(note.postType) : (note.postType === "question" ? "question" : "discussion");
  const communityScope = note.communityScope || (note.orgId == null ? "global" : (note.majorId == null ? "college" : "jurusan"));
  const cs = window.CommunityService;
  const communityKey = (cs && cs.isValidCommunityKey(note.communityKey))
    ? note.communityKey
    : (cs ? cs.getCommunityKey(communityScope, note.orgId, note.majorId) : note.communityKey);
  return {
    ...note,
    postType,
    questionStatus: note.questionStatus !== undefined && note.questionStatus !== null
      ? note.questionStatus
      : (postType === "question" ? "open" : null),
    communityScope,
    communityKey,
    moderationStatus: note.moderationStatus || "published",
    commentCount: Number.isFinite(Number(note.commentCount)) ? Number(note.commentCount) : 0,
  };
}

function stableDemoColorHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Prototype-only engagement: a deterministic long-tail base score for every
// shipped seed/default post. It is deliberately derived from immutable seed
// identity, not Math.random(), timestamps at page load, or real-user data.
// The 10,000-point thresholds mirror the requested approximate distribution.
const DEMO_ENGAGEMENT_BUCKETS = Object.freeze([
  Object.freeze({ ceiling:1500, min:0, max:3 }),
  Object.freeze({ ceiling:4000, min:4, max:12 }),
  Object.freeze({ ceiling:6500, min:13, max:25 }),
  Object.freeze({ ceiling:8300, min:26, max:40 }),
  Object.freeze({ ceiling:9300, min:41, max:60 }),
  Object.freeze({ ceiling:9800, min:61, max:75 }),
  Object.freeze({ ceiling:10000, min:76, max:87 }),
]);

// These stable seed anchors guarantee the requested visual QA values are in
// the shipped demo without creating a mechanical sequence. They contribute
// only 19 of 763 runtime seeds; every other value comes from the weighted hash.
const DEMO_ENGAGEMENT_ANCHORS = Object.freeze({
  "allkm2026|global:all|note001":0,
  "allkm2026|global:all|note002":1,
  "allkm2026|global:all|note003":2,
  "allkm2026|global:all|note004":5,
  "allkm2026|global:all|note005":8,
  "allkm2026|global:all|note006":13,
  "allkm2026|global:all|note007":17,
  "allkm2026|global:all|note008":21,
  "allkm2026|global:all|note009":25,
  "kmk-community-v1|community:1:1|note001":28,
  "kmk-community-v1|community:1:1|note002":34,
  "kmk-community-v1|community:1:1|note003":39,
  "kmk-community-v1|community:1:1|note004":43,
  "kmk-community-v1|community:1:1|note005":51,
  "kmk-community-v1|community:1:1|note006":58,
  "batch02|building:B_PUSTAKA|note001":64,
  "batch02|building:B_PUSTAKA|note002":72,
  "batch02|building:B_PUSTAKA|note003":81,
  "batch02|building:B_PUSTAKA|note004":87,
});

function getWeightedDemoEngagementScore(stableKey) {
  const key = String(stableKey || "");
  if (Object.prototype.hasOwnProperty.call(DEMO_ENGAGEMENT_ANCHORS, key)) {
    return DEMO_ENGAGEMENT_ANCHORS[key];
  }
  const bucketRoll = stableDemoColorHash(`${key}|engagement-bucket`) % 10000;
  const bucket = DEMO_ENGAGEMENT_BUCKETS.find(candidate => bucketRoll < candidate.ceiling)
    || DEMO_ENGAGEMENT_BUCKETS[DEMO_ENGAGEMENT_BUCKETS.length - 1];
  const width = bucket.max - bucket.min + 1;
  return bucket.min + (stableDemoColorHash(`${key}|engagement-value`) % width);
}

function defaultSeedSignature(note) {
  const contextType = note?.contextType === "building" || note?.placeId ? "building" : "community";
  return [
    contextType,
    Number(note?.id),
    contextType === "community" ? Number(note?.orgId) : "",
    contextType === "community" ? Number(note?.majorId) : "",
    contextType === "building" ? String(note?.placeId || "") : "",
    String(note?.createdAt || ""),
    String(note?.content || ""),
  ].join("|");
}

const DEFAULT_SEED_ENGAGEMENT_KEYS = new Map(
  SEED_NOTES.concat(SEED_BUILDING_NOTES).map(note => {
    const contextType = note.contextType === "building" || note.placeId ? "building" : "community";
    const wallIdentity = contextType === "building"
      ? String(note.placeId || "")
      : `${Number(note.orgId)}:${Number(note.majorId)}`;
    return [defaultSeedSignature(note), `default|${contextType}|${wallIdentity}|${Number(note.id)}`];
  }),
);

function getDefaultSeedEngagementKey(note) {
  return DEFAULT_SEED_ENGAGEMENT_KEYS.get(defaultSeedSignature(note)) || "";
}

function getDemoEngagementWallKey(note) {
  if (note?.contextType === "building" || note?.placeId) return `building:${String(note?.placeId || "")}`;
  const wallKey = String(note?.wallKey || "");
  if (wallKey) return wallKey;
  const communityKey = String(note?.communityKey || "");
  const jurusanMatch = /^jurusan:(\d+):(\d+)$/.exec(communityKey);
  if (jurusanMatch) return `community:${jurusanMatch[1]}:${jurusanMatch[2]}`;
  if (communityKey) return communityKey;
  if (Number.isInteger(Number(note?.orgId)) && Number.isInteger(Number(note?.majorId))) {
    return `community:${Number(note.orgId)}:${Number(note.majorId)}`;
  }
  return "community:unknown";
}

// Keeps the already-balanced Sticky colors untouched while producing a
// deterministic Hot order that does not bunch identical colors together.
// Scores still originate from each stable key's weighted bucket; only the
// assignment of that deterministic score multiset inside a wall is arranged.
function buildDemoEngagementOrder(wallKey, entries) {
  const pools = new Map();
  entries.forEach(entry => {
    const color = String(entry.note.color || "unset");
    if (!pools.has(color)) pools.set(color, []);
    pools.get(color).push(entry);
  });
  pools.forEach(pool => pool.sort((left, right) => (
    stableDemoColorHash(`${left.stableKey}|engagement-order`) - stableDemoColorHash(`${right.stableKey}|engagement-order`)
    || left.sourceIndex - right.sourceIndex
  )));

  const ordered = [];
  for (let index = 0; index < entries.length; index += 1) {
    const slotsAfter = entries.length - index - 1;
    const recentColors = ordered.slice(-2).map(entry => String(entry.note.color || "unset"));
    const leavesValidRemainder = color => {
      const largestRemainder = Math.max(...[...pools.entries()].map(([candidate, pool]) => (
        pool.length - Number(candidate === color)
      )));
      return largestRemainder <= Math.ceil(slotsAfter / 2);
    };
    let colors = [...pools.entries()]
      .filter(([color, pool]) => pool.length > 0 && !recentColors.includes(color) && leavesValidRemainder(color))
      .map(([color]) => color);
    if (!colors.length) {
      const previousColor = recentColors[recentColors.length - 1];
      colors = [...pools.entries()]
        .filter(([color, pool]) => pool.length > 0 && color !== previousColor && leavesValidRemainder(color))
        .map(([color]) => color);
    }
    if (!colors.length) colors = [...pools.entries()].filter(([, pool]) => pool.length > 0).map(([color]) => color);

    const totalWeight = colors.reduce((sum, color) => sum + pools.get(color).length, 0);
    let ticket = stableDemoColorHash(`${wallKey}|engagement-color|${index}`) % totalWeight;
    let selectedColor = colors[0];
    for (const color of colors) {
      const weight = pools.get(color).length;
      if (ticket < weight) {
        selectedColor = color;
        break;
      }
      ticket -= weight;
    }
    ordered.push(pools.get(selectedColor).shift());
  }
  return ordered;
}

function assignDemoSeedEngagementScores(sourceNotes) {
  const entries = sourceNotes.map((note, sourceIndex) => ({
    note,
    sourceIndex,
    stableKey:String(note.demoSeedKey || `runtime-seed-${sourceIndex}`),
  }));
  const walls = new Map();
  entries.forEach(entry => {
    const wallKey = getDemoEngagementWallKey(entry.note);
    if (!walls.has(wallKey)) walls.set(wallKey, []);
    walls.get(wallKey).push(entry);
  });

  const assignments = new Map();
  walls.forEach((wallEntries, wallKey) => {
    const scores = wallEntries
      .map(entry => getWeightedDemoEngagementScore(entry.stableKey))
      .sort((left, right) => right - left);
    buildDemoEngagementOrder(wallKey, wallEntries).forEach((entry, order) => {
      assignments.set(entry.stableKey, { score:scores[order], order });
    });
  });

  return sourceNotes.map((note, sourceIndex) => {
    const stableKey = String(note.demoSeedKey || `runtime-seed-${sourceIndex}`);
    const assignment = assignments.get(stableKey) || { score:getWeightedDemoEngagementScore(stableKey), order:sourceIndex };
    return {
      ...note,
      demoEngagementScore:assignment.score,
      demoEngagementOrder:assignment.order,
      upvotes:assignment.score,
      downvotes:0,
      score:assignment.score,
      userVote:null,
    };
  });
}

function assignDefaultSeedEngagementScores() {
  notes.forEach(note => {
    const stableKey = getDefaultSeedEngagementKey(note);
    if (!stableKey) return;
    note.demoEngagementScore = getWeightedDemoEngagementScore(stableKey);
    note.demoEngagementOrder = stableDemoColorHash(`${stableKey}|engagement-order`);
  });
}

function getNoteEngagementScore(note) {
  const baseScore = Number(note?.demoEngagementScore);
  if (Number.isFinite(baseScore)) {
    const interactionDelta = note?.isDemoSeedRuntime === true
      ? 0
      : note?.userVote === "up"
        ? 1
        : note?.userVote === "down"
          ? -1
          : 0;
    return Math.max(0, Math.min(87, Math.trunc(baseScore) + interactionDelta));
  }
  return Number(note?.score || 0);
}

window.getNoteEngagementScore = getNoteEngagementScore;

function getDemoSeedCommunityWallKey(note) {
  if (note?.contextType !== "community") return "";
  return String(note.communityKey || note.wallKey || "");
}

function buildBalancedDemoSeedColorMap(wallKey, wallNotes) {
  const ordered = wallNotes
    .map((note, sourceIndex) => ({ note, sourceIndex }))
    .sort((left, right) => (
      Number(right.note.score || 0) - Number(left.note.score || 0)
      || left.sourceIndex - right.sourceIndex
    ));
  const baseCount = Math.floor(ordered.length / STICKY_NOTE_COLORS.length);
  const extraColors = [...STICKY_NOTE_COLORS].sort((left, right) => (
    stableDemoColorHash(`${wallKey}|extra|${left}`) - stableDemoColorHash(`${wallKey}|extra|${right}`)
    || left.localeCompare(right)
  ));
  const remaining = new Map(STICKY_NOTE_COLORS.map(color => [color, baseCount]));
  for (let index = 0; index < ordered.length % STICKY_NOTE_COLORS.length; index += 1) {
    const color = extraColors[index];
    remaining.set(color, remaining.get(color) + 1);
  }

  const assigned = [];
  const colorByKey = new Map();
  ordered.forEach(({ note }, index) => {
    const leavesValidRemainder = color => {
      const slotsAfter = ordered.length - index - 1;
      const largestRemainder = Math.max(...STICKY_NOTE_COLORS.map(candidate => (
        remaining.get(candidate) - Number(candidate === color)
      )));
      return largestRemainder <= Math.ceil(slotsAfter / 2);
    };
    const recentColors = assigned.slice(-5);
    let candidates = STICKY_NOTE_COLORS.filter(color => (
      remaining.get(color) > 0
      && leavesValidRemainder(color)
      && !recentColors.includes(color)
    ));
    if (!candidates.length) {
      const previousColor = assigned[assigned.length - 1];
      candidates = STICKY_NOTE_COLORS.filter(color => (
        remaining.get(color) > 0
        && leavesValidRemainder(color)
        && color !== previousColor
      ));
    }
    if (!candidates.length) {
      const previousColor = assigned[assigned.length - 1];
      candidates = STICKY_NOTE_COLORS.filter(color => remaining.get(color) > 0 && color !== previousColor);
    }
    if (!candidates.length) candidates = STICKY_NOTE_COLORS.filter(color => remaining.get(color) > 0);

    const totalWeight = candidates.reduce((sum, color) => sum + remaining.get(color), 0);
    let ticket = stableDemoColorHash(`${wallKey}|${note.demoSeedKey || index}|${index}`) % totalWeight;
    let selectedColor = candidates[0];
    for (const color of candidates) {
      const weight = remaining.get(color);
      if (ticket < weight) {
        selectedColor = color;
        break;
      }
      ticket -= weight;
    }
    assigned.push(selectedColor);
    remaining.set(selectedColor, remaining.get(selectedColor) - 1);
    colorByKey.set(note.demoSeedKey, selectedColor);
  });
  return colorByKey;
}

function balanceDemoSeedCommunityColors(sourceNotes) {
  const walls = new Map();
  sourceNotes.forEach(note => {
    const wallKey = getDemoSeedCommunityWallKey(note);
    if (!wallKey || !note.demoSeedKey) return;
    if (!walls.has(wallKey)) walls.set(wallKey, []);
    walls.get(wallKey).push(note);
  });

  const colorByKey = new Map();
  walls.forEach((wallNotes, wallKey) => {
    if (wallNotes.length < STICKY_NOTE_COLORS.length) return;
    buildBalancedDemoSeedColorMap(wallKey, wallNotes).forEach((color, demoSeedKey) => {
      colorByKey.set(demoSeedKey, color);
    });
  });
  return sourceNotes.map(note => (
    colorByKey.has(note.demoSeedKey) ? { ...note, color:colorByKey.get(note.demoSeedKey) } : note
  ));
}

// Merges the legacy 696-note showcase/KMK bundle with the All Student KM
// seed (a separate, independently-loaded array -- see the comment atop
// data/demo-seed-all-student-km.v1.js for why it is NOT folded into the
// bundle file itself). Both sources go through the exact same id-assignment
// loop and normalizeDemoSeedCommunityFields() call, so there is only ever
// one code path a seed note becomes a fully interactive runtime note through.
function activateDemoSeedSnapshot(snapshot) {
  const usedIds = new Set(notes.map(note => Number(note.id)).filter(Number.isFinite));
  let runtimeId = -1;
  const additionalSeedNotes = Array.isArray(window.ECHO_WALL_ALL_STUDENT_KM_SEED) ? window.ECHO_WALL_ALL_STUDENT_KM_SEED : [];
  // Color balancing runs first so this engagement-only task does not change
  // any post's established Sticky color. Engagement then uses that fixed
  // palette to produce a color-safe deterministic Hot ordering.
  const colorBalancedSourceNotes = balanceDemoSeedCommunityColors(snapshot.notes.concat(additionalSeedNotes));
  const combinedSourceNotes = assignDemoSeedEngagementScores(colorBalancedSourceNotes);
  assignDefaultSeedEngagementScores();
  const runtimeNotes = combinedSourceNotes.map(note => {
    while (usedIds.has(runtimeId)) runtimeId -= 1;
    const runtimeNote = Object.freeze({
      ...normalizeDemoSeedCommunityFields(note),
      id:runtimeId,
      isDemoSeedRuntime:true,
    });
    usedIds.add(runtimeId);
    runtimeId -= 1;
    return runtimeNote;
  });
  demoSeedRuntimeNotes = Object.freeze(runtimeNotes);
  demoSeedRuntimeStatus = "ready";
  emitRuntimeNotesChange({ type:"seed-ready", count:demoSeedRuntimeNotes.length });
}
async function loadDefaultDemoSeed() {
  if (demoSeedRuntimeStatus === "ready") return true;
  if (demoSeedRuntimeStatus === "loading") return false;
  demoSeedRuntimeStatus = "loading";
  demoSeedRuntimeError = "";
  try {
    const bundledSnapshot = window.ECHO_WALL_DEMO_SEED_BUNDLE;
    if (bundledSnapshot) {
      validatePortableDemoSeedBundle(bundledSnapshot);
      activateDemoSeedSnapshot(bundledSnapshot);
      return true;
    }    const response = await fetch(DEFAULT_DEMO_SEED_PATH, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`Demo seed request failed (${response.status}).`);
    const snapshot = await response.json();
    validateShowcaseDemoSeedSnapshot(snapshot);
    // Same id-assignment + normalization + All Student KM merge as the
    // bundled-snapshot path above -- one shared implementation, see
    // activateDemoSeedSnapshot()'s own comment.
    activateDemoSeedSnapshot(snapshot);
    return true;
  } catch (error) {
    demoSeedRuntimeNotes = Object.freeze([]);
    demoSeedRuntimeStatus = "error";
    demoSeedRuntimeError = error instanceof Error ? error.message : "Demo seed loading failed.";
    console.error("Demo seed loading failed:", error);
    return false;
  }
}

function saveNotes(options = {}) {
  const storageError = inspectNoteStorage();
  if (storageError) noteStoreLoadError = storageError;
  if (noteStoreLoadError) {
    console.warn('Note storage write blocked because the saved data is corrupted.');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    if (options.notify !== false) emitRuntimeNotesChange({ type:"notes-saved" });
    return true;
  } catch (e) {
    console.warn("localStorage save failed:", e);
    return false;
  }
}

function loadNotes(options = {}) {
  const readOnly = options.readOnly === true;
  let source = null;
  let loadedFromStorage = false;
  let originalSavedValue = "";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      if (saved === '') throw createNoteStoreCorruptionError();
      originalSavedValue = saved;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new TypeError("Saved notes must be an array.");
      source = parsed;
      loadedFromStorage = true;
    }
  } catch (e) {
    noteStoreLoadError = createNoteStoreCorruptionError();
    if (!noteStoreHasSuccessfulLoad) notes = [];
    return false;
    console.warn("localStorage load failed:", e);
  }

  // Migrate Chinese notes to English
  if (loadedFromStorage && source) {
    const chinesePattern = /[\u4e00-\u9fff]/;
    let needsMigration = false;
    source.forEach(note => {
      if (note.content && chinesePattern.test(note.content)) {
        needsMigration = true;
      }
    });
    if (needsMigration) {
      source = translateChineseNotesToEnglish(source);
      if (!readOnly) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(source)); } catch {}
      }
    }
  }

  if (!readOnly && loadedFromStorage && localStorage.getItem(STORAGE_SCHEMA_KEY) !== "2" && !localStorage.getItem(STORAGE_BACKUP_KEY)) {
    try { localStorage.setItem(STORAGE_BACKUP_KEY, originalSavedValue); } catch (error) { console.warn("Note backup could not be created:", error); }
  }

  if (!source) {
    source = [...JSON.parse(JSON.stringify(SEED_NOTES)), ...JSON.parse(JSON.stringify(SEED_BUILDING_NOTES))];
    if (!readOnly) {
      try { localStorage.setItem(BUILDING_SEED_KEY, "true"); } catch {}
    }
  }

  notes = source.map(normalizeStoredNote).filter(Boolean);

  const buildingSeedApplied = localStorage.getItem(BUILDING_SEED_KEY) === "true";
  if (loadedFromStorage && !buildingSeedApplied) {
    const buildingSeeds = JSON.parse(JSON.stringify(SEED_BUILDING_NOTES)).map(normalizeStoredNote).filter(Boolean);
    const existingIds = new Set(notes.map(note => Number(note.id)));
    notes.push(...buildingSeeds.filter(note => !existingIds.has(Number(note.id))));
    if (!readOnly) {
      try { localStorage.setItem(BUILDING_SEED_KEY, "true"); } catch {}
    }
  }

  // The complete default-note signature protects later real user posts from
  // receiving prototype engagement. Recompute instead of trusting storage so
  // refreshes, browser restarts, and prior schema versions stay identical.
  assignDefaultSeedEngagementScores();

  const ids = notes.map(n => Number(n.id)).filter(Number.isFinite);
  nextId = (ids.length ? Math.max(...ids) : 99) + 1;
  noteStoreLoadError = null;
  noteStoreHasSuccessfulLoad = true;
  if (!readOnly) {
    try { localStorage.setItem(STORAGE_SCHEMA_KEY, "2"); } catch {}
    saveNotes({ notify:false });
  }
  console.info("Echo Wall note migration", {
    schemaVersion: 2,
    total: notes.length,
    community: notes.filter(note => note.contextType === "community").length,
    building: notes.filter(note => note.contextType === "building").length,
    backupCreated: Boolean(localStorage.getItem(STORAGE_BACKUP_KEY)),
  });
  return true;
}

function requireWritableNoteStore() {
  if (!loadNotes() || noteStoreLoadError) throw createNoteStoreCorruptionError();
}

function emitNoteStoreChange(change) {
  const snapshot = JSON.parse(JSON.stringify(change || { type:'change' }));
  noteStoreListeners.forEach(listener => {
    try { listener(JSON.parse(JSON.stringify(snapshot))); }
    catch { console.warn('A note store listener failed.'); }
  });
}

function createPlaceNote(input = {}, options = {}) {
  requireWritableNoteStore();
  const placeId = String(input.placeId || "");
  const building = window.getCampusBuilding?.(placeId);
  const wallKey = String(input.wallKey || "");
  const content = String(input.content || "").trim();
  const category = String(input.category || "");
  const shape = String(input.shape || "");
  const requestedColor = String(input.color || "");
  const authorUserId = String(input.authorUserId || "");
  const isAnonymous = input.isAnonymous !== false;
  const authorNickname = isAnonymous ? null : String(input.authorNickname || "").trim();
  if (!building || wallKey !== building.wallKey || wallKey !== "building:" + placeId) throw new Error("This building wall is unavailable.");
  if (!content || content.length > 500) throw new Error("The note must contain between 1 and 500 characters.");
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, category)) throw new Error("Choose a valid category.");
  if (!SHAPES.includes(shape)) throw new Error("Choose a valid note shape.");
  if (!authorUserId) throw new Error("Sign in before publishing.");
  if (!isAnonymous && !authorNickname) throw new Error("Your account needs a display name before publishing.");

  const id = nextId++;
  const newNote = {
    id, schemaVersion:2, contextType:"building", orgId:null, batchId:null, majorId:null,
    placeId, wallKey, postType:normalizePostType(input.postType),
    questionStatus:normalizePostType(input.postType) === "question" ? "open" : null,
    category, isAnonymous, authorNickname, authorUserId, shape,
    color:/^#[0-9a-f]{6}$/i.test(requestedColor) ? requestedColor : randomColor(category), rotation:Math.floor(Math.random() * 5) - 2,
    upvotes:0, downvotes:0, score:0, userVote:null, createdAt:new Date().toISOString(), content,
    imageDataUrl:safeImageDataUrl(input.imageDataUrl), imageUrl:safeImageRemoteUrl(input.imageUrl),
    imagePublicId:String(input.imagePublicId || "").slice(0,200), imageName:String(input.imageName || "").slice(0,120),
    imageCropScale:Math.max(1,Math.min(1.8,Number(input.imageCropScale || 1))), imageFit:input.imageFit === "contain" ? "contain" : "cover",
  };
  notes.unshift(newNote);
  if (!saveNotes()) {
    notes = notes.filter(note => Number(note.id) !== id);
    const remainingIds = notes.map(note => Number(note.id)).filter(Number.isFinite);
    nextId = (remainingIds.length ? Math.max(...remainingIds) : 99) + 1;
    throw new Error("Browser storage is full.");
  }
  try {
    if (typeof options.afterSave === "function") options.afterSave({ ...newNote });
  } catch (error) {
    try {
      requireWritableNoteStore();
      const rollbackIndex = notes.findIndex(note => note.contextType === 'building' && Number(note.id) === id);
      if (rollbackIndex >= 0) {
        notes.splice(rollbackIndex, 1);
        if (!saveNotes()) throw new Error('The created note could not be rolled back.');
      }
    } catch (rollbackError) {
      const combined = new Error('Note creation failed and its rollback did not complete.');
      combined.cause = error;
      combined.rollbackError = rollbackError;
      throw combined;
    }
    throw error;
  }
  if (options.notify !== false) emitNoteStoreChange({ type:'create', noteId:id });
  return { ...newNote };
}

function listBuildingNotes() {
  if (!loadNotes() || noteStoreLoadError) throw createNoteStoreCorruptionError();
  return notes.filter(note => note.contextType === 'building').map(note => JSON.parse(JSON.stringify(note)));
}

function setPlaceNoteHidden(noteId, hidden, options = {}) {
  requireWritableNoteStore();
  const target = notes.find(note => note.contextType === 'building' && String(note.id) === String(noteId));
  if (!target) throw new Error('Building note was not found.');
  const previous = Boolean(target.isHidden);
  target.isHidden = Boolean(hidden);
  if (!saveNotes()) { target.isHidden = previous; throw new Error('Browser storage is full.'); }
  if (options.notify !== false) emitNoteStoreChange({ type:'visibility', noteId:target.id, hidden:target.isHidden });
  return JSON.parse(JSON.stringify(target));
}

function deletePlaceNote(noteId, options = {}) {
  requireWritableNoteStore();
  const index = notes.findIndex(note => note.contextType === 'building' && String(note.id) === String(noteId));
  if (index < 0) throw new Error('Building note was not found.');
  const removed = notes[index];
  notes.splice(index, 1);
  if (!saveNotes()) { notes.splice(index, 0, removed); throw new Error('Browser storage is full.'); }
  if (options.notify !== false) emitNoteStoreChange({ type:'delete', noteId:removed.id });
  return { note:JSON.parse(JSON.stringify(removed)), index };
}

function restorePlaceNote(snapshot, options = {}) {
  requireWritableNoteStore();
  const hasRollbackSnapshot = snapshot && typeof snapshot === 'object' && snapshot.note;
  const restored = normalizeStoredNote(hasRollbackSnapshot ? snapshot.note : snapshot);
  if (!restored || restored.contextType !== 'building') throw new Error('Building note snapshot is invalid.');
  if (notes.some(note => String(note.id) === String(restored.id))) throw new Error('Building note already exists.');
  const requestedIndex = hasRollbackSnapshot ? Number(snapshot.index) : 0;
  const restoreIndex = Number.isFinite(requestedIndex) ? Math.max(0, Math.min(notes.length, Math.trunc(requestedIndex))) : 0;
  notes.splice(restoreIndex, 0, restored);
  if (!saveNotes()) { notes = notes.filter(note => note !== restored); throw new Error('Browser storage is full.'); }
  nextId = Math.max(nextId, Number(restored.id) + 1);
  if (options.notify !== false) emitNoteStoreChange({ type:'restore', noteId:restored.id });
  return JSON.parse(JSON.stringify(restored));
}

function subscribeToPlaceNotes(listener) {
  if (typeof listener !== 'function') throw new Error('Note subscriber must be a function.');
  noteStoreListeners.add(listener);
  return () => noteStoreListeners.delete(listener);
}

window.EchoNoteStore = Object.freeze({
  createPlaceNote,
  listBuildingNotes,
  setPlaceNoteHidden,
  deletePlaceNote,
  restorePlaceNote,
  subscribe:subscribeToPlaceNotes,
  categories:Object.freeze(Object.keys(CATEGORY_COLORS)),
  shapes:Object.freeze([...SHAPES]),
  postTypes:POST_TYPES,
});

window.EchoDemoSeedRuntime = Object.freeze({
  getState:getDemoSeedRuntimeState,
});
