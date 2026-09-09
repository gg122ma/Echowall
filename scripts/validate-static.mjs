#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const pass = message => console.log(`PASS - ${message}`);
const fail = message => failures.push(message);

for (const relativePath of ["index.html", "map.html"]) {
  const filename = path.join(ROOT, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const ids = [...source.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) fail(`${relativePath} has duplicate IDs: ${duplicates.join(", ")}`);
  else pass(`${relativePath} has ${ids.length} unique static IDs`);

  const missing = [];
  for (const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:|tel:|#)/i.test(reference)) continue;
    const clean = reference.split(/[?#]/, 1)[0];
    if (clean && !fs.existsSync(path.resolve(path.dirname(filename), clean))) missing.push(clean);
  }
  if (missing.length) fail(`${relativePath} has missing local assets: ${[...new Set(missing)].join(", ")}`);
  else pass(`${relativePath} local asset references resolve`);
}

function stripCssStringsAndComments(source) {
  let result = "";
  let quote = "";
  let comment = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (comment) {
      if (character === "*" && next === "/") { comment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (character === "\\") { index += 1; continue; }
      if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "*") { comment = true; index += 1; continue; }
    if (character === "\"" || character === "'") { quote = character; continue; }
    result += character;
  }
  if (comment) fail("CSS contains an unterminated comment");
  if (quote) fail("CSS contains an unterminated string");
  return result;
}

const cssFiles = fs.readdirSync(ROOT).filter(name => name.endsWith(".css")).sort();
for (const relativePath of cssFiles) {
  const source = stripCssStringsAndComments(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
  let depth = 0;
  let invalid = false;
  for (const character of source) {
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth < 0) { invalid = true; break; }
    }
  }
  if (invalid || depth !== 0) fail(`${relativePath} has unbalanced CSS braces`);
  else pass(`${relativePath} has balanced CSS structure`);
}

if (failures.length) {
  console.error(`\nStatic validation failed (${failures.length}):`);
  failures.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`\nStatic validation passed: 2 HTML files and ${cssFiles.length} CSS files.`);
}
