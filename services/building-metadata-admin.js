/** V2.4c: raw override model and API adapter. Server RPC owns authorization. */
(function () {
  const limits = Object.freeze({ description: 2000, purpose: 500, special_notes: 1000, localized_alias: 100 });
  const languages = Object.freeze(["en", "ms", "zh"]);
  const fields = [...Object.keys(limits), "hours"];
  const columns = ["building_id", ...fields, "updated_at"].join(",");
  const clone = value => JSON.parse(JSON.stringify(value));
  const problem = (code, message) => Object.assign(new Error(message), { code });
  function errorMessage(error) {
    return ({
      "42501": "You do not have permission to edit this Building.",
      "40001": "Building metadata changed. Reload the latest overrides before retrying.",
      "22023": "Invalid metadata. Check the language limits and opening hours.",
      "23503": "This Building is unavailable or invalid.",
      AUTH_REQUIRED: "Sign in with your Supabase account before editing Building metadata.",
    })[error?.code] || "Could not reach Building metadata. Your edits are preserved; try again.";
  }
  function localized(value, field) {
    if (value === null) return null;
    if (!value || Array.isArray(value) || typeof value !== "object") throw problem("22023");
    const result = {};
    for (const key of Object.keys(value)) {
      if (!languages.includes(key) || typeof value[key] !== "string" || [...value[key]].length > limits[field]) throw problem("22023");
      result[key] = value[key];
    }
    return result;
  }
  function hours(value) {
    if (value === null) return null;
    if (!value || !["weekly", "24h", "unavailable"].includes(value.mode)) throw problem("22023");
    const result = { mode: value.mode };
    if (value.residentsOnly !== undefined) {
      if (typeof value.residentsOnly !== "boolean") throw problem("22023");
      result.residentsOnly = value.residentsOnly;
    }
    if (value.mode === "weekly") {
      if (!value.days || Object.keys(value.days).length !== 7) throw problem("22023");
      result.days = {};
      const time = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
      for (let i = 0; i < 7; i++) {
        const day = value.days[String(i)];
        if (day?.closed === true && day.open === undefined && day.close === undefined) result.days[i] = { closed: true };
        else if (day && day.closed === undefined && time.test(day.open) && time.test(day.close) && day.open < day.close) result.days[i] = { open: day.open, close: day.close };
        else throw problem("22023");
      }
    }
    return result;
  }
  function draftFromRow(row) {
    return Object.fromEntries(fields.map(field => [field, row?.[field] == null ? null : clone(row[field])]));
  }
  function sanitizeRow(row, buildingId) {
    if (!row || row.building_id !== buildingId || typeof row.updated_at !== "string" || !row.updated_at) throw problem("INVALID_RESPONSE");
    return { building_id: buildingId, ...draftFromRow(row), updated_at: row.updated_at };
  }
  function serialize(buildingId, draft, raw) {
    if (!window.getCampusBuilding(buildingId)) throw problem("23503");
    const payload = { p_building_id: buildingId };
    for (const field of fields) payload[`p_${field}`] = field === "hours" ? hours(draft[field]) : localized(draft[field], field);
    payload.p_expected_updated_at = raw ? raw.updated_at : null;
    return payload;
  }
  async function sessionClient() {
    const client = await window.CommunitySupabaseClient.getClient();
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.access_token || !data.session.user?.id || data.session.user.is_anonymous) throw problem("AUTH_REQUIRED");
    return client;
  }
  function createEditor() {
    const state = { buildingId: "", raw: null, draft: null, previousDraft: null, loaded: false, busy: false, conflict: false, message: "" };
    async function load(buildingId, preserve = false) {
      if (state.busy) return false;
      state.busy = true;
      state.message = "Loading raw overrides…";
      try {
        if (!window.getCampusBuilding(buildingId)) throw problem("23503");
        const client = await sessionClient();
        const { data, error } = await client.from("building_metadata_public").select(columns).eq("building_id", buildingId).maybeSingle();
        if (error) throw error;
        const raw = data === null ? null : sanitizeRow(data, buildingId);
        state.previousDraft = preserve && state.draft ? clone(state.draft) : null;
        Object.assign(state, { buildingId, raw, draft: draftFromRow(raw), loaded: true, conflict: false,
          message: raw ? "Raw backend overrides loaded." : "No backend override row. All fields use static fallback." });
        return true;
      } catch (error) { state.message = errorMessage(error); return false; }
      finally { state.busy = false; }
    }
    async function save() {
      if (state.busy || !state.loaded || state.conflict) return false;
      state.busy = true;
      state.message = "Saving…";
      try {
        const payload = serialize(state.buildingId, state.draft, state.raw);
        const client = await sessionClient();
        const { data, error } = await client.rpc("update_building_metadata", payload);
        if (error) throw error;
        if (!Array.isArray(data) || data.length !== 1) throw problem("INVALID_RESPONSE");
        const raw = sanitizeRow(data[0], state.buildingId);
        Object.assign(state, { raw, draft: draftFromRow(raw), previousDraft: null, message: "Building metadata saved." });
        window.BuildingMetadataProvider.acceptSavedRow(raw);
        return true;
      } catch (error) {
        state.conflict = error?.code === "40001";
        state.message = errorMessage(error);
        return false;
      } finally { state.busy = false; }
    }
    return { state, load, save };
  }
  window.BuildingMetadataAdmin = Object.freeze({ limits, languages, draftFromRow, serialize, errorMessage, createEditor,
    listBuildings: () => window.CAMPUS_BUILDINGS.map(({ id, name }) => ({ id, name })) });
})();
