/** Supabase Auth session provider for the Community runtime. */
(function () {
  let currentUser = null;
  let readyPromise = null;

  function toDomainUser(user) {
    if (!user) return null;
    const displayName = String(user.user_metadata?.display_name || user.user_metadata?.name || "").trim();
    return Object.freeze({
      id: String(user.id || ""),
      email: String(user.email || ""),
      displayName,
      role: "user",
      provider: "supabase",
    });
  }

  function publishUser(user) {
    currentUser = user;
    window.dispatchEvent?.(new CustomEvent("echo:communityauthchange", { detail: { user: currentUser } }));
    return currentUser;
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = window.CommunitySupabaseClient.getClient().then(async client => {
        const { data, error } = await client.auth.getSession();
        if (error) throw new Error("Your Community session could not be restored.");
        publishUser(toDomainUser(data?.session?.user));
        client.auth.onAuthStateChange((_event, session) => {
          publishUser(toDomainUser(session?.user));
        });
        return currentUser;
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
    const normalizedEmail = String(email || "").trim();
    const normalizedPassword = String(password || "");
    const normalizedName = String(displayName || "").trim();
    if (normalizedName.length < 2) throw new Error("Enter a display name with at least 2 characters.");
    const client = await window.CommunitySupabaseClient.getClient();
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: { data: { display_name: normalizedName } },
    });
    if (error) throw new Error(error.message || "We could not create your Community account.");
    if (!data?.session?.user) throw new Error("Your Community account did not receive an authenticated session.");
    currentUser = toDomainUser(data.session.user);
    if (normalizedName) return upsertProfile(normalizedName);
    return publishUser(currentUser);
  }

  async function signInWithPassword({ email, password } = {}) {
    const client = await window.CommunitySupabaseClient.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || ""),
    });
    if (error) throw new Error(error.message || "We could not sign you in. Check your email and password.");
    if (!data?.session?.user) throw new Error("Your Community session could not be established.");
    return publishUser(toDomainUser(data.session.user));
  }

  async function signInWithOtp(email) {
    const client = await window.CommunitySupabaseClient.getClient();
    const { error } = await client.auth.signInWithOtp({
      email: String(email || "").trim(),
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
    getCurrentUser: () => currentUser,
    isAuthenticated: () => Boolean(currentUser),
  });
})();
