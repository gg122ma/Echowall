import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST = path.join(ROOT, "dist");
const OUTPUT = path.join(DIST, "pages");
const TARGET_PATH = path.join(SCRIPT_DIR, "config", "production-target.json");

const RUNTIME_FILES = [
  "index.html",
  "map.html",
  "style-core.css",
  "style-wall.css",
  "style-comments.css",
  "style-admin.css",
  "style-study.css",
  "app-admin.js",
  "app-admin-dashboard.js",
  "app-admin-management.js",
  "app-campus-buildings.js",
  "app-campus-map.js",
  "app-community.js",
  "app-data.js",
  "app-place.js",
  "app-router.js",
  "app-study.js",
  "app-study-admin.js",
  "app-wall.js",
  "echomap.js",
  "config/app-config.js",
  "data/campus-building-hours.js",
  "data/campus-building-registry.js",
  "data/campus-buildings.js",
  "data/campus-map-config.js",
  "data/community-config.js",
  "data/demo-display-counts.js",
  "data/demo-seed-all-student-km.v1.js",
  "data/demo-seed-bundle.v1.js",
  "data/kmk-knowledge-base.js",
  "data/study-subjects.js",
  "i18n/index.js",
  "i18n/locales/en.js",
  "i18n/locales/ms.js",
  "i18n/locales/zh.js",
  "services/admin-audit-service.js",
  "services/admin-permission-service.js",
  "services/ai-assistant.js",
  "services/auth-service.js",
  "services/auth-ui.js",
  "services/bisheng-adapter.js",
  "services/cloudinary-adapter.js",
  "services/comment-service.js",
  "services/community-data-provider.js",
  "services/community-realtime-service.js",
  "services/community-row-adapter.js",
  "services/community-service.js",
  "services/community-supabase-client.js",
  "services/community-supabase-repositories.js",
  "services/free-ai-adapter.js",
  "services/map-note-service.js",
  "services/moderation-assist-service.js",
  "services/moderation-service.js",
  "services/permission-service.js",
  "services/preferences-ui.js",
  "services/study-resource-service.js",
  "services/study-submission-service.js",
  "services/supabase-auth-provider.js",
  "services/theme-service.js",
  "services/translation-service.js",
  "features/map-note-overlay.js",
  "assets/book-icon.png",
  "assets/vendor/leaflet/leaflet.css",
  "assets/vendor/leaflet/leaflet.js",
  "assets/vendor/leaflet/images/layers-2x.png",
  "assets/vendor/leaflet/images/layers.png",
  "assets/vendor/leaflet/images/marker-icon-2x.png",
  "assets/vendor/leaflet/images/marker-icon.png",
  "assets/vendor/leaflet/images/marker-shadow.png"
];

const PUBLIC_STUDY_FIELDS = [
  "id", "title", "jurusan", "semester", "subjectCode", "resourceType",
  "resourceSubtype", "topic", "yearStart", "yearEnd", "examSessionLabel",
  "sourceCollege", "sourceType", "fileId", "language", "description",
  "relatedResourceId", "resourceGroupId", "moderationStatus",
  "verificationStatus", "reviewStatus", "isDuplicate",
  "duplicateOfResourceId", "createdAt", "updatedAt", "fileUrl", "demoAvailable"
];

function posix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function fail(message) {
  throw new Error(`[build-pages] ${message}`);
}

async function requireFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  let info;
  try {
    info = await stat(fullPath);
  } catch {
    fail(`Required source file is missing: ${relativePath}`);
  }
  if (!info.isFile()) fail(`Required source path is not a file: ${relativePath}`);
  return fullPath;
}

async function copyRequired(relativePath) {
  const source = await requireFile(relativePath);
  const destination = path.join(OUTPUT, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function listFiles(directory, allowedExtensions) {
  const root = path.join(ROOT, directory);
  const result = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) {
        const relative = posix(path.relative(ROOT, full));
        const extension = path.extname(entry.name).toLowerCase();
        if (!allowedExtensions.has(extension)) fail(`Unexpected file type in ${directory}: ${relative}`);
        result.push(relative);
      } else {
        fail(`Symlinks and special files are not allowed in production inputs: ${posix(path.relative(ROOT, full))}`);
      }
    }
  }
  await visit(root);
  return result.sort((a, b) => a.localeCompare(b, "en"));
}

async function loadStudyManifest(sourcePath) {
  const source = await readFile(sourcePath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  new vm.Script(source, { filename: sourcePath }).runInContext(context);
  const manifest = context.window.STUDY_RESOURCE_MANIFEST;
  if (!Array.isArray(manifest) || manifest.length === 0) fail("Study manifest did not expose a non-empty array");
  return manifest.map(item => ({ ...item }));
}

function sanitizeStudyManifest(manifest) {
  return manifest.map((resource, index) => {
    const projected = {};
    for (const field of PUBLIC_STUDY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(resource, field)) projected[field] = resource[field];
    }
    if (!projected.id) fail(`Study row ${index} has no public resource ID`);
    return projected;
  });
}

function proveStudyProjection(original, projected) {
  if (original.length !== projected.length) fail("Sanitized Study projection changed the row count");
  const originalIds = new Set();
  for (let index = 0; index < original.length; index += 1) {
    const before = original[index];
    const after = projected[index];
    if (originalIds.has(before.id)) fail(`Duplicate Study ID: ${before.id}`);
    originalIds.add(before.id);
    for (const field of PUBLIC_STUDY_FIELDS) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        fail(`Sanitized Study projection changed ${field} for ${before.id}`);
      }
    }
    const publishableBefore = before.reviewStatus === "auto_parsed" && before.moderationStatus !== "rejected" && !before.isDuplicate;
    const publishableAfter = after.reviewStatus === "auto_parsed" && after.moderationStatus !== "rejected" && !after.isDuplicate;
    if (publishableBefore !== publishableAfter) fail(`Sanitized Study projection changed publishability for ${before.id}`);
  }
  const ids = new Set(projected.map(item => item.id));
  for (const resource of projected) {
    if (resource.relatedResourceId && !ids.has(resource.relatedResourceId)) {
      fail(`Study relationship target is missing: ${resource.id} -> ${resource.relatedResourceId}`);
    }
  }
}

async function writeSanitizedStudyManifest(manifest) {
  const destination = path.join(OUTPUT, "data", "study-resource-manifest.js");
  await mkdir(path.dirname(destination), { recursive: true });
  const source = [
    "/**",
    " * Echo Library public production catalogue.",
    " * Deterministic build-time projection; private import provenance is excluded.",
    " */",
    `window.STUDY_RESOURCE_MANIFEST = Object.freeze(${JSON.stringify(manifest, null, 2)});`,
    ""
  ].join("\n");
  await writeFile(destination, source, "utf8");
}

async function sha256(fullPath) {
  const data = await readFile(fullPath);
  return createHash("sha256").update(data).digest("hex");
}

async function collectArtifactFiles() {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) files.push(posix(path.relative(OUTPUT, full)));
      else fail(`Generated artifact contains a symlink or special file: ${posix(path.relative(OUTPUT, full))}`);
    }
  }
  await visit(OUTPUT);
  return files.sort((a, b) => a.localeCompare(b, "en"));
}

function gitValue(args, fallback) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

async function main() {
  const target = JSON.parse(await readFile(TARGET_PATH, "utf8"));
  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });

  for (const relativePath of RUNTIME_FILES) await copyRequired(relativePath);

  const buildingFiles = await listFiles("assets/buildings", new Set([".jpg", ".jpeg", ".png", ".webp"]));
  if (buildingFiles.length === 0) fail("No Building assets were found");
  for (const relativePath of buildingFiles) await copyRequired(relativePath);

  const sourceManifestPath = await requireFile("data/study-resource-manifest.js");
  const sourceManifest = await loadStudyManifest(sourceManifestPath);
  const publicManifest = sanitizeStudyManifest(sourceManifest);
  proveStudyProjection(sourceManifest, publicManifest);
  await writeSanitizedStudyManifest(publicManifest);

  const mappedResources = publicManifest.filter(item => item.fileUrl);
  const seenStudyPaths = new Set();
  let studyBytes = 0;
  for (const resource of mappedResources) {
    const relativePath = posix(resource.fileUrl);
    if (!relativePath.startsWith("assets/study-files/") || relativePath.includes("..")) {
      fail(`Unsafe Study file path for ${resource.id}: ${resource.fileUrl}`);
    }
    if (seenStudyPaths.has(relativePath)) fail(`Duplicate mapped Study file path: ${relativePath}`);
    seenStudyPaths.add(relativePath);
    const sourcePath = await requireFile(relativePath);
    const actualHash = await sha256(sourcePath);
    const expectedHash = String(resource.fileId || "").replace(/^sha256:/, "");
    if (!expectedHash || actualHash !== expectedHash) fail(`Study SHA-256 mismatch: ${relativePath}`);
    studyBytes += (await stat(sourcePath)).size;
    await copyRequired(relativePath);
  }

  await writeFile(path.join(OUTPUT, ".nojekyll"), "", "utf8");

  const artifactFiles = await collectArtifactFiles();
  let totalBytes = 0;
  const hashLines = [];
  for (const relativePath of artifactFiles) {
    const fullPath = path.join(OUTPUT, relativePath);
    totalBytes += (await stat(fullPath)).size;
    hashLines.push(`${await sha256(fullPath)}  ${relativePath}`);
  }
  await mkdir(DIST, { recursive: true });
  await writeFile(path.join(DIST, "pages.sha256"), `${hashLines.join("\n")}\n`, "utf8");

  const releaseMetadata = {
    buildTimestamp: new Date().toISOString(),
    sourceHead: gitValue(["rev-parse", "HEAD"], "UNKNOWN"),
    sourceBranch: gitValue(["branch", "--show-current"], "UNKNOWN"),
    productionRepository: target.repository,
    productionBranch: target.branch,
    productionUrl: target.publicUrl,
    basePath: target.basePath,
    artifactPath: "dist/pages/",
    fileCount: artifactFiles.length,
    totalBytes,
    studyMappedCount: mappedResources.length,
    studyBytes,
    buildingAssetCount: buildingFiles.length,
    checksumManifest: "dist/pages.sha256"
  };
  await writeFile(path.join(DIST, "pages-release-manifest.json"), `${JSON.stringify(releaseMetadata, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(releaseMetadata, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
