/* Verbatim pre-POLISH-004 collegeCards markup in app-community.js
   renderCommunityHub() (as it stood after COMMUNITY-V2-POLISH-003, before
   this stage added the pointer-glow layers). */

const collegeCards = organizations.map((org, index) => `
    <button class="org-card reveal-card" data-reveal style="--reveal-delay:${(index + 1) * 70}ms" onclick="navigate('#/community/${org.id}')" aria-label="Open ${escapeHtml(org.name)} community">
      <div class="org-card-glow" aria-hidden="true"></div>
      <div class="org-card-header">
        <span class="org-emoji">${org.emoji}</span>
        <span class="note-count">📖 <strong>${getCommunityNoteCount(org.id)}</strong></span>
      </div>
      <div>
        <span class="org-card-kicker">${I18n.t("community.hub.collegeKicker")}</span>
        <h3 class="org-card-title">${escapeHtml(org.name)}</h3>
        <p class="org-card-desc">${I18n.t("community.desc")}</p>
      </div>
      <span class="org-card-link">${I18n.t("community.enter")} <span aria-hidden="true">→</span></span>
    </button>`).join("");

/* globalCard was and remains completely unchanged by this stage. */
