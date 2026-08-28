import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const check = (condition, message) => {
  if (condition) console.log(`PASS ${message}`);
  else failures.push(message);
};
const bundleSource = fs.readFileSync(path.join(ROOT, "data", "demo-seed-bundle.v1.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
new vm.Script(bundleSource).runInContext(sandbox);
const bundle = sandbox.window.ECHO_WALL_DEMO_SEED_BUNDLE;
check(bundle && Array.isArray(bundle.notes), "bundle is valid classic-script JavaScript");

for (const htmlFile of ["index.html", "map.html"]) {
  const htmlPath = path.join(ROOT, htmlFile);
  const html = fs.readFileSync(htmlPath, "utf8");
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1].replace(/^\.\//, ""));
  check(scripts.indexOf("data/demo-seed-bundle.v1.js") >= 0 && scripts.indexOf("data/demo-seed-bundle.v1.js") < scripts.indexOf("app-data.js"), `${htmlFile} loads bundle before app-data.js`);
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:|tel:|#)/i.test(reference)) continue;
    const clean = reference.split(/[?#]/, 1)[0];
    check(fs.existsSync(path.resolve(path.dirname(htmlPath), clean)), `${htmlFile} relative resource exists: ${clean}`);
  }
}

const keys = bundle.notes.map((note) => note.demoSeedKey);
check(keys.every(Boolean) && new Set(keys).size === keys.length, "demoSeedKey values are present and unique");
const kmkCounts = [1, 2, 3].map((majorId) => bundle.notes.filter((note) => Number(note.orgId) === 1 && Number(note.majorId) === majorId).length);
check(kmkCounts.join("/") === "73/25/10", "KMK wall counts are 73/25/10");
check(bundle.noteCount === 696 && bundle.notes.length === 696, "bundle contains exactly 696 notes");

const campusSource = fs.readFileSync(path.join(ROOT, "data", "campus-buildings.js"), "utf8");
for (const asset of new Set([...campusSource.matchAll(/["'](assets\/buildings\/[^"']+)["']/g)].map((match) => match[1]))) {
  check(fs.existsSync(path.join(ROOT, asset)), `building asset exists: ${asset}`);
}

const walk = (directory) => fs.readdirSync(path.join(ROOT, directory), { recursive: true })
  .filter((name) => /\.(?:js|json|css|html)$/i.test(name))
  .map((name) => path.join(directory, name));
const runtimeFiles = [
  "index.html", "map.html",
  ...fs.readdirSync(ROOT).filter((name) => /\.(?:js|css)$/i.test(name)),
  ...["config", "data", "features", "i18n", "services"].flatMap(walk),
];
for (const relativePath of runtimeFiles) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  check(!/(?:^|[\s"'(=])[A-Za-z]:\\|localhost|(?:src|href)=["']\/(?!\/)/i.test(source), `${relativePath} has no drive, localhost, or site-root resource path`);
  check(!/demoSeedPreview/i.test(source), `${relativePath} does not depend on demoSeedPreview`);
}
if (failures.length) {
  console.error(`\nPortable demo validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`\nPortable demo validation passed: ${bundle.notes.length} notes; KMK ${kmkCounts.join("/")}.`);
}
