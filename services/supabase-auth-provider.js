/** Supabase Auth session provider for the Community runtime. */
(function () {
  let currentUser = null;
  let readyPromise = null;
  let authSubscription = null;
  let authEventSequence = 0;
  let status = "idle";
  let lastError = null;

  function toDomainUser(user, session = null) {
    if (!user) return null;
    const displayName = String(user.user_metadata?.display_name || user.user_metadata?.name || "").trim();
    const emailConfirmedAt = user.email_confirmed_at ? String(user.email_confirmed_at) : null;
    const expiresAtSeconds = Number(session?.expires_at);
    return Object.freeze({
      id: String(user.id || ""),
      email: String(user.email || ""),
      displayName,
      role: "user",
      provider: "supabase",
      emailConfirmedAt,
      isEmailVerified: Boolean(emailConfirmedAt),
      sessionExpiresAt: Number.isFinite(expiresAtSeconds) ? new Date(expiresAtSeconds * 1000).toISOString() : null,
    });
  }

  function publishUser(user) {
    currentUser = user;
    window.dispatchEvent?.(new CustomEvent("echo:communityauthchange", { detail: { user: currentUser } }));
    return currentUser;
  }

  function publishStatus(nextStatus, error = null) {
    status = nextStatus;
    lastError = error instanceof Error ? error : null;
    window.dispatchEvent?.(new CustomEvent("echo:communityauthstate", {
      detail: { status, error: lastError },
    }));
  }

  function applyAuthEvent(event, session) {
    authEventSequence += 1;
    if (event === "SIGNED_OUT") return publishUser(null);
    if (session?.user) return publishUser(toDomainUser(session.user, session));
    // INITIAL_SESSION with no session is the one authoritative bootstrap
    // event for an unauthenticated browser. Other session-less events must
    // not erase a valid user because of a transient refresh/provider event.
    if (event === "INITIAL_SESSION") return publishUser(null);
    return currentUser;
  }

  function ensureAuthListener(client) {
    if (authSubscription) return;
    const result = client.auth.onAuthStateChange((event, session) => {
      applyAuthEvent(event, session);
    });
    authSubscription = result?.data?.subscription || result || true;
  }

  function ready() {
    if (!readyPromise) {
      publishStatus("loading");
      readyPromise = window.CommunitySupabaseClient.getClient().then(async client => {
        ensureAuthListener(client);
        const sequenceBeforeSessionRead = authEventSequence;
        const { data, error } = await client.auth.getSession();
        if (error) throw new Error("Your Community session could not be restored.");
        // If an auth event arrived while getSession() was in flight, that
        // event represents the newer state and must not be overwritten by a
        // stale session read.
        if (authEventSequence === sequenceBeforeSessionRead) {
          publishUser(toDomainUser(data?.session?.user, data?.session));
        }
        publishStatus("ready");
        return currentUser;
      }).catch(error => {
        readyPromise = null;
        publishStatus("error", error);
        throw error;
      });
    }
    return readyPromise;
  }

  async function upsertProfile(displayName) {
    const normalizedName = String(displayName || "").trim();
    if (!normalizedName) throw new Error("Enter a display name before publishing with your name.");
    const client = await window.CommunitySupabaseClient.getClient();
    const { error } = await client.rpc("upsert_my_profile", { p_display_name: normalizedName });
    if (error) throw new Error(error.message || "Your Community display name could not be saved.");
    const user = currentUser ? Object.freeze({ ...currentUser, displayName: normalizedName }) : currentUser;
    return publishUser(user);
  }

  async function signUp({ email, password, displayName } = {}) {
    const normalizedEmail = window.EmailVerificationService.normalizeEmail(email);
    const normalizedPassword = String(password || "");
    const normalizedName = String(displayName || "").trim();
    if (!window.EmailVerificationService.isValidEmailSyntax(normalizedEmail)) throw new Error("Enter a valid email address.");
    if (normalizedName.length < 2) throw new Error("Enter a display name with at least 2 characters.");
    const client = await window.CommunitySupabaseClient.getClient();
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: { data: { display_name: normalizedName } },
    });
    if (error) throw new Error(error.message || "We could not create your Community account.");
    if (!data?.session?.user) {
      publishUser(null);
      return Object.freeze({
        status: "awaiting_verification",
        email: normalizedEmail,
        user: toDomainUser(data?.user),
      });
    }
    currentUser = toDomainUser(data.session.user, data.session);
    if (normalizedName) return upsertProfile(normalizedName);
    return publishUser(currentUser);
  }

  async function signInWithPassword({ email, password } = {}) {
    const normalizedEmail = window.EmailVerificationService.normalizeEmail(email);
    if (!window.EmailVerificationService.isValidEmailSyntax(normalizedEmail)) throw new Error("Enter a valid email address.");
    const client = await window.CommunitySupabaseClient.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password: String(password || ""),
    });
    if (error) throw new Error(error.message || "We could not sign you in. Check your email and password.");
    if (!data?.session?.user) throw new Error("Your Community session could not be established.");
    return publishUser(toDomainUser(data.session.user, data.session));
  }

  async function signInWithOtp(email) {
    const normalizedEmail = window.EmailVerificationService.normalizeEmail(email);
    if (!window.EmailVerificationService.isValidEmailSyntax(normalizedEmail)) throw new Error("Enter a valid email address.");
    const client = await window.CommunitySupabaseClient.getClient();
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: "https://gg122ma.github.io/Echowall/" },
    });
    if (error) throw new Error("We could not send the sign-in link. Please try again later.");
  }

  async function signOut() {
    const client = await window.CommunitySupabaseClient.getClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error("We could not sign you out. Please try again.");
    publishUser(null);
  }

  window.SupabaseAuthProvider = Object.freeze({
    provider: "supabase",
    ready,
    signUp,
    signInWithPassword,
    signInWithOtp,
    upsertProfile,
    signOut,
    toDomainUser,
    getStatus: () => Object.freeze({ status, error: lastError }),
    getCurrentUser: () => window.EmailVerificationService.isSessionActive(currentUser) ? currentUser : null,
    isAuthenticated: () => window.EmailVerificationService.isSessionActive(currentUser),
  });
})();
