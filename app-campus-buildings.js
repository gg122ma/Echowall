/**
 * Building Registry framework pages for non-KMK colleges.
 * One shared pair of render functions, driven by data/campus-building-registry.js and keyed by
 * orgId — no per-college page is written. KMK is not handled here; it keeps its existing
 * building directory in app-place.js untouched.
 */
function getOrgWithCampusStructure(orgId) {
  const org = organizations.find(item => item.id === orgId);
  const hasCampusMap = org && typeof getCampusMapConfig === "function" && getCampusMapConfig(orgId);
  return hasCampusMap ? org : null;
}

function renderBuildingRegistryUnavailable(container, orgId, org) {
  container.innerHTML = `
    <section class="container error-page page-reveal">
      <div class="error-illustration">🏛️</div>
      <p class="eyebrow">${I18n.t("buildingRegistry.eyebrow")}</p>
      <h1>${I18n.t("buildingRegistry.unavailable")}</h1>
      <p>${I18n.t("buildingRegistry.unavailableDesc")}</p>
      <button class="btn btn-primary" onclick="navigate('${org ? `#/org/${orgId}` : "#/"}')">${I18n.t("org.back")}</button>
    </section>`;
}

function renderOrgBuildingRegistry(container, orgId) {
  const org = getOrgWithCampusStructure(orgId);
  if (!org) {
    renderBuildingRegistryUnavailable(container, orgId, organizations.find(item => item.id === orgId));
    return;
  }

  const safeName = escapeHtml(org.name);
  document.title = `${org.name} Building Registry — Echo Wall`;
  const buildings = typeof getCampusBuildingRegistry === "function" ? getCampusBuildingRegistry(orgId) : [];

  const bodyMarkup = buildings.length
    ? `<div class="building-home-grid">${buildings.map(building => `
        <button type="button" class="building-home-card" onclick="navigate('#/org/${orgId}/building/${encodeURIComponent(building.buildingId)}')">
          <span aria-hidden="true">🏢</span>
          <div><strong>${escapeHtml(building.name)}</strong>${building.category ? `<small>${escapeHtml(building.category)}</small>` : ""}</div>
          <b aria-hidden="true">→</b>
        </button>`).join("")}</div>`
    : `<div class="empty-state"><p>${I18n.t("buildingRegistry.empty")}</p><p>${I18n.t("buildingRegistry.emptyDesc")}</p></div>`;

  container.innerHTML = `
    <div class="container org-page page-reveal">
      <button class="page-back" onclick="navigate('#/org/${orgId}')">← ${I18n.t("org.back")}</button>
      <header class="campus-registry-hero">
        <p class="eyebrow">${I18n.t("buildingRegistry.eyebrow")}</p>
        <h1>${I18n.t("buildingRegistry.title", { name: safeName })}</h1>
      </header>
      ${bodyMarkup}
    </div>`;
}

function renderOrgBuildingDetail(container, orgId, buildingId) {
  const org = getOrgWithCampusStructure(orgId);
  const building = org && typeof getCampusBuildingByOrgAndId === "function"
    ? getCampusBuildingByOrgAndId(orgId, buildingId)
    : null;

  if (!org || !building) {
    const backHash = org ? `#/org/${orgId}/buildings` : "#/";
    container.innerHTML = `
      <section class="container error-page page-reveal">
        <div class="error-illustration">🏢</div>
        <p class="eyebrow">${I18n.t("buildingRegistry.eyebrow")}</p>
        <h1>${I18n.t("building.notFound")}</h1>
        <p>${I18n.t("building.notFoundDesc")}</p>
        <button class="btn btn-primary" onclick="navigate('${backHash}')">${I18n.t(org ? "buildingRegistry.back" : "org.back")}</button>
      </section>`;
    return;
  }

  const safeName = escapeHtml(building.name);
  document.title = `${building.name} — Echo Wall`;
  const description = String(building.description || "").trim();
  const knowledge = String(building.knowledge || "").trim();

  container.innerHTML = `
    <div class="container org-page page-reveal">
      <button class="page-back" onclick="navigate('#/org/${orgId}/buildings')">← ${I18n.t("buildingRegistry.back")}</button>
      <header class="campus-registry-hero">
        <p class="eyebrow">${building.category ? escapeHtml(building.category) : I18n.t("buildingRegistry.eyebrow")}</p>
        <h1>${safeName}</h1>
      </header>
      <section class="selection-shell building-info-section">
        <h2>${I18n.t("building.infoTitle")}</h2>
        ${description ? `<p>${escapeHtml(description)}</p>` : `<div class="empty-state">${I18n.t("building.infoEmpty")}</div>`}
      </section>
      <section class="selection-shell building-info-section">
        <h2>${I18n.t("building.knowledgeTitle")}</h2>
        ${knowledge ? `<p>${escapeHtml(knowledge)}</p>` : `<div class="empty-state">${I18n.t("building.knowledgeEmpty")}</div>`}
      </section>
      <section class="selection-shell building-info-section">
        <h2>${I18n.t("building.wallTitle")}</h2>
        <div class="empty-state">${I18n.t("building.wallEmpty")}</div>
      </section>
    </div>`;
}
