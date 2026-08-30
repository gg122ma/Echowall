import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT = path.join(ROOT, "dist", "pages");
const WARN_BYTES = 650 * 1024 * 1024;
const BLOCK_BYTES = 800 * 1024 * 1024;
const FORBIDDEN_TOP_LEVEL = new Set([
  ".git", ".github", "EchoWall_项目来源_正式上线规划", "production-launch",
  "production-launch-plan", "video", "video-demo", "abstract-source", "checkpoints",
  "reports", "scripts", "tmp"
]);
const FORBIDDEN_NAMES = new Set([
  "CLAUDE.md", "AGENTS.md", "HANDOFF.md", "CODE_AUDIT.md", "OPTIMIZATION_LOG.md",
  "CHANGELOG.md", "ROADMAP.md", "EchoWall-portable-demo-v1.zip"
]);
const PRIVATE_STUDY_FIELDS = ["sourceRelativePath", "parseWarnings", "sourceBatch", "contributorUserId"];
const REQUIRED_RUNTIME = [
  "index.html", "map.html", ".nojekyll", "style-core.css", "style-wall.css",
  "style-comments.css", "style-admin.css", "style-study.css", "app-router.js",
  "app-wall.js", "app-study.js", "echomap.js", "config/app-config.js",
  "data/study-resource-manifest.js", "assets/vendor/leaflet/leaflet.js",
  "assets/vendor/leaflet/leaflet.css", "assets/book-icon.png"
];
const SM015 = [
  ["study_cc0c4b44ab7eee85009a", "assets/study-files/study_cc0c4b44ab7eee85009a.pdf", "c95e7bba8002b508af2cbb674bdb894df8fb48e8ea3d783c52bc928b3e572f56"],
  ["study_fbafe15efc7241049987", "assets/study-files/study_fbafe15efc7241049987.pdf", "73e73c1d8026f392fc4f866a9fcfa05833273d2decf17950a5eaddf81cd3ddcf"]
];

function posix(value) { return value.split(path.sep).join("/"); }
function fail(message) { throw new Error(`[validate-pages-artifact] ${message}`); }
async function existsFile(relativePath) {
  try { return (await stat(path.join(ARTIFACT, relativePath))).isFile(); } catch { return false; }
}
async function sha256(fullPath) {
  return createHash("sha256").update(await readFile(fullPath)).digest("hex");
}

async function enumerate() {
  const rootReal = await realpath(ARTIFACT);
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const relative = posix(path.relative(ARTIFACT, full));
      if (relative.split("/").includes("..")) fail(`Path traversal in artifact: ${relative}`);
      const info = await lstat(full);
      if (info.isSymbolicLink()) fail(`Symlink is forbidden: ${relative}`);
      const resolved = await realpath(full);
      if (resolved !== rootReal && !resolved.startsWith(`${rootReal}${path.sep}`)) fail(`Artifact path escapes root: ${relative}`);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) files.push(relative);
      else fail(`Special file is forbidden: ${relative}`);
    }
  }
  await visit(ARTIFACT);
  return files.sort((a, b) => a.localeCompare(b, "en"));
}

function localReference(raw) {
  const value = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!value || /^(?:https?:|data:|mailto:|tel:|javascript:|blob:|indexeddb:|#)/i.test(value)) return null;
  return decodeURIComponent(value.split(/[?#]/, 1)[0]);
}

async function validateStaticReferences(files) {
  const textFiles = files.filter(file => /\.(?:html|css|js)$/i.test(file));
  for (const relativePath of textFiles) {
    const text = await readFile(path.join(ARTIFACT, relativePath), "utf8");
    const references = [];
    if (/\.html$/i.test(relativePath)) {
      for (const match of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) references.push(match[1]);
    }
    if (/\.css$/i.test(relativePath)) {
      for (const match of text.matchAll(/url\(\s*([^\)]+?)\s*\)/gi)) references.push(match[1]);
    }
    for (const raw of references) {
      const ref = localReference(raw);
      if (!ref) continue;
      if (ref.startsWith("/")) fail(`Project-root absolute first-party reference in ${relativePath}: ${ref}`);
      const resolved = path.resolve(path.dirname(path.join(ARTIFACT, relativePath)), ref);
      const relativeResolved = posix(path.relative(ARTIFACT, resolved));
      if (relativeResolved.startsWith("../") || path.isAbsolute(relativeResolved)) fail(`Reference escapes artifact in ${relativePath}: ${ref}`);
      if (!(await existsFile(relativeResolved))) fail(`Unresolved local reference in ${relativePath}: ${ref}`);
    }
  }
}

function loadManifest(source, filename) {
  const context = { window: {} };
  vm.createContext(context);
  new vm.Script(source, { filename }).runInContext(context);
  return context.window.STUDY_RESOURCE_MANIFEST;
}

async function main() {
  for (const required of REQUIRED_RUNTIME) if (!(await existsFile(required))) fail(`Required runtime file is missing: ${required}`);
  const files = await enumerate();
  if (!files.length) fail("Artifact is empty");

  for (const relativePath of files) {
    const parts = relativePath.split("/");
    if (FORBIDDEN_TOP_LEVEL.has(parts[0])) fail(`Forbidden deployment directory: ${parts[0]}`);
    if (FORBIDDEN_NAMES.has(path.basename(relativePath))) fail(`Forbidden deployment file: ${relativePath}`);
    if (/^\.env(?:\.|$)/i.test(path.basename(relativePath))) fail(`Environment file is forbidden: ${relativePath}`);
    if (/\.(?:zip|bak|backup)$/i.test(relativePath)) fail(`Backup/archive file is forbidden: ${relativePath}`);
  }

  await validateStaticReferences(files);

  const manifestPath = path.join(ARTIFACT, "data", "study-resource-manifest.js");
  const manifestSource = await readFile(manifestPath, "utf8");
  for (const field of PRIVATE_STUDY_FIELDS) if (manifestSource.includes(field)) fail(`Private Study provenance field remains in public artifact: ${field}`);
  const manifest = loadManifest(manifestSource, manifestPath);
  if (!Array.isArray(manifest) || manifest.length !== 2468) fail(`Unexpected Study manifest row count: ${manifest?.length}`);
  const publishable = manifest.filter(item => item.reviewStatus === "auto_parsed" && item.moderationStatus !== "rejected" && !item.isDuplicate);
  const mapped = publishable.filter(item => item.fileUrl);
  if (publishable.length !== 2284) fail(`Unexpected publishable Study count: ${publishable.length}`);
  if (mapped.length !== 377) fail(`Unexpected mapped Study count: ${mapped.length}`);

  let studyBytes = 0;
  const phase0StudyBaselinePath = path.join(ROOT, "production-launch", "phase-0", "claude", "manifests", "study-real-files.sha256");
  const phase0Rows = (await readFile(phase0StudyBaselinePath, "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^([0-9a-f]+)\s+(\d+)\s+(.+)$/i);
      if (!match) fail(`Malformed Phase-0 Study hash row: ${line}`);
      return { hashPrefix: match[1].toLowerCase(), bytes: Number(match[2]), relativePath: posix(match[3]) };
    });
  if (phase0Rows.length !== mapped.length) fail(`Phase-0 Study baseline count changed: ${phase0Rows.length} vs ${mapped.length}`);
  const phase0ByPath = new Map(phase0Rows.map(row => [row.relativePath, row]));
  for (const resource of mapped) {
    const relativePath = posix(resource.fileUrl);
    if (!relativePath.startsWith("assets/study-files/") || relativePath.includes("..")) fail(`Unsafe Study path: ${relativePath}`);
    if (!(await existsFile(relativePath))) fail(`Mapped Study file is missing: ${relativePath}`);
    const fullPath = path.join(ARTIFACT, relativePath);
    const expected = String(resource.fileId || "").replace(/^sha256:/, "");
    const actualHash = await sha256(fullPath);
    const actualBytes = (await stat(fullPath)).size;
    if (!expected || actualHash !== expected) fail(`Mapped Study SHA-256 mismatch: ${relativePath}`);
    const phase0 = phase0ByPath.get(relativePath);
    if (!phase0 || phase0.bytes !== actualBytes || !actualHash.startsWith(phase0.hashPrefix)) {
      fail(`Mapped Study file differs from Phase-0 baseline: ${relativePath}`);
    }
    studyBytes += actualBytes;
  }

  for (const [id, relativePath, expectedHash] of SM015) {
    const resource = manifest.find(item => item.id === id);
    if (!resource || resource.fileUrl !== relativePath) fail(`SM015 resource mapping changed: ${id}`);
    if (!(await existsFile(relativePath)) || await sha256(path.join(ARTIFACT, relativePath)) !== expectedHash) fail(`SM015 file failed integrity check: ${id}`);
  }

  const artifactBuildingFiles = files.filter(file => file.startsWith("assets/buildings/"));
  if (artifactBuildingFiles.length !== 18) fail(`Unexpected Building asset count: ${artifactBuildingFiles.length}`);

  // Every artifact byte must match the current parity source, except the intentionally
  // generated public Study projection and the generated .nojekyll marker.
  for (const relativePath of files) {
    if (relativePath === ".nojekyll" || relativePath === "data/study-resource-manifest.js") continue;
    const sourcePath = path.join(ROOT, relativePath);
    let sourceInfo;
    try { sourceInfo = await stat(sourcePath); } catch { fail(`Artifact file has no current-source counterpart: ${relativePath}`); }
    if (!sourceInfo.isFile()) fail(`Artifact source counterpart is not a file: ${relativePath}`);
    if (await sha256(sourcePath) !== await sha256(path.join(ARTIFACT, relativePath))) {
      fail(`Artifact file differs from current parity source: ${relativePath}`);
    }
  }

  const textFiles = files.filter(file => /\.(?:html|css|js|json|txt|xml|svg)$/i.test(file));
  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    /(?:api[_-]?secret|service[_-]?role[_-]?key|private[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/i
  ];
  const absolutePathPatterns = [/\b[A-Za-z]:\\Users\\/i, /(?:^|[^A-Za-z])\/Users\//, /(?:^|[^A-Za-z])\/home\//];
  for (const relativePath of textFiles) {
    const text = await readFile(path.join(ARTIFACT, relativePath), "utf8");
    if (secretPatterns.some(pattern => pattern.test(text))) fail(`Obvious secret pattern detected: ${relativePath}`);
    if (absolutePathPatterns.some(pattern => pattern.test(text))) fail(`Developer absolute path detected: ${relativePath}`);
  }

  let totalBytes = 0;
  for (const relativePath of files) totalBytes += (await stat(path.join(ARTIFACT, relativePath))).size;
  if (totalBytes > BLOCK_BYTES) fail(`Artifact exceeds 800 MiB block threshold: ${totalBytes} bytes`);
  const warnings = [];
  if (totalBytes >= WARN_BYTES) warnings.push(`Artifact exceeds 650 MiB warning threshold: ${totalBytes} bytes`);
  console.log(JSON.stringify({
    status: "PASS", fileCount: files.length, totalBytes, studyMappedCount: mapped.length,
    studyBytes, buildingAssetCount: artifactBuildingFiles.length, warnings
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
