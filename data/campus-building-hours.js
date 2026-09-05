// Structured weekly opening hours for the buildings that open the Echo Map building card and
// the building detail ("More details") page (PREVIEW_PLACE_IDS in echomap.js). Sourced from
// data/campus-buildings.js "hours" text plus KMK_Building_Facility_Source_Summary_EchoWall.docx
// (Pustaka's precise 8:00am-4:30pm Sun-Thu / closed Fri-Sat schedule comes from that source, not
// the looser campus-buildings.js string). Buildings whose source only gives an event-dependent or
// "check current hours" note are marked "unavailable" instead of guessing a weekly pattern.
// Day keys follow Date.getDay(): 0=Sunday ... 6=Saturday.
// window.BuildingHours is the single shared read API for this data — echomap.js and app-place.js
// both call it so the map card and the detail page never disagree about a building's status.
(function () {
  const DAILY_06_22 = {
    0: { open: "06:00", close: "22:00" },
    1: { open: "06:00", close: "22:00" },
    2: { open: "06:00", close: "22:00" },
    3: { open: "06:00", close: "22:00" },
    4: { open: "06:00", close: "22:00" },
    5: { open: "06:00", close: "22:00" },
    6: { open: "06:00", close: "22:00" },
  };
  const DAILY_0630_22 = {
    0: { open: "06:30", close: "22:00" },
    1: { open: "06:30", close: "22:00" },
    2: { open: "06:30", close: "22:00" },
    3: { open: "06:30", close: "22:00" },
    4: { open: "06:30", close: "22:00" },
    5: { open: "06:30", close: "22:00" },
    6: { open: "06:30", close: "22:00" },
  };
  const MON_SAT_0730_1800 = {
    0: { closed: true },
    1: { open: "07:30", close: "18:00" },
    2: { open: "07:30", close: "18:00" },
    3: { open: "07:30", close: "18:00" },
    4: { open: "07:30", close: "18:00" },
    5: { open: "07:30", close: "18:00" },
    6: { open: "07:30", close: "18:00" },
  };

  window.CAMPUS_BUILDING_HOURS = {
    B_PUSTAKA: {
      mode: "weekly",
      days: {
        0: { open: "08:00", close: "16:30" },
        1: { open: "08:00", close: "16:30" },
        2: { open: "08:00", close: "16:30" },
        3: { open: "08:00", close: "16:30" },
        4: { open: "08:00", close: "16:30" },
        5: { closed: true },
        6: { closed: true },
      },
    },
    B_MASJID: { mode: "24h" },
    B_DEWAN_KULIAH: { mode: "weekly", days: MON_SAT_0730_1800 },
    B_BLOK_TUTORAN_MAKMAL: { mode: "weekly", days: MON_SAT_0730_1800 },
    B_LANGKASUKA: { mode: "weekly", days: MON_SAT_0730_1800 },
    B_SERI_JERAI: { mode: "weekly", days: MON_SAT_0730_1800 },
    B_SERAMBI: {
      mode: "weekly",
      days: {
        0: { closed: true },
        1: { open: "08:00", close: "17:00" },
        2: { open: "08:00", close: "17:00" },
        3: { open: "08:00", close: "17:00" },
        4: { open: "08:00", close: "17:00" },
        5: { open: "08:00", close: "17:00" },
        6: { closed: true },
      },
    },
    B_BASKETBALL_NW: {
      mode: "weekly",
      days: {
        0: { closed: true },
        1: { open: "08:30", close: "17:30" },
        2: { open: "08:30", close: "17:30" },
        3: { open: "08:30", close: "17:30" },
        4: { open: "08:30", close: "17:30" },
        5: { open: "08:30", close: "17:30" },
        6: { closed: true },
      },
    },
    B_ASTAKA: { mode: "weekly", days: DAILY_06_22 },
    B_TENNIS_NW: { mode: "weekly", days: DAILY_06_22 },
    B_PADANG_UTAMA: { mode: "weekly", days: DAILY_06_22 },
    B_KAFETERIA_A: { mode: "weekly", days: DAILY_0630_22 },
    B_KAFETERIA_B: { mode: "weekly", days: DAILY_0630_22 },
    B_KAFETERIA_C: { mode: "weekly", days: DAILY_0630_22 },
    B_SERI_PALAS: { mode: "24h", residentsOnly: true },
    B_SERI_TEMIN: { mode: "24h", residentsOnly: true },
    B_SERI_LAKA: { mode: "24h", residentsOnly: true },
    B_DEWAN_MAHAWANGSA: { mode: "unavailable" },
    B_KAFETERIA_PENTADBIRAN: { mode: "unavailable" },
  };

  const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  function hoursToMinutes(value) {
    const [hour, minute] = String(value).split(":").map(Number);
    return hour * 60 + minute;
  }

  function formatTime(value) {
    const [hourStr, minuteStr] = String(value).split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = ((hour + 11) % 12) + 1;
    return displayHour + ":" + String(minute).padStart(2, "0") + " " + period;
  }

  // BACKEND V2.4a: single resolution point for which hours config to use —
  // an optional backend override (app.building_metadata.hours, whole-object
  // only, never merged day-by-day) takes precedence when present; otherwise
  // falls through to the exact same static lookup as before. This is the
  // ONLY change in this file: the open/closed calculation below is
  // untouched, so there remains exactly one canonical runtime calculation
  // path regardless of which config source it reads from.
  function resolveHoursConfig(buildingId) {
    const override = window.BuildingMetadataProvider?.getHoursOverride?.(buildingId);
    return override || window.CAMPUS_BUILDING_HOURS[buildingId];
  }

  function getSnapshot(buildingId, now) {
    const config = resolveHoursConfig(buildingId);
    if (!config || config.mode === "unavailable") return { mode: "unavailable" };
    if (config.mode === "24h") return { mode: "24h", residentsOnly: !!config.residentsOnly };

    const day = now.getDay();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const today = config.days[day];
    const isOpenNow = !!today && !today.closed
      && minutesNow >= hoursToMinutes(today.open)
      && minutesNow < hoursToMinutes(today.close);
    if (isOpenNow) {
      return { mode: "weekly", isOpen: true, closesAt: today.close, days: config.days };
    }
    for (let offset = 0; offset <= 7; offset++) {
      const candidateDay = (day + offset) % 7;
      const candidate = config.days[candidateDay];
      if (!candidate || candidate.closed) continue;
      if (offset === 0 && minutesNow >= hoursToMinutes(candidate.close)) continue;
      return {
        mode: "weekly",
        isOpen: false,
        opensAt: candidate.open,
        opensDay: candidateDay,
        opensToday: offset === 0,
        days: config.days,
      };
    }
    return { mode: "weekly", isOpen: false, days: config.days };
  }

  function formatStatusLine(snapshot) {
    if (snapshot.mode === "unavailable") {
      return I18n.t("map.hours.unavailable");
    }
    if (snapshot.mode === "24h") {
      const suffix = snapshot.residentsOnly ? " · " + I18n.t("map.hours.residentsOnly") : "";
      return I18n.t("map.hours.open") + " · " + I18n.t("map.hours.open24") + suffix;
    }
    if (snapshot.isOpen) {
      return I18n.t("map.hours.open") + " · " + I18n.t("map.hours.closesAt", { time: formatTime(snapshot.closesAt) });
    }
    if (snapshot.opensAt) {
      const opensText = snapshot.opensToday
        ? I18n.t("map.hours.opensAt", { time: formatTime(snapshot.opensAt) })
        : I18n.t("map.hours.opensOnDay", { time: formatTime(snapshot.opensAt), day: I18n.t("map.weekday." + WEEKDAY_KEYS[snapshot.opensDay]) });
      return I18n.t("map.hours.closed") + " · " + opensText;
    }
    return I18n.t("map.hours.closed");
  }

  window.BuildingHours = {
    weekdayKeys: WEEKDAY_KEYS,
    getSnapshot: getSnapshot,
    formatTime: formatTime,
    formatStatusLine: formatStatusLine,
  };
})();
