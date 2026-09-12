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

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function sessionFor(id, email, expiresIn = 3600) {
  return {
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: {
      id,
      email,
      email_confirmed_at: "2026-09-09T01:02:03.000Z",
      user_metadata: { display_name: "Echo User" },
    },
  };
}

function createAuthHarness(getSession, storage = fakeStorage()) {
  const listeners = [];
  const events = [];
  let signOutCalls = 0;
  const client = {
    auth: {
      getSession,
      onAuthStateChange: callback => {
        listeners.push(callback);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: async ({ email }) => ({ data: { session: sessionFor("signed-in-user", email) }, error: null }),
      signOut: async () => { signOutCalls += 1; return { error: null }; },
    },
  };
  const window = {
    dispatchEvent: event => events.push(event),
    CommunitySupabaseClient: { getClient: async () => client },
  };
  window.window = window;
  const context = vm.createContext({
    window,
    localStorage: storage,
    console,
    Object,
    Number,
    String,
    Boolean,
    Date,
    Promise,
    Error,
    CustomEvent: class CustomEvent {
      constructor(type, options) { this.type = type; this.detail = options?.detail; }
    },
  });
  vm.runInContext(read("services/email-verification-service.js"), context, { filename: "services/email-verification-service.js" });
  vm.runInContext(read("services/supabase-auth-provider.js"), context, { filename: "services/supabase-auth-provider.js" });
  return {
    context,
    window,
    client,
    listeners,
    events,
    signOutCalls: () => signOutCalls,
  };
}

// Persisted-session bootstrap remains in a loading state until getSession
// resolves, then restores the authenticated user without a signed-out flash.
const sessionRead = deferred();
const harness = createAuthHarness(() => sessionRead.promise);
const readyPromise = harness.window.SupabaseAuthProvider.ready();
check("auth bootstrap exposes loading before persisted session resolution", harness.window.SupabaseAuthProvider.getStatus().status === "loading");
check("auth bootstrap does not finalize an unauthenticated user while loading", harness.window.SupabaseAuthProvider.getCurrentUser() === null && !harness.events.some(event => event.type === "echo:communityauthchange"));
await Promise.resolve();
check("auth listener is registered once during bootstrap", harness.listeners.length === 1);
const persistedSession = sessionFor("persisted-user", "persisted@example.com");
sessionRead.resolve({ data: { session: persistedSession }, error: null });
const restored = await readyPromise;
check("persisted session restores the authenticated user after reload", restored?.id === "persisted-user");
check("restored auth reaches ready state", harness.window.SupabaseAuthProvider.getStatus().status === "ready");
await harness.window.SupabaseAuthProvider.ready();
check("repeated readiness does not register duplicate auth listeners", harness.listeners.length === 1);

// Auth events preserve valid sessions. A newer event wins over an older
// in-flight getSession snapshot, preventing refresh races.
const staleRead = deferred();
const raceHarness = createAuthHarness(() => staleRead.promise);
const raceReady = raceHarness.window.SupabaseAuthProvider.ready();
await Promise.resolve();
const refreshedSession = sessionFor("race-user", "race@example.com", 7200);
raceHarness.listeners[0]("TOKEN_REFRESHED", refreshedSession);
staleRead.resolve({ data: { session: sessionFor("stale-user", "stale@example.com") }, error: null });
await raceReady;
check("TOKEN_REFRESHED session wins over an older bootstrap snapshot", raceHarness.window.SupabaseAuthProvider.getCurrentUser()?.id === "race-user");
raceHarness.listeners[0]("INITIAL_SESSION", refreshedSession);
check("INITIAL_SESSION retains a valid authenticated session", raceHarness.window.SupabaseAuthProvider.getCurrentUser()?.id === "race-user");
raceHarness.listeners[0]("SIGNED_IN", refreshedSession);
check("SIGNED_IN retains a valid authenticated session", raceHarness.window.SupabaseAuthProvider.getCurrentUser()?.id === "race-user");
raceHarness.listeners[0]("UNRELATED_EVENT", null);
check("session-less unrelated auth events do not clear a valid user", raceHarness.window.SupabaseAuthProvider.getCurrentUser()?.id === "race-user");
raceHarness.listeners[0]("SIGNED_OUT", null);
check("SIGNED_OUT clears the in-memory authenticated user", raceHarness.window.SupabaseAuthProvider.getCurrentUser() === null);

const explicitHarness = createAuthHarness(async () => ({ data: { session: persistedSession }, error: null }));
await explicitHarness.window.SupabaseAuthProvider.ready();
const signedIn = await explicitHarness.window.SupabaseAuthProvider.signInWithPassword({ email: "login@example.com", password: "password123" });
check("successful password login publishes the authenticated session", signedIn?.id === "signed-in-user" && explicitHarness.window.SupabaseAuthProvider.getCurrentUser()?.id === "signed-in-user");
await explicitHarness.window.SupabaseAuthProvider.signOut();
check("explicit Supabase sign-out calls the client exactly once", explicitHarness.signOutCalls() === 1);
check("explicit sign-out clears the published user", explicitHarness.window.SupabaseAuthProvider.getCurrentUser() === null);

// Admin authorization is re-evaluated from the restored identity. Stored
// role lookup failures deny safely without touching the valid auth session.
const roleRows = [{
  id: "role-1",
  userId: "persisted-user",
  role: "COLLEGE_ADMIN",
  scopeType: "college",
  scopeId: 1,
  permissions: [],
  status: "active",
  grantedBy: "admin",
  grantedAt: null,
  updatedAt: null,
}];
const roleStorage = fakeStorage({ "echo-wall-role-assignments:v1": JSON.stringify(roleRows) });
const adminHarness = createAuthHarness(async () => ({ data: { session: persistedSession }, error: null }), roleStorage);
vm.runInContext(read("services/admin-permission-service.js"), adminHarness.context, { filename: "services/admin-permission-service.js" });
const adminUser = await adminHarness.window.SupabaseAuthProvider.ready();
check("persisted authenticated admin role reload allows the Admin page", adminHarness.window.AdminPermissionService.canAccessAdminPanel(adminUser));
const normalUser = adminHarness.window.SupabaseAuthProvider.toDomainUser(sessionFor("normal-user", "normal@example.com").user, sessionFor("normal-user", "normal@example.com"));
check("authenticated non-admin remains denied", !adminHarness.window.AdminPermissionService.canAccessAdminPanel(normalUser));
adminHarness.window.AdminPermissionService.useProvider({ list: () => { throw new Error("temporary role lookup failure"); }, save() {} });
check("temporary role lookup failure denies safely", !adminHarness.window.AdminPermissionService.canAccessAdminPanel(normalUser));
check("temporary role lookup failure is observable", /temporary role lookup failure/.test(adminHarness.window.AdminPermissionService.getLastProviderError()?.message || ""));
check("role lookup failure does not destroy the valid Supabase session", adminHarness.window.SupabaseAuthProvider.getCurrentUser()?.id === "persisted-user");

// Production wiring assertions cover cross-page provider consistency and
// storage safety without needing real credentials or mutating Supabase.
const authUi = read("services/auth-ui.js");
const adminApp = read("app-admin.js");
const adminDashboard = read("app-admin-dashboard.js");
const adminManagement = read("app-admin-management.js");
const studyAdmin = read("app-study-admin.js");
const appRouter = read("app-router.js");
const clientSource = read("services/community-supabase-client.js");
check("navbar auth selection is deployment-wide rather than hash-route scoped", /function isSupabaseAuthActive\(\)[\s\S]*CommunityDataProvider\?\.isRemoteRequested\(\) === true/.test(authUi) && !/function isSupabaseCommunityRoute/.test(authUi));
check("sign-in dialog defaults to Supabase throughout active production", /!options\?\.provider && isSupabaseAuthActive\(\)/.test(authUi));
check("navbar waits for auth readiness before rendering a final state", /DOMContentLoaded[\s\S]*void ready\(\)\.catch/.test(authUi));
check("Supabase admins are not categorically hidden from Admin navigation", !/user\.provider === ["']supabase["'] \? false/.test(authUi));
check("Admin guard checks auth loading before access denial", /if \(adminAuthIsLoading\(\)\)[\s\S]*renderAdminAuthLoadingState[\s\S]*const user = adminCurrentUser\(\)/.test(adminApp));
check("Admin modules use the restored active auth identity", ![adminDashboard, adminManagement, studyAdmin].some(source => /AuthService\.getCurrentUser/.test(source)));
check("Admin rerenders when Supabase bootstrap or session state changes", /echo:communityauthchange[\s\S]*page === ["']admin["']/.test(appRouter) && /echo:communityauthstate/.test(appRouter));
check("authenticated client enables persistent storage and token refresh", /auth:\s*\{\s*persistSession:\s*true,\s*autoRefreshToken:\s*true,\s*detectSessionInUrl:\s*true\s*\}/.test(clientSource));
check("anonymous read client uses an isolated non-persistent storage key", /persistSession:\s*false[\s\S]*storageKey:\s*["']echo-wall-public-read:v1["']/.test(clientSource));
check("only the shared client module creates Supabase browser clients", fs.readdirSync(path.join(ROOT, "services")).filter(name => name.endsWith(".js")).every(name => name === "community-supabase-client.js" || !/\.createClient\s*\(/.test(read(path.join("services", name)))));

const productionFiles = [
  "app-admin.js", "app-admin-dashboard.js", "app-admin-management.js", "app-router.js", "app-study-admin.js",
  ...fs.readdirSync(path.join(ROOT, "services")).filter(name => name.endsWith(".js")).map(name => path.join("services", name)),
];
const productionSource = productionFiles.map(read).join("\n");
check("production runtime contains no generic localStorage.clear", !/localStorage\.clear\s*\(/.test(productionSource));
check("production runtime contains no generic sessionStorage.clear", !/sessionStorage\.clear\s*\(/.test(productionSource));
check("Supabase auth signOut exists only in the explicit provider path", (productionSource.match(/\.auth\.signOut\s*\(/g) || []).length === 1);
check("browser auth code contains no service-role credential", !/SERVICE_ROLE_KEY|service_role\s*[:=]|sb_secret_/i.test(productionSource));

console.log(`\n${passed}/${passed} assertions passed.`);
