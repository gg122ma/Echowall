/**
 * Study Notes V2 — metadata manifest builder (STUDY-V2-002).
 * Spec: study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf, sections 7-8.
 *
 * Scans one or more real course-material folders, ignores system junk,
 * parses candidate StudyResource metadata from each file's path/name, hashes
 * every file (SHA-256, for exact-duplicate detection), links Question <->
 * Answer Scheme pairs that live in the same folder/year/subject, and writes
 * the result to data/study-resource-manifest.js. Nothing is auto-published:
 * every item carries its own `reviewStatus` ("auto_parsed" | "manual_review")
 * plus `parseWarnings` explaining exactly what could not be confirmed —
 * uncertain items are flagged, never guessed into a specific category.
 *
 * This script does NOT copy any PDF/DOCX file into the repo. It only reads
 * files locally (outside the repo) to compute metadata + hash, then writes
 * plain metadata (title, code, type, hash, relative path, source label) to
 * the manifest. Actual file storage/serving is out of scope for this stage
 * (spec section 13: "PDF 文件不放 LocalStorage... 大文件应使用对象存储").
 *
 * Usage:
 *   node scripts/build-study-manifest.mjs <path>=<jurusan> [<path>=<jurusan> ...]
 *   node scripts/build-study-manifest.mjs "/Users/me/Downloads/Perakaunan=perakaunan" ...
 * If "=<jurusan>" is omitted, the folder's basename is looked up in
 * DEFAULT_JURUSAN_BY_FOLDER_NAME below (case-insensitive, trimmed).
 *
 * Idempotent: resourceId is derived from the file's relative path (stable
 * across re-runs even if content changes); fileId is derived from the
 * content hash (so identical bytes always get the same fileId even across
 * different paths — the "exact duplicate" signal).
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "data", "study-resource-manifest.js");

const DEFAULT_JURUSAN_BY_FOLDER_NAME = {
  engineering: "kejuruteraan",
  perakaunan: "perakaunan",
  science: "sains",
  sains: "sains",
  "sains komputer": "sains_komputer",
};

const IGNORE_DIR_NAMES = new Set(["__MACOSX"]);
const IGNORE_FILE_PATTERNS = [/^\._/, /^\.DS_Store$/i, /^Thumbs\.db$/i, /^desktop\.ini$/i];
const RECOGNIZED_EXTENSIONS = new Set([".pdf", ".docx", ".doc", ".pptx", ".ppt"]);

const SUBJECT_CODE_RE = /\b([A-Z]{2}\d{3})\b/g;
const COLLEGE_FOLDER_RE = /^KM[A-Za-z]/;
const SEMESTER_FOLDER_RE = /semester\s*([12])\b/i;
const CHAPTER_TOPIC_RE = /^(bab|chapter)\s*\d+/i;

function isIgnoredPath(segments, basename) {
  if (segments.some(seg => IGNORE_DIR_NAMES.has(seg))) return true;
  return IGNORE_FILE_PATTERNS.some(re => re.test(basename));
}

function detectYear(text) {
  let m = text.match(/(20\d{2})\s*[-/]\s*(20\d{2})/);
  if (m) return { yearStart: Number(m[1]), yearEnd: Number(m[2]) };
  m = text.match(/\b(\d{2})\s*-\s*(\d{2})\b/);
  if (m) {
    const expand = n => (Number(n) <= 30 ? 2000 + Number(n) : 1900 + Number(n));
    return { yearStart: expand(m[1]), yearEnd: expand(m[2]) };
  }
  m = text.match(/\b(20\d{2})\b/);
  if (m) return { yearStart: Number(m[1]), yearEnd: Number(m[1]) };
  return { yearStart: null, yearEnd: null };
}

function detectResourceType(filename, segments) {
  const haystackFile = filename.toLowerCase();
  const haystackAll = [...segments, filename].join(" | ").toLowerCase();
  const warnings = [];

  if (/skema|scheme\b|jawapan|answer/.test(haystackFile)) {
    return { resourceType: "answer_scheme", resourceSubtype: null, warnings };
  }
  // Most-specific keywords first — several of these strings ("PSPM", "PSPM
  // Past Year") are substrings of broader folder names like "Essei Klon
  // PSPM AE015" or "By Topic Collection ... PSPM Past Year", so the
  // generic bare "pspm" check MUST run after every more specific pattern
  // that could also contain the literal text "pspm", or it wins first and
  // misclassifies e.g. a klon/by-topic set as a plain PSPM paper.
  if (/lab\s*manual/.test(haystackAll)) return { resourceType: "lab", resourceSubtype: "lab_manual", warnings };
  if (/pre[\s-]*pspm/.test(haystackAll)) return { resourceType: "paper", resourceSubtype: "pre_pspm", warnings };
  if (/pra[\s-]*pspm/.test(haystackAll)) return { resourceType: "paper", resourceSubtype: "pra_pspm", warnings };
  if (/\bklon\b/.test(haystackAll)) {
    warnings.push("'klon' (cloned essay set) inferred as practice/mock — verify");
    return { resourceType: "practice", resourceSubtype: "mock", warnings };
  }
  if (/\bdiy\b|program\s*diy/.test(haystackAll)) {
    warnings.push("'DIY' set inferred as practice/revision — verify");
    return { resourceType: "practice", resourceSubtype: "revision", warnings };
  }
  if (/road\s*to\s*final/.test(haystackAll)) {
    warnings.push("'Road to Final' inferred as practice/revision — verify");
    return { resourceType: "practice", resourceSubtype: "revision", warnings };
  }
  if (/set\s*latihan/.test(haystackAll)) {
    warnings.push("'Set Latihan' inferred as practice/tutorial — verify");
    return { resourceType: "practice", resourceSubtype: "tutorial", warnings };
  }
  if (/by\s*topic/.test(haystackAll)) return { resourceType: "practice", resourceSubtype: "by_topic", warnings };
  if (/reinforcement/.test(haystackAll)) return { resourceType: "practice", resourceSubtype: "reinforcement", warnings };
  if (/\bmock\b/.test(haystackAll)) return { resourceType: "practice", resourceSubtype: "mock", warnings };
  if (/tutorial/.test(haystackAll)) return { resourceType: "practice", resourceSubtype: "tutorial", warnings };
  if (/revision/.test(haystackAll)) return { resourceType: "practice", resourceSubtype: "revision", warnings };
  if (/summary/.test(haystackAll)) return { resourceType: "summary", resourceSubtype: null, warnings };
  if (/\bpspm\b/.test(haystackAll)) return { resourceType: "paper", resourceSubtype: "pspm", warnings };
  if (/lecturer/.test(haystackAll) && /notes?/.test(haystackAll)) return { resourceType: "notes", resourceSubtype: "lecturer_notes", warnings };
  if (/notes?/.test(haystackAll)) return { resourceType: "notes", resourceSubtype: "student_notes", warnings };
  if (/soalan\s*essei|essei/.test(haystackAll)) {
    warnings.push("'essei' set inferred as practice/by_topic — verify");
    return { resourceType: "practice", resourceSubtype: "by_topic", warnings };
  }

  warnings.push("no resourceType keyword recognized in path/filename");
  return { resourceType: "other", resourceSubtype: null, warnings };
}

function detectSourceCollegeAndType(segments) {
  const collegeSegments = segments.filter(seg => COLLEGE_FOLDER_RE.test(seg.trim()));
  if (segments.some(seg => /bahagian\s*matrikulasi/i.test(seg))) {
    return { sourceCollege: null, sourceType: "official" };
  }
  if (collegeSegments.length) {
    return { sourceCollege: collegeSegments[collegeSegments.length - 1].trim(), sourceType: "college" };
  }
  return { sourceCollege: null, sourceType: "unknown" };
}

function detectSubjectCode(segments, knownCodes) {
  for (const seg of segments) {
    const matches = [...seg.matchAll(SUBJECT_CODE_RE)].map(m => m[1]);
    if (!matches.length) continue;
    const unique = [...new Set(matches)];
    if (unique.length > 1) {
      return { subjectCode: unique[0], warnings: [`compound subject folder "${seg}" — contains ${unique.join(", ")}, took first`] };
    }
    return { subjectCode: unique[0], warnings: knownCodes.has(unique[0]) ? [] : [`subject code "${unique[0]}" not in data/study-subjects.js registry`] };
  }
  return { subjectCode: null, warnings: ["no subject code found in path"] };
}

function detectSemester(segments, subjectCode) {
  for (const seg of segments) {
    const m = seg.match(SEMESTER_FOLDER_RE);
    if (m) return { semester: Number(m[1]), warnings: [] };
  }
  if (subjectCode) {
    const lastDigit = subjectCode.match(/(\d)\d(?=\D*$)/); // e.g. AA015 -> "1", AA025 -> "2"
    if (subjectCode.endsWith("5") || subjectCode.endsWith("4")) {
      const secondLastChar = subjectCode[subjectCode.length - 2];
      if (secondLastChar === "1") return { semester: 1, warnings: ["semester inferred from subject code suffix, not from a Semester folder"] };
      if (secondLastChar === "2") return { semester: 2, warnings: ["semester inferred from subject code suffix, not from a Semester folder"] };
    }
  }
  return { semester: null, warnings: ["no semester folder or inferable code suffix"] };
}

function detectTopic(segments) {
  const topicSeg = segments.find(seg => CHAPTER_TOPIC_RE.test(seg.trim()));
  return topicSeg ? topicSeg.trim() : null;
}

function shortHash(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 20);
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function* walk(dir, ignoreZipBasenames, junkCounter) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIR_NAMES.has(entry.name)) { junkCounter.count += 1; continue; }
    if (IGNORE_FILE_PATTERNS.some(re => re.test(entry.name))) { junkCounter.count += 1; continue; }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full, ignoreZipBasenames, junkCounter);
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().endsWith(".zip")) {
        const base = entry.name.slice(0, -4);
        if (ignoreZipBasenames.has(base)) continue; // already covered by an extracted sibling folder
        yield { full, isUnextractedZip: true };
        continue;
      }
      yield { full, isUnextractedZip: false };
    }
  }
}

async function collectZipBasenames(rootDir) {
  const basenames = new Set();
  const scan = async dir => {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIR_NAMES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        basenames.add(entry.name); // a real extracted folder makes its own name a "covered" basename
        await scan(full);
      }
    }
  };
  await scan(rootDir);
  return basenames;
}

async function buildManifest(rootSpecs, knownCodes) {
  const items = [];
  const stats = { scannedFiles: 0, ignoredJunk: 0, autoParsed: 0, manualReview: 0, unextractedZips: 0 };

  for (const { rootDir, jurusan, sourceBatch } of rootSpecs) {
    const zipBasenames = await collectZipBasenames(rootDir);
    const junkCounter = { count: 0 };
    for await (const { full, isUnextractedZip } of walk(rootDir, zipBasenames, junkCounter)) {
      const relPath = path.relative(rootDir, full);
      const segments = relPath.split(path.sep).slice(0, -1);
      const filename = path.basename(full);
      stats.scannedFiles += 1;

      if (isUnextractedZip) {
        stats.unextractedZips += 1;
        stats.manualReview += 1;
        items.push({
          id: `study_${shortHash(sourceBatch + "|" + relPath)}`,
          title: filename.replace(/\.zip$/i, ""),
          jurusan, semester: null, subjectCode: null,
          resourceType: "other", resourceSubtype: null, topic: null,
          yearStart: null, yearEnd: null, examSessionLabel: null,
          sourceCollege: null, sourceType: "unknown", contributorUserId: null,
          fileId: null, language: null, description: null,
          relatedResourceId: null, resourceGroupId: null,
          moderationStatus: "unverified", verificationStatus: "unverified",
          reviewStatus: "manual_review",
          parseWarnings: ["zip file not expanded — no matching extracted folder found; extract and re-scan before publishing"],
          sourceBatch, sourceRelativePath: relPath, isDuplicate: false, duplicateOfResourceId: null,
          createdAt: null, updatedAt: null,
        });
        continue;
      }

      const ext = path.extname(filename).toLowerCase();
      const warnings = [];
      if (!RECOGNIZED_EXTENSIONS.has(ext)) warnings.push(`unrecognized file extension "${ext || "(none)"}"`);

      const subjectResult = detectSubjectCode(segments, knownCodes);
      const semesterResult = detectSemester(segments, subjectResult.subjectCode);
      const typeResult = detectResourceType(filename, segments);
      const { yearStart, yearEnd } = detectYear([...segments, filename].join(" "));
      const { sourceCollege, sourceType } = detectSourceCollegeAndType(segments);
      const topic = detectTopic(segments);
      warnings.push(...subjectResult.warnings, ...semesterResult.warnings, ...typeResult.warnings);
      if (typeResult.resourceType === "paper" && !yearStart) warnings.push("paper-type resource with no detected year — verify manually");

      const isScheme = /skema|scheme\b|jawapan|answer/i.test(filename);
      const parentDirRelPath = segments.join("/");
      // Deliberately NOT keyed on resourceType/resourceSubtype: a Question
      // file (resourceType "paper") and its Answer Scheme (resourceType
      // "answer_scheme", set from the FIRST check in detectResourceType)
      // always differ in type by definition, so including type here would
      // put them in different groups and silently break every pairing —
      // caught by testing on real AE015 PSPM folders before the full run.
      // Subject + year + parent folder is what real Question/Scheme pairs
      // in this dataset actually share.
      const groupKeyRaw = `${subjectResult.subjectCode || "?"}|${yearStart || "?"}-${yearEnd || "?"}|${parentDirRelPath}`;
      const resourceGroupId = `grp_${shortHash(sourceBatch + "|" + groupKeyRaw)}`;

      const reviewStatus = warnings.length === 0 ? "auto_parsed" : "manual_review";
      if (reviewStatus === "auto_parsed") stats.autoParsed += 1; else stats.manualReview += 1;

      let fileId = null;
      try {
        const digest = await hashFile(full);
        fileId = `sha256:${digest}`;
      } catch (err) {
        warnings.push(`could not hash file: ${err.message}`);
      }

      items.push({
        id: `study_${shortHash(sourceBatch + "|" + relPath)}`,
        title: filename.replace(/\.[^.]+$/, ""),
        jurusan,
        semester: semesterResult.semester,
        subjectCode: subjectResult.subjectCode,
        resourceType: typeResult.resourceType,
        resourceSubtype: typeResult.resourceSubtype,
        topic,
        yearStart, yearEnd,
        examSessionLabel: yearStart && yearEnd ? `${yearStart}/${yearEnd}` : null,
        sourceCollege, sourceType,
        contributorUserId: null,
        fileId,
        language: /bilingual/i.test(filename) ? "mixed" : null,
        description: null,
        relatedResourceId: null, // filled in during the Question<->Scheme linking pass below
        resourceGroupId,
        moderationStatus: "unverified",
        verificationStatus: "unverified",
        reviewStatus,
        parseWarnings: warnings,
        sourceBatch,
        sourceRelativePath: relPath,
        isDuplicate: false,
        duplicateOfResourceId: null,
        isSchemeFilename: isScheme,
        createdAt: null,
        updatedAt: null,
      });
    }
    stats.ignoredJunk += junkCounter.count;
  }

  // --- Question <-> Answer Scheme linking, per resourceGroupId ---
  const byGroup = new Map();
  for (const item of items) {
    if (!item.resourceGroupId) continue;
    if (!byGroup.has(item.resourceGroupId)) byGroup.set(item.resourceGroupId, []);
    byGroup.get(item.resourceGroupId).push(item);
  }
  let linkedPairs = 0;
  for (const group of byGroup.values()) {
    const questions = group.filter(it => !it.isSchemeFilename);
    const schemes = group.filter(it => it.isSchemeFilename);
    if (questions.length === 1 && schemes.length >= 1) {
      const question = questions[0];
      question.relatedResourceId = schemes[0].id;
      for (const scheme of schemes) { scheme.relatedResourceId = question.id; linkedPairs += 1; }
    }
  }

  // --- exact-duplicate detection via content hash ---
  const firstByHash = new Map();
  let duplicateCount = 0;
  for (const item of items) {
    if (!item.fileId) continue;
    if (!firstByHash.has(item.fileId)) {
      firstByHash.set(item.fileId, item.id);
    } else {
      item.isDuplicate = true;
      item.duplicateOfResourceId = firstByHash.get(item.fileId);
      duplicateCount += 1;
    }
  }

  // isSchemeFilename was only needed for the linking pass above.
  for (const item of items) delete item.isSchemeFilename;

  return { items, stats: { ...stats, linkedQuestionSchemePairs: linkedPairs, exactDuplicates: duplicateCount } };
}

function parseRootSpecs(argv) {
  return argv.map(raw => {
    const eqIndex = raw.lastIndexOf("=");
    const rootDir = path.resolve(eqIndex === -1 ? raw : raw.slice(0, eqIndex));
    const explicitJurusan = eqIndex === -1 ? null : raw.slice(eqIndex + 1);
    const baseName = path.basename(rootDir).trim().toLowerCase();
    const jurusan = explicitJurusan || DEFAULT_JURUSAN_BY_FOLDER_NAME[baseName];
    if (!jurusan) throw new Error(`Could not infer jurusan for "${rootDir}" — pass it explicitly as "${rootDir}=<jurusan>".`);
    return { rootDir, jurusan, sourceBatch: path.basename(rootDir).trim() };
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) {
    console.error("Usage: node scripts/build-study-manifest.mjs <path>[=<jurusan>] [...]");
    process.exit(1);
  }
  const rootSpecs = parseRootSpecs(argv);
  for (const spec of rootSpecs) {
    if (!fs.existsSync(spec.rootDir)) throw new Error(`Path does not exist: ${spec.rootDir}`);
  }

  let knownCodes = new Set();
  try {
    const registrySource = await fsp.readFile(path.join(REPO_ROOT, "data", "study-subjects.js"), "utf8");
    knownCodes = new Set([...registrySource.matchAll(/code:\s*"([A-Z]{2}\d{3})"/g)].map(m => m[1]));
  } catch { /* registry not present yet — proceed without cross-check */ }

  const { items, stats } = await buildManifest(rootSpecs, knownCodes);

  const header = `/**
 * Study Notes V2 — resource metadata manifest (STUDY-V2-002, generated).
 * DO NOT hand-edit — regenerate with:
 *   node scripts/build-study-manifest.mjs ${rootSpecs.map(s => `"${s.rootDir}=${s.jurusan}"`).join(" ")}
 * Generated: ${new Date().toISOString()}
 * Source batches: ${rootSpecs.map(s => s.sourceBatch).join(", ")}
 * Scanned files: ${stats.scannedFiles} | auto_parsed: ${stats.autoParsed} | manual_review: ${stats.manualReview}
 * Unextracted zips flagged: ${stats.unextractedZips} | Question<->Scheme pairs linked: ${stats.linkedQuestionSchemePairs}
 * Exact duplicates (same SHA-256): ${stats.exactDuplicates}
 *
 * This manifest stores METADATA ONLY — no file content. \`fileId\` is a
 * content hash (sha256:...), \`sourceRelativePath\`/\`sourceBatch\` record
 * where the file was found on the machine this was generated on for
 * traceability; there is no served URL yet (Upload/Storage/Viewer wiring is
 * a later stage — see study v2/reports/REPORT_STUDY-V2-FOUNDATION-001.md).
 * Every item not fully auto-parsed carries reviewStatus:"manual_review" and
 * a non-empty parseWarnings array explaining why — see
 * services/study-resource-service.js for how these are meant to be queried.
 */
window.STUDY_RESOURCE_MANIFEST = Object.freeze([
${items.map(item => "  " + JSON.stringify(item)).join(",\n")}
]);
`;

  await fsp.writeFile(OUTPUT_PATH, header, "utf8");
  console.log(`Wrote ${items.length} items to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
  console.log(stats);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
