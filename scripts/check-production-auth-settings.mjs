#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(ROOT, "config", "app-config.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
new vm.Script(source, { filename: "config/app-config.js" }).runInContext(context);

const config = context.window.EchoConfig?.community?.production;
if (!config?.url || !config?.publishableKey) {
  throw new Error("Production Supabase public configuration is missing.");
}

const response = await fetch(`${String(config.url).replace(/\/$/, "")}/auth/v1/settings`, {
  headers: { apikey: config.publishableKey },
});
if (!response.ok) throw new Error(`Supabase Auth settings returned HTTP ${response.status}.`);

const settings = await response.json();
const result = Object.freeze({
  mailer_autoconfirm: settings.mailer_autoconfirm,
  mailer_allow_unverified_email_sign_ins: settings.mailer_allow_unverified_email_sign_ins,
  mailer_secure_email_change_enabled: settings.mailer_secure_email_change_enabled,
  disable_signup: settings.disable_signup,
  external_email_enabled: settings.external?.email,
});
console.log(JSON.stringify(result, null, 2));

if (result.mailer_autoconfirm === true) {
  console.warn("PARTIAL / BLOCKED BY SUPABASE AUTO-CONFIRM");
  console.warn("Real mailbox ownership verification is not operational.");
} else if (result.mailer_autoconfirm === false) {
  console.log("PASS: Supabase Confirm Email is enabled.");
} else {
  console.error("UNKNOWN: Supabase did not return a boolean mailer_autoconfirm value.");
  process.exitCode = 2;
}
