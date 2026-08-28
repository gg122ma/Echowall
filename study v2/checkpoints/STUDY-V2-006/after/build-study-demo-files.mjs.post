/**
 * Study Notes V2 — Competition Demo file copier (STUDY-V2-006).
 * Spec: study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf, section 13
 * ("可保留静态 manifest 作为 competition demo fallback").
 *
 * This does NOT re-scan/re-parse anything build-study-manifest.mjs already
 * did (metadata/hashing logic there is untouched). It is a second, additive
 * pass over the ALREADY-GENERATED data/study-resource-manifest.js:
 *
 *   1. For every publishable resource whose subjectCode is in
 *      DEMO_SUBJECT_CODES, copy its real physical file (resolved via the
 *      existing sourceBatch + sourceRelativePath fields, which point at the
 *      real course-material folders on this machine) into
 *      assets/study-files/<resourceId>.<ext> — the resourceId is used as
 *      the filename specifically so the public URL never encodes the
 *      original title, folder structure, or local absolute path.
 *   2. Re-hashes the COPY and asserts it matches the manifest's own
 *      recorded fileId (sha256:...) before marking it available — a
 *      mismatch is a hard error, never silently accepted.
 *   3. Rewrites data/study-resource-manifest.js, adding two new fields to
 *      EVERY item: `fileUrl` (repo-relative path under assets/study-files/,
 *      or null) and `demoAvailable` (true only for items actually copied
 *      this run). All other existing fields/values are preserved exactly.
 *
 * Why a curated subject list and not all 2284 publishable resources: the
 * full publishable set is ~2.52GB (measured directly against real files on
 * this machine before writing this script) — safely under any single-file
 * limit, but large for a static competition build's working tree. The
 * chosen subjects are FULL (every publishable resource in each subject has
 * a real file — no subject in this set silently has some resources missing
 * their file while looking otherwise complete) and together cover every
 * resourceType/resourceSubtype actually present in the real manifest
 * (lecturer_notes does not exist anywhere in the real data — this is a true
 * fact about the source material, not something this script can produce).
 *
 * Usage:
 *   node scripts/build-study-demo-files.mjs "<path>=<sourceBatch>" [...]
 *   node scripts/build-study-demo-files.mjs "/Users/me/Downloads/Engineering=Engineering" "/Users/me/Downloads/Perakaunan=Perakaunan" "/Users/me/Downloads/Science =Science"
 * <sourceBatch> must exactly match the `sourceBatch` value already recorded
 * on manifest items from that folder (see each item's own field / the
 * manifest header's "Source batches:" line).
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const MANIFEST_PATH = path.join(REPO_ROOT, "data", "study-resource-manifest.js");
const DEMO_FILES_DIR = path.join(REPO_ROOT, "assets", "study-files");

// Chosen to give FULL coverage (every publishable resource in each subject
// gets a real file) across all 3 jurusan that currently have real data
// (sains_komputer still has zero real subjects — nothing to include there),
// and across every resourceType/resourceSubtype present in the real
// dataset: notes(student), paper(pspm/pre_pspm/pra_pspm), answer_scheme,
// practice(by_topic/revision/reinforcement/mock), summary, lab(lab_manual).
const DEMO_SUBJECT_CODES = new Set([
  "EE025", "EM025", "EA025", // kejuruteraan — all 3 real Engineering subjects (~4.8MB total)
  "AA015", "AP015",          // perakaunan — the two subjects prior stages' reports/tests already used
  "SM015", "DP024", "DC014", "DP014", // sains — SM015 (heavily tested already) + notes/summary/lab_manual coverage
]);

function isPublishable(resource) {
  return resource.reviewStatus === "auto_parsed" && resource.moderationStatus !== "rejected" && !resource.isDuplicate;
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

function parseRoots(argv) {
  const roots = {};
  for (const raw of argv) {
    const eqIndex = raw.lastIndexOf("=");
    if (eqIndex === -1) throw new Error(`Expected "<path>=<sourceBatch>", got "${raw}"`);
    const rootDir = path.resolve(raw.slice(0, eqIndex));
    const sourceBatch = raw.slice(eqIndex + 1);
    roots[sourceBatch] = rootDir;
  }
  return roots;
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) {
    console.error('Usage: node scripts/build-study-demo-files.mjs "<path>=<sourceBatch>" [...]');
    process.exit(1);
  }
  const roots = parseRoots(argv);

  const manifestSource = await fsp.readFile(MANIFEST_PATH, "utf8");
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(manifestSource, sandbox, { filename: MANIFEST_PATH }); // populates sandbox.STUDY_RESOURCE_MANIFEST — same file, no re-parsing of source folders
  const items = sandbox.STUDY_RESOURCE_MANIFEST;
  if (!Array.isArray(items)) throw new Error("Could not load STUDY_RESOURCE_MANIFEST from " + MANIFEST_PATH);

  await fsp.mkdir(DEMO_FILES_DIR, { recursive: true });

  const stats = { copied: 0, hashMismatch: 0, sourceMissing: 0, notInDemoSet: 0, notPublishable: 0 };
  const hashMismatches = [];
  const sourceMissing = [];

  for (const item of items) {
    if (!isPublishable(item)) { item.fileUrl = null; item.demoAvailable = false; stats.notPublishable += 1; continue; }
    if (!DEMO_SUBJECT_CODES.has(item.subjectCode)) { item.fileUrl = null; item.demoAvailable = false; stats.notInDemoSet += 1; continue; }

    const root = roots[item.sourceBatch];
    const srcPath = root ? path.join(root, item.sourceRelativePath) : null;
    if (!srcPath || !fs.existsSync(srcPath)) {
      item.fileUrl = null;
      item.demoAvailable = false;
      stats.sourceMissing += 1;
      sourceMissing.push(`${item.id} (${item.sourceBatch}/${item.sourceRelativePath})`);
      continue;
    }

    const ext = path.extname(item.sourceRelativePath).toLowerCase();
    const destName = `${item.id}${ext}`;
    const destPath = path.join(DEMO_FILES_DIR, destName);
    await fsp.copyFile(srcPath, destPath);

    const digest = await hashFile(destPath);
    const expected = String(item.fileId || "").replace(/^sha256:/, "");
    if (digest !== expected) {
      stats.hashMismatch += 1;
      hashMismatches.push(item.id);
      await fsp.unlink(destPath); // do not leave an unverified copy behind
      item.fileUrl = null;
      item.demoAvailable = false;
      continue;
    }

    item.fileUrl = `assets/study-files/${destName}`;
    item.demoAvailable = true;
    stats.copied += 1;
  }

  if (hashMismatches.length) {
    throw new Error(`Hash mismatch after copy for: ${hashMismatches.join(", ")} — aborting manifest rewrite.`);
  }

  const header = `/**
 * Study Notes V2 — resource metadata manifest (STUDY-V2-002, generated;
 * fileUrl/demoAvailable added by STUDY-V2-006's scripts/build-study-demo-files.mjs).
 * DO NOT hand-edit — regenerate metadata with:
 *   node scripts/build-study-manifest.mjs "/Users/lars_foh/Downloads/Engineering=kejuruteraan" "/Users/lars_foh/Downloads/Perakaunan=perakaunan" "/Users/lars_foh/Downloads/Science =sains"
 * then re-run the demo file copy with:
 *   node scripts/build-study-demo-files.mjs "/Users/lars_foh/Downloads/Engineering=Engineering" "/Users/lars_foh/Downloads/Perakaunan=Perakaunan" "/Users/lars_foh/Downloads/Science =Science"
 * Generated: 2026-08-21T10:47:30.672Z
 * Source batches: Engineering, Perakaunan, Science
 * Scanned files: 2468 | auto_parsed: 2318 | manual_review: 150
 * Unextracted zips flagged: 1 | Question<->Scheme pairs linked: 238
 * Exact duplicates (same SHA-256): 36
 * Demo files copied (STUDY-V2-006): ${stats.copied} | demoAvailable subject codes: ${[...DEMO_SUBJECT_CODES].sort().join(", ")}
 *
 * This manifest stores METADATA plus, for a curated "Competition Demo File
 * Set" only, a real served \`fileUrl\` under assets/study-files/ (filename is
 * the resourceId, not the original title/path, so no local folder
 * structure or absolute path is ever exposed). \`fileId\` remains the
 * content hash (sha256:...); \`sourceRelativePath\`/\`sourceBatch\` remain
 * internal provenance fields only (never rendered to users — see
 * app-study.js). Every item has \`demoAvailable\`: true only if its file was
 * actually copied and re-hash-verified this run; false items still render
 * normally with an honest "not included in this demo" state — see
 * services/study-resource-service.js#getResourceFileUrl and
 * study v2/reports/REPORT_STUDY-V2-006.md for the full file-availability
 * breakdown.
 * Every item not fully auto-parsed carries reviewStatus:"manual_review" and
 * a non-empty parseWarnings array explaining why — see
 * services/study-resource-service.js for how these are meant to be queried.
 */
window.STUDY_RESOURCE_MANIFEST = Object.freeze([
${items.map(item => "  " + JSON.stringify(item)).join(",\n")}
]);
`;

  await fsp.writeFile(MANIFEST_PATH, header, "utf8");

  console.log("Demo file copy stats:", stats);
  if (sourceMissing.length) console.log("Source missing for:", sourceMissing);
  console.log(`Wrote ${items.length} items (unchanged) + fileUrl/demoAvailable to ${path.relative(REPO_ROOT, MANIFEST_PATH)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
