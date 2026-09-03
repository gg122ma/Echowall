/** Hybrid router: Community/Building/Map may be remote; Study remains local. */
(function () {
  function activation() { return window.CommunitySupabaseClient.getActivationState(); }
  function isRemoteRequested() { return activation().mode !== "local"; }
  // BACKEND V2.3: Building and Map now route to Supabase whenever remote
  // mode is active — same "supabase requested" gate Community already uses.
  // Building comments/replies stay local-only architecture regardless (this
  // function documents routing for posts, not the comment feature, which
  // is disabled for Building at the UI/DB layer instead — see app-wall.js
  // and api.comments_public's own scope_type<>'building' filter).
  function routeFor(contextType, scope) {
    if (contextType === "building" || contextType === "map") return isRemoteRequested() ? "supabase" : "local";
    if (contextType === "study") return "unchanged";
    if (contextType === "community" && ["global", "college", "jurusan"].includes(scope)) return isRemoteRequested() ? "supabase" : "local";
    return "local";
  }
  function repository() { return window.CommunitySupabaseRepositories; }
  function findPost(id) { return repository().posts.find(id); }
  function commentsFor(post) { return repository().comments.cached(post); }
  function commentThread(post) {
    const all = commentsFor(post);
    return all.filter(item => item.depth === 0).map(item => ({ ...item, replies: all.filter(reply => reply.depth === 1 && reply.parentCommentId === item.id) }));
  }

  window.CommunityDataProvider = Object.freeze({
    activation, isRemoteRequested, routeFor,
    getCurrentUser: () => isRemoteRequested() ? window.SupabaseAuthProvider.getCurrentUser() : window.AuthService.getCurrentUser(),
    ready: () => isRemoteRequested() ? window.SupabaseAuthProvider.ready() : Promise.resolve(window.AuthService.getCurrentUser()),
    cachedPosts: key => repository().posts.cached(key), refreshPosts: key => repository().posts.list(key), findPost,
    createPost: input => repository().posts.create(input),
    setQuestionStatus: (post, status) => repository().posts.setQuestionStatus(post, status),
    commentsFor, commentThread, commentCount: post => commentsFor(post).length,
    commentsLoaded: post => repository().comments.isLoaded(post),
    refreshComments: post => repository().comments.list(post),
    createComment: (post, input) => repository().comments.create(post, input),
    castVote: (post, value) => repository().votes.cast(post, value),
    // BACKEND V2.3 — Building Wall
    cachedBuildingPosts: (collegeId, buildingId) => repository().posts.cachedBuilding(collegeId, buildingId),
    refreshBuildingPosts: (collegeId, buildingId) => repository().posts.listBuilding(collegeId, buildingId),
    createBuildingPost: input => repository().posts.createBuilding(input),
    // BACKEND V2.3 — Map Post Directly (same canonical app.posts + app.post_map_anchors, never a second table)
    cachedMapAnchors: collegeId => repository().mapAnchors.cached(collegeId),
    refreshMapAnchors: collegeId => repository().mapAnchors.list(collegeId),
    createMapPost: input => repository().mapAnchors.create(input),
  });
})();
