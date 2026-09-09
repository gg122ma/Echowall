(function () {
  "use strict";

  const RAW_PUBLISHED_BASELINE = 573;
  const VISIBLE_NOTES_BASELINE = 1017;
  const COMMUNITIES = 12;
  const PHOTO_NOTES = 53;

  function normalizePublishedCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  }

  function getVisibleNotes(rawPublishedCount) {
    const raw = normalizePublishedCount(rawPublishedCount);
    return VISIBLE_NOTES_BASELINE + Math.max(0, raw - RAW_PUBLISHED_BASELINE);
  }

  window.HomeStatsService = Object.freeze({
    RAW_PUBLISHED_BASELINE,
    VISIBLE_NOTES_BASELINE,
    COMMUNITIES,
    PHOTO_NOTES,
    getVisibleNotes,
  });
}());
