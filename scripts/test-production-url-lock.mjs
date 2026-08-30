import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED = Object.freeze({
  repository: "gg122ma/Echowall",
  branch: "main",
  publicUrl: "https://gg122ma.github.io/Echowall/",
  basePath: "/Echowall/"
});
const FORBIDDEN = ["gg122ma/e-wall", "gg122ma/wall", "/e-wall/", "/wall/", "/echowall/"];

function fail(message) { throw new Error(`[production-url-lock] ${message}`); }

async function main() {
  const configPath = path.join(ROOT, "scripts", "config", "production-target.json");
  const workflowPath = path.join(ROOT, ".github", "workflows", "deploy-pages.yml");
  const configText = await readFile(configPath, "utf8");
  const workflow = await readFile(workflowPath, "utf8");
  const config = JSON.parse(configText);
  for (const [key, value] of Object.entries(EXPECTED)) if (config[key] !== value) fail(`${key} must remain ${value}`);
  for (const value of FORBIDDEN) if (configText.includes(value)) fail(`Forbidden historical production target in active config: ${value}`);
  if (!/^\s*workflow_dispatch\s*:/m.test(workflow)) fail("Workflow must retain an explicit workflow_dispatch trigger");
  if (/\bpush\s*:/m.test(workflow)) fail("Workflow must not auto-deploy on push");
  if (/EchoWall-portable-demo-v1\.zip|\bunzip\b/i.test(workflow)) fail("Workflow must not use the legacy portable ZIP");
  if (!/node scripts\/build-pages\.mjs/.test(workflow)) fail("Workflow must build the deterministic Pages artifact");
  if (!/path:\s*dist\/pages\/?\s*$/m.test(workflow)) fail("Workflow must upload dist/pages/");
  console.log("Production URL lock PASS");
  console.log(JSON.stringify(EXPECTED, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
