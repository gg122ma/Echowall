/**
 * Study Notes V2 — Jurusan / Semester / Subject registry (STUDY-V2-001).
 * Spec: study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf, section 4.
 *
 * INVARIANT: Study Notes is organized Jurusan -> Semester -> Subject Code.
 * There is no College/Kolej level anywhere in this file, and there must
 * never be one — College is only ever a `sourceCollege` string on an
 * individual StudyResource (see data/study-resource-manifest.js), never a
 * grouping key here. If a future change adds a college-keyed branch to
 * this registry, that is the exact mistake this module was built to avoid.
 *
 * STUDY_SUBJECTS below is built from the real folders the product owner
 * pointed at for this stage (~/Downloads/Engineering, /Perakaunan,
 * /Science — see scripts/build-study-manifest.mjs for the scan that
 * produced data/study-resource-manifest.js from the same source). Every
 * code listed here was observed as an actual subject folder; none are
 * invented. `sains_komputer` is kept in STUDY_JURUSAN per the spec's fixed
 * enum even though this data drop contained zero Computer Science-specific
 * subject folders — its subject list is intentionally empty until a real
 * batch exists, not filled with guesses.
 *
 * Subject `name` is left `null` (UI falls back to showing the code alone)
 * for any code this file's author could not confirm with reasonable
 * confidence from the real folder contents inspected during this stage —
 * see the per-subject comments below. Do not fill these in with guessed
 * official titles; get them from a real syllabus/module handbook instead.
 *
 * Must load after i18n (only for the jurusan display strings' fallback,
 * not required at parse time) and before services/study-resource-service.js.
 */
window.STUDY_JURUSAN = Object.freeze([
  { id: "sains", name: { en: "Science", ms: "Sains", zh: "理科" }, emoji: "🔬" },
  { id: "perakaunan", name: { en: "Accountancy", ms: "Perakaunan", zh: "会计" }, emoji: "📊" },
  { id: "sains_komputer", name: { en: "Computer Science", ms: "Sains Komputer", zh: "计算机科学" }, emoji: "💻" },
  { id: "kejuruteraan", name: { en: "Engineering", ms: "Kejuruteraan", zh: "工程" }, emoji: "⚙️" },
]);

// jurusan: one of STUDY_JURUSAN's ids. semester: 1 | 2.
// name: {en,ms,zh} | null — null means "not confirmed this stage, show code only."
window.STUDY_SUBJECTS = Object.freeze([
  // --- perakaunan (Perakaunan/Semester 1|2 real folders) ---
  { code: "AA015", jurusan: "perakaunan", semester: 1, name: { en: "Financial Accounting", ms: "Perakaunan Kewangan", zh: "财务会计" } },
  { code: "AE015", jurusan: "perakaunan", semester: 1, name: { en: "Economics", ms: "Ekonomi", zh: "经济学" } },
  { code: "AM015", jurusan: "perakaunan", semester: 1, name: { en: "Business Mathematics", ms: "Matematik Pengurusan", zh: "商业数学" } },
  { code: "AP015", jurusan: "perakaunan", semester: 1, name: { en: "Business Studies", ms: "Pengajian Perniagaan", zh: "商业学" } },
  { code: "AA025", jurusan: "perakaunan", semester: 2, name: { en: "Cost & Management Accounting", ms: "Perakaunan Kos & Pengurusan", zh: "成本与管理会计" } },
  { code: "AE025", jurusan: "perakaunan", semester: 2, name: { en: "Economics", ms: "Ekonomi", zh: "经济学" } },
  { code: "AM025", jurusan: "perakaunan", semester: 2, name: { en: "Business Mathematics", ms: "Matematik Pengurusan", zh: "商业数学" } },
  { code: "AP025", jurusan: "perakaunan", semester: 2, name: { en: "Business Studies", ms: "Pengajian Perniagaan", zh: "商业学" } },

  // --- sains (Science/SDS + Science/SES real folders) ---
  { code: "SM015", jurusan: "sains", semester: 1, name: { en: "Mathematics", ms: "Matematik", zh: "数学" } },
  { code: "SP015", jurusan: "sains", semester: 1, name: { en: "Physics", ms: "Fizik", zh: "物理" } },
  { code: "SC015", jurusan: "sains", semester: 1, name: { en: "Chemistry", ms: "Kimia", zh: "化学" } },
  { code: "SB015", jurusan: "sains", semester: 1, name: { en: "Biology", ms: "Biologi", zh: "生物" } },
  { code: "SK015", jurusan: "sains", semester: 1, name: null }, // observed under Science/SDS; official title not confirmed this stage
  { code: "SM025", jurusan: "sains", semester: 2, name: { en: "Mathematics", ms: "Matematik", zh: "数学" } },
  { code: "SP025", jurusan: "sains", semester: 2, name: { en: "Physics", ms: "Fizik", zh: "物理" } },
  { code: "SC025", jurusan: "sains", semester: 2, name: { en: "Chemistry", ms: "Kimia", zh: "化学" } },
  { code: "SB025", jurusan: "sains", semester: 2, name: { en: "Biology", ms: "Biologi", zh: "生物" } },
  { code: "SK025", jurusan: "sains", semester: 2, name: null },
  // Observed under Science/SES (folder structure only — official titles not
  // confirmed this stage; these are the exact DP014/DC014 codes the spec
  // document itself uses as worked examples in its section 2 table).
  { code: "DP014", jurusan: "sains", semester: 1, name: null },
  { code: "DB014", jurusan: "sains", semester: 1, name: null },
  { code: "DC014", jurusan: "sains", semester: 1, name: null },
  { code: "DK014", jurusan: "sains", semester: 1, name: null },
  { code: "DP024", jurusan: "sains", semester: 2, name: null },
  { code: "DB024", jurusan: "sains", semester: 2, name: null },
  { code: "DC024", jurusan: "sains", semester: 2, name: null },
  { code: "DK024", jurusan: "sains", semester: 2, name: null },
  { code: "DM025", jurusan: "sains", semester: 2, name: null },

  // --- kejuruteraan (Engineering/Semester 1|2 real folders) ---
  // EB015/EE015 were observed as a single combined folder
  // ("EB015 - EE015") in the real data — split into the two real codes
  // rather than kept as one invented compound code; official titles not
  // confirmed this stage.
  { code: "EB015", jurusan: "kejuruteraan", semester: 1, name: null },
  { code: "EE015", jurusan: "kejuruteraan", semester: 1, name: null },
  { code: "EA025", jurusan: "kejuruteraan", semester: 2, name: null },
  { code: "EB025", jurusan: "kejuruteraan", semester: 2, name: null },
  { code: "EE025", jurusan: "kejuruteraan", semester: 2, name: null },
  { code: "EM025", jurusan: "kejuruteraan", semester: 2, name: null },

  // sains_komputer: no real subject folders in this data drop — left
  // empty deliberately, not filled with placeholder codes.
]);
