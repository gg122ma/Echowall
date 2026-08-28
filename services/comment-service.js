/**
 * Comment / Reply storage (COM-V2-005). Prototype LocalStorage adapter,
 * storage key `echo-wall-comments:v1` (schema defined in COM-V2-001,
 * services/community-service.js). Only depth 0 (Comment) and depth 1
 * (Reply) are allowed — no deeper nesting. Comments are Community-post-only;
 * Building notes never have comments.
 */
(function () {
  const STORAGE_KEY = (window.CommunityService && window.CommunityService.COMMENT_STORAGE_KEY) || "echo-wall-comments:v1";
  const MAX_LENGTH = 500;
  let comments = [];
  let nextCommentId = 1;
  let loaded = false;

  function normalizeStoredComment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = Number(raw.id);
    const postId = Number(raw.postId);
    if (!Number.isFinite(id) || !Number.isFinite(postId)) return null;
    const content = String(raw.content || "").trim().slice(0, MAX_LENGTH);
    if (!content) return null;
    const depth = raw.depth === 1 ? 1 : 0;
    const parentCommentId = depth === 1 && Number.isFinite(Number(raw.parentCommentId)) ? Number(raw.parentCommentId) : null;
    const isAnonymous = raw.isAnonymous !== false;
    return {
      id, postId, parentCommentId, depth,
      authorUserId: raw.authorUserId ? String(raw.authorUserId) : "",
      isAnonymous,
      authorNickname: isAnonymous ? null : (raw.authorNickname ? String(raw.authorNickname) : null),
      content,
      moderationStatus: ["published", "pending", "flagged", "rejected"].includes(raw.moderationStatus) ? raw.moderationStatus : "published",
      isHidden: raw.isHidden === true,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || null,
    };
  }

  function loadComments() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      comments = Array.isArray(parsed) ? parsed.map(normalizeStoredComment).filter(Boolean) : [];
    } catch {
      comments = [];
    }
    const ids = comments.map(c => c.id).filter(Number.isFinite);
    nextCommentId = (ids.length ? Math.max(...ids) : 0) + 1;
    loaded = true;
  }

  function saveComments() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
      return true;
    } catch {
      return false;
    }
  }

  function ensureLoaded() {
    if (!loaded) loadComments();
  }

  // Comments are always isolated by postId — every read filters on it, no
  // shared/global comment list is ever exposed.
  function getCommentsForPost(postId) {
    ensureLoaded();
    const canonicalPostId = Number(postId);
    return comments
      .filter(comment => comment.postId === canonicalPostId && !comment.isHidden && comment.moderationStatus === "published")
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .map(comment => ({ ...comment }));
  }

  // Returns top-level comments (depth 0), each with its depth-1 replies
  // nested under `replies` — the one-level thread shape the UI renders.
  function getCommentThreadForPost(postId) {
    const all = getCommentsForPost(postId);
    return all
      .filter(comment => comment.depth === 0)
      .map(comment => ({
        ...comment,
        replies: all.filter(reply => reply.depth === 1 && reply.parentCommentId === comment.id),
      }));
  }

  function getCommentCount(postId) {
    return getCommentsForPost(postId).length;
  }

  function createComment(input = {}) {
    ensureLoaded();
    const postId = Number(input.postId);
    if (!Number.isFinite(postId)) throw new Error("A valid post is required.");
    const content = String(input.content || "").trim();
    if (!content) throw new Error("Write a comment before sending.");
    if (content.length > MAX_LENGTH) throw new Error(`Comments must be ${MAX_LENGTH} characters or fewer.`);
    const authorUserId = String(input.authorUserId || "");
    if (!authorUserId) throw new Error("Sign in before commenting.");
    const isAnonymous = input.isAnonymous !== false;
    const authorNickname = isAnonymous ? null : (String(input.authorNickname || "").trim() || null);
    if (!isAnonymous && !authorNickname) throw new Error("Your account needs a display name before publishing.");

    let depth = 0;
    let parentCommentId = null;
    if (input.parentCommentId !== null && input.parentCommentId !== undefined) {
      const parent = comments.find(c => c.id === Number(input.parentCommentId) && c.postId === postId);
      if (!parent) throw new Error("The comment you are replying to no longer exists.");
      if (parent.depth >= 1) throw new Error("Replies can only be one level deep.");
      depth = 1;
      parentCommentId = parent.id;
    }

    const comment = {
      id: nextCommentId,
      postId, parentCommentId, depth,
      authorUserId, isAnonymous, authorNickname,
      content: content.slice(0, MAX_LENGTH),
      moderationStatus: "published",
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    nextCommentId += 1;
    comments.push(comment);
    if (!saveComments()) {
      comments.pop();
      nextCommentId -= 1;
      throw new Error("Browser storage is full.");
    }
    return { ...comment };
  }

  window.CommentService = Object.freeze({
    STORAGE_KEY,
    getCommentsForPost,
    getCommentThreadForPost,
    getCommentCount,
    createComment,
  });
})();
