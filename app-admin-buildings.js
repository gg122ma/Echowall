/** Building subsection of the existing Admin route. No prototype role authorization. */
(function () {
  let editor = null;
  let accountId = window.SupabaseAuthProvider?.getCurrentUser?.()?.id || null;
  const labels = { description: "Description", purpose: "Purpose", special_notes: "Special notes", localized_alias: "Localized alias" };
  const staticKeys = { special_notes: "specialNotes", localized_alias: "localizedAlias" };
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const esc = value => escapeHtml(String(value ?? ""));
  const checked = value => value ? " checked" : "";
  function fallbackControl(field, value) {
    return `<label class="form-group"><span class="form-label">${esc(labels[field] || "Hours")} source</span><select class="form-input" data-source="${field}"><option value="static"${value === null ? " selected" : ""}>Use static fallback</option><option value="override"${value !== null ? " selected" : ""}>Use backend override</option></select></label>`;
  }
  function reference(field, building) {
    const value = field === "hours" ? window.CAMPUS_BUILDING_HOURS?.[building.id] : building[staticKeys[field] || field];
    return `<details><summary>Static reference (read only)</summary><pre>${esc(JSON.stringify(value ?? null, null, 2))}</pre></details>`;
  }
  function localizedHtml(field, building) {
    const value = editor.state.draft[field];
    return `<fieldset><legend>${esc(labels[field])}</legend>${fallbackControl(field, value)}${value === null ? "" : `<p>Select the languages to include. An empty object is an explicit override.</p>${BuildingMetadataAdmin.languages.map(lang => `<label class="form-group"><span><input type="checkbox" data-language="${field}:${lang}"${checked(Object.hasOwn(value, lang))}> Include ${lang}</span><textarea class="form-textarea" aria-label="${labels[field]} ${lang}" data-text="${field}:${lang}"${Object.hasOwn(value, lang) ? "" : " disabled"}>${esc(value[lang] || "")}</textarea><small>Maximum ${BuildingMetadataAdmin.limits[field]} characters</small></label>`).join("")}`}${reference(field, building)}</fieldset>`;
  }
  function hoursHtml(building) {
    const value = editor.state.draft.hours;
    return `<fieldset><legend>Hours</legend>${fallbackControl("hours", value)}${value === null ? "" : `<label class="form-group">Schedule mode<select class="form-input" data-hours-mode>${["weekly", "24h", "unavailable"].map(mode => `<option${value.mode === mode ? " selected" : ""}>${mode}</option>`).join("")}</select></label><label class="form-group">Residents only<select class="form-input" data-residents><option value="unset"${value.residentsOnly === undefined ? " selected" : ""}>Not specified</option><option value="true"${value.residentsOnly === true ? " selected" : ""}>Yes</option><option value="false"${value.residentsOnly === false ? " selected" : ""}>No</option></select></label>${value.mode === "weekly" ? `<p>24-hour HH:MM. Opening must be earlier than closing, on the same day.</p>${days.map((name, i) => { const day = value.days[i]; return `<div class="building-admin-day"><strong>${name}</strong><label><input type="checkbox" data-closed="${i}"${checked(day.closed)}> Closed</label>${day.closed ? "" : `<label>Open<input class="form-input" type="time" step="60" aria-label="${name} open" data-time="${i}:open" value="${esc(day.open)}"></label><label>Close<input class="form-input" type="time" step="60" aria-label="${name} close" data-time="${i}:close" value="${esc(day.close)}"></label>`}</div>`; }).join("")}` : ""}`}${reference("hours", building)}</fieldset>`;
  }
  function paint(container) {
    const state = editor.state;
    const building = window.getCampusBuilding(state.buildingId);
    container.innerHTML = `<div class="admin-shell building-admin"><aside class="admin-sidebar"><h2>Admin</h2><a class="admin-nav-item active" href="#/admin/buildings">Building metadata</a><a class="admin-nav-item" href="#/places">Building profiles</a></aside><main class="admin-main"><h1>Building metadata</h1><p>For authorized Building administrators. Saving requires a signed-in Supabase account and server permission.</p><p>Override off uses current static information. Override on replaces the whole field, including its languages. Static references are never copied into your edits.</p><form data-building-form><fieldset${state.busy ? " disabled" : ""}><legend>Choose a Building</legend><label class="form-group">Building<select class="form-input" data-building-select><option value="">Select a Building…</option>${BuildingMetadataAdmin.listBuildings().map(item => `<option value="${esc(item.id)}"${item.id === state.buildingId ? " selected" : ""}>${esc(item.name)} — ${esc(item.id)}</option>`).join("")}</select></label><button type="button" class="btn btn-outline" data-load>Load selected Building</button><p>Loading replaces the form. Copy any unsaved edits before switching Buildings.</p></fieldset><p role="status" aria-live="polite" data-status>${esc(state.message)}</p>${state.loaded ? `<h2>${esc(building.name)} <small>${esc(building.id)}</small></h2><p>Loaded revision: ${esc(state.raw?.updated_at || "No backend row")}</p><fieldset${state.busy ? " disabled" : ""}><legend>Overrides</legend>${Object.keys(labels).map(field => localizedHtml(field, building)).join("")}${hoursHtml(building)}<button type="submit" class="btn btn-primary"${state.conflict ? " disabled" : ""}>${state.busy ? "Saving…" : "Save all fields"}</button> <button type="button" class="btn btn-outline" data-reload>Reload latest overrides (keep draft for reference)</button></fieldset>` : ""}${state.previousDraft ? `<details open><summary>Your unsaved draft before reload (read only)</summary><pre>${esc(JSON.stringify(state.previousDraft, null, 2))}</pre><p>Compare with the latest form above and re-enter the changes you want to save.</p></details>` : ""}</form></main></div>`;
    const form = container.querySelector("[data-building-form]");
    form.oninput = event => {
      const target = event.target;
      if (target.dataset.text) { const [field, lang] = target.dataset.text.split(":"); state.draft[field][lang] = target.value; }
      if (target.dataset.time) { const [day, key] = target.dataset.time.split(":"); state.draft.hours.days[day][key] = target.value; }
    };
    form.onchange = event => {
      const target = event.target;
      if (target.dataset.source) state.draft[target.dataset.source] = target.value === "static" ? null : target.dataset.source === "hours" ? { mode: "unavailable" } : {};
      else if (target.dataset.language) { const [field, lang] = target.dataset.language.split(":"); if (target.checked) state.draft[field][lang] = ""; else delete state.draft[field][lang]; }
      else if (target.hasAttribute("data-hours-mode")) { state.draft.hours.mode = target.value; delete state.draft.hours.days; if (target.value === "weekly") state.draft.hours.days = Object.fromEntries(days.map((_, i) => [i, { closed: true }])); }
      else if (target.hasAttribute("data-residents")) { if (target.value === "unset") delete state.draft.hours.residentsOnly; else state.draft.hours.residentsOnly = target.value === "true"; }
      else if (target.dataset.closed !== undefined) state.draft.hours.days[target.dataset.closed] = target.checked ? { closed: true } : { open: "", close: "" };
      else return;
      const attribute = ["data-source", "data-language", "data-hours-mode", "data-residents", "data-closed"].find(name => target.hasAttribute(name));
      const value = attribute ? target.getAttribute(attribute) : "";
      paint(container);
      if (attribute) container.querySelector(`[${attribute}="${value}"]`)?.focus();
    };
    async function run(action) {
      const activeEditor = editor;
      const pending = action();
      paint(container);
      await pending;
      if (editor === activeEditor && window.location.hash === "#/admin/buildings") paint(container);
    }
    form.querySelector("[data-load]").onclick = () => {
      const id = form.querySelector("[data-building-select]").value;
      if (id) return run(() => editor.load(id));
    };
    form.querySelector("[data-reload]")?.addEventListener("click", () => run(() => editor.load(state.buildingId, true)));
    form.onsubmit = event => { event.preventDefault(); return run(() => editor.save()); };
  }
  window.renderAdminBuildings = container => {
    if (!editor) editor = BuildingMetadataAdmin.createEditor();
    paint(container);
  };
  window.addEventListener("echo:communityauthchange", event => {
    const nextId = event.detail?.user?.id || null;
    if (nextId === accountId) return; // Token refresh must not erase an unsaved form.
    accountId = nextId;
    // Do not carry another account's draft across sign-out/account switching.
    editor = null;
    if (window.location.hash === "#/admin/buildings" && typeof render === "function") render();
  });
})();
