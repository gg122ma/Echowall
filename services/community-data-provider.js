/** Hybrid router: Community may be remote; Building, Map, and Study remain local. */
(function () {
  function activation() { return window.CommunitySupabaseClient.getActivationState(); }
  function isRemoteRequested() { return activation().mode !== "local"; }
  function routeFor(contextType, scope) {
    if (contextType === "building" || contextType === "map") return "local";
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
  });
})();
