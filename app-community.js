/**
 * Community V2 Hub + College Landing (COM-V2-002).
 * Router entry points only — reuses the existing Sticky Wall renderer
 * (renderWall in app-wall.js) for the Jurusan canonical route, and reuses
 * the existing .org-page/.org-grid/.selection-shell CSS from style-core.css
 * so no new stylesheet was needed for this stage.
 *
 * Must load after app-router.js (uses renderOrgHeaderActions) and before
 * app-wall.js is not required, but the existing index.html order places it
 * there anyway.
 */
function renderCommunityNotFound(container, backHash, backLabel) {
  container.innerHTML = `
    <section class="container error-page page-reveal">
      <div class="error-illustration">🧭</div>
      <p class="eyebrow">Route mismatch</p>
      <h1>Community not found</h1>
      <p>This community link does not match any known college.</p>
      <button class="btn btn-primary" onclick="navigate('${backHash}')">${escapeHtml(backLabel)}</button>
    </section>`;
}

function renderCommunityHub(container) {
  // COMMUNITY-V2-POLISH-005: globalCard now shares the exact same
  // pointer-glow engine/CSS choreography as the 12 college cards below
  // (same [data-pointer-glow-card] attribute, same three <span> layers,
  // same JS via initializePointerGlowCards("[data-pointer-glow-card]") —
  // no second implementation). Its old static .org-card-glow corner blob
  // is removed (kept alongside the new layers would have produced two
  // competing light sources). The only thing specific to this card is the
  // `org-card-global` sizing class, which just picks a larger glow radius
  // in style-core.css — the interaction logic and hover/lift/opacity
  // choreography are 100% shared with the college cards via the shared
  // [data-pointer-glow-card] rules.
  const globalCard = `
    <button class="org-card org-card-global reveal-card" data-reveal data-pointer-glow-card onclick="navigate('#/community/all')" aria-label="${escapeHtml(I18n.t("community.hub.globalName"))}">
      <span class="org-card-ambient" aria-hidden="true"></span>
      <span class="org-card-rings" aria-hidden="true"></span>
      <span class="org-card-pointer-glow" aria-hidden="true"></span>
      <div class="org-card-header">
        <span class="org-emoji">🌐</span>
      </div>
      <div class="org-card-body">
        <span class="org-card-kicker">${I18n.t("community.hub.kicker")}</span>
        <h3 class="org-card-title">${I18n.t("community.hub.globalName")}</h3>
        <p class="org-card-desc">${I18n.t("community.hub.globalDesc")}</p>
      </div>
      <span class="org-card-link">${I18n.t("community.hub.enter")} <span aria-hidden="true">→</span></span>
    </button>`;

  // COMMUNITY-V2-POLISH-003: restored the original .org-card/.org-grid Kolej
  // card grid here (it was the Homepage's card design before POLISH-002
  // hid all colleges from the Homepage). This is NOT the Homepage duplicate
  // POLISH-001 removed — the Homepage itself renders zero college cards
  // (see app-router.js renderHome()'s single "Enter Community" CTA); the
  // Hub is now the only page that renders this grid, so there is no
  // duplication. Markup is restored verbatim from
  // community v2/checkpoints/COMMUNITY-V2-POLISH-001/app-community.js.pre
  // (the pre-POLISH-001 collegeCards block), not rebuilt from memory.
  // .org-grid's existing repeat(auto-fit,minmax(245px,1fr)) CSS already
  // yields 4 columns at this page's 1160px container width with zero new
  // breakpoint rules (see style-core.css line 192/423).
  // COMMUNITY-V2-POLISH-004: each card additionally carries the same
  // pointer-follow gold glow as the Homepage's Community CTA — same shared
  // engine (initializePointerGlowCard() in app-router.js), scoped CSS sizing
  // (.org-card-ambient/-pointer-glow/-rings, smaller radii than the
  // Homepage's .home-community-card- versions). `data-pointer-glow-card`
  // opts a card into the engine. "Enter community" stays as in-card text
  // (unlike the Homepage card, which removed its separate button) — the
  // whole <button> is still the single click target either way.
  // COMMUNITY-V2-POLISH-005: the "All KM Students" globalCard above now
  // gets the same treatment too (see its own comment above) — as of this
  // stage, every .org-card on this page (global + all 12 colleges) carries
  // [data-pointer-glow-card] and the same three layers; only the glow
  // radius differs (via the org-card-global class), never the JS.
  const collegeCards = organizations.map((org, index) => `
    <button class="org-card reveal-card" data-reveal data-pointer-glow-card style="--reveal-delay:${(index + 1) * 70}ms" onclick="navigate('#/community/${org.id}')" aria-label="Open ${escapeHtml(org.name)} community">
      <span class="org-card-ambient" aria-hidden="true"></span>
      <span class="org-card-rings" aria-hidden="true"></span>
      <span class="org-card-pointer-glow" aria-hidden="true"></span>
      <div class="org-card-header">
        <span class="org-emoji">${org.emoji}</span>
        <span class="note-count">📖 <strong>${getCollegeDisplayCount(org.id, getCommunityNoteCount(org.id))}</strong></span>
      </div>
      <div class="org-card-body">
        <span class="org-card-kicker">${I18n.t("community.hub.collegeKicker")}</span>
        <h3 class="org-card-title">${escapeHtml(org.name)}</h3>
        <p class="org-card-desc">${I18n.t("community.desc")}</p>
      </div>
      <span class="org-card-link">${I18n.t("community.enter")} <span aria-hidden="true">→</span></span>
    </button>`).join("");

  container.innerHTML = `
    <div class="container org-page page-reveal">
      <button class="page-back" onclick="navigate('#/')">← ${I18n.t("nav.home")}</button>
      <header class="org-header">
        <div class="org-header-icon">🏛️</div>
        <div><p class="eyebrow">${I18n.t("community.hub.eyebrow")}</p><h1>${I18n.t("community.hub.title")}</h1></div>
      </header>
      <section class="selection-shell">
        <div class="section-heading" style="margin-bottom:18px"><div><h2>${I18n.t("community.hub.globalName")}</h2></div></div>
        <div class="org-grid">${globalCard}</div>
      </section>
      <section class="selection-shell" style="margin-top:24px">
        <div class="section-heading" style="margin-bottom:18px"><div><h2>${I18n.t("community.hub.collegesTitle")}</h2></div></div>
        <div class="org-grid">${collegeCards}</div>
      </section>
    </div>`;
}

function renderCollegeLanding(container, orgId) {
  const org = organizations.find(item => item.id === orgId);
  if (!org) {
    renderCommunityNotFound(container, "#/community", I18n.t("community.hub.title"));
    return;
  }

  if (org.comingSoon) {
    container.innerHTML = `
      <div class="container org-page page-reveal">
        <button class="page-back" onclick="navigate('#/community')">← ${I18n.t("community.hub.title")}</button>
        <header class="org-header">
          <div class="org-header-icon">${org.emoji}</div>
          <div><p class="eyebrow">${I18n.t("org.workspace")}</p><h1>${escapeHtml(org.name)}</h1></div>
        </header>
        <section class="selection-shell"><div class="empty-state">${I18n.t("org.comingSoon")}</div></section>
      </div>`;
    return;
  }

  const orgMajors = majors.filter(item => item.orgId === orgId);
  const jurusanItems = orgMajors.map((major, index) => `
    <button class="selection-item" style="--item-delay:${index * 55}ms" onclick="navigate('#/community/${orgId}/jurusan/${major.id}')">
      <span class="selection-icon">🌿</span><span><strong>${escapeHtml(major.name)}</strong><small>${I18n.t("community.landing.jurusanHint")}</small></span><span class="selection-check">→</span>
    </button>`).join("") || `<div class="empty-state">${I18n.t("org.noMajors")}</div>`;

  container.innerHTML = `
    <div class="container org-page page-reveal">
      <button class="page-back" onclick="navigate('#/community')">← ${I18n.t("community.hub.title")}</button>
      <header class="org-header">
        <div class="org-header-icon">${org.emoji}</div>
        <div><p class="eyebrow">${I18n.t("org.workspace")}</p><h1>${escapeHtml(org.name)}</h1><div class="org-header-meta"><span class="org-meta-tag">${escapeHtml(org.type)}</span><span>${getCollegeDisplayCount(org.id, getCommunityNoteCount(org.id))} visible notes</span></div></div>
        ${typeof renderOrgHeaderActions === "function" ? renderOrgHeaderActions(org.id) : ""}
      </header>
      <section class="selection-shell" style="margin-top:24px">
        <div class="selection-grid" style="grid-template-columns:minmax(0,1fr)">
          <div class="selection-col"><div class="selection-heading"><span>🎓</span><div><h2>${I18n.t("community.landing.jurusanTitle")}</h2><p>${I18n.t("community.landing.jurusanDesc")}</p></div></div><div class="selection-list">${jurusanItems}</div></div>
        </div>
      </section>
    </div>`;
}

// Community V2 (COM-V2-002 shells for Global/College General were replaced
// in COM-V2-003 by renderCommunityGlobalWall/renderCommunityCollegeGeneralWall
// in app-wall.js — those reuse the real Sticky Wall renderer instead of a
// placeholder, so this file only keeps Hub + College Landing now.
