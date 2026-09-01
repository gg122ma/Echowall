/** Community-only repositories. Supabase/PostgREST details terminate here. */
(function () {
  const postCache = new Map();
  const postUiIndex = new Map();
  const commentCache = new Map();
  const commentLoaded = new Set();
  const voteState = new Map();
  const inFlight = new Set();

  function friendlyError(error, fallback) {
    const code = String(error?.code || "");
    if (code === "COMMUNITY_STAGING_NOT_CONFIGURED") return error;
    if (code === "42501" || Number(error?.status) === 401 || Number(error?.status) === 403) return new Error("Please sign in with an active Community account to continue.");
    if (["22023", "23514"].includes(code)) return new Error("Please check the information you entered and try again.");
    if (code === "23503") return new Error("This Community item is no longer available.");
    if (code === "23505") return new Error("That action has already been completed.");
    return new Error(fallback || "Community is temporarily unavailable. Please try again later.");
  }

  async function once(key, action) {
    if (inFlight.has(key)) throw new Error("That action is already being sent.");
    inFlight.add(key);
    try { return await action(); }
    finally { inFlight.delete(key); }
  }

  function parseScopeKey(key) {
    const parsed = window.CommunityService.parseCommunityKey(key);
    if (!parsed) throw new Error("Choose a valid Community.");
    return parsed;
  }

  function rpcScope(scope) {
    return scope.scope === "global" ? "all_km" : scope.scope;
  }

  async function listPosts(communityKey) {
    const scope = parseScopeKey(communityKey);
    const client = await window.CommunitySupabaseClient.getClient();
    let query = client.from("posts_public").select("*").eq("scope_type", rpcScope(scope));
    if (scope.scope !== "global") query = query.eq("college_id", scope.orgId);
    if (scope.scope === "jurusan") query = query.eq("jurusan_id", scope.majorId);
    const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(500);
    if (error) throw friendlyError(error, "Community posts could not be loaded.");
    const posts = (data || []).map(row => {
      const post = window.CommunityRowAdapter.postFromRow(row);
      return Object.freeze({ ...post, userVote: voteState.get(post.remoteId) || null });
    });
    posts.forEach(post => {
      const key = String(post.id);
      const existing = postUiIndex.get(key);
      if (existing && existing.remoteId !== post.remoteId) {
        throw new Error("Community remote identity collision was blocked.");
      }
      postUiIndex.set(key, post);
    });
    postCache.set(communityKey, Object.freeze(posts));
    return posts;
  }

  async function createPost(input) {
    if (input.imageDataUrl || input.imageUrl || input.photo) throw new Error("Photo posting is not available in Community staging yet. Remove the photo to continue.");
    const scope = parseScopeKey(input.communityKey);
    return once("create-post", async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { error } = await client.rpc("create_post", {
        p_post_type: input.postType === "question" ? "question" : "discussion",
        p_scope_type: rpcScope(scope), p_content: String(input.content || ""),
        p_category: String(input.category || ""), p_shape: String(input.shape || ""),
        p_color: String(input.color || ""), p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous",
        p_college_id: scope.scope === "global" ? null : scope.orgId,
        p_jurusan_id: scope.scope === "jurusan" ? scope.majorId : null,
        p_building_id: null, p_rotation: Number(input.rotation || 0),
        p_position_x: Number(input.positionX || 10), p_position_y: Number(input.positionY || 15),
      });
      if (error) throw friendlyError(error, "Your note could not be published.");
      await listPosts(input.communityKey);
    });
  }

  function findPost(clientId) {
    return postUiIndex.get(String(clientId)) || null;
  }

  async function setQuestionStatus(post, status) {
    return once(`question:${post.remoteId}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { error } = await client.rpc(status === "solved" ? "solve_question" : "reopen_question", { p_post_id: post.remoteId });
      if (error) throw friendlyError(error, "The question status could not be changed.");
      await listPosts(post.communityKey);
    });
  }

  async function listComments(post) {
    const client = await window.CommunitySupabaseClient.getClient();
    const { data, error } = await client.from("comments_public").select("*").eq("post_id", post.remoteId).order("created_at", { ascending: true }).order("id", { ascending: true });
    if (error) throw friendlyError(error, "Comments could not be loaded.");
    const comments = (data || []).map(row => window.CommunityRowAdapter.commentFromRow(row, post));
    commentCache.set(post.remoteId, Object.freeze(comments));
    commentLoaded.add(post.remoteId);
    return comments;
  }

  async function createComment(post, input) {
    const parent = input.parentCommentId ? getComments(post).find(item => Number(item.id) === Number(input.parentCommentId)) : null;
    const operation = parent ? "create_reply" : "create_comment";
    const parameters = parent
      ? { p_parent_comment_id: parent.remoteId, p_content: input.content, p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous" }
      : { p_post_id: post.remoteId, p_content: input.content, p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous" };
    return once(`comment:${post.remoteId}:${parent?.remoteId || "root"}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { error } = await client.rpc(operation, parameters);
      if (error) throw friendlyError(error, "Your comment could not be published.");
      await listComments(post);
    });
  }

  function getComments(post) { return commentCache.get(post?.remoteId) || []; }
  function hasCommentsLoaded(post) { return commentLoaded.has(post?.remoteId); }

  async function castVote(post, value) {
    return once(`vote:${post.remoteId}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { data, error } = await client.rpc("cast_vote", { p_post_id: post.remoteId, p_value: value });
      if (error) throw friendlyError(error, "Your vote could not be saved.");
      const result = Array.isArray(data) ? data[0] : data;
      const currentVote = Number(result?.current_vote);
      voteState.set(post.remoteId, currentVote === 1 ? "up" : (currentVote === -1 ? "down" : null));
      await listPosts(post.communityKey);
      return result;
    });
  }

  window.CommunitySupabaseRepositories = Object.freeze({
    posts: Object.freeze({ list: listPosts, cached: key => postCache.get(key) || [], find: findPost, create: createPost, setQuestionStatus }),
    comments: Object.freeze({ list: listComments, cached: getComments, isLoaded: hasCommentsLoaded, create: createComment }),
    votes: Object.freeze({ cast: castVote }),
    friendlyError,
  });
})();
