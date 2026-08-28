/* Verbatim pre-HOMEPAGE-POLISH-001 section order inside renderHome()'s
   returned template, captured via Read before any edit was made in this
   task. Only the ORDER of these <section> blocks changed in this stage —
   no markup inside any of them was altered. */

// Order BEFORE this stage (top to bottom):
// 1. <section class="hero container">                              (Hero)
// 2. <section class="container stats-section">                     (Stats)
// 3. <section class="container map-promo reveal-card" id="communities">  (Community CTA)
// 4. <section class="container section-block how-section">         (How Echo Wall Works)  <-- moved
// 5. <section class="container section-block building-home-section">    (Building promo)
// 6. <section class="container map-promo reveal-card">             (Echo Map promo)
// 7. <footer class="container site-footer">                        (Footer)

// The exact pre-edit how-section block (content unchanged by this stage,
// only relocated):
      <section class="container section-block how-section">
        <div class="section-heading centered" data-reveal>
          <div><p class="eyebrow">${I18n.t("home.howEyebrow")}</p><h2>${I18n.t("home.howTitle")}</h2></div>
          <p>${I18n.t("home.howDesc")}</p>
        </div>
        <div class="how-grid">
          <article class="how-card reveal-card" data-reveal style="--reveal-delay:0ms"><span class="how-number">01</span><div class="how-icon">🏛️</div><h3>${I18n.t("home.step1Title")}</h3><p>${I18n.t("home.step1Desc")}</p></article>
          <article class="how-card reveal-card" data-reveal style="--reveal-delay:90ms"><span class="how-number">02</span><div class="how-icon">📖</div><h3>${I18n.t("home.step2Title")}</h3><p>${I18n.t("home.step2Desc")}</p></article>
          <article class="how-card reveal-card" data-reveal style="--reveal-delay:180ms"><span class="how-number">03</span><div class="how-icon">📌</div><h3>${I18n.t("home.step3Title")}</h3><p>${I18n.t("home.step3Desc")}</p></article>
        </div>
      </section>

// Immediately followed (before this stage) by building-home-section, then
// the Echo Map map-promo, then the footer — see the "after" snapshot for
// the current, corrected order.
