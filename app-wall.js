const MAX_IMAGE_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_STORED_IMAGE_BYTES = 450 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const NOTE_COLOR_PRESETS = Object.freeze([
  { value:"#BFDBFE", label:"Soft blue" },
  { value:"#FEF08A", label:"Soft yellow" },
  { value:"#BBF7D0", label:"Soft green" },
  { value:"#FBCFE8", label:"Soft pink" },
  { value:"#FED7AA", label:"Soft orange" },
  { value:"#FFF7ED", label:"Warm cream" },
  { value:"#E9D5FF", label:"Soft purple" },
  { value:"#CBD5E1", label:"Grey blue" },
  { value:"#CFFAFE", label:"Soft cyan" },
  { value:"#FDE68A", label:"Golden yellow" },
]);

let pendingImageDataUrl = "";
let pendingImageName = "";
let imageProcessing = false;

function dataUrlByteSize(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const padding = (base64.match(/=*$/) || [""])[0].length;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(blob);
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file is not a readable image."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("This browser could not process the selected image."));
    }, type, quality);
  });
}

async function compressNoteImage(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Please choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_IMAGE_SOURCE_BYTES) {
    throw new Error("The original image must be 8 MB or smaller.");
  }

  const source = await loadImageFile(file);
  const maxDimension = 1280;
  const initialScale = Math.min(1, maxDimension / Math.max(source.naturalWidth, source.naturalHeight));
  let width = Math.max(1, Math.round(source.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(source.naturalHeight * initialScale));
  let quality = 0.84;
  let lastDataUrl = "";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Image processing is not available in this browser.");

    context.drawImage(source, 0, 0, width, height);
    let blob;
    try {
      blob = await canvasToBlob(canvas, "image/webp", quality);
    } catch {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    lastDataUrl = await blobToDataUrl(blob);
    if (blob.size <= MAX_STORED_IMAGE_BYTES) return lastDataUrl;

    if (quality > 0.58) {
      quality -= 0.08;
    } else {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
      quality = 0.76;
    }
  }

  if (dataUrlByteSize(lastDataUrl) <= MAX_STORED_IMAGE_BYTES * 1.15) return lastDataUrl;
  throw new Error("This image is too detailed to store locally. Please choose a smaller image.");
}

function updateImagePreview() {
  const preview = document.getElementById("image-preview");
  const previewImage = document.getElementById("image-preview-img");
  if (!preview || !previewImage) return;

  const safeSource = safeImageDataUrl(pendingImageDataUrl);
  if (!safeSource) {
    preview.classList.add("hidden");
    previewImage.removeAttribute("src");
    return;
  }

  previewImage.src = safeSource;
  preview.classList.remove("hidden");
}

function setImageStatus(message, isError = false) {
  const status = document.getElementById("image-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("form-error", isError);
}

function setImageProcessing(isProcessing) {
  imageProcessing = isProcessing;
  const submit = document.getElementById("note-submit");
  const input = document.getElementById("form-image");
  if (submit) {
    submit.disabled = isProcessing;
    submit.textContent = isProcessing ? "Processing photo…" : "📌 Pin to Wall";
  }
  if (input) input.disabled = isProcessing;
}

async function handleImageSelection(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  pendingImageDataUrl = "";
  pendingImageName = "";
  updateImagePreview();
  setImageStatus("");

  if (!file) return;

  setImageProcessing(true);
  setImageStatus("Resizing photo for local storage…");
  try {
    pendingImageDataUrl = await compressNoteImage(file);
    pendingImageName = String(file.name || "photo").slice(0, 120);
    updateImagePreview();
    const sizeKb = Math.ceil(dataUrlByteSize(pendingImageDataUrl) / 1024);
    setImageStatus(`Photo ready (${sizeKb} KB after compression).`);
  } catch (error) {
    input.value = "";
    pendingImageDataUrl = "";
    pendingImageName = "";
    updateImagePreview();
    setImageStatus(error instanceof Error ? error.message : "The photo could not be processed.", true);
  } finally {
    setImageProcessing(false);
  }
}

function removeSelectedImage() {
  pendingImageDataUrl = "";
  pendingImageName = "";
  const input = document.getElementById("form-image");
  if (input) input.value = "";
  updateImagePreview();
  setImageStatus("");
}


let selectedPhotoCropScale = 1;
let selectedImageFit = "cover";
const noteTranslationState = new Map();

function renderWall(container, orgId, majorId) {
  const org = organizations.find(item => item.id === orgId);
  const major = majors.find(item => item.id === majorId);
  renderContextWall(container, {
    contextType: "community",
    communityScope: "jurusan",
    communityKey: CommunityService.getCommunityKey("jurusan", orgId, majorId),
    orgId,
    majorId,
    title: major?.name || "",
    kicker: `${org?.name || ""} community`,
    icon: org?.emoji || "🏛️",
    backPath: `#/community/${orgId}`,
  });
}

// Community V2 (COM-V2-003): Global + College General reuse the exact same
// Sticky Wall renderer as Jurusan — only the communityKey/scope differ, so
// there is no second wall implementation.
function renderCommunityGlobalWall(container) {
  renderContextWall(container, {
    contextType: "community",
    communityScope: "global",
    communityKey: CommunityService.getCommunityKey("global", null, null),
    orgId: null,
    majorId: null,
    title: I18n.t("community.hub.globalName"),
    kicker: I18n.t("community.hub.kicker"),
    icon: "🌐",
    backPath: "#/community",
  });
}

function renderCommunityCollegeGeneralWall(container, orgId) {
  const org = organizations.find(item => item.id === orgId);
  if (!org) {
    renderCommunityNotFound(container, "#/community", I18n.t("community.hub.title"));
    return;
  }
  renderContextWall(container, {
    contextType: "community",
    communityScope: "college",
    communityKey: CommunityService.getCommunityKey("college", orgId, null),
    orgId,
    majorId: null,
    title: `${org.name} ${I18n.t("community.landing.generalTitle")}`,
    kicker: I18n.t("org.workspace"),
    icon: org.emoji || "🏫",
    backPath: `#/community/${orgId}`,
  });
}

function leaveContextWall(backPath) {
  navigate(backPath);
}

function leaveBuildingWall(placeId) {
  const building = getCampusBuilding(placeId);
  const fallbackPath = building ? `#/place/${encodeURIComponent(building.id)}` : "#/places";
  if (history.length > 1) {
    history.back();
    return;
  }
  navigate(fallbackPath);
}

function renderBuildingWall(container, placeId) {
  const building = getCampusBuilding(placeId);
  if (!building) {
    container.innerHTML = `<section class="container error-page"><h1>Building not found</h1><button class="btn btn-primary" onclick="navigate('#/places')">${I18n.t("place.back")}</button></section>`;
    return;
  }
  renderContextWall(container, {
    contextType: "building",
    placeId: building.id,
    title: building.name,
    kicker: getBuildingZoneName(building),
    icon: building.emoji || "🏢",
    backPath: `#/place/${building.id}`,
  });
}

function renderContextWall(container, context) {
  wallState.contextType = context.contextType;
  wallState.orgId = context.orgId || 0;
  wallState.majorId = context.majorId || 0;
  wallState.placeId = context.placeId || "";
  // Community V2 (COM-V2-003): communityKey/communityScope are the single
  // source of truth for which notes belong on this wall — orgId/majorId
  // above stay as internal "unset" bookkeeping (0), never written into a
  // note's own orgId/majorId for Global/College General (see handleFormSubmit).
  wallState.communityScope = context.communityScope || null;
  wallState.communityKey = context.communityKey || "";
  const contextNotes = getContextNotes();
  const visibleCount = wallDisplayNoteCount(contextNotes.length);
  const backAction = context.contextType === "building"
    ? `leaveBuildingWall('${escapeHtml(context.placeId)}')`
    : `leaveContextWall('${escapeHtml(context.backPath)}')`;

  container.innerHTML = `
    <div class="wall-page page-reveal">
      <div class="wall-sticky-stack">
        <header class="wall-context-bar">
          <div class="wall-context-main">
            <button class="wall-back-btn" onclick="${backAction}" aria-label="Leave this wall">←</button>
            <div class="wall-context-icon">${escapeHtml(context.icon)}</div>
            <div><p class="wall-context-kicker">${escapeHtml(context.kicker)}</p><div class="wall-context-title"><h1>${escapeHtml(context.title)}</h1><span id="wall-result-count" class="wall-title-count">${escapeHtml(formatVisibleNoteCount(visibleCount))}</span></div></div>
          </div>
          <div class="wall-context-meta"><span class="wall-live-dot"></span><span>${I18n.t("wall.shared")}</span></div>
        </header>

        <div class="toolbar">
          <div class="toolbar-scroll" aria-label="Wall controls">
            <div class="filter-group" aria-label="Category filters">
              <button class="filter-btn ${wallState.category === "all" ? "active" : ""}" data-category="all" onclick="setCategoryFilter('all')">${I18n.t("wall.all")}</button>
              <button class="filter-btn ${wallState.category === "academic" ? "active" : ""}" data-category="academic" onclick="setCategoryFilter('academic')">📚 ${I18n.t("wall.academic")}</button>
              <button class="filter-btn ${wallState.category === "koko" ? "active" : ""}" data-category="koko" onclick="setCategoryFilter('koko')">🎖️ ${I18n.t("wall.activities")}</button>
              <button class="filter-btn ${wallState.category === "campus_life" ? "active" : ""}" data-category="campus_life" onclick="setCategoryFilter('campus_life')">🏫 ${I18n.t("wall.campusLife")}</button>
              <button class="filter-btn ${wallState.category === "emotional" ? "active" : ""}" data-category="emotional" onclick="setCategoryFilter('emotional')">💛 ${I18n.t("wall.support")}</button>
            </div>
            ${context.contextType === "community" ? `
            <span class="toolbar-divider" aria-hidden="true"></span>
            <div class="filter-group compact" aria-label="Post type filters">
              <button class="filter-btn ${wallState.postType === "all" ? "active" : ""}" data-post-type="all" onclick="setPostTypeFilter('all')">${I18n.t("wall.typeAll")}</button>
              <button class="filter-btn ${wallState.postType === "discussion" ? "active" : ""}" data-post-type="discussion" onclick="setPostTypeFilter('discussion')">💬 ${I18n.t("wall.typeDiscussion")}</button>
              <button class="filter-btn ${wallState.postType === "question" ? "active" : ""}" data-post-type="question" onclick="setPostTypeFilter('question')">❓ ${I18n.t("wall.typeQuestion")}</button>
            </div>` : ""}
            <span class="toolbar-divider" aria-hidden="true"></span>
            <div class="filter-group compact" aria-label="Sort order">
              <button class="filter-btn ${wallState.sort === "hot" ? "active" : ""}" data-sort="hot" onclick="setSortOrder('hot')">🔥 ${I18n.t("wall.hot")}</button>
              <button class="filter-btn ${wallState.sort === "new" ? "active" : ""}" data-sort="new" onclick="setSortOrder('new')">🕒 ${I18n.t("wall.new")}</button>
              ${context.contextType === "community" ? `<button class="filter-btn ${wallState.sort === "unanswered" ? "active" : ""}" data-sort="unanswered" onclick="setSortOrder('unanswered')">❓ ${I18n.t("wall.unanswered")}</button>` : ""}
            </div>
          </div>
          <div class="toolbar-actions">
            <label class="search-box"><span class="search-icon">⌕</span><input type="search" class="search-input" placeholder="${escapeHtml(I18n.t("wall.search"))}" value="${escapeHtml(wallState.search || "")}" oninput="handleSearchInput(event)" aria-label="${escapeHtml(I18n.t("wall.search"))}" /><button type="button" class="search-clear ${wallState.search ? "" : "hidden"}" onclick="clearSearch()" aria-label="Clear search">✕</button></label>
            <button class="btn btn-primary btn-round wall-compose-btn" onclick="openDrawer()"><span>＋</span> ${I18n.t("wall.leaveNote")}</button>
          </div>
        </div>
      </div>

      <div class="wall-canvas-wrap"><div class="wall-canvas-grid" aria-hidden="true"></div><div class="wall-canvas" id="wall-canvas" aria-live="polite"></div></div>
    </div>`;
  renderWallNotes();
}

// UI-only display-count override for the Building Wall header, sourced from
// the same data/demo-display-counts.js config every other Building entry
// point reads (Building Stories, Building Detail, Echo Map). Only applies to
// building context — Community wall headers stay real (a Global/College
// General/Jurusan wall count is a narrower, distinct metric from the
// College Community card total, see HANDOFF.md). getContextNotes()'s actual
// returned array (what renderWallNotes() renders as real note cards) is
// never touched by this — only this header's text.
function wallDisplayNoteCount(realCount) {
  if (wallState.contextType === "building" && typeof getBuildingDisplayCount === "function") {
    return getBuildingDisplayCount(wallState.placeId, realCount);
  }
  return realCount;
}

function getContextNotes() {
  if (wallState.contextType === "building") return getVisibleBuildingNotes(wallState.placeId);
  // Community V2 (COM-V2-003): filter by communityKey (global:all/college:{orgId}/
  // jurusan:{orgId}:{majorId}) via CommunityService, not raw orgId/majorId
  // comparison — this is what lets Global/College General/Jurusan share one
  // filter without any orgId=0/majorId=0 special-casing.
  const communityKey = wallState.communityKey;
  return getRuntimeNotes().filter(note => {
    if (note.isHidden || note.contextType !== "community") return false;
    if (communityKey) return CommunityService.getCommunityKeyForNote(note) === communityKey;
    return Number(note.orgId) === wallState.orgId && Number(note.majorId) === wallState.majorId;
  });
}

function formatVisibleNoteCount(count) {
  const safeCount = Math.max(0, Math.trunc(Number(count) || 0));
  const language = I18n.getLanguage();
  if (language === "ms") return `${safeCount} nota`;
  if (language === "zh") return `${safeCount}条留言`;
  return `${safeCount} ${safeCount === 1 ? "note" : "notes"}`;
}

function getDisplayedNoteEngagementScore(note) {
  return typeof window.getNoteEngagementScore === "function"
    ? window.getNoteEngagementScore(note)
    : Number(note?.score || 0);
}

function getFilteredNotes() {
  // Community V2 (COM-V2-006): "Unanswered" is both a filter and a sort —
  // open questions with zero published comments, newest first. Discussion
  // posts and solved/answered questions never appear under it.
  const isUnansweredSort = wallState.contextType === "community" && wallState.sort === "unanswered";
  return getContextNotes().filter(note => {
    if (wallState.category !== "all" && note.category !== wallState.category) return false;
    // Community V2 (COM-V2-004): Type filter only applies to community
    // notes — building notes have no postType and are never affected.
    if (wallState.contextType === "community" && wallState.postType !== "all" && note.postType !== wallState.postType) return false;
    if (isUnansweredSort) {
      const commentCount = window.CommentService?.getCommentCount(note.id) ?? 0;
      if (note.postType !== "question" || note.questionStatus !== "open" || commentCount !== 0) return false;
    }
    const query = wallState.search.trim().toLowerCase();
    if (!query) return true;
    const content = String(note.content || "").toLowerCase();
    const author = note.isAnonymous ? "anonymous" : String(note.authorNickname || "user").toLowerCase();
    return content.includes(query) || author.includes(query);
  }).sort((a, b) => {
    if (wallState.sort === "new" || isUnansweredSort) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    const scoreDifference = getDisplayedNoteEngagementScore(b) - getDisplayedNoteEngagementScore(a);
    if (scoreDifference) return scoreDifference;
    const aDemoOrder = Number(a.demoEngagementOrder);
    const bDemoOrder = Number(b.demoEngagementOrder);
    if (Number.isFinite(aDemoOrder) && Number.isFinite(bDemoOrder)) return aDemoOrder - bDemoOrder;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function stableWallLayoutHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getWallLayoutClass() {
  const layoutKey = wallState.contextType === "building"
    ? `building:${wallState.placeId}`
    : `community:${wallState.orgId}:${wallState.majorId}`;
  return `wall-layout-${stableWallLayoutHash(layoutKey) % 4}`;
}

function renderWallNotes() {
  const canvas = document.getElementById("wall-canvas");
  if (!canvas) return;
  canvas.className = `wall-canvas ${getWallLayoutClass()}`;
  const filtered = getFilteredNotes();
  const resultCount = document.getElementById("wall-result-count");
  if (resultCount) resultCount.textContent = formatVisibleNoteCount(wallDisplayNoteCount(getContextNotes().length));

  if (!filtered.length) {
    canvas.style.minHeight = "560px";
    canvas.innerHTML = `<div class="wall-empty-state"><div class="wall-empty-icon">🍃</div><h2>${I18n.t("wall.empty.title")}</h2><p>${I18n.t("wall.empty.body")}</p><button class="btn btn-primary" onclick="openDrawer()">${I18n.t("wall.leaveNote")}</button></div>`;
    return;
  }

  canvas.style.minHeight = "560px";
  canvas.innerHTML = "";
  filtered.forEach((note, index) => canvas.appendChild(buildNoteDOM(note, index)));
}

function getSafeNoteColor(note, category) {
  const noteColor = String(note?.color || "").trim();
  const categoryColor = String(CATEGORY_COLORS[category]?.[0] || "#DBEAFE");
  if (/^#[0-9a-fA-F]{6}$/.test(noteColor)) return noteColor;
  return /^#[0-9a-fA-F]{6}$/.test(categoryColor) ? categoryColor : "#DBEAFE";
}

// Community V2 (COM-V2-004): Question badge. Discussion posts show no
// badge at all — only Question posts get QUESTION + OPEN/SOLVED. Building
// Building and Map-authored building notes now use the same postType field.
function setQuestionStatus(noteId, status) {
  const currentUser = AuthService.getCurrentUser();
  const note = getRuntimeNotes().find(item => Number(item.id) === Number(noteId));
  if (!note || (note.isDemoSeed === true && note.isDemoSeedRuntime === true)) return;
  // Community V2 (COM-V2-007): unified permission hook — see
  // services/permission-service.js for the full moderation-scope rules.
  if (!PermissionService.canUserMarkSolved(currentUser, note)) { showToast(I18n.t("question.notAllowed")); return; }
  note.questionStatus = status === "solved" ? "solved" : "open";
  note.updatedAt = new Date().toISOString();
  if (!saveNotes()) { showToast("Browser storage is full."); return; }
  renderWallNotes();
  openModal(noteId);
}

function getQuestionBadgeHTML(note) {
  if (note?.postType !== "question") return "";
  const isSolved = note.questionStatus === "solved";
  const statusLabel = isSolved ? I18n.t("wall.solvedBadge") : I18n.t("wall.openBadge");
  return `<span class="question-badge ${isSolved ? "is-solved" : "is-open"}">❓ ${escapeHtml(I18n.t("wall.questionBadge"))} · ${escapeHtml(statusLabel)}</span>`;
}

function buildNoteDOM(note, index) {
  const element = document.createElement("article");
  const category = Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, note.category) ? note.category : "academic";
  const shape = SHAPES.includes(note.shape) ? note.shape : "rounded";
  const imageSource = getNoteImageSource(note);
  // COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY: isDemoSeed is internal
  // bookkeeping only now (kept for QA/debugging) -- it no longer hides any
  // reader-facing UI. Seed/default community posts render and behave
  // exactly like normal posts (click, open, comment, reply). The one
  // narrow exception is voting in the modal (see openModal()): seed note
  // objects are Object.frozen at seed-activation time, so mutating
  // upvotes/downvotes on them can never actually persist -- that is a
  // storage-layer constraint, not a "seed content is read-only" policy, and
  // is not treated as one anywhere else in this file.
  const isDemoSeed = note.isDemoSeed === true && note.isDemoSeedRuntime === true;
  element.className = `note-item shape-${shape} cat-${category}${imageSource ? " has-photo" : ""}`;
  if (isDemoSeed) element.dataset.demoSeed = "showcase";
  element.style.backgroundColor = getSafeNoteColor(note, category);
  element.style.setProperty("--note-delay", `${Math.min(index * 35, 350)}ms`);
  element.style.setProperty("--photo-scale", String(Math.max(1, Math.min(1.8, Number(note.imageCropScale || 1)))));
  element.style.setProperty("--photo-fit", note.imageFit === "contain" ? "contain" : "cover");

  const rotation = Number.isFinite(Number(note.rotation)) ? Number(note.rotation) : 0;
  element.style.setProperty("--note-rotation", `${Math.max(-2.5, Math.min(2.5, rotation))}deg`);
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", `Open note by ${note.isAnonymous ? "Anonymous" : note.authorNickname || "User"}`);
  element.onclick = () => openModal(note.id);
  element.onkeydown = event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openModal(note.id); }
  };

  const name = note.isAnonymous ? "Anonymous" : (note.authorNickname || "User");
  const categoryIcon = { academic: "📚", koko: "🎖️", campus_life: "🏫", emotional: "💛" }[category];
  // This card-level control never votes directly (voteNote() only runs from
  // inside the modal) -- it just opens the modal, showing the current
  // score, so the exact same markup is correct for every post regardless of
  // isDemoSeed.
  const noteAction = `<button class="note-votes ${note.userVote ? "voted" : ""}" onclick="openModal(${Number(note.id)})" aria-label="Open note voting">👍 ${getDisplayedNoteEngagementScore(note)}</button>`;
  // Community V2 (COM-V2-005): comment count is a live read from
  // CommentService (the real source of truth), not the note's own cached
  // commentCount field — clicking the card still opens the Detail Modal,
  // comments never expand inline on the wall.
  const commentCountHTML = note.contextType === "community"
    ? `<span class="note-comment-count" aria-label="Comments">💬 ${Number(window.CommentService?.getCommentCount(note.id) ?? note.commentCount ?? 0)}</span>`
    : "";
  element.innerHTML = `<div class="note-pin" aria-hidden="true"></div><div class="note-category-label">${categoryIcon} ${category.replace("campus_life", "campus life")}</div>${getQuestionBadgeHTML(note)}${imageSource ? `<div class="note-photo"><img src="${imageSource}" alt="${escapeHtml(note.imageName || "Photo attached to note")}" loading="lazy" /></div>` : ""}<div class="note-content">${escapeHtml(note.content)}</div><div class="note-footer" onclick="event.stopPropagation()"><span class="note-author">👤 ${escapeHtml(name)}</span>${commentCountHTML}${noteAction}</div>`;
  return element;
}

let searchTimer;
function handleSearchInput(event) {
  const value = event.target.value;
  document.querySelector(".search-clear")?.classList.toggle("hidden", !value);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { wallState.search = value; renderWallNotes(); }, 180);
}
function clearSearch() {
  wallState.search = "";
  const input = document.querySelector(".search-input");
  if (input) { input.value = ""; input.focus(); }
  document.querySelector(".search-clear")?.classList.add("hidden");
  renderWallNotes();
}
function setCategoryFilter(category) {
  wallState.category = category;
  document.querySelectorAll("[data-category]").forEach(button => button.classList.toggle("active", button.dataset.category === category));
  renderWallNotes();
}
function setSortOrder(sort) {
  wallState.sort = sort;
  document.querySelectorAll("[data-sort]").forEach(button => button.classList.toggle("active", button.dataset.sort === sort));
  renderWallNotes();
}
function setPostTypeFilter(postType) {
  wallState.postType = postType;
  document.querySelectorAll("[data-post-type]").forEach(button => button.classList.toggle("active", button.dataset.postType === postType));
  renderWallNotes();
}

async function toggleNoteTranslation(id) {
  const state = noteTranslationState.get(Number(id));
  if (state?.showTranslated) {
    noteTranslationState.set(Number(id), { ...state, showTranslated: false });
    openModal(id);
    return;
  }
  if (state?.translatedText) {
    noteTranslationState.set(Number(id), { ...state, showTranslated: true });
    openModal(id);
    return;
  }
  const note = getRuntimeNotes().find(item => Number(item.id) === Number(id));
  if (!note) return;
  const button = document.getElementById("modal-translate-button");
  if (button) { button.disabled = true; button.textContent = I18n.t("common.loading"); }
  try {
    const translatedText = await TranslationService.translateText(note.content, I18n.getLanguage());
    noteTranslationState.set(Number(id), { translatedText, showTranslated: true });
    openModal(id);
  } catch (error) {
    showToast(error?.code === "TRANSLATION_NOT_CONFIGURED" ? I18n.t("wall.translationUnavailable") : (error?.message || I18n.t("common.error")));
    if (button) { button.disabled = false; button.textContent = I18n.t("wall.translate"); }
  }
}

// Community V2 (COM-V2-005): Comments + one-level Reply, rendered inside
// the existing Detail Modal (no separate Post Detail route this stage).
// Building notes never get a comments section — gated by contextType below.
function getCommentAuthorLabel(comment) {
  return comment.isAnonymous ? "Anonymous" : (comment.authorNickname || "User");
}

function buildCommentHTML(comment, isReply) {
  const replyControlsHTML = isReply ? "" : `
    <button class="modal-comment-reply-btn" type="button" onclick="toggleCommentReplyBox(${Number(comment.id)})">${escapeHtml(I18n.t("comments.reply"))}</button>
    <div class="modal-comment-reply-box hidden" id="reply-box-${Number(comment.id)}">
      <textarea class="form-textarea" id="reply-input-${Number(comment.id)}" maxlength="500" placeholder="${escapeHtml(I18n.t("comments.replyPlaceholder"))}"></textarea>
      <div class="modal-comment-composer-row">
        <label class="comment-anon-toggle"><input type="checkbox" id="reply-show-name-${Number(comment.id)}" /> <span>${escapeHtml(I18n.t("comments.showName"))}</span></label>
        <button class="btn btn-outline btn-sm" type="button" onclick="submitComment(${Number(comment.postId)}, ${Number(comment.id)})">${escapeHtml(I18n.t("comments.send"))}</button>
      </div>
    </div>`;
  return `<div class="modal-comment${isReply ? " modal-comment-reply" : ""}" data-comment-id="${Number(comment.id)}">
    <div class="modal-comment-meta"><b>${escapeHtml(getCommentAuthorLabel(comment))}</b><span>${formatDate(comment.createdAt, false)}</span></div>
    <p class="modal-comment-text">${escapeHtml(comment.content)}</p>
    ${replyControlsHTML}
  </div>`;
}

function renderCommentsSectionHTML(postId) {
  if (typeof window.CommentService === "undefined") return "";
  const thread = CommentService.getCommentThreadForPost(postId);
  const count = CommentService.getCommentCount(postId);
  const commentsListHTML = thread.length
    ? thread.map(comment => buildCommentHTML(comment, false) + comment.replies.map(reply => buildCommentHTML(reply, true)).join("")).join("")
    : `<p class="modal-comments-empty">${escapeHtml(I18n.t("comments.empty"))}</p>`;
  return `<div class="modal-comments" data-post-id="${Number(postId)}">
    <h4 class="modal-comments-title">💬 ${escapeHtml(I18n.t("comments.title"))} (${count})</h4>
    <div class="modal-comments-list">${commentsListHTML}</div>
    <div class="modal-comment-composer">
      <textarea class="form-textarea" id="comment-input" maxlength="500" placeholder="${escapeHtml(I18n.t("comments.placeholder"))}"></textarea>
      <div class="modal-comment-composer-row">
        <label class="comment-anon-toggle"><input type="checkbox" id="comment-show-name" /> <span>${escapeHtml(I18n.t("comments.showName"))}</span></label>
        <button class="btn btn-primary btn-sm" type="button" onclick="submitComment(${Number(postId)})">${escapeHtml(I18n.t("comments.send"))}</button>
      </div>
    </div>
  </div>`;
}

function toggleCommentReplyBox(commentId) {
  document.getElementById(`reply-box-${Number(commentId)}`)?.classList.toggle("hidden");
}

function submitComment(postId, parentCommentId) {
  const currentUser = AuthService.getCurrentUser();
  // Community V2 (COM-V2-007): unified permission hook (visitors cannot
  // comment) — see services/permission-service.js.
  if (!PermissionService.canUserComment(currentUser)) { showToast(I18n.t("wall.authRequired")); AuthUI.open("login"); return; }
  const hasParent = parentCommentId !== null && parentCommentId !== undefined;
  const inputId = hasParent ? `reply-input-${Number(parentCommentId)}` : "comment-input";
  const showNameId = hasParent ? `reply-show-name-${Number(parentCommentId)}` : "comment-show-name";
  const input = document.getElementById(inputId);
  const content = String(input?.value || "").trim();
  if (!content) { showToast(I18n.t("comments.writeFirst")); return; }
  const showName = document.getElementById(showNameId)?.checked === true;
  const nickname = String(currentUser.displayName || "").trim();
  if (showName && !nickname) { showToast("Your account needs a display name before publishing."); return; }
  try {
    CommentService.createComment({
      postId: Number(postId),
      parentCommentId: hasParent ? Number(parentCommentId) : null,
      authorUserId: currentUser.id,
      isAnonymous: !showName,
      authorNickname: showName ? nickname : null,
      content,
    });
    renderWallNotes();
    openModal(postId);
  } catch (error) {
    showToast(error instanceof Error ? error.message : I18n.t("common.error"));
  }
}

function openModal(id) {
  const note = getRuntimeNotes().find(item => Number(item.id) === Number(id));
  if (!note) return;
  const overlay = document.getElementById("modal-overlay");
  const modalCard = document.getElementById("modal-card");
  const content = document.getElementById("modal-content");
  if (!overlay || !modalCard || !content) return;
  const name = note.isAnonymous ? "Anonymous" : (note.authorNickname || "User");
  const imageSource = getNoteImageSource(note);
  const category = Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, note.category) ? note.category : "academic";
  const shape = SHAPES.includes(note.shape) ? note.shape : "rounded";
  const safeColor = getSafeNoteColor(note, category);
  const categoryLabel = { academic: "ACADEMIC", koko: "ACTIVITIES", campus_life: "CAMPUS LIFE", emotional: "SUPPORT" }[category];
  const translation = noteTranslationState.get(Number(id));
  const visibleText = translation?.showTranslated ? translation.translatedText : note.content;
  const isDemoSeed = note.isDemoSeed === true && note.isDemoSeedRuntime === true;
  const hasDemoEngagement = Number.isFinite(Number(note.demoEngagementScore));
  const engagementScore = getDisplayedNoteEngagementScore(note);
  // Runtime bundle/All Student seeds show a plain, non-interactive display:
  // those note objects are frozen at activation time. Older stored defaults
  // remain votable and show their deterministic base plus the persisted local
  // userVote delta. Real user posts keep the original upvote/downvote path.
  const modalActions = isDemoSeed
    ? `<span class="demo-seed-preview-readonly">👍 ${engagementScore} · 👎 ${Number(note.downvotes || 0)}</span>`
    : `<button class="btn btn-outline btn-sm" onclick="voteNote(${Number(note.id)},'up')">👍 Agree (${hasDemoEngagement ? engagementScore : Number(note.upvotes || 0)})</button><button class="btn btn-outline btn-sm" onclick="voteNote(${Number(note.id)},'down')">👎 Disagree (${Number(note.downvotes || 0)})</button>`;

  Array.from(modalCard.classList).forEach(className => {
    if (className.startsWith("modal-shape-")) modalCard.classList.remove(className);
  });
  modalCard.classList.remove("modal-note-shaped");
  modalCard.classList.add("modal-note-shaped", `modal-shape-${shape}`);
  modalCard.style.setProperty("--modal-note-color", safeColor);
  modalCard.dataset.noteShape = shape;
  modalCard.dataset.noteCategory = category;
  // COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY: seed/default community posts
  // render the same comment section as any other post — comments always
  // went through the shared CommentService (keyed by postId, independent of
  // the note object itself), so there was never a technical reason to gate
  // this on isDemoSeed, only a UI one that is now removed.
  const commentsSectionHTML = note.contextType === "community" ? renderCommentsSectionHTML(note.id) : "";
  // Community V2 (COM-V2-006): Mark Solved / Reopen — author or prototype
  // moderator only, Question posts only. canUserMarkSolved() itself already
  // denies this for seed posts (their authorUserId never matches a real
  // signed-in user), so no separate isDemoSeed check is needed here either.
  const currentUserForActions = AuthService.getCurrentUser();
  const questionActionsHTML = note.postType === "question" && PermissionService.canUserMarkSolved(currentUserForActions, note)
    ? `<div class="modal-question-actions">${note.questionStatus === "solved"
        ? `<button class="btn btn-outline btn-sm" onclick="setQuestionStatus(${Number(note.id)}, 'open')">🔓 ${escapeHtml(I18n.t("question.reopen"))}</button>`
        : `<button class="btn btn-primary btn-sm" onclick="setQuestionStatus(${Number(note.id)}, 'solved')">✅ ${escapeHtml(I18n.t("question.markSolved"))}</button>`
      }</div>`
    : "";
  content.innerHTML = `<div class="modal-note-tools"><span class="badge badge-pill cat-${category}">${categoryLabel}</span>${getQuestionBadgeHTML(note)}<button id="modal-translate-button" class="btn btn-outline btn-sm" type="button" onclick="toggleNoteTranslation(${Number(note.id)})">${translation?.showTranslated ? I18n.t("wall.showOriginal") : I18n.t("wall.translate")}</button></div>${imageSource ? `<div class="modal-note-photo-wrap" style="--photo-scale:${Math.max(1, Math.min(1.8, Number(note.imageCropScale || 1)))};--photo-fit:${note.imageFit === "contain" ? "contain" : "cover"}"><img class="modal-note-photo" src="${imageSource}" alt="${escapeHtml(note.imageName || "Photo attached to note")}" /></div>` : ""}<div class="handwriting modal-note-text">${escapeHtml(visibleText)}</div>${translation?.showTranslated ? `<p class="translation-label">Translated to ${escapeHtml(I18n.getLanguage())}</p>` : ""}<div class="modal-note-footer"><div>👤 ${escapeHtml(name)}<br><span style="font-size:0.75rem">${formatDate(note.createdAt, true)}</span></div><div class="modal-vote-actions">${modalActions}</div></div>${questionActionsHTML}${commentsSectionHTML}`;
  overlay.classList.remove("hidden");
  document.body.classList.add("overlay-open");
  requestAnimationFrame(() => overlay.querySelector(".modal-close")?.focus());
}
function closeModal(event) {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay) return;
  if (!event || event.target === overlay || event.target.classList.contains("modal-close")) {
    overlay.classList.add("hidden"); document.body.classList.remove("overlay-open");
  }
}
function voteNote(id, type) {
  const note = getRuntimeNotes().find(item => Number(item.id) === Number(id));
  if (!note || (note.isDemoSeed === true && note.isDemoSeedRuntime === true) || !["up", "down"].includes(type)) return;
  note.upvotes = Number(note.upvotes || 0); note.downvotes = Number(note.downvotes || 0);
  if (note.userVote === type) {
    if (type === "up") note.upvotes = Math.max(0, note.upvotes - 1); else note.downvotes = Math.max(0, note.downvotes - 1);
    note.userVote = null;
  } else {
    if (note.userVote === "up") note.upvotes = Math.max(0, note.upvotes - 1);
    if (note.userVote === "down") note.downvotes = Math.max(0, note.downvotes - 1);
    if (type === "up") note.upvotes += 1; else note.downvotes += 1;
    note.userVote = type;
  }
  note.score = note.upvotes - note.downvotes;
  saveNotes(); renderWallNotes(); openModal(id);
}

function updateCropScale(event) {
  selectedPhotoCropScale = Math.max(1, Math.min(1.8, Number(event.target.value || 1)));
  document.getElementById("crop-scale-value").textContent = `${Math.round(selectedPhotoCropScale * 100)}%`;
  document.getElementById("image-preview")?.style.setProperty("--photo-scale", String(selectedPhotoCropScale));
}
function updateImageFit(event) {
  selectedImageFit = event.target.value === "contain" ? "contain" : "cover";
  document.getElementById("image-preview")?.style.setProperty("--photo-fit", selectedImageFit);
}

let activeNoteSelect = null;
let noteSelectsInitialized = false;
let noteColorManuallySelected = false;

function getNoteColorPreset(value) {
  return NOTE_COLOR_PRESETS.find(preset => preset.value === String(value || "").toUpperCase()) || null;
}

function setSelectedNoteColor(value, manual = false) {
  const input = document.getElementById("form-color");
  const category = String(document.getElementById("form-category")?.value || "academic");
  const categoryDefault = String(CATEGORY_COLORS[category]?.[0] || NOTE_COLOR_PRESETS[0].value).toUpperCase();
  const selected = getNoteColorPreset(value) || getNoteColorPreset(categoryDefault) || NOTE_COLOR_PRESETS[0];
  if (input) input.value = selected.value;
  document.querySelectorAll("[data-note-color]").forEach(button => {
    const isSelected = button.dataset.noteColor === selected.value;
    button.setAttribute("aria-checked", String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
  if (manual) noteColorManuallySelected = true;
}

function ensureNoteColorPicker() {
  if (document.getElementById("note-color-picker")) return;
  const shapeRow = document.getElementById("form-shape")?.closest(".form-row");
  if (!shapeRow) return;
  const fieldset = document.createElement("fieldset");
  fieldset.id = "note-color-picker";
  fieldset.className = "form-group note-color-picker";
  fieldset.innerHTML = `<legend class="form-label">Note color</legend><input type="hidden" id="form-color" value="${NOTE_COLOR_PRESETS[0].value}" /><div class="note-color-options" role="radiogroup" aria-label="Note color">${NOTE_COLOR_PRESETS.map((preset, index) => `<button class="note-color-choice" type="button" role="radio" aria-checked="${index === 0}" aria-label="${preset.label}" title="${preset.label}" data-note-color="${preset.value}" style="--note-color-choice:${preset.value}" tabindex="${index === 0 ? 0 : -1}"><span aria-hidden="true">✓</span></button>`).join("")}</div>`;
  shapeRow.insertAdjacentElement("afterend", fieldset);
  fieldset.addEventListener("click", event => {
    const button = event.target.closest("[data-note-color]");
    if (!button) return;
    setSelectedNoteColor(button.dataset.noteColor, true);
    button.focus();
  });
  fieldset.addEventListener("keydown", event => {
    const button = event.target.closest("[data-note-color]");
    if (!button) return;
    const buttons = [...fieldset.querySelectorAll("[data-note-color]")];
    const direction = { ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1 }[event.key];
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const currentIndex = Math.max(0, buttons.indexOf(button));
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (currentIndex + direction + buttons.length) % buttons.length;
    const nextButton = buttons[nextIndex];
    setSelectedNoteColor(nextButton.dataset.noteColor, true);
    nextButton.focus();
  });
  document.getElementById("form-category")?.addEventListener("change", event => {
    if (noteColorManuallySelected) return;
    const defaultColor = CATEGORY_COLORS[String(event.target.value || "academic")]?.[0];
    setSelectedNoteColor(defaultColor);
  });
}

function getNoteSelectParts(type) {
  const root = document.querySelector(`[data-note-select="${type}"]`);
  const trigger = root?.querySelector(".note-select-trigger");
  const menu = document.getElementById(trigger?.getAttribute("aria-controls") || "");
  const input = document.getElementById(`form-${type}`);
  return root && trigger && menu && input ? { root, trigger, menu, input } : null;
}

function syncNoteSelect(type, value) {
  const parts = getNoteSelectParts(type);
  if (!parts) return;
  const option = parts.menu.querySelector(`[role="option"][data-value="${value}"]`);
  if (!option) return;
  parts.input.value = value;
  parts.menu.querySelectorAll('[role="option"]').forEach(item => item.setAttribute("aria-selected", String(item === option)));
  const label = parts.trigger.querySelector("[data-note-select-label]");
  const key = option.dataset.i18nKey || "";
  if (label && key) {
    label.dataset.i18n = key;
    label.textContent = I18n.t(key);
  }
  const currentVisual = parts.trigger.querySelector(".category-choice-icon,.shape-swatch,.fit-swatch");
  const optionVisual = option.querySelector(".category-choice-icon,.shape-swatch,.fit-swatch");
  if (currentVisual && optionVisual) {
    currentVisual.className = optionVisual.className;
    currentVisual.innerHTML = optionVisual.innerHTML;
  }
  parts.input.dispatchEvent(new Event("change", { bubbles:true }));
}

function getNoteSelectEventPath(event) {
  return typeof event.composedPath === "function" ? event.composedPath() : [event.target];
}

function eventIsInsideActiveNoteSelect(event) {
  if (!activeNoteSelect) return false;
  const path = getNoteSelectEventPath(event);
  return path.includes(activeNoteSelect.trigger) ||
    path.includes(activeNoteSelect.menu) ||
    activeNoteSelect.trigger.contains(event.target) ||
    activeNoteSelect.menu.contains(event.target);
}

function getNoteSelectOptionFromEvent(event) {
  return getNoteSelectEventPath(event).find(node => node instanceof Element && node.matches?.('[role="option"]')) ||
    (event.target instanceof Element ? event.target.closest('[role="option"]') : null);
}

function closeNoteSelect(restoreFocus = false) {
  if (!activeNoteSelect) return;
  activeNoteSelect.menu.hidden = true;
  activeNoteSelect.trigger.setAttribute("aria-expanded", "false");
  if (restoreFocus) activeNoteSelect.trigger.focus();
  activeNoteSelect = null;
}

function positionNoteSelect(parts) {
  const rect = parts.trigger.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(parts.root.dataset.noteSelect === "shape" ? 440 : Math.max(rect.width, 260), window.innerWidth - margin * 2);
  parts.menu.style.width = `${width}px`;
  parts.menu.style.maxHeight = `${Math.max(96, window.innerHeight - margin * 2)}px`;
  const height = parts.menu.getBoundingClientRect().height;
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
  const below = rect.bottom + 8;
  const top = below + height <= window.innerHeight - margin ? below : Math.max(margin, rect.top - height - 8);
  parts.menu.style.left = `${left}px`;
  parts.menu.style.top = `${top}px`;
}

function openNoteSelect(type, focusTarget = "selected") {
  const parts = getNoteSelectParts(type);
  if (!parts) return;
  if (activeNoteSelect?.type === type) {
    closeNoteSelect();
    return;
  }
  closeNoteSelect();
  parts.menu.hidden = false;
  parts.trigger.setAttribute("aria-expanded", "true");
  activeNoteSelect = { ...parts, type };
  positionNoteSelect(parts);
  const options = [...parts.menu.querySelectorAll('[role="option"]')];
  const target = focusTarget === "first" ? options[0] : focusTarget === "last" ? options.at(-1) : options.find(item => item.getAttribute("aria-selected") === "true");
  target?.focus();
}

function handleNoteSelectKeydown(event, type, option) {
  const parts = getNoteSelectParts(type);
  if (!parts) return;
  const options = [...parts.menu.querySelectorAll('[role="option"]')];
  if (option && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    syncNoteSelect(type, option.dataset.value || "");
    closeNoteSelect(true);
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeNoteSelect(true);
    return;
  }
  const navigation = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  if (event.key in navigation || event.key === "Home" || event.key === "End") {
    event.preventDefault();
    if (!activeNoteSelect) {
      openNoteSelect(type, event.key === "End" || event.key === "ArrowUp" ? "last" : "first");
      return;
    }
    const currentIndex = Math.max(0, options.indexOf(option || document.activeElement));
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (currentIndex + navigation[event.key] + options.length) % options.length;
    options[nextIndex]?.focus();
  }
}

function initializeNoteCustomSelects() {
  if (noteSelectsInitialized) return;
  const overlay = document.getElementById("drawer-overlay");
  if (!overlay) return;
  document.querySelectorAll("[data-note-select]").forEach(root => {
    const type = root.dataset.noteSelect;
    const trigger = root.querySelector(".note-select-trigger");
    const menu = document.getElementById(trigger?.getAttribute("aria-controls") || "");
    if (!type || !trigger || !menu) return;
    overlay.appendChild(menu);
    trigger.addEventListener("click", () => openNoteSelect(type));
    trigger.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openNoteSelect(type);
      } else handleNoteSelectKeydown(event, type, null);
    });
    menu.addEventListener("click", event => {
      event.stopPropagation();
      const option = getNoteSelectOptionFromEvent(event);
      if (!option) return;
      syncNoteSelect(type, option.dataset.value || "");
      closeNoteSelect(true);
    });
    menu.addEventListener("keydown", event => handleNoteSelectKeydown(event, type, getNoteSelectOptionFromEvent(event)));
  });
  document.addEventListener("pointerdown", event => {
    if (activeNoteSelect && !eventIsInsideActiveNoteSelect(event)) closeNoteSelect();
  }, true);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && activeNoteSelect) closeNoteSelect(true); });
  overlay.addEventListener("scroll", event => { if (!event.target.closest?.(".note-select-menu")) closeNoteSelect(); }, true);
  window.addEventListener("resize", () => closeNoteSelect());
  noteSelectsInitialized = true;
}

function setComposerPostType(form, value, { focus = false } = {}) {
  const normalized = EchoPostTypeContract.normalize(value);
  const inputs = Array.from(form?.querySelectorAll('input[name="post-type"]') || []);
  inputs.forEach(input => { input.checked = input.value === normalized; });
  const group = form?.querySelector("#post-type-group");
  if (group) group.dataset.selectedPostType = normalized;
  if (focus) inputs.find(input => input.checked)?.focus();
  return normalized;
}

function initializeComposerPostType(form) {
  const group = form?.querySelector("#post-type-group");
  if (!group) return EchoPostTypeContract.defaultValue;
  group.hidden = false;
  group.querySelectorAll(".identity-choice").forEach(choice => {
    if (choice.dataset.postTypeChoiceBound === "true") return;
    choice.dataset.postTypeChoiceBound = "true";
    choice.addEventListener("click", event => {
      const input = choice.querySelector('input[name="post-type"]');
      if (!input) return;
      // Map enters through a full document navigation while Community usually
      // reuses the SPA, so make the shared composer state explicit.
      event.preventDefault();
      setComposerPostType(form, input.value, { focus:true });
    });
  });
  return setComposerPostType(form, EchoPostTypeContract.defaultValue);
}

function getComposerPostType(form) {
  return EchoPostTypeContract.normalize(form?.querySelector('input[name="post-type"]:checked')?.value);
}

function openDrawer() {
  const currentUser = AuthService.getCurrentUser();
  // Community V2 (COM-V2-007): unified permission hook (visitors cannot
  // post) — see services/permission-service.js.
  if (!PermissionService.canUserPost(currentUser)) {
    showToast(I18n.t("wall.authRequired"));
    AuthUI.open("login");
    return;
  }
  const overlay = document.getElementById("drawer-overlay");
  const form = document.getElementById("note-form");
  if (!overlay || !form) return;
  ensureNoteColorPicker();
  overlay.classList.remove("hidden"); document.body.classList.add("overlay-open"); form.reset();
  // Community and Building share this one composer and canonical state.
  initializeComposerPostType(form);
  initializeNoteCustomSelects();
  selectedPhotoCropScale = 1; selectedImageFit = "cover";
  noteColorManuallySelected = false;
  syncNoteSelect("category", "academic");
  syncNoteSelect("shape", "rounded");
  syncNoteSelect("image-fit", "cover");
  setSelectedNoteColor(CATEGORY_COLORS.academic[0]);
  const crop = document.getElementById("form-crop-scale"); if (crop) crop.value = "1";
  document.getElementById("crop-scale-value").textContent = "100%";
  const displayName = document.getElementById("form-display-name");
  if (displayName) displayName.textContent = currentUser.displayName;
  document.getElementById("char-count").textContent = "0 / 500";
  pendingImageDataUrl = ""; pendingImageName = ""; setImageProcessing(false); setImageStatus(""); updateImagePreview();
  requestAnimationFrame(() => document.getElementById("form-content")?.focus());
}
function closeDrawer() { closeNoteSelect(); document.getElementById("drawer-overlay")?.classList.add("hidden"); document.body.classList.remove("overlay-open"); }
async function handleFormSubmit(event) {
  event.preventDefault();
  const currentUser = AuthService.getCurrentUser();
  if (!PermissionService.canUserPost(currentUser)) { closeDrawer(); AuthUI.open("login"); return; }
  if (imageProcessing) { showToast("Please wait for the photo to finish processing."); return; }
  const currentForm = event.target;
  const content = String(currentForm.querySelector("#form-content")?.value || "").trim();
  const category = String(currentForm.querySelector("#form-category")?.value || "academic");
  const shape = String(currentForm.querySelector("#form-shape")?.value || "rounded");
  const selectedColor = String(currentForm.querySelector("#form-color")?.value || "").toUpperCase();
  const safeCategory = Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, category) ? category : "academic";
  const color = getNoteColorPreset(selectedColor)?.value || randomColor(safeCategory);
  const anonymous = currentForm.querySelector('input[name="publish-identity"]:checked')?.value !== "named";
  const nickname = String(currentUser.displayName || "").trim();
  if (!content) { showToast("Write a message before pinning the note."); return; }
  if (!anonymous && !nickname) { showToast("Your account needs a display name before publishing."); return; }

  const submitButton = document.getElementById("note-submit");
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = I18n.t("common.loading"); }
  try {
    const upload = pendingImageDataUrl ? await CloudinaryAdapter.uploadCompressedDataUrl(pendingImageDataUrl, { contextType: wallState.contextType, placeId: wallState.placeId || "" }) : null;
    const id = nextId++;
    // Community V2 (COM-V2-003, pulled forward from COM-V2-004's flagged
    // technical debt): new community posts are written as V3-compliant from
    // the moment they're created — orgId/majorId are genuine null for
    // Global/College General (never a 0 magic value), and communityKey/
    // communityScope are set directly so scope isolation works before the
    // next reload, not only after normalizeStoredNote() backfills them.
    const isCommunity = wallState.contextType === "community";
    const communityScope = isCommunity ? (wallState.communityScope || "jurusan") : null;
    const noteOrgId = isCommunity && communityScope !== "global" ? wallState.orgId : null;
    const noteMajorId = isCommunity && communityScope === "jurusan" ? wallState.majorId : null;
    const communityKey = isCommunity
      ? (CommunityService.isValidCommunityKey(wallState.communityKey) ? wallState.communityKey : CommunityService.getCommunityKey(communityScope, noteOrgId, noteMajorId))
      : "";
    // Community V2 (COM-V2-004): Post Type. Legacy default (no radio present,
    // e.g. a stale cached form) stays "discussion" — never silently becomes
    // a Question. The same rule now applies to Building and Map posts.
    const postType = getComposerPostType(currentForm);
    const newNote = {
      id, schemaVersion: isCommunity ? 3 : 2, contextType: isCommunity ? "community" : "building",
      orgId: noteOrgId,
      batchId: null,
      majorId: noteMajorId,
      placeId: isCommunity ? "" : wallState.placeId,
      postType, questionStatus: postType === "question" ? "open" : null,
      ...(isCommunity ? {
        communityKey, communityScope,
        moderationStatus: "published", commentCount: 0, updatedAt: null,
      } : {}),
      ...(communityScope === "jurusan" ? { wallKey: `community:${noteOrgId}:${noteMajorId}` } : {}),
      category: safeCategory,
      isAnonymous: anonymous, authorNickname: anonymous ? null : nickname, authorUserId: currentUser.id,
      shape: SHAPES.includes(shape) ? shape : "rounded", color, rotation: Math.floor(Math.random() * 5) - 2,
      upvotes: 0, downvotes: 0, score: 0, userVote: null, createdAt: new Date().toISOString(), content,
      imageDataUrl: upload?.mode === "local" ? safeImageDataUrl(upload.dataUrl) : "",
      imageUrl: upload?.mode === "cloudinary" ? upload.url : "",
      imagePublicId: upload?.mode === "cloudinary" ? upload.publicId : "",
      imageName: pendingImageName, imageCropScale: selectedPhotoCropScale, imageFit: selectedImageFit,
    };
    notes.unshift(newNote);
    if (!saveNotes()) { notes = notes.filter(note => Number(note.id) !== id); throw new Error("Browser storage is full."); }
    // ADMIN-V2-008: assist-only auto-flag evaluation, best-effort -- never
    // blocks a real post from publishing (it already saved above), never
    // hides/deletes anything itself, only ever creates a normal `pending`
    // ModerationItem a human moderator still reviews through the existing
    // Approve/Reject/Hide flow.
    try {
      const evaluation = window.ModerationAssistService?.evaluateCommunityPost?.(newNote, notes);
      if (evaluation?.flagged) {
        const scope = window.ModerationService?.resolveContentScope?.("post", newNote.id);
        if (scope) window.ModerationAssistService.applyAutoFlag("post", newNote.id, scope, evaluation);
      }
    } catch (error) {
      console.error("ModerationAssistService evaluation failed (post still published):", error);
    }
    closeDrawer(); renderWallNotes(); showToast(newNote.imageUrl || newNote.imageDataUrl ? "📷 Photo note pinned to the wall!" : "📌 Note pinned to the wall!");
  } catch (error) {
    showToast(error instanceof Error ? error.message : I18n.t("common.error"));
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = I18n.t("form.submit"); }
  }
}

function showToast(message) {
  const region = document.getElementById("toast-region") || document.body;
  const toast = document.createElement("div"); toast.className = "toast-item"; toast.textContent = message; region.appendChild(toast);
  setTimeout(() => { toast.classList.add("is-leaving"); setTimeout(() => toast.remove(), 260); }, 2800);
}
window.addEventListener("keydown", event => { if (event.key === "Escape") { closeModal(); closeDrawer(); } });
let wallResizeTimer;
window.addEventListener("resize", () => { clearTimeout(wallResizeTimer); wallResizeTimer = setTimeout(() => { if (document.getElementById("wall-canvas")) renderWallNotes(); }, 160); });
