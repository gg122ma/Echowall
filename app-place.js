function getBuildingNotes(placeId) {
  return getVisibleBuildingNotes(placeId);
}

function getBuildingDescription(building) {
  return getLocalizedBuildingText(building, "description");
}

function getBuildingZoneName(building) {
  const language = I18n.getLanguage();
  return CAMPUS_ZONES[building.zoneId]?.[language] || CAMPUS_ZONES[building.zoneId]?.en || building.zoneId;
}

function buildingPolygonPoints(building) {
  const polygon = Array.isArray(building.overviewPolygon) ? building.overviewPolygon : [];
  return polygon.map(point => `${Number(point[0]).toFixed(2)},${Number(point[1]).toFixed(2)}`).join(" ");
}

function renderBuildingMiniature(building, className = "") {
  return `<svg class="building-miniature ${className}" viewBox="0 0 100 100" role="img" aria-label="Bird's-eye outline of ${escapeHtml(building.name)}">
    <defs><linearGradient id="g-${escapeHtml(building.id)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".2"/><stop offset="1" stop-color="currentColor" stop-opacity=".06"/></linearGradient></defs>
    <polygon points="${buildingPolygonPoints(building)}" fill="url(#g-${escapeHtml(building.id)})" stroke="currentColor" stroke-width="2.2" vector-effect="non-scaling-stroke" />
  </svg>`;
}

const BUILDING_PHOTO_SRC_PATTERN = /^assets\/buildings\/B_[A-Z0-9_]+\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/i;

function getBuildingPhotos(building) {
  if (!building || !Array.isArray(building.photos)) return [];
  const expectedPrefix = `assets/buildings/${building.id}/`;
  return building.photos.filter(photo => {
    const src = String(photo?.src || '').trim();
    const alt = String(photo?.alt || '').trim();
    return src.startsWith(expectedPrefix) && BUILDING_PHOTO_SRC_PATTERN.test(src) && alt;
  }).map(photo => ({
    src:String(photo.src).trim(),
    alt:String(photo.alt).trim(),
    fit:photo.fit === 'contain' ? 'contain' : 'cover',
  }));
}

function handleBuildingPhotoError(image) {
  if (!image) return;
  image.hidden = true;
  const fallback = image.parentElement?.querySelector('[data-building-photo-fallback]');
  if (fallback) fallback.hidden = false;
}

function renderPlaceCardVisual(building) {
  const cover = getBuildingPhotos(building)[0];
  if (!cover) return renderBuildingMiniature(building);
  return `<img class='place-card-cover' src='${escapeHtml(cover.src)}' alt='${escapeHtml(cover.alt)}' loading='lazy' decoding='async' onerror='handleBuildingPhotoError(this)' />
    <span class='place-card-photo-fallback' data-building-photo-fallback hidden>${renderBuildingMiniature(building)}</span>`;
}

function renderBuildingGallery(building) {
  const photos = getBuildingPhotos(building);
  if (!photos.length) return '';
  const multiple = photos.length > 1;
  const slides = photos.map((photo, index) => `<figure class='building-gallery-slide' aria-label='${index + 1} of ${photos.length}'>
    <img src='${escapeHtml(photo.src)}' alt='${escapeHtml(photo.alt)}' loading='lazy' decoding='async' onerror='handleBuildingPhotoError(this)' />
    <span class='building-gallery-fallback' data-building-photo-fallback hidden>${renderBuildingMiniature(building)}</span>
  </figure>`).join('');
  const controls = multiple ? `<div class='building-gallery-controls'>
    <button type='button' class='building-gallery-arrow' aria-label='Previous building photo' onclick='moveBuildingGallery(this,-1)' disabled>‹</button>
    <span class='building-gallery-count' aria-live='polite'><b data-building-gallery-index>1</b> / ${photos.length}</span>
    <button type='button' class='building-gallery-arrow' aria-label='Next building photo' onclick='moveBuildingGallery(this,1)'>›</button>
  </div>` : '';
  return `<section class='building-gallery${multiple ? ' has-multiple' : ''}' data-building-gallery data-photo-count='${photos.length}' aria-label='Photos of ${escapeHtml(building.name)}'>
    <div class='building-gallery-track' onscroll='syncBuildingGallery(this.parentElement)'>${slides}</div>
    ${controls}
  </section>`;
}

function syncBuildingGallery(gallery) {
  if (!gallery) return;
  const track = gallery.querySelector('.building-gallery-track');
  const count = Number(gallery.dataset.photoCount || 0);
  if (!track || count < 2) return;
  const index = Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / Math.max(track.clientWidth, 1))));
  const indicator = gallery.querySelector('[data-building-gallery-index]');
  if (indicator) indicator.textContent = String(index + 1);
  const arrows = gallery.querySelectorAll('.building-gallery-arrow');
  if (arrows[0]) arrows[0].disabled = index === 0;
  if (arrows[1]) arrows[1].disabled = index === count - 1;
}

function moveBuildingGallery(button, direction) {
  const gallery = button?.closest('[data-building-gallery]');
  const track = gallery?.querySelector('.building-gallery-track');
  const count = Number(gallery?.dataset.photoCount || 0);
  if (!track || count < 2) return;
  const current = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
  const target = Math.max(0, Math.min(count - 1, current + Number(direction || 0)));
  track.scrollTo({ left:target * track.clientWidth, behavior:'smooth' });
}

function renderPlaceDirectory(container) {
  const orderedBuildings = CAMPUS_BUILDINGS
    .map((building, sourceIndex) => ({
      building,
      sourceIndex,
      rank:building.id === 'B_MASJID' ? 0 : (Array.isArray(building.photos) && building.photos.length ? 1 : 2),
    }))
    .sort((a, b) => a.rank - b.rank || a.sourceIndex - b.sourceIndex)
    .map(entry => entry.building);
  const cards = orderedBuildings.map((building, index) => {
    const count = getBuildingDisplayCount(building.id, getBuildingNotes(building.id).length);
    return `<button class="place-card reveal-card" data-reveal style="--reveal-delay:${Math.min(index * 35, 420)}ms" onclick="setPlaceReturnSource('places','${escapeHtml(building.id)}');navigate('#/place/${encodeURIComponent(building.id)}')">
      <div class="place-card-visual" style="--place-color:${escapeHtml({ learning:'#5f74d6','student-life':'#9b70cf',residence:'#dc5b83',sports:'#4ba874',services:'#65748d',mobility:'#8b7867' }[building.zoneId] || '#8b5e3c')}">
        ${renderPlaceCardVisual(building)}
        <span class="place-emoji">${escapeHtml(building.emoji)}</span>
      </div>
      <div class="place-card-copy"><span class="place-zone">${escapeHtml(getBuildingZoneName(building))}</span><h3>${escapeHtml(building.name)}</h3><p>${escapeHtml(getBuildingDescription(building))}</p></div>
      <span class="place-card-foot"><b>${count}</b> notes <span>${I18n.t("home.buildings.open")} →</span></span>
    </button>`;
  }).join("");

  container.innerHTML = `<div class="container places-page page-reveal">
    <button class="page-back" onclick="navigate('#/')">← ${I18n.t("nav.home")}</button>
    <header class="places-header"><p class="eyebrow">${I18n.t("places.eyebrow")}</p><h1>${I18n.t("places.title")}</h1><p>${I18n.t("places.description")}</p></header>
    <div class="place-filter-bar"><span>${CAMPUS_BUILDINGS.length} buildings</span><input id="place-search" class="form-input" type="search" placeholder="Search buildings" oninput="filterPlaceCards(event)" /></div>
    <div id="place-grid" class="place-grid">${cards}</div>
  </div>`;
}

function filterPlaceCards(event) {
  const query = String(event.target.value || "").trim().toLowerCase();
  document.querySelectorAll(".place-card").forEach(card => {
    card.hidden = query && !card.textContent.toLowerCase().includes(query);
  });
}

function renderBuildingPurposeSection(building) {
  const purpose = String(window.getLocalizedBuildingText?.(building, 'purpose') || '').trim();
  if (!purpose) return '';
  return `<section class="place-profile-section"><h3>${escapeHtml(I18n.t('place.purpose'))}</h3><p>${escapeHtml(purpose)}</p></section>`;
}

function renderBuildingHoursSection(building) {
  if (!window.BuildingHours) return '';
  const now = new Date();
  const snapshot = window.BuildingHours.getSnapshot(building.id, now);
  const statusText = window.BuildingHours.formatStatusLine(snapshot);
  let tableMarkup = '';
  if (snapshot.mode === 'weekly') {
    const todayIndex = now.getDay();
    const rows = window.BuildingHours.weekdayKeys.map((key, index) => {
      const dayConfig = snapshot.days[index];
      const value = (dayConfig && !dayConfig.closed)
        ? `${window.BuildingHours.formatTime(dayConfig.open)} – ${window.BuildingHours.formatTime(dayConfig.close)}`
        : I18n.t('map.hours.closed');
      const rowClass = index === todayIndex ? ' is-today' : '';
      return `<div class="place-profile-hours-row${rowClass}"><span>${escapeHtml(I18n.t('map.weekday.' + key))}</span><span>${escapeHtml(value)}</span></div>`;
    }).join('');
    tableMarkup = `<div class="place-profile-hours-table">${rows}</div>`;
  }
  return `<section class="place-profile-section">
    <h3>${escapeHtml(I18n.t('map.hours.title'))}</h3>
    <p class="place-profile-hours-status"><span aria-hidden="true">🕒</span><span>${escapeHtml(statusText)}</span></p>
    ${tableMarkup}
  </section>`;
}

function renderBuildingSpecialNotesSection(building) {
  const notes = String(window.getLocalizedBuildingText?.(building, 'specialNotes') || '').trim();
  const text = notes || I18n.t('place.noSpecialNotes');
  return `<section class="place-profile-section"><h3>${escapeHtml(I18n.t('place.specialNotes'))}</h3><p>${escapeHtml(text)}</p></section>`;
}

function getBuildingEvents(building, status) {
  return Array.isArray(building?.events) ? building.events.filter(event => event && event.status === status) : [];
}

function renderBuildingEventsSection(building, status, titleKey, emptyKey) {
  const events = getBuildingEvents(building, status);
  const body = events.length
    ? events.map(event => `<div class="place-profile-event"><b>${escapeHtml(event.eventName || '')}</b><span>${escapeHtml(event.date || '')}${event.startTime ? ` · ${escapeHtml(event.startTime)}${event.endTime ? `–${escapeHtml(event.endTime)}` : ''}` : ''}</span>${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}</div>`).join('')
    : `<p class="place-profile-empty">${escapeHtml(I18n.t(emptyKey))}</p>`;
  return `<section class="place-profile-section"><h3>${escapeHtml(I18n.t(titleKey))}</h3>${body}</section>`;
}

function renderBuildingEchoesSection(building, visibleNoteCount) {
  return `<section class="place-profile-section"><h3>${escapeHtml(I18n.t('place.buildingEchoes'))}</h3><p class="place-profile-note-count"><b>${visibleNoteCount}</b> ${escapeHtml(I18n.t('map.visibleNotes'))}</p></section>`;
}

function renderPlaceProfile(container, placeId, options) {
  // BACKEND V2.4a: getEffectiveBuilding() returns the static building
  // unchanged whenever there is no backend override yet (no row, local
  // mode, request failure, or the preload below simply hasn't resolved
  // yet) — so the very first paint is always byte-for-byte identical to
  // pre-V2.4a behavior. window.BuildingMetadataProvider may not be loaded
  // in every context (e.g. an older cached page), hence the guard.
  const building = window.BuildingMetadataProvider
    ? window.BuildingMetadataProvider.getEffectiveBuilding(placeId)
    : getCampusBuilding(placeId);
  if (!building) {
    container.innerHTML = `<section class="container error-page"><h1>Building not found</h1><button class="btn btn-primary" onclick="navigate('#/places')">${I18n.t("place.back")}</button></section>`;
    return;
  }
  // COMMUNITY-MAP-NAV-POLISH-001: honor where the user actually came from
  // instead of always returning to Building Stories -- see
  // setPlaceReturnSource()/getPlaceReturnSource() in app-router.js.
  const cameFromMap = typeof getPlaceReturnSource === "function" && getPlaceReturnSource(building.id) === "map";
  const backAction = cameFromMap ? "location.href='map.html'" : "navigate('#/places')";
  const backLabel = cameFromMap ? I18n.t("place.backToMap") : I18n.t("place.back");
  const description = String(getBuildingDescription(building) || '').trim();
  const visibleNoteCount = getBuildingDisplayCount(building.id, getBuildingNotes(building.id).length);
  const photos = getBuildingPhotos(building);
  const descriptionMarkup = description ? `<p class='place-profile-description'>${escapeHtml(description)}</p>` : '';
  const detailSections = [
    renderBuildingPurposeSection(building),
    renderBuildingHoursSection(building),
    renderBuildingSpecialNotesSection(building),
    renderBuildingEventsSection(building, 'happening-now', 'place.currentEvents', 'place.noCurrentEvents'),
    renderBuildingEventsSection(building, 'upcoming', 'place.upcomingEvents', 'place.noUpcomingEvents'),
    renderBuildingEchoesSection(building, visibleNoteCount),
  ].filter(Boolean).join('');
  const mediaMarkup = photos.length
    ? `<div class='place-profile-media'>${renderBuildingGallery(building)}</div>`
    : `<div class="building-overview">
        <div class="building-overview-grid"></div>
        ${renderBuildingMiniature(building, "building-overview-shape")}
      </div>`;
  container.innerHTML = `<div class="container place-profile page-reveal">
    <button class="page-back" onclick="${backAction}">← ${backLabel}</button>
    <section class="place-profile-hero">
      <div class="place-profile-copy">
        <span class="place-profile-icon">${escapeHtml(building.emoji)}</span>
        <h1>${escapeHtml(window.getLocalizedBuildingDisplayName(building))}</h1>
        ${descriptionMarkup}
        ${detailSections}
        <section class="place-wall-entry"><div><h2>${escapeHtml(building.name)} Wall</h2></div><button class="btn btn-primary btn-lg btn-round" onclick="navigateToBuildingWall('${escapeHtml(building.id)}')">${I18n.t("place.enterWall")} →</button></section>
      </div>
      ${mediaMarkup}
    </section>
  </div>`;

  // BACKEND V2.4a: one-shot, silent background refresh. preload() is
  // memoized (one bulk request per page load, not per building), resolves
  // `false` for local mode/empty table/any failure (nothing to do), and
  // `true` only when backend rows exist. `options.refreshed` prevents this
  // from re-scheduling itself when THIS re-render is the one preload()
  // triggered (preload()'s own promise is already resolved by then, so
  // without this guard the .then() below would fire again synchronously
  // and recurse forever). Skipped entirely if the user has since navigated
  // away from this exact Building profile route.
  if (!(options && options.refreshed) && window.BuildingMetadataProvider) {
    const routeHash = `#/place/${encodeURIComponent(placeId)}`;
    window.BuildingMetadataProvider.preload().then(changed => {
      if (changed && location.hash === routeHash) renderPlaceProfile(container, placeId, { refreshed: true });
    }).catch(() => {});
  }
}

function openPlaceFromMap(placeId) {
  if (!getCampusBuilding(placeId)) return false;
  location.href = `index.html#/place/${encodeURIComponent(placeId)}`;
  return true;
}

window.openPlaceFromMap = openPlaceFromMap;
