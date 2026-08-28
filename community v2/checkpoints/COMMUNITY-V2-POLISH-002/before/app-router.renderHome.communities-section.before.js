/* Verbatim pre-POLISH-002 state of app-router.js renderHome(), the parts
   this stage changed. Captured from a Read call at the start of this task,
   before any edit was made. Line numbers below match the pre-edit file. */

// lines 285-306 (function open + orgCards builder — orgCards was removed entirely in POLISH-002)
function renderHome(container) {
  const visibleNotes = getVisibleRuntimeNotes();
  const homepageVisibleNotesDisplay = visibleNotes.length;
  const homepageCommunitiesDisplay = organizations.length;
  const homepagePhotoNotesDisplay = getVisiblePhotoNoteCount(visibleNotes);
  const latestNote = getLatestVisibleNote(visibleNotes);

  const orgCards = organizations.map((org, index) => `
    <button class="org-card reveal-card" data-reveal style="--reveal-delay:${index * 70}ms" onclick="navigate('#/community/${org.id}')" aria-label="Open ${escapeHtml(org.name)} community">
      <div class="org-card-glow" aria-hidden="true"></div>
      <div class="org-card-header">
        <span class="org-emoji">${org.emoji}</span>
        <span class="note-count">📖 <strong>${getCommunityNoteCount(org.id, visibleNotes)}</strong></span>
      </div>
      <div>
        <span class="org-card-kicker">${I18n.t("community.kicker")}</span>
        <h3 class="org-card-title">${escapeHtml(org.name)}</h3>
        <p class="org-card-desc">${org.comingSoon ? I18n.t("org.comingSoon") : I18n.t("community.desc")}</p>
      </div>
      ${org.comingSoon ? "" : `<span class="org-card-link">${I18n.t("community.enter")} <span aria-hidden="true">→</span></span>`}
    </button>
  `).join("");

  container.innerHTML = `
    ...(hero + stats sections unchanged)...

      <section class="container section-block" id="communities">
        <div class="section-heading" data-reveal>
          <div><p class="eyebrow">${I18n.t("home.chooseSpace")}</p><h2>${I18n.t("home.communities")}</h2></div>
          <p>${I18n.t("home.communitiesDesc")}</p>
        </div>
        <div class="org-grid">${orgCards}</div>
      </section>

    ...(how-section, building-home-section, map-promo, footer unchanged)...
