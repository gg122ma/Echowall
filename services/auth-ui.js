(function () {
  let mode = "login";
  let lastFocusedElement = null;
  let profileLastFocusedElement = null;
  let profileOnboarding = false;
  let profileStatus = "";
  let profileSubmitting = false;
  let accountOpen = false;
  let accountLastFocusedElement = null;
  let accountSigningOut = false;
  let accountBodyOverflow = null;
  let activeProfileSelect = null;
  let activeProfileOptionIndex = -1;

  function ensureDialog() {
    let overlay = document.getElementById("auth-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.className = "auth-overlay hidden";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `<section class="account-auth-shell" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description">
      <button class="account-auth-close" type="button">✕</button>
      <section class="account-auth-visual" aria-label="Echo Wall">
        <div class="account-auth-copy">
          <img src="assets/book-icon.png" alt="" />
          <p class="eyebrow account-auth-visual-eyebrow"></p>
          <h2 class="account-auth-visual-title"></h2>
          <p class="account-auth-visual-description"></p>
          <div class="account-auth-points">
            <span>✦ <b class="account-auth-point-one"></b></span>
            <span>✦ <b class="account-auth-point-two"></b></span>
            <span>✦ <b class="account-auth-point-three"></b></span>
          </div>
        </div>
      </section>
      <section class="account-auth-panel">
        <div class="account-auth-scroll">
          <div class="account-auth-card">
            <div class="account-auth-mark" aria-hidden="true">E</div>
            <p class="eyebrow account-auth-mode-label"></p>
            <h2 id="auth-title"></h2>
            <p id="auth-description" class="account-auth-description"></p>
            <p class="account-auth-local-notice"></p>
            <form id="auth-form" novalidate>
              <div class="form-group auth-display-name"><label class="form-label" for="auth-display-name"></label><input id="auth-display-name" class="form-input" maxlength="50" autocomplete="name" /></div>
              <div class="form-group"><label class="form-label" for="auth-email"></label><input id="auth-email" class="form-input" type="email" autocomplete="email" required /></div>
              <div class="form-group"><label class="form-label" for="auth-password"></label><input id="auth-password" class="form-input" type="password" autocomplete="current-password" minlength="8" required /></div>
              <div class="form-group auth-confirm"><label class="form-label" for="auth-confirm"></label><input id="auth-confirm" class="form-input" type="password" autocomplete="new-password" minlength="8" /></div>
              <p id="auth-error" class="auth-error" role="alert"></p>
              <button id="auth-submit" class="btn btn-primary btn-full btn-lg" type="submit"></button>
            </form>
            <button id="auth-switch" class="account-auth-switch" type="button"></button>
          </div>
        </div>
      </section>
    </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    overlay.querySelector(".account-auth-close").addEventListener("click", close);
    overlay.querySelector("#auth-switch").addEventListener("click", () => {
      setMode(mode === "login" ? "register" : "login");
      focusFirstField(overlay);
    });
    overlay.querySelector("#auth-form").addEventListener("submit", submit);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !overlay.classList.contains("hidden")) close();
    });
    return overlay;
  }

  function focusFirstField(overlay) {
    requestAnimationFrame(() => {
      overlay.querySelector(mode === "register" ? "#auth-display-name" : "#auth-email")?.focus();
    });
  }

  function ensureProfileDialog() {
    let overlay = document.getElementById("profile-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "profile-overlay";
    overlay.className = "auth-overlay profile-overlay hidden";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `<section class="profile-dialog-shell" role="dialog" aria-modal="true" aria-labelledby="profile-title" aria-describedby="profile-description">
      <header class="profile-dialog-header"><div><p class="eyebrow profile-dialog-eyebrow"></p><h2 id="profile-title"></h2><p id="profile-description"></p></div><button class="account-auth-close profile-close" type="button">✕</button></header>
      <form id="profile-form" class="profile-form" novalidate>
        <div class="profile-dialog-scroll">
          <p class="profile-optional-note"></p>
          <div class="form-group"><label class="form-label" for="profile-display-name"></label><input id="profile-display-name" class="form-input" maxlength="50" autocomplete="name" required /></div>
          <fieldset class="profile-status-fieldset"><legend class="form-label profile-status-legend"></legend><div class="profile-status-grid" role="radiogroup" aria-labelledby="profile-status-label"><span id="profile-status-label" class="visually-hidden"></span>
            <button type="button" class="profile-status-card" role="radio" aria-checked="false" data-profile-status="current_student"><span>🎓</span><b class="profile-status-current"></b></button>
            <button type="button" class="profile-status-card" role="radio" aria-checked="false" data-profile-status="alumni"><span>📜</span><b class="profile-status-alumni"></b></button>
            <button type="button" class="profile-status-card" role="radio" aria-checked="false" data-profile-status="non_student"><span>🌿</span><b class="profile-status-non-student"></b></button>
          </div></fieldset>
          <div class="profile-education-details hidden">
            <div class="form-group"><label class="form-label" for="profile-org-trigger"></label><div class="profile-select"><select id="profile-org" class="form-select profile-select-native" tabindex="-1" aria-hidden="true"></select><button id="profile-org-trigger" class="profile-select-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="profile-select-menu" data-profile-select="profile-org"><span class="profile-select-value"></span><span aria-hidden="true">▾</span></button></div></div>
            <div class="form-group"><label class="form-label" for="profile-major-trigger"></label><div class="profile-select"><select id="profile-major" class="form-select profile-select-native" tabindex="-1" aria-hidden="true" disabled></select><button id="profile-major-trigger" class="profile-select-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="profile-select-menu" data-profile-select="profile-major" disabled><span class="profile-select-value"></span><span aria-hidden="true">▾</span></button></div></div>
            <div class="form-group"><label class="form-label" for="profile-year-trigger"></label><div class="profile-select"><select id="profile-year" class="form-select profile-select-native" tabindex="-1" aria-hidden="true"></select><button id="profile-year-trigger" class="profile-select-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="profile-select-menu" data-profile-select="profile-year"><span class="profile-select-value"></span><span aria-hidden="true">▾</span></button></div></div>
          </div>
          <p class="profile-non-student-note hidden"></p>
          <p id="profile-error" class="auth-error profile-error" role="alert" tabindex="-1"></p>
        </div>
        <footer class="profile-dialog-actions"><button class="btn btn-ghost profile-skip" type="button"></button><button id="profile-submit" class="btn btn-primary" type="submit"></button></footer>
      </form>
    </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => { if (event.target === overlay) closeProfileEditor(); });
    overlay.querySelector(".profile-close").addEventListener("click", closeProfileEditor);
    overlay.querySelector(".profile-skip").addEventListener("click", closeProfileEditor);
    overlay.querySelectorAll("[data-profile-status]").forEach(button => button.addEventListener("click", () => setProfileStatus(button.dataset.profileStatus)));
    overlay.querySelector("#profile-org").addEventListener("change", () => {
      const currentMajorId = overlay.querySelector("#profile-major").value;
      populateProfileMajors(currentMajorId || null);
    });
    overlay.querySelectorAll("[data-profile-select]").forEach(trigger => {
      trigger.addEventListener("click", () => activeProfileSelect === trigger.dataset.profileSelect ? closeProfileSelectMenu() : openProfileSelectMenu(trigger.dataset.profileSelect));
      trigger.addEventListener("keydown", handleProfileSelectTriggerKeydown);
    });
    overlay.querySelector("#profile-form").addEventListener("submit", submitProfile);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !overlay.classList.contains("hidden") && !activeProfileSelect) closeProfileEditor();
    });
    return overlay;
  }

  function appendSelectOption(select, value, label, { disabled = false } = {}) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.disabled = disabled;
    select.appendChild(option);
  }

  function ensureProfileSelectMenu() {
    let menu = document.getElementById("profile-select-menu");
    if (menu) return menu;
    menu = document.createElement("div");
    menu.id = "profile-select-menu";
    menu.className = "profile-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    document.body.appendChild(menu);
    menu.addEventListener("pointerdown", event => {
      const option = event.target.closest("[data-profile-option]");
      if (!option || option.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      chooseProfileSelectOption(Number(option.dataset.profileOption));
    });
    return menu;
  }

  function syncProfileSelect(selectId) {
    const overlay = document.getElementById("profile-overlay");
    const select = overlay?.querySelector(`#${selectId}`);
    const trigger = overlay?.querySelector(`[data-profile-select="${selectId}"]`);
    if (!select || !trigger) return;
    trigger.disabled = select.disabled;
    const selected = select.options[select.selectedIndex] || select.options[0];
    trigger.querySelector(".profile-select-value").textContent = selected?.textContent || "";
    trigger.classList.toggle("profile-select-empty", !select.value);
    if (select.disabled && activeProfileSelect === selectId) closeProfileSelectMenu(false);
  }

  function renderProfileSelectOptions(select) {
    const menu = ensureProfileSelectMenu();
    menu.replaceChildren();
    Array.from(select.options).forEach((nativeOption, index) => {
      const option = document.createElement("div");
      option.className = "profile-select-option";
      option.id = `profile-select-option-${index}`;
      option.dataset.profileOption = String(index);
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === select.selectedIndex));
      option.setAttribute("aria-disabled", String(nativeOption.disabled));
      option.textContent = nativeOption.textContent;
      menu.appendChild(option);
    });
  }

  function setActiveProfileOption(index) {
    const menu = document.getElementById("profile-select-menu");
    const options = Array.from(menu?.querySelectorAll("[data-profile-option]") || []);
    if (!options.length) return;
    activeProfileOptionIndex = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => option.classList.toggle("is-active", optionIndex === activeProfileOptionIndex));
    const active = options[activeProfileOptionIndex];
    document.querySelector(`[data-profile-select="${activeProfileSelect}"]`)?.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block:"nearest" });
  }

  function positionProfileSelectMenu(trigger) {
    const menu = ensureProfileSelectMenu();
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 16);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)}px`;
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.visibility = "hidden";
    requestAnimationFrame(() => {
      const height = menu.getBoundingClientRect().height;
      const below = window.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      menu.style.top = `${below < Math.min(height, 270) && above > below ? Math.max(8, rect.top - height - 6) : rect.bottom + 6}px`;
      menu.style.visibility = "visible";
      menu.querySelector(".is-active")?.scrollIntoView({ block:"nearest" });
    });
  }

  function openProfileSelectMenu(selectId) {
    const overlay = document.getElementById("profile-overlay");
    const select = overlay?.querySelector(`#${selectId}`);
    const trigger = overlay?.querySelector(`[data-profile-select="${selectId}"]`);
    if (!select || !trigger || select.disabled) return;
    closeProfileSelectMenu(false);
    activeProfileSelect = selectId;
    renderProfileSelectOptions(select);
    const menu = ensureProfileSelectMenu();
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    positionProfileSelectMenu(trigger);
    setActiveProfileOption(Math.max(0, select.selectedIndex));
  }

  function closeProfileSelectMenu(restoreFocus = false) {
    const trigger = activeProfileSelect ? document.querySelector(`[data-profile-select="${activeProfileSelect}"]`) : null;
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.removeAttribute("aria-activedescendant");
    const menu = document.getElementById("profile-select-menu");
    if (menu) menu.hidden = true;
    activeProfileSelect = null;
    activeProfileOptionIndex = -1;
    if (restoreFocus) trigger?.focus();
  }

  function chooseProfileSelectOption(index) {
    const overlay = document.getElementById("profile-overlay");
    const select = activeProfileSelect ? overlay?.querySelector(`#${activeProfileSelect}`) : null;
    const option = select?.options[index];
    if (!select || !option || option.disabled) return;
    select.selectedIndex = index;
    select.dispatchEvent(new Event("change", { bubbles:true }));
    syncProfileSelect(select.id);
    closeProfileSelectMenu(true);
  }

  function handleProfileSelectTriggerKeydown(event) {
    const selectId = event.currentTarget.dataset.profileSelect;
    if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const wasOpen = activeProfileSelect === selectId;
      if (!wasOpen) openProfileSelectMenu(selectId);
      const select = document.getElementById(selectId);
      if (event.key === "Home") setActiveProfileOption(0);
      else if (event.key === "End") setActiveProfileOption((select?.options.length || 1) - 1);
      else if (event.key === "ArrowDown") setActiveProfileOption(activeProfileOptionIndex + 1);
      else if (event.key === "ArrowUp") setActiveProfileOption(activeProfileOptionIndex - 1);
      else if ((event.key === "Enter" || event.key === " ") && wasOpen) chooseProfileSelectOption(activeProfileOptionIndex);
    }
  }

  function populateProfileOrganizations(selectedId = null) {
    const select = ensureProfileDialog().querySelector("#profile-org");
    select.replaceChildren();
    appendSelectOption(select, "", I18n.t("profile.chooseInstitution"));
    educationInstitutions.forEach(org => appendSelectOption(select, String(org.id), String(org.name)));
    select.value = selectedId == null ? "" : String(selectedId);
    syncProfileSelect("profile-org");
  }

  function populateProfileMajors(selectedId = null) {
    const overlay = ensureProfileDialog();
    const select = overlay.querySelector("#profile-major");
    const available = educationPrograms;
    select.replaceChildren();
    appendSelectOption(select, "", I18n.t(available.length ? "profile.chooseMajor" : "profile.noMajors"));
    available.forEach(major => appendSelectOption(select, String(major.id), String(major.name)));
    select.disabled = !available.length;
    const selectedProgram = available.find(major => major.id === Number(selectedId) || major.legacyIds?.includes(Number(selectedId)));
    select.value = selectedProgram ? String(selectedProgram.id) : "";
    syncProfileSelect("profile-major");
  }

  function populateProfileYears(selectedYear = null) {
    const select = ensureProfileDialog().querySelector("#profile-year");
    select.replaceChildren();
    appendSelectOption(select, "", I18n.t("profile.chooseYear"));
    for (let year = new Date().getFullYear() + 1; year >= 1980; year -= 1) appendSelectOption(select, String(year), String(year));
    select.value = selectedYear == null ? "" : String(selectedYear);
    syncProfileSelect("profile-year");
  }

  function setProfileStatus(status) {
    closeProfileSelectMenu(false);
    profileStatus = ["current_student", "alumni", "non_student"].includes(status) ? status : "";
    const overlay = ensureProfileDialog();
    overlay.querySelectorAll("[data-profile-status]").forEach(button => {
      const selected = button.dataset.profileStatus === profileStatus;
      button.setAttribute("aria-checked", String(selected));
      button.classList.toggle("selected", selected);
    });
    const needsEducation = profileStatus === "current_student" || profileStatus === "alumni";
    overlay.querySelector(".profile-education-details").classList.toggle("hidden", !needsEducation);
    overlay.querySelector(".profile-non-student-note").classList.toggle("hidden", profileStatus !== "non_student");
    ["#profile-org", "#profile-major", "#profile-year"].forEach(selector => { overlay.querySelector(selector).required = needsEducation; });
  }

  function translateProfileDialog() {
    const overlay = document.getElementById("profile-overlay");
    if (!overlay) return;
    overlay.querySelector(".profile-dialog-eyebrow").textContent = I18n.t("profile.educationStatus");
    overlay.querySelector("#profile-title").textContent = I18n.t(profileOnboarding ? "profile.completeTitle" : "profile.editTitle");
    overlay.querySelector("#profile-description").textContent = I18n.t("profile.description");
    overlay.querySelector(".profile-optional-note").textContent = I18n.t("profile.optional");
    overlay.querySelector("label[for='profile-display-name']").textContent = I18n.t("profile.displayName");
    overlay.querySelector(".profile-status-legend").textContent = I18n.t("profile.educationStatus");
    overlay.querySelector("#profile-status-label").textContent = I18n.t("profile.educationStatus");
    overlay.querySelector(".profile-status-current").textContent = I18n.t("profile.currentStudent");
    overlay.querySelector(".profile-status-alumni").textContent = I18n.t("profile.alumni");
    overlay.querySelector(".profile-status-non-student").textContent = I18n.t("profile.nonStudent");
    overlay.querySelector("label[for='profile-org-trigger']").textContent = I18n.t("profile.institution");
    overlay.querySelector("label[for='profile-major-trigger']").textContent = I18n.t("profile.major");
    overlay.querySelector("label[for='profile-year-trigger']").textContent = I18n.t("profile.intakeYear");
    overlay.querySelector(".profile-non-student-note").textContent = I18n.t("profile.nonStudentNote");
    overlay.querySelector(".profile-skip").textContent = I18n.t(profileOnboarding ? "profile.skip" : "common.cancel");
    overlay.querySelector("#profile-submit").textContent = I18n.t("profile.save");
    overlay.querySelector(".profile-close").setAttribute("aria-label", I18n.t("common.close"));
    if (!overlay.classList.contains("hidden")) {
      const orgId = overlay.querySelector("#profile-org").value;
      const majorId = overlay.querySelector("#profile-major").value;
      const year = overlay.querySelector("#profile-year").value;
      populateProfileOrganizations(orgId || null);
      populateProfileMajors(majorId || null);
      populateProfileYears(year || null);
    }
  }

  function openProfileEditor(options = {}) {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    const overlay = ensureProfileDialog();
    if (overlay.classList.contains("hidden")) profileLastFocusedElement = document.activeElement;
    profileOnboarding = options?.onboarding === true;
    profileSubmitting = false;
    translateProfileDialog();
    overlay.querySelector("#profile-submit").disabled = false;
    overlay.querySelector("#profile-display-name").value = user.displayName || "";
    populateProfileOrganizations(user.educationOrgId);
    populateProfileMajors(user.educationMajorId);
    populateProfileYears(user.educationStartYear);
    setProfileStatus(user.educationStatus === "unset" ? "" : user.educationStatus);
    overlay.querySelector("#profile-error").textContent = "";
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("overlay-open");
    requestAnimationFrame(() => overlay.querySelector("#profile-display-name")?.focus());
  }

  function closeProfileEditor(force = false) {
    const overlay = document.getElementById("profile-overlay");
    const forceClose = force === true;
    if (!overlay || overlay.classList.contains("hidden") || (profileSubmitting && !forceClose)) return;
    if (forceClose) profileSubmitting = false;
    closeProfileSelectMenu(false);
    document.getElementById("profile-select-menu")?.remove();
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overlay-open");
    profileLastFocusedElement?.focus?.();
    profileLastFocusedElement = null;
  }

  async function submitProfile(event) {
    event.preventDefault();
    if (profileSubmitting) return;
    const form = event.currentTarget;
    const error = form.querySelector("#profile-error");
    const displayName = form.querySelector("#profile-display-name").value.trim();
    const needsEducation = profileStatus === "current_student" || profileStatus === "alumni";
    const orgId = needsEducation ? Number(form.querySelector("#profile-org").value) : null;
    const majorId = needsEducation ? Number(form.querySelector("#profile-major").value) : null;
    const year = needsEducation ? Number(form.querySelector("#profile-year").value) : null;
    let invalidField = null;
    let message = "";
    if (displayName.length < 2) { invalidField = form.querySelector("#profile-display-name"); message = I18n.t("profile.errorDisplayName"); }
    else if (!profileStatus) { invalidField = form.querySelector("[data-profile-status]"); message = I18n.t("profile.chooseStatus"); }
    else if (needsEducation && (!orgId || !majorId || !year)) { invalidField = !orgId ? form.querySelector("#profile-org-trigger") : !majorId ? form.querySelector("#profile-major-trigger") : form.querySelector("#profile-year-trigger"); message = I18n.t("profile.errorEducation"); }
    if (message) {
      error.textContent = message;
      (invalidField || error).focus();
      return;
    }
    const submitButton = form.querySelector("#profile-submit");
    profileSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = I18n.t("common.loading");
    error.textContent = "";
    try {
      await AuthService.updateProfile({ displayName, educationStatus:profileStatus, educationOrgId:orgId, educationMajorId:majorId, educationStartYear:year });
      profileSubmitting = false;
      submitButton.disabled = false;
      closeProfileEditor();
      showToast?.(I18n.t("profile.saved"));
    } catch (profileError) {
      profileSubmitting = false;
      submitButton.disabled = false;
      submitButton.textContent = I18n.t("profile.save");
      error.textContent = I18n.t("profile.updateFailed");
      error.focus();
    }
  }

  function setMode(nextMode) {
    mode = nextMode;
    const overlay = ensureDialog();
    const isRegister = mode === "register";
    overlay.querySelector(".auth-display-name").classList.toggle("hidden", !isRegister);
    overlay.querySelector(".auth-confirm").classList.toggle("hidden", !isRegister);
    overlay.querySelector("#auth-display-name").required = isRegister;
    overlay.querySelector("#auth-confirm").required = isRegister;
    overlay.querySelector("#auth-password").autocomplete = isRegister ? "new-password" : "current-password";
    overlay.querySelector(".account-auth-visual-eyebrow").textContent = I18n.t("auth.visualEyebrow");
    overlay.querySelector(".account-auth-visual-title").textContent = I18n.t("auth.visualTitle");
    overlay.querySelector(".account-auth-visual-description").textContent = I18n.t("auth.visualDescription");
    overlay.querySelector(".account-auth-point-one").textContent = I18n.t("auth.visualPoint1");
    overlay.querySelector(".account-auth-point-two").textContent = I18n.t("auth.visualPoint2");
    overlay.querySelector(".account-auth-point-three").textContent = I18n.t("auth.visualPoint3");
    overlay.querySelector(".account-auth-mode-label").textContent = I18n.t("auth.title");
    overlay.querySelector("#auth-title").textContent = I18n.t(isRegister ? "auth.registerTitle" : "auth.loginTitle");
    overlay.querySelector("#auth-description").textContent = I18n.t(isRegister ? "auth.registerDescription" : "auth.loginDescription");
    overlay.querySelector(".account-auth-local-notice").textContent = I18n.t("auth.localNotice");
    overlay.querySelector(".account-auth-close").setAttribute("aria-label", I18n.t("common.close"));
    overlay.querySelector("label[for='auth-display-name']").textContent = I18n.t("auth.displayName");
    overlay.querySelector("label[for='auth-email']").textContent = I18n.t("auth.email");
    overlay.querySelector("label[for='auth-password']").textContent = I18n.t("auth.password");
    overlay.querySelector("label[for='auth-confirm']").textContent = I18n.t("auth.confirmPassword");
    overlay.querySelector("#auth-submit").textContent = isRegister ? I18n.t("auth.register") : I18n.t("auth.signIn");
    overlay.querySelector("#auth-switch").textContent = isRegister ? I18n.t("auth.switchLogin") : I18n.t("auth.switchRegister");
    overlay.querySelector("#auth-error").textContent = "";
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.querySelector("#auth-email").value;
    const password = form.querySelector("#auth-password").value;
    const error = form.querySelector("#auth-error");
    const submitButton = form.querySelector("#auth-submit");
    submitButton.disabled = true;
    error.textContent = "";
    let authenticatedUser = null;
    try {
      if (mode === "register") {
        const confirmPassword = form.querySelector("#auth-confirm").value;
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        authenticatedUser = await AuthService.register({ email, password, displayName: form.querySelector("#auth-display-name").value });
        showToast?.(I18n.t("auth.successRegister"));
      } else {
        authenticatedUser = await AuthService.signIn({ email, password });
        showToast?.(I18n.t("auth.successLogin"));
      }
      close();
      if (authenticatedUser?.educationStatus === "unset") requestAnimationFrame(() => openProfileEditor({ onboarding:true }));
    } catch (authError) {
      error.textContent = authError instanceof Error ? authError.message : I18n.t("common.error");
    } finally {
      submitButton.disabled = false;
    }
  }

  function open(nextMode = "login") {
    const overlay = ensureDialog();
    lastFocusedElement = document.activeElement;
    setMode(nextMode);
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("overlay-open");
    focusFirstField(overlay);
  }

  function close() {
    const overlay = document.getElementById("auth-overlay");
    if (!overlay || overlay.classList.contains("hidden")) return;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overlay-open");
    lastFocusedElement?.focus?.();
    lastFocusedElement = null;
  }

  function getUserInitials(displayName) {
    const parts = String(displayName || "").trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part[0]).join("") || "?").toUpperCase();
  }

  function renderAccountSummary(user) {
    const statusKey = {
      current_student: "profile.currentStudent",
      alumni: "profile.alumni",
      non_student: "profile.nonStudent",
      unset: "account.profileIncomplete",
    }[user.educationStatus] || "account.profileIncomplete";
    const needsEducation = user.educationStatus === "current_student" || user.educationStatus === "alumni";
    const org = needsEducation ? educationInstitutions.find(item => item.id === user.educationOrgId) : null;
    const major = needsEducation
      ? educationPrograms.find(item => item.id === user.educationMajorId || item.legacyIds?.includes(user.educationMajorId))
      : null;
    const educationRows = [
      org ? `<span><b>${I18n.t("profile.institution")}</b>${escapeHtml(org.name)}</span>` : "",
      major ? `<span><b>${I18n.t("profile.major")}</b>${escapeHtml(major.name)}</span>` : "",
      needsEducation && Number.isInteger(user.educationStartYear)
        ? `<span><b>${I18n.t("profile.intakeYear")}</b>${escapeHtml(String(user.educationStartYear))}</span>`
        : "",
    ].join("");
    return `<div class="account-summary"><div class="account-avatar account-avatar-large" aria-hidden="true">${escapeHtml(getUserInitials(user.displayName))}</div><div class="account-summary-copy"><strong>${escapeHtml(user.displayName || "")}</strong><span class="account-status">${I18n.t(statusKey)}</span></div></div>${educationRows ? `<div class="account-education">${educationRows}</div>` : ""}`;
  }

  function renderAccountPopover(user, isAdmin) {
    const language = I18n.getLanguage();
    const theme = ThemeService.getPreference();
    const profileAction = user.educationStatus === "unset" ? I18n.t("profile.completeTitle") : I18n.t("profile.editTitle");
    const option = (value, current, label, attribute) => `<button type="button" class="account-option${value === current ? " is-selected" : ""}" ${attribute}="${value}" aria-pressed="${value === current}">${label}</button>`;
    return `<div id="account-overlay" class="account-overlay" hidden><div class="account-popover-backdrop" data-account-dismiss></div><section id="account-popover" class="account-popover" role="dialog" aria-modal="false" aria-labelledby="account-popover-title">
      <header class="account-popover-header"><p id="account-popover-title" class="eyebrow">${I18n.t("nav.account")}</p><button class="account-popover-close" type="button" data-account-dismiss aria-label="${I18n.t("common.close")}">✕</button></header>
      <div class="account-popover-scroll">${renderAccountSummary(user)}
        <button class="account-action account-edit" type="button" data-account-edit><span>✎</span>${profileAction}</button>
        <div class="account-settings-group"><span class="account-setting-label">${I18n.t("account.language")}</span><div class="account-options" role="group" aria-label="${I18n.t("account.language")}">${option("en", language, "EN", "data-account-language")}${option("ms", language, "BM", "data-account-language")}${option("zh", language, "中文", "data-account-language")}</div></div>
        <div class="account-settings-group"><span class="account-setting-label">${I18n.t("nav.theme")}</span><div class="account-options" role="group" aria-label="${I18n.t("nav.theme")}">${option("light", theme, I18n.t("theme.light"), "data-account-theme")}${option("dark", theme, I18n.t("theme.dark"), "data-account-theme")}${option("system", theme, I18n.t("theme.system"), "data-account-theme")}</div></div>
        ${isAdmin ? `<a class="account-action" href="#/admin" data-account-admin><span>◆</span>${I18n.t("nav.adminDashboard")}</a>` : ""}
        <button class="account-action account-sign-out" type="button" data-account-sign-out><span>↪</span>${I18n.t("nav.signOut")}</button>
      </div>
    </section></div>`;
  }

  function ensureAccountPopover(user, isAdmin) {
    document.getElementById("account-overlay")?.remove();
    document.body.insertAdjacentHTML("beforeend", renderAccountPopover(user, isAdmin));
    return document.getElementById("account-overlay");
  }

  function isMobileAccountSheet() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  function lockAccountBodyScroll() {
    document.body.classList.add("account-open");
    if (!isMobileAccountSheet() || accountBodyOverflow !== null) return;
    accountBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function unlockAccountBodyScroll() {
    document.body.classList.remove("account-open");
    if (accountBodyOverflow === null) return;
    document.body.style.overflow = accountBodyOverflow;
    accountBodyOverflow = null;
  }

  function focusWithoutScroll(element) {
    if (!element) return;
    try { element.focus({ preventScroll:true }); }
    catch { element.focus(); }
  }

  function syncAccountPopoverLayout() {
    if (!accountOpen) return;
    const trigger = document.getElementById("account-trigger");
    const popover = document.getElementById("account-popover");
    if (!trigger || !popover) return;
    if (isMobileAccountSheet()) {
      if (accountBodyOverflow === null) {
        accountBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      popover.style.removeProperty("--account-popover-top");
      popover.style.removeProperty("--account-popover-right");
      return;
    }
    if (accountBodyOverflow !== null) {
      document.body.style.overflow = accountBodyOverflow;
      accountBodyOverflow = null;
    }
    const rect = trigger.getBoundingClientRect();
    popover.style.setProperty("--account-popover-top", `${Math.max(8, rect.bottom + 12)}px`);
    popover.style.setProperty("--account-popover-right", `${Math.max(12, window.innerWidth - rect.right)}px`);
  }

  function openAccountPopover() {
    const trigger = document.getElementById("account-trigger");
    const overlay = document.getElementById("account-overlay");
    const popover = document.getElementById("account-popover");
    const scroll = popover?.querySelector(".account-popover-scroll");
    if (!trigger || !overlay || !popover || !scroll || accountOpen) return;
    accountOpen = true;
    accountLastFocusedElement = trigger;
    trigger.setAttribute("aria-expanded", "true");
    overlay.hidden = false;
    lockAccountBodyScroll();
    syncAccountPopoverLayout();
    requestAnimationFrame(() => {
      scroll.scrollTop = 0;
      focusWithoutScroll(popover.querySelector(".account-popover-close"));
      scroll.scrollTop = 0;
      requestAnimationFrame(() => { scroll.scrollTop = 0; });
    });
  }

  function closeAccountPopover(restoreFocus = true) {
    const trigger = document.getElementById("account-trigger");
    const overlay = document.getElementById("account-overlay");
    if (!accountOpen && (!overlay || overlay.hidden)) return;
    accountOpen = false;
    trigger?.setAttribute("aria-expanded", "false");
    if (overlay) overlay.hidden = true;
    unlockAccountBodyScroll();
    if (restoreFocus && document.contains(accountLastFocusedElement)) focusWithoutScroll(accountLastFocusedElement);
    accountLastFocusedElement = null;
  }

  function bindAccountPopover(target) {
    const trigger = target.querySelector("#account-trigger");
    const overlay = document.getElementById("account-overlay");
    if (!trigger || !overlay) return;
    trigger.addEventListener("click", () => accountOpen ? closeAccountPopover() : openAccountPopover());
    overlay.querySelectorAll("[data-account-dismiss]").forEach(element => element.addEventListener("click", () => closeAccountPopover()));
    overlay.querySelector("[data-account-edit]")?.addEventListener("click", () => {
      closeAccountPopover();
      requestAnimationFrame(() => openProfileEditor());
    });
    overlay.querySelectorAll("[data-account-language]").forEach(button => button.addEventListener("click", () => I18n.setLanguage(button.dataset.accountLanguage)));
    overlay.querySelectorAll("[data-account-theme]").forEach(button => button.addEventListener("click", () => ThemeService.setTheme(button.dataset.accountTheme)));
    overlay.querySelector("[data-account-admin]")?.addEventListener("click", () => closeAccountPopover(false));
    overlay.querySelector("[data-account-sign-out]")?.addEventListener("click", event => {
      if (accountSigningOut) return;
      accountSigningOut = true;
      event.currentTarget.disabled = true;
      closeAccountPopover(false);
      signOut();
      accountSigningOut = false;
    });
  }

  function updateAccountThemeSelection() {
    const current = ThemeService.getPreference();
    document.querySelectorAll("[data-account-theme]").forEach(button => {
      const selected = button.dataset.accountTheme === current;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderNavbar() {
    const target = document.getElementById("user-nav-actions");
    if (!target) return;
    closeAccountPopover(false);
    document.getElementById("account-overlay")?.remove();
    const user = AuthService.getCurrentUser();
    target.innerHTML = user
      ? `<button id="account-trigger" class="account-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="account-popover" aria-label="${I18n.t("nav.account")}: ${escapeHtml(user.displayName)}"><span class="account-avatar" aria-hidden="true">${escapeHtml(getUserInitials(user.displayName))}</span><span class="account-trigger-name">${escapeHtml(user.displayName)}</span></button>`
      : `<button class="btn btn-ghost btn-sm" type="button" onclick="AuthUI.open('login')">${I18n.t("nav.signIn")}</button><button class="btn btn-primary btn-sm" type="button" onclick="AuthUI.open('register')">${I18n.t("nav.register")}</button>`;
    if (user) {
      // ADMIN-V2-001: show the Admin Dashboard link for anyone who holds
      // any active RoleAssignment (Super Admin, legacy prototype admin, or
      // a real Global Moderator/College Admin/Study Moderator/Content
      // Reviewer grant) — not just the legacy binary admin whitelist.
      const canSeeAdminLink = Boolean(window.AdminPermissionService?.canAccessAdminPanel?.(user)) || AuthService.isCurrentUserAdmin();
      ensureAccountPopover(user, canSeeAdminLink);
      bindAccountPopover(target);
    }
  }

  function signOut() {
    closeProfileEditor(true);
    AuthService.signOut();
    showToast?.(I18n.t("nav.signOut"));
  }

  window.AuthUI = { open, close, openProfileEditor, closeProfileEditor, signOut, renderNavbar };
  window.addEventListener("echo:authchange", () => { renderNavbar(); if (!AuthService.getCurrentUser()) closeProfileEditor(true); });
  window.addEventListener("echo:languagechange", () => { renderNavbar(); setMode(mode); translateProfileDialog(); });
  window.addEventListener("echo:themechange", updateAccountThemeSelection);
  window.addEventListener("hashchange", () => closeAccountPopover(false));
  window.addEventListener("resize", syncAccountPopoverLayout);
  document.addEventListener("pointerdown", event => {
    if (activeProfileSelect) {
      const menu = document.getElementById("profile-select-menu");
      const trigger = document.querySelector(`[data-profile-select="${activeProfileSelect}"]`);
      if (!menu?.contains(event.target) && !trigger?.contains(event.target)) closeProfileSelectMenu(false);
    }
    if (!accountOpen || isMobileAccountSheet()) return;
    const popover = document.getElementById("account-popover");
    const trigger = document.getElementById("account-trigger");
    if (!popover?.contains(event.target) && !trigger?.contains(event.target)) closeAccountPopover();
  });
  document.addEventListener("keydown", event => {
    if (activeProfileSelect) {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeProfileSelectMenu(true); return; }
      if (event.key === "Tab") { closeProfileSelectMenu(false); return; }
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const count = document.querySelectorAll("#profile-select-menu [data-profile-option]").length;
        setActiveProfileOption(event.key === "Home" ? 0 : event.key === "End" ? count - 1 : activeProfileOptionIndex + (event.key === "ArrowDown" ? 1 : -1));
        return;
      }
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseProfileSelectOption(activeProfileOptionIndex); return; }
    }
    if (event.key === "Escape" && accountOpen) {
      event.preventDefault();
      closeAccountPopover();
    }
  });
  window.addEventListener("DOMContentLoaded", renderNavbar);
})();
