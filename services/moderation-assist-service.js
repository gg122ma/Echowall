/**
 * ADMIN-V2-008 — Auto Moderation Assist.
 *
 * Lightweight, deterministic rule checks that FLAG content for a human
 * moderator to review faster -- this is assist, not automatic moderation
 * (spec section 30/56: "AI/自动化 moderation 只能辅助... 不能宣传 AI 完全取代
 * 人工审核"). Nothing in this file ever hides, rejects, or deletes content;
 * it only ever calls services/moderation-service.js's own
 * ensureAutoFlagModerationItem(), which creates a normal `pending`
 * ModerationItem a real moderator still has to act on through the existing
 * Approve/Reject/Hide flow (ADMIN-V2-004's reason-required rules apply
 * exactly the same to an auto-flagged item as to any other).
 *
 * Deliberately rule-based, not an external AI call (spec section 31: "不要
 * 调用昂贵外部 AI API... 优先 deterministic rules") -- every rule here is a
 * pure function of content already in memory, with no network request and
 * no per-evaluation cost beyond a few string comparisons.
 *
 * Load order: after services/moderation-service.js (uses
 * ensureAutoFlagModerationItem) and services/admin-permission-service.js is
 * not required at all -- this file performs no permission checks of its own
 * (ModerationService's own scope-gated reads/writes are unaffected by
 * anything here; an auto-flagged item is exactly as scope-restricted to
 * moderators as a reported one).
 */
(function () {
  const SUSPICIOUS_LINK_DOMAINS = Object.freeze([
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "buff.ly", "rebrand.ly",
  ]);
  const URL_PATTERN = /\bhttps?:\/\/[^\s]+/gi;
  const FLOOD_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  const FLOOD_THRESHOLD = 5;
  const REPETITION_THRESHOLD = 3;

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function extractUrls(content) {
    return String(content || "").match(URL_PATTERN) || [];
  }

  function isSuspiciousUrl(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return SUSPICIOUS_LINK_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false; // an unparseable "URL" isn't itself a suspicious-link signal
    }
  }

  // --- Community post rules ---------------------------------------------------
  //
  // `allNotes` is the full current notes array (same source app-data.js's
  // `notes`/`getRuntimeNotes()` already provides everywhere else in this
  // app) -- needed for the cross-note checks (repetition/flood/duplicate);
  // the single-note checks (suspicious links) don't need it.

  function evaluateCommunityPost(note, allNotes = []) {
    const rulesTriggered = [];
    let riskScore = 0;
    const content = String(note?.content || "");
    const normalizedContent = normalizeText(content);

    // Suspicious links: a known link-shortener domain, or an unusually high
    // link count for a short social post (flood-of-links is itself a spam
    // signal independent of the domain).
    const urls = extractUrls(content);
    const suspiciousUrls = urls.filter(isSuspiciousUrl);
    if (suspiciousUrls.length > 0) {
      rulesTriggered.push("suspicious_link_domain");
      riskScore += 40;
    }
    if (urls.length >= 3) {
      rulesTriggered.push("excessive_links");
      riskScore += 20;
    }

    if (normalizedContent && Array.isArray(allNotes) && allNotes.length) {
      const sameAuthorNotes = allNotes.filter(other =>
        other && other.id !== note.id
        && other.contextType === note.contextType
        && other.authorUserId != null && note.authorUserId != null
        && String(other.authorUserId) === String(note.authorUserId)
      );

      // Spam repetition: the same author has posted this exact content
      // (or the note itself) REPETITION_THRESHOLD+ times.
      const identicalCount = sameAuthorNotes.filter(other => normalizeText(other.content) === normalizedContent).length + 1;
      if (identicalCount >= REPETITION_THRESHOLD) {
        rulesTriggered.push("spam_repetition");
        riskScore += 35;
      }

      // Duplicate content: identical text already exists from a DIFFERENT
      // author too (not just the same author's own repetition above) --
      // assists the reviewer, never auto-deletes (spec section 32/34).
      const duplicateFromOthers = allNotes.some(other =>
        other && other.id !== note.id && normalizeText(other.content) === normalizedContent
        && String(other.authorUserId || "") !== String(note.authorUserId || "")
      );
      if (duplicateFromOthers) {
        rulesTriggered.push("duplicate_content");
        riskScore += 25;
      }

      // Flood: the same author posted FLOOD_THRESHOLD+ notes within a short
      // window (regardless of content) -- a burst-posting signal distinct
      // from repeating the same text.
      const noteTime = new Date(note.createdAt || 0).getTime();
      if (Number.isFinite(noteTime)) {
        const recentCount = sameAuthorNotes.filter(other => {
          const otherTime = new Date(other.createdAt || 0).getTime();
          return Number.isFinite(otherTime) && Math.abs(noteTime - otherTime) <= FLOOD_WINDOW_MS;
        }).length + 1;
        if (recentCount >= FLOOD_THRESHOLD) {
          rulesTriggered.push("flood_posting");
          riskScore += 20;
        }
      }
    }

    return {
      flagged: rulesTriggered.length > 0,
      riskScore: Math.min(100, riskScore),
      rulesTriggered,
      reason: rulesTriggered.length ? `Auto-flagged: ${rulesTriggered.join(", ")}` : null,
    };
  }

  // --- Study submission rules --------------------------------------------------

  const REQUIRED_STUDY_FIELDS = Object.freeze(["title", "jurusan", "semester", "subjectCode", "resourceType"]);

  function evaluateStudySubmission(submission) {
    const rulesTriggered = [];
    let riskScore = 0;

    const missingFields = REQUIRED_STUDY_FIELDS.filter(field => {
      const value = submission?.[field];
      return value == null || String(value).trim() === "";
    });
    if (missingFields.length > 0) {
      rulesTriggered.push("missing_required_metadata");
      riskScore += 30;
    }

    if (!submission?.fileId || !Number.isFinite(Number(submission?.fileSize)) || Number(submission?.fileSize) <= 0) {
      rulesTriggered.push("missing_or_broken_file");
      riskScore += 45;
    }

    // Hash duplicate -- reuses services/study-submission-service.js's own
    // already-computed SHA-256 duplicateStatus (ADMIN-V2-002's exact-match
    // guard); this rule does not recompute a hash of its own.
    if (submission?.duplicateStatus === "exact") {
      rulesTriggered.push("exact_hash_duplicate");
      riskScore += 50;
    } else if (submission?.duplicateStatus === "likely") {
      rulesTriggered.push("likely_duplicate");
      riskScore += 15;
    }

    return {
      flagged: rulesTriggered.length > 0,
      riskScore: Math.min(100, riskScore),
      rulesTriggered,
      reason: rulesTriggered.length ? `Auto-flagged: ${rulesTriggered.join(", ")}` : null,
      missingFields,
    };
  }

  // --- Apply: create/refresh the auto_flag ModerationItem ---------------------
  //
  // Best-effort, matching every other ModerationService integration in this
  // app -- a missing ModerationService must never throw out of an
  // evaluation call site (Community/Study's own real action already
  // completed by the time this runs).

  function applyAutoFlag(contentType, contentId, scope, evaluation) {
    if (!evaluation?.flagged) return null;
    try {
      return window.ModerationService?.ensureAutoFlagModerationItem?.({
        contentType,
        contentId,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        reason: evaluation.reason,
        riskScore: evaluation.riskScore,
      }) || null;
    } catch (error) {
      console.error("ModerationAssistService.applyAutoFlag failed:", error);
      return null;
    }
  }

  window.ModerationAssistService = Object.freeze({
    evaluateCommunityPost,
    evaluateStudySubmission,
    applyAutoFlag,
  });
})();
