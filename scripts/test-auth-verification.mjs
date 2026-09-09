#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS - ${name}`);
}
async function rejects(name, action, pattern) {
  await assert.rejects(action, pattern);
  passed += 1;
  console.log(`PASS - ${name}`);
}

let authClient;
const window = {
  dispatchEvent: () => {},
  CommunitySupabaseClient: { getClient: async () => authClient },
};
window.window = window;
const context = {
  window,
  console,
  Object,
  Number,
  String,
  Boolean,
  Date,
  Promise,
  Error,
  CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
};
vm.createContext(context);
for (const file of ["services/email-verification-service.js", "services/supabase-auth-provider.js", "services/permission-service.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}

const verification = window.EmailVerificationService;
check("valid ordinary email syntax is accepted", verification.isValidEmailSyntax("Student.Name+tag@example.edu.my"));
check("email normalization trims and lowercases", verification.normalizeEmail("  STUDENT@Example.COM  ") === "student@example.com");
check("missing domain is rejected", !verification.isValidEmailSyntax("student@localhost"));
check("double dots are rejected", !verification.isValidEmailSyntax("student..name@example.com"));
check("multiple at signs are rejected", !verification.isValidEmailSyntax("student@@example.com"));

const future = new Date(Date.now() + 60_000).toISOString();
const past = new Date(Date.now() - 60_000).toISOString();
const unverified = { provider: "supabase", emailConfirmedAt: null, isEmailVerified: false, sessionExpiresAt: future };
const verified = { provider: "supabase", emailConfirmedAt: new Date().toISOString(), isEmailVerified: true, sessionExpiresAt: future };
check("unverified Supabase user cannot publish", !verification.canPublish(unverified));
check("verified Supabase user can publish", verification.canPublish(verified));
check("expired verified session cannot publish", !verification.canPublish({ ...verified, sessionExpiresAt: past }));
check("verification denial is human-readable", /verify your email/i.test(verification.denialMessage(unverified)));
check("expired-session denial asks user to sign in", /sign in/i.test(verification.denialMessage({ ...verified, sessionExpiresAt: past })));
check("existing local prototype users remain compatible", verification.canPublish({ provider: "local-prototype", sessionExpiresAt: future }));

const mapped = window.SupabaseAuthProvider.toDomainUser({
  id: "user-1",
  email: "student@example.com",
  email_confirmed_at: "2026-09-09T01:02:03.000Z",
  user_metadata: { display_name: "Student" },
}, { expires_at: Math.floor(Date.now() / 1000) + 3600 });
check("Supabase domain user retains email_confirmed_at", mapped.emailConfirmedAt === "2026-09-09T01:02:03.000Z" && mapped.isEmailVerified === true);
check("Supabase domain user retains session expiry", Number.isFinite(Date.parse(mapped.sessionExpiresAt)));
check("protected post permission uses verified session state", window.PermissionService.canUserPost(mapped));
check("comments retain active-session compatibility", window.PermissionService.canUserComment(unverified));

authClient = {
  auth: {
    signUp: async () => ({ data: { user: { id: "pending-1", email: "pending@example.com", email_confirmed_at: null }, session: null }, error: null }),
  },
  rpc: async () => ({ error: null }),
};
const registration = await window.SupabaseAuthProvider.signUp({ email: "pending@example.com", password: "password123", displayName: "Pending Student" });
check("signup without a session succeeds awaiting confirmation", registration.status === "awaiting_verification" && registration.email === "pending@example.com");
check("awaiting-confirmation registration has no fake verified state", registration.user.isEmailVerified === false);

await rejects("signup rejects invalid email before Supabase", () => window.SupabaseAuthProvider.signUp({ email: "bad", password: "password123", displayName: "Student" }), /valid email/i);
await rejects("sign-in rejects invalid email before Supabase", () => window.SupabaseAuthProvider.signInWithPassword({ email: "bad", password: "password123" }), /valid email/i);

authClient = {
  auth: {
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: "Email not confirmed" } }),
  },
};
await rejects(
  "unconfirmed Supabase sign-in remains blocked",
  () => window.SupabaseAuthProvider.signInWithPassword({ email: "pending@example.com", password: "password123" }),
  /not confirmed/i,
);

const migration = read("supabase/migrations/20260909151613_ai_photo_verified_writes.sql");
check("migration verifies authoritative auth.users confirmation state", /from auth\.users[\s\S]*email_confirmed_at is not null/.test(migration));
check("migration does not authorize from user_metadata", !/user_metadata|raw_user_meta_data/.test(migration));
check("existing post and map RPCs require verified active users", (migration.match(/private\.require_verified_active_user\(\)/g) || []).length >= 4);
check("post-with-media RPC persists post and metadata atomically", /create_post_with_media[\s\S]*insert into app\.media_assets/.test(migration));
check("media RPC remains authenticated-only", /grant execute on function api\.create_post_with_media[\s\S]*to authenticated, service_role/.test(migration));
check("unsigned Cloudinary URL is constrained to the configured cloud", /res\[\.\]cloudinary\[\.\]com\/das8chiyz/.test(migration));
check("migration contains no browser service-role credential", !/service_role\s*[:=]|SERVICE_ROLE_KEY|api_secret/i.test(migration));
const mapMediaMigration = read("supabase/migrations/20260909161836_add_atomic_map_photo_publish.sql");
check("Map-photo RPC independently requires a verified active user", /create_map_post_with_media[\s\S]*private\.require_verified_active_user\(\)/.test(mapMediaMigration));
check("Map-photo RPC persists the map post and media metadata atomically", /create_map_post_with_media[\s\S]*api\.create_map_post\([\s\S]*insert into app\.media_assets/.test(mapMediaMigration));
check("Map-photo RPC remains authenticated-only", /grant execute on function api\.create_map_post_with_media[\s\S]*to authenticated, service_role/.test(mapMediaMigration));
check("Map-photo migration does not authorize from user metadata", !/user_metadata|raw_user_meta_data/.test(mapMediaMigration));
const productionAuthCheck = read("scripts/check-production-auth-settings.mjs");
const autoConfirmBranch = productionAuthCheck.match(/if \(result\.mailer_autoconfirm === true\) \{([\s\S]*?)\} else if/);
check("production auto-confirm is reported as partial instead of mailbox-verified", /PARTIAL \/ BLOCKED BY SUPABASE AUTO-CONFIRM/.test(autoConfirmBranch?.[1] || ""));
check("accepted auto-confirm limitation does not fail the remaining release gate", !/process\.exitCode/.test(autoConfirmBranch?.[1] || ""));
const mapOverlay = read("features/map-note-overlay.js");
check("Map posting applies the same verified-user client gate", /remote && !window\.EmailVerificationService\?\.canPublish/.test(mapOverlay));
check("Map publishing surfaces a human-readable backend error", /catch \(error\)[\s\S]*setComposeError\(error instanceof Error \? error\.message/.test(mapOverlay));

console.log(`\n${passed}/${passed} assertions passed.`);
