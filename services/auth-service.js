(function () {
  const USERS_KEY = "echo-wall-users:v1";
  const SESSION_KEY = "echo-wall-user-session:v1";
  // ADMIN-V2-001A: this whitelist is the legacy prototype admin tier ONLY.
  // The Super Admin bootstrap email lives exclusively in
  // services/admin-permission-service.js (SUPER_ADMIN_EMAIL) — do not add
  // it back here. See that file's header comment and isCurrentUserAdmin()
  // below for how the two tiers now compose without a second hardcode.
  const PROTOTYPE_ADMIN_EMAILS = new Set([
    "mzteoh88@gmail.com",
  ]);
  const EDUCATION_STATUSES = new Set(["unset", "current_student", "alumni", "non_student"]);
  const EMPTY_EDUCATION_PROFILE = Object.freeze({
    educationStatus: "unset",
    educationOrgId: null,
    educationMajorId: null,
    educationStartYear: null,
  });

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function deriveRoleFromEmail(email) {
    return PROTOTYPE_ADMIN_EMAILS.has(normalizeEmail(email)) ? "admin" : "user";
  }

  function normalizeEducationProfile(input, { strict = false } = {}) {
    const source = input && typeof input === "object" ? input : {};
    const rawStatus = String(source.educationStatus || "unset");
    if (!EDUCATION_STATUSES.has(rawStatus)) {
      if (strict) throw new Error("Choose a valid education status.");
      return { ...EMPTY_EDUCATION_PROFILE };
    }
    if (rawStatus === "unset" || rawStatus === "non_student") {
      return { educationStatus: rawStatus, educationOrgId: null, educationMajorId: null, educationStartYear: null };
    }

    const orgId = Number(source.educationOrgId);
    const majorId = Number(source.educationMajorId);
    const startYear = Number(source.educationStartYear);
    const currentYear = new Date().getFullYear();
    const org = Number.isInteger(orgId) ? educationInstitutions.find(item => item.id === orgId) : null;
    const major = Number.isInteger(majorId)
      ? educationPrograms.find(item => item.id === majorId || item.legacyIds?.includes(majorId))
      : null;
    const isValid = Boolean(org && major && Number.isInteger(startYear) && startYear >= 1980 && startYear <= currentYear + 1);
    if (!isValid) {
      if (strict) throw new Error("Choose a valid institution, major, and start year.");
      return { ...EMPTY_EDUCATION_PROFILE };
    }
    return { educationStatus: rawStatus, educationOrgId: org.id, educationMajorId: majorId, educationStartYear: startYear };
  }

  function readUsers() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      let changed = false;
      const users = parsed.map(user => {
        if (!user || typeof user !== "object" || Array.isArray(user)) return user;
        const role = deriveRoleFromEmail(user.email);
        const education = normalizeEducationProfile(user);
        const isNormalized = user.role === role
          && user.educationStatus === education.educationStatus
          && user.educationOrgId === education.educationOrgId
          && user.educationMajorId === education.educationMajorId
          && user.educationStartYear === education.educationStartYear;
        if (isNormalized) return user;
        changed = true;
        return { ...user, role, ...education };
      });
      if (changed) {
        try {
          writeUsers(users);
        } catch {
          // Keep the normalized in-memory users available and retry persistence on the next read.
        }
      }
      return users;
    } catch {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function digest(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function sanitizeUser(user) {
    if (!user) return null;
    return {
      id: String(user.id),
      email: String(user.email),
      displayName: String(user.displayName),
      createdAt: String(user.createdAt),
      role: deriveRoleFromEmail(user.email),
      ...normalizeEducationProfile(user),
    };
  }

  function getCurrentUser() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!session?.userId) return null;
      const user = readUsers().find(item => item.id === session.userId);
      return sanitizeUser(user);
    } catch {
      return null;
    }
  }

  async function register({ email, displayName, password }) {
    const normalizedEmail = normalizeEmail(email);
    const cleanName = String(displayName || "").trim().slice(0, 50);
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Enter a valid email address.");
    if (cleanName.length < 2) throw new Error("Display name must contain at least 2 characters.");
    if (String(password || "").length < 8) throw new Error("Password must contain at least 8 characters.");

    const users = readUsers();
    if (users.some(user => normalizeEmail(user?.email) === normalizedEmail)) throw new Error("An account with this email already exists.");
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: normalizedEmail,
      displayName: cleanName,
      passwordHash: await digest(String(password)),
      createdAt: new Date().toISOString(),
      role: deriveRoleFromEmail(normalizedEmail),
      ...EMPTY_EDUCATION_PROFILE,
    };
    users.push(user);
    writeUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, createdAt: new Date().toISOString() }));
    notify();
    return sanitizeUser(user);
  }

  async function signIn({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await digest(String(password || ""));
    const user = readUsers().find(item => normalizeEmail(item?.email) === normalizedEmail && item.passwordHash === passwordHash);
    if (!user) throw new Error("Incorrect email or password.");
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, createdAt: new Date().toISOString() }));
    notify();
    return sanitizeUser(user);
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    notify();
  }

  function updateProfile(input = {}) {
    const session = (() => {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
      catch { return null; }
    })();
    if (!session?.userId) throw new Error("Sign in before updating your profile.");

    const users = readUsers();
    const userIndex = users.findIndex(user => user?.id === session.userId);
    if (userIndex < 0) throw new Error("Sign in before updating your profile.");
    const current = users[userIndex];
    const source = input && typeof input === "object" ? input : {};
    const displayName = Object.prototype.hasOwnProperty.call(source, "displayName")
      ? String(source.displayName || "").trim().slice(0, 50)
      : String(current.displayName || "");
    if (displayName.length < 2) throw new Error("Display name must contain at least 2 characters.");

    const educationInput = { ...current };
    ["educationStatus", "educationOrgId", "educationMajorId", "educationStartYear"].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(source, key)) educationInput[key] = source[key];
    });
    const education = normalizeEducationProfile(educationInput, { strict: true });
    users[userIndex] = { ...current, displayName, ...education };
    writeUsers(users);
    notify();
    return sanitizeUser(users[userIndex]);
  }

  function notify() {
    window.dispatchEvent(new CustomEvent("echo:authchange", { detail: { user: getCurrentUser() } }));
  }

  // ADMIN-V2-001A: compatibility wrapper, not a permission source. When
  // services/admin-permission-service.js is loaded (the normal case — see
  // CLAUDE.md's script-load-order note, it loads immediately after this
  // file), this defers to AdminPermissionService.canAccessAdminPanel(),
  // which is what actually recognizes Super Admin (by email, independent
  // of `role`), legacy admin (mzteoh88@gmail.com, via the whitelist
  // above), and any real Role/Scope-contract RoleAssignment. If that
  // service is somehow absent, this degrades to the legacy whitelist only
  // — a defensive fallback, not a second bootstrap source.
  function isCurrentUserAdmin() {
    const user = getCurrentUser();
    if (!user) return false;
    if (typeof window !== "undefined" && window.AdminPermissionService?.canAccessAdminPanel) {
      return Boolean(window.AdminPermissionService.canAccessAdminPanel(user));
    }
    return PROTOTYPE_ADMIN_EMAILS.has(normalizeEmail(user.email));
  }

  window.AuthService = {
    provider: "local-prototype",
    register,
    signIn,
    signOut,
    updateProfile,
    getCurrentUser,
    isCurrentUserAdmin,
    isAuthenticated: () => Boolean(getCurrentUser()),
  };
})();
