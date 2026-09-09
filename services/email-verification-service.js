(function () {
  "use strict";

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmailSyntax(value) {
    const email = normalizeEmail(value);
    if (!email || email.length > 254 || email.includes("..")) return false;
    const parts = email.split("@");
    if (parts.length !== 2 || !parts[0] || parts[0].length > 64) return false;
    return /^[^\s@]+$/.test(parts[0]) && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(parts[1]);
  }

  function isSessionActive(user, now = Date.now()) {
    if (!user) return false;
    if (!user.sessionExpiresAt) return true;
    const expiresAt = Date.parse(user.sessionExpiresAt);
    return Number.isFinite(expiresAt) && expiresAt > now;
  }

  function isVerified(user) {
    if (!user) return false;
    if (user.provider !== "supabase") return true;
    return Boolean(user.emailConfirmedAt) && user.isEmailVerified === true;
  }

  function canPublish(user, now = Date.now()) {
    return Boolean(user) && isSessionActive(user, now) && isVerified(user);
  }

  function denialMessage(user, now = Date.now()) {
    if (!user || !isSessionActive(user, now)) return "Sign in before publishing.";
    if (!isVerified(user)) return "Verify your email address before publishing or uploading a photo.";
    return "This account cannot publish right now.";
  }

  window.EmailVerificationService = Object.freeze({ normalizeEmail, isValidEmailSyntax, isSessionActive, isVerified, canPublish, denialMessage });
}());
