# Echo Wall 主项目优化日志

## 2026-08-23 — ADMIN-V2-003: one shared admin sidebar instead of two duplicated copies

- `adminSidebarNavHtml()` (`app-admin.js`) replaces two independently-maintained inline sidebar
  copies — the Community/Map panel's own markup and `app-study-admin.js`'s own near-identical
  copy (the latter's duplication was originally an explicit, documented tradeoff from STUDY-V2-008
  to avoid touching the former). Every admin view (the 4 new Dashboard views plus both existing
  module workspaces) now renders navigation from one function; adding a future nav entry — or
  fixing a future nav bug — only needs to happen once.
- The Dashboard's Overview/Queue/Reports/History views compute zero moderation data of their own —
  every count, filter, and list is a pure transform (`adminDashboardFilterItems`/
  `adminDashboardSortQueue`/`adminDashboardGroupReports`/`adminDashboardOverviewCounts`) over
  whatever `ModerationService.listModerationItems()`/`listReports()` already returned, reusing the
  ADMIN-V2-002 scope-filtering instead of re-implementing a parallel permission check in the UI
  layer.

## 2026-08-23 — ADMIN-V2-002A: reused existing identity/config sources instead of new ones

- `canonicalRecordKey()` in `services/map-note-service.js` reuses the module's own existing
  `resolveCombinedTarget()` parser instead of writing a second target-normalization routine — the
  ModerationItem `contentId` for a map note is guaranteed to match the exact `recordKey` format
  `app-admin.js`'s rows already display, with zero duplicated addressing logic.
  `resolveKmkOrgId()` in `services/moderation-service.js` reuses the canonical `organizations`
  config (app-data.js) instead of a second hardcoded college-id constant — the same source
  `echomap.js`'s own local `KMK_ORG_ID` already trusts.

## 2026-08-23 — ADMIN-V2-002: one moderation queue entry per content, not one per report

- `ensureModerationItemForReport()` reuses the existing ACTIVE ModerationItem for a
  `contentType`+`contentId` pair instead of creating a new queue row per report — N reports on the
  same content produce N independent Report records (still individually auditable/listable) but
  exactly one moderation case to actually review, with `riskScore` rising to reflect the repeated
  reports instead of the queue silently filling with duplicates a moderator would otherwise have to
  manually notice and merge.
- Scope derivation for Community posts reuses `CommunityService.getCommunityKeyForNote()`/
  `parseCommunityKey()` — the exact same parsing `getCommunityPosts()` already relies on — instead
  of re-deriving a community's global/college/jurusan scope a second way inside the new moderation
  service.
- `services/moderation-service.js`'s `ready()`/`subscribe()`/`useProvider()` shape and the
  `{ list(), save(list) }` provider abstraction directly reuse the pattern
  `services/admin-permission-service.js` (ADMIN-V2-001) already established, rather than inventing
  a second persistence idiom for the second Admin V2 service in a row.

## 2026-08-23 — ADMIN-V2-001: one permission source of truth instead of five scattered checks

- Collapsed five independent `role === "admin"` / `AuthService.isCurrentUserAdmin()` re-derivations
  (`app-admin.js`, `app-study-admin.js` implicitly via `requireAdminAccess()`,
  `services/study-submission-service.js`, `services/permission-service.js`,
  `services/auth-ui.js`) into calls against one new service
  (`services/admin-permission-service.js`). Every future admin-gated feature asks this service
  instead of adding a sixth ad hoc check.
- `services/permission-service.js`'s `canUserModerateCommunity()`/`canUserMarkSolved()` replaced a
  single-scope stub (`getUserModerationScope()`, whose college branch was dead code — "currently
  reachable only via constructed user objects in tests, not a real signed-in account," per its own
  prior header comment) with real calls into `AdminPermissionService.canModerateCollege()` — a real
  College Admin now works end-to-end for Mark Solved/Reopen without a second scope-resolution
  system being built alongside the new one.
- RoleAssignment persistence reuses this repo's existing swappable-provider convention (the same
  shape `services/map-note-service.js` already uses) instead of inventing a new persistence idiom —
  `useProvider()` is the only thing a future Supabase-backed provider needs to replace.

## 2026-08-22 — COMMUNITY-MAP-NAV-POLISH-001: collapsed two non-KMK map renderers into one

- `map.html`'s own campus switcher (`echomap.js` `switchToCollegeIndex()`) previously maintained a
  second, ad-hoc copy of the non-KMK "Campus Framework" sidebar — a single static notice paragraph
  that could never actually show real content, since `map.html` doesn't even load the scripts
  (`app-campus-map.js`, `data/campus-building-registry.js`) that the real sidebar needs.
  **Correction (same day)**: the fix originally logged here hands off to `renderOrgCampusMap()` via
  a full-page navigation — that broke in-place switching and was replaced same-day. The corrected,
  shipped fix instead loads `app-campus-map.js`/`data/campus-building-registry.js` directly onto
  `map.html` and extracts the sidebar's shared markup into one function,
  `renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix)`, called directly by both
  `renderOrgCampusMap()` (Community → Map) and the switcher's new `renderNonKmkCampusGuide()` — no
  navigation, no route, no second copy of the header/body markup. Net result is the same dedup goal
  (one campus-framework renderer instead of two, zero new HTML/CSS for non-KMK campuses) achieved
  without sacrificing in-place switching.
- Building Detail's "return to Echo Map" flow reuses the pre-existing `saveMapReturnSnapshot()`/
  `restoreMapReturnSnapshot()` mechanism (already used by "Enter this building wall") instead of
  building a second map-state-restore path for the new "More Details" return flow.

## 2026-08-21 — Study Search/Filter: reused existing rendering/CSS instead of a parallel system

- Search-result rows and the new Subject-page filter bar reuse existing STUDY-V2-004/006 pieces
  wholesale rather than duplicating them: `studyResourceFileBadgeHtml()`/`studyResourceQuickOpenHtml()`
  (file-type badge + quick-open link) are called unchanged from the new
  `studySearchResultRowHtml()`, so search results automatically got correct, already-tested
  demo-file-availability behavior for free instead of a second implementation that could drift out
  of sync with Resource Detail's own file-open logic.
- One shared CSS block (`.study-search-filters`/`.study-filter-field`) serves both the Global
  Search filter row and the Subject page's Year/Subtype/Source/Sort filter bar, instead of two
  near-identical rule sets — the two UIs render structurally identical `<label><select>` markup.
- `filterResources()`/`getFilterOptions()` are generic over any resource array — the same two
  functions serve Global Search's whole-manifest-scoped results AND the Subject page's
  category-scoped resources, rather than one implementation per surface.
- Search input is debounced (~200ms, plain `setTimeout`) so a keystroke never triggers a full
  results re-render against ~2.5k manifest items on every character — no search library was added
  (Fuse.js etc.), matching the existing "plain Vanilla JS, current codebase style" convention
  already used throughout this module.

## 2026-08-21 — Study Notes file serving: curated demo subset instead of a wholesale ~2.5GB copy

- Before writing `scripts/build-study-demo-files.mjs`, measured the real numbers instead of
  guessing: all 2284 publishable resources' physical files total ~2.52GB (largest single file
  63.4MB), and are broken down per-subject by size (`kejuruteraan` ~4.8MB total across 3 subjects;
  individual `sains`/`perakaunan` subjects range ~10MB–472MB). Rather than copying everything
  (safe per-file-size-wise, but a 40x repo-size increase for a static competition build) or
  building a second parallel storage/CDN layer (explicitly out of scope for this stage), chose 9
  subjects with **full** internal coverage (no subject in the set has some resources present and
  others silently missing) that together span all 3 jurusan with real data and every real
  `resourceType`/`resourceSubtype` combination that actually exists in the dataset — 377 files,
  ~422MB, a ~6x smaller footprint than a wholesale copy while still giving genuinely complete,
  testable coverage within each chosen subject.
- Reused the existing `fileId` (SHA-256) field from STUDY-V2-002 as an integrity check rather than
  trusting a plain file copy: every copied file is re-hashed and compared against its manifest
  entry's `fileId` before being marked `demoAvailable`, with a hard failure (and automatic
  deletion of the unverified copy) on any mismatch — no new hashing scheme was invented.
- Filenames under `assets/study-files/` are the opaque `resourceId`, not the original title or
  folder path — this both closes the "don't leak local paths" requirement AND sidesteps every
  filename-safety concern (spaces, unicode, duplicate titles across colleges) that preserving the
  original names would have introduced, without needing a separate slug/sanitization step.

## 2026-08-21 — Study Subject page: pagination budgeted by row count, not group count

- Real-data testing (SM015, 138 resources across many PSPM sets sharing the same exam year)
  caught that the first pagination implementation counted "how many year-groups to show" rather
  than "how many resource rows to show" — a 15-year-group budget rendered 113 of 138 rows on
  first paint, which is not meaningfully different from rendering everything. Rewrote
  `studyYearGroupedListHtml()` in `app-study.js` to accumulate a row-count budget across included
  year-groups (always including at least one full group, stopping once the budget is spent)
  instead of slicing the group array directly — SM015's initial render dropped to 50 rows. Reused
  the existing `STUDY_RESOURCE_PAGE_SIZE` constant and the app-wall.js-style partial re-render
  ("Load more" mutates module state and re-renders only the `#study-resource-list` container) for
  the load-more mechanism rather than introducing scroll-position tracking or a second rendering
  path.

## 2026-08-20 — Echo Map college switcher: reused the existing framework instead of a second system

- Before writing any code, spent a research pass confirming the site already had a multi-college map framework (`organizations` in `app-data.js`, `data/campus-map-config.js`, `data/campus-building-registry.js`, `app-campus-map.js`) built for the SPA's `#/org/:orgId/map` route. The Echo Map switcher reuses that data directly (college order, short codes, per-college lat/lng/zoom, and the existing "awaiting data" empty-state copy) rather than hardcoding a second college list or inventing new center coordinates — only one new `<script>` tag was needed (`data/campus-map-config.js` on `map.html`) to make the existing data reachable from `echomap.js`.
- "Fit campus" was extended to be college-aware by branching on the *existing* `CAMPUS_BOUNDS`/`CAMPUS_MAP_CONFIGS` data sources rather than adding a third bounds table.

## 2026-08-20 — Building name alias: generic data field instead of per-language branching

- `getLocalizedBuildingDisplayName` reuses the existing generic `getLocalizedBuildingText(building, field)` accessor for the new `localizedAlias` field instead of writing a new `if (language === ...)` switch — zero new i18n-branching logic was added, and the mechanism already generalizes to any future building without further code changes.

## 2026-08-20 — Building Detail page: mobile reorder via CSS, no DOM duplication

- Used CSS Grid `order` (scoped to the existing `@media(max-width:980px)` block) to show the photo before the information card on mobile, instead of adding a second mobile-specific DOM branch or duplicating the gallery/copy markup in `app-place.js`. One render path continues to serve both breakpoints — desktop and mobile differ only in CSS, matching how the rest of `.place-profile*` already handles the responsive split.

## 2026-08-20 — Building Detail page: single scroll region on desktop (UX)

- Removed the double-scroll-region ambiguity the previous stage introduced on desktop: with the whole page scrollable, it wasn't obvious whether scrolling moved the page or just the left card, and the right-hand photo could end up scrolled out of the viewport. Locking the page to the viewport and giving only the left Building Information card its own scroll region (`overflow-y:auto`) makes the Photo Gallery a stable reference point during scroll, and keeps the interaction to exactly one scrollable element on desktop.
- Reused the project's existing global lightweight `::-webkit-scrollbar` styling (already defined once near the top of `style-core.css`) for the new internal scroll region instead of adding a second scrollbar treatment.

## 2026-08-20 — Building Detail page: shared hours data, reused localization pattern

- Extracted the opening-hours snapshot/status-line logic out of `echomap.js` (where it was added as a local closure last stage) into a shared `window.BuildingHours` API in `data/campus-building-hours.js`, so the Echo Map card and the Building Detail page compute status from one implementation instead of two copies that could drift out of sync.
- Purpose/Special Notes were added to `data/campus-buildings.js` using the exact same `{zh, ms, en}` localized-object shape and `window.getLocalizedBuildingText` accessor the `description` field already used, instead of introducing a parallel content structure.
- Building Echoes' note-count label now reuses the existing `map.visibleNotes` i18n string (shared with the Echo Map card) instead of the hardcoded English "notes" the detail page previously rendered.

## 2026-08-20 — Echo Map building card hours + more-details entry

- Reused the existing `.place-preview-*` layout and theme variables (`--secondary`, `--border`, `--card-bg`) for the new hours/more-details rows instead of introducing new colours, so light/dark theming came for free.
- Kept the opening-hours dataset scoped to only the 19 buildings that can actually open the map building card (`PREVIEW_PLACE_IDS`), instead of trying to structure a schedule for every building in `data/campus-buildings.js`.
- Sourced Pustaka's precise Sun–Thu 8:00am–4:30pm / closed Fri–Sat schedule from `KMK_Building_Facility_Source_Summary_EchoWall.docx` rather than the looser `21:30`-close string already in `data/campus-buildings.js`, because the requested worked example ("Closes 4:30 PM") only matches the docx figure.
- Buildings whose only source note is event-dependent or "check current hours" were left as `mode:"unavailable"` rather than invented — avoids presenting a guessed weekly pattern as fact.

## 2026-07-22 — Assistant activation

- Reused the existing launcher and BISHENG adapter rather than adding another integration boundary.
- Added a local, deterministic KMK guide so the chat remains useful while the remote assistant endpoint is unavailable.
- Replaced fixed chat colours with the existing theme variables to keep text contrast readable in both themes.
- Added a lightweight animated typing state so immediate local responses still feel intentional.

版本：2026-07-11 Main UI Optimization  
主项目：Echo Wall 原生 HTML + CSS + JavaScript  
辅助资料：KMK Digital Twin 地图及建筑区域数据

## 0. 项目定位纠正

本轮已经将开发主次重新调整为：

1. **Echo Wall 留言墙代码是主项目**；
2. `KMK-DigitalTwin` 不再作为主网站框架；
3. 数字孪生项目只提供 KMK 地图、建筑分类与功能区域资料；
4. 没有把 Echo Wall 改写成 Next.js、React、TypeScript 或 Three.js；
5. 保留原有 Hash Router、HTML、CSS、JavaScript、Leaflet 和 localStorage 架构。

---

## 1. 首页 `app-router.js`、`style-core.css`

### 新增

- 使用上传的书本图片作为主视觉和导航 Logo；
- 新增 Hero 双栏结构；
- 新增浮动便签、书本轻浮动、背景轨道和鼠标轻微视差；
- 新增两项主要行动按钮：
  - Explore Communities
  - Open KMK Echo Map
- 新增首页统计数字递增动画；
- 新增 Communities 卡片滚动进入动画；
- 新增 How Echo Wall Works 三步说明；
- 新增 KMK Echo Map 宣传区；
- 新增更完整的网站页脚；
- 新增页面切换淡入动画；
- 新增导航栏滚动后阴影和背景变化；
- 新增 `prefers-reduced-motion` 动画降级支持。

### 修正

- 删除首页“100% Encrypted”误导描述；
- 改为准确显示当前原型数据、照片留言和最新留言；
- Community 卡片改为可键盘操作的 `button`；
- 修复不同学院之间沿用错误 Batch / Major 的问题；
- 增加无效 Hash Wall 路由检查；
- 改善手机端按钮、标题和视觉布局。

---

## 2. 学院、Batch 与 Major 选择页

### 新增

- Community 图标与上下文说明；
- 三阶段流程提示；
- Batch 与 Major 分组卡片；
- 选中状态动画；
- 选项依次进入动画；
- 更明确的 Enter Echo Wall 行动区；
- 键盘焦点视觉反馈。

### 修正

- 切换学院时自动验证并重置不属于当前学院的 Batch 和 Major；
- 进入留言墙前再次验证关系，避免错误路由。

---

## 3. 留言墙 `app-wall.js`、`style-wall.css`

### 工具栏

- 新增墙面上下文 Header；
- 显示学院、Batch、Major 和当前结果数量；
- 分类按钮重新设计；
- Hot / New 排序重新设计；
- 新增搜索清除按钮；
- 工具栏在手机端保持可用；
- Leave a Note 按钮视觉强化。

### 便签与动画

- 留言卡片改成错峰进入动画；
- 保留原有散落便签风格；
- 改善卡片位置算法，减少互相覆盖；
- 增加图钉、类别标签和照片过渡；
- Hover 时抬升、归正和加深阴影；
- 支持 Enter / Space 打开留言；
- 手机端自动切换为单栏卡片，不再使用绝对定位；
- 无结果时显示完整空状态和发布按钮；
- 自动计算墙面高度，避免底部留言无法滚动查看。

### 照片留言

- 保留并整合照片上传功能；
- 支持 JPG、PNG、WebP；
- 原图最大 8 MB；
- 浏览器压缩后目标约 450 KB；
- 上传前预览；
- 可移除照片；
- 留言卡片显示照片；
- 弹窗显示完整照片；
- Admin 页面显示缩略图；
- localStorage 满额时撤回失败记录并显示提示。

### 表单与弹窗

- 重做 Leave a Note 抽屉；
- 改善输入框、分类、形状、匿名开关和照片区域；
- 打开后自动聚焦留言输入；
- 弹窗和抽屉打开时锁定背景滚动；
- Toast 改为统一队列区域和退出动画；
- 增加 ARIA dialog、按钮说明和焦点状态。

---

## 4. Admin 页面 `app-admin.js`、`style-admin.css`

### 布局

- 改为桌面左侧栏 + 主工作区；
- 手机端左侧栏自动变成顶部快捷栏；
- 新增 Wall Notes、Map Pins、Echo Map、Export JSON 导航；
- 新增本地原型安全提示；
- 新增统一顶部标题和系统状态。

### Dashboard

- 新增动态统计卡：
  - Total Notes / Pins
  - Visible
  - Photo Notes / Hidden
  - Votes / Coverage
- 统计数字加入递增动画；
- 统计卡加入错峰进入和 Hover 动画。

### 内容审核

- 搜索和筛选栏重新排版；
- 留言行加入类别图标或图片缩略图；
- 显示学院、Batch、Major、作者、日期和分数；
- 改善 Visible / Hidden 标签；
- 改善 Hide、Show、Delete 按钮；
- Map Pin 显示颜色、图标、坐标和作者；
- 新增空数据状态；
- 保留 JSON 导出和原型数据重置。

### 登录页

- 改成双栏品牌介绍与登录表单；
- 明确标注当前是 local prototype authentication；
- 未更改现有登录方式，以免破坏当前原型运行。

### 上线前必须替换

以下代码仍然只适合本机演示：

```js
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "abc67##";
```

正式上线必须改成 Supabase Auth，并用 RLS 限制管理员数据权限。

---

## 5. Echo Map `map.html`、`echomap.js`

### 主次关系

Echo Map 现在是 Echo Wall 的地点化辅助页面，不是主框架。

### 使用 KMK Digital Twin 辅助资料新增

- 6 个功能导览区：
  1. Learning & Teaching / 学习与教学区
  2. Student Life / 学生生活区
  3. Residence & Dining / 宿舍与餐饮区
  4. Sports & Activity / 体育与活动区
  5. Administration & Staff / 行政与教职员区
  6. Access & Parking / 出入口与停车区
- 根据辅助数据中 44 个建筑或结构的类别范围生成导览矩形；
- 每个区域显示图标、名称、中文名称、说明和数量；
- 点击区域卡片或地图区域可以平滑定位；
- 新增显示/隐藏功能区域按钮；
- 新增 Fit Campus 按钮；
- 优化桌面与手机地图布局。

### 数据声明

这些区域是根据建筑分组的范围生成的**功能导览范围**，不是 KMK 官方行政区域或测量边界。网站界面已明确显示此限制。

### 地图留言

- 重做地图留言发布弹窗；
- 新增字数统计；
- 保留颜色与图标选择；
- 加入存储失败提示；
- 加强 XSS 转义；
- 验证颜色、图标、坐标和日期；
- 隐藏的 Map Pin 不会显示在公开地图。

---

## 6. 全站细节

- 合并重复 Google Fonts 请求；
- 增加 `theme-color` 和页面描述；
- 增加 Skip to content；
- 加强按钮 `focus-visible`；
- 增加页面与卡片统一缓动曲线；
- 动画优先使用 `transform` 与 `opacity`；
- 手机端关闭复杂视差；
- 用户开启 Reduce Motion 时关闭非必要动画；
- 修复 favicon 路径为 `assets/book-icon.png`；
- 保持所有原有数据和功能兼容。

---

## 7. 未在本轮接入的部分

为了保持当前原型框架与本轮目标，以下尚未连接：

- Supabase 数据库；
- Supabase Auth；
- Supabase RLS；
- Cloudinary signed upload；
- 云端图片删除；
- 多用户实时同步；
- 正式审核状态工作流。

当前代码仍使用 localStorage，但图片字段和 UI 已经为后续 Cloudinary URL 替换保留清晰入口。

---

## 8. 检查结果

已执行：

- `node --check`：所有 JavaScript 文件通过；
- HTML 本地资源路径检查：通过；
- HTML ID 重复检查：通过；
- CSS 解析检查：3 个 CSS 文件均无语法错误；
- 首页与地图本地 HTTP 响应：HTTP 200。

当前运行环境的 Chromium 无头截图进程无法正常退出，因此没有把自动浏览器截图测试列为通过。此限制已如实保留，不代表已完成浏览器视觉回归测试。

---

## 9. 文件结构

```text
EchoWall-Main-Optimized/
├── assets/
│   └── book-icon.png
├── index.html
├── map.html
├── app-data.js
├── app-router.js
├── app-wall.js
├── app-admin.js
├── echomap.js
├── style-core.css
├── style-wall.css
├── style-admin.css
├── README.md
└── OPTIMIZATION_LOG.md
```

---

## 2026-07-12 23:48 +08:00 — UI Cleanup: Prototype Labels and Admin Sidebar

### Stage

Focused visual cleanup requested after screenshot review.

### Objective

Remove unnecessary prototype-facing labels and reduce duplicate branding in the logged-in admin workspace without changing authentication, data storage, routing, or moderation behaviour.

### Files inspected

- `index.html`
- `app-router.js`
- `app-admin.js`
- `style-admin.css`
- `style-core.css`
- `AGENTS.md`

### Design decision

Two feasible approaches were compared:

1. Hide the unwanted elements with CSS only.
2. Remove the unused markup and its dedicated CSS, then preserve the intended sidebar spacing.

Option 2 was selected because it avoids hidden duplicate content, removes dead presentation code, is easier to maintain, and has a straightforward rollback. The existing global Echo Wall navbar brand remains unchanged.

### Files modified

- `index.html`
- `app-router.js`
- `app-admin.js`
- `style-admin.css`

### Behaviour before

- The main navbar displayed `Local prototype` with a green status dot.
- The homepage footer displayed `© 2026 · Prototype build`.
- The admin sidebar repeated the Echo Wall brand beneath the global navbar.
- The admin sidebar displayed a `Local prototype auth` warning card.
- The warning card supplied the automatic spacer that kept `Sign out` at the bottom.

### Behaviour after

- The main navbar displays only the Echo Map KMK action on the right.
- The homepage footer displays `© 2026 Matriks EchoWall`.
- The duplicate sidebar `Echo Wall / Admin workspace` brand is removed.
- The logged-in admin sidebar no longer displays the `Local prototype auth` card.
- The admin navigation begins cleanly at the top of the sidebar.
- `Sign out` remains anchored at the bottom of the desktop sidebar.

### Reason for change

The removed labels were visually repetitive and made the prototype feel less polished. The admin workspace already has the global Echo Wall brand in the main navbar, so the second sidebar brand did not add useful context.

### Data migration performed

None. No LocalStorage keys, records, credentials, routes, or schemas were changed.

### Tests executed

- `node --check` on all JavaScript files.
- Duplicate HTML ID check for `index.html` and `map.html`.
- Local HTML asset-path check.
- CSS parse/structure check for all three stylesheets.
- Exact requested-text and removed-block assertions.
- Local HTTP smoke test for `index.html` and `map.html`.

### Test results

- All JavaScript syntax checks passed.
- No duplicate HTML IDs were found.
- No missing local assets were found.
- All CSS files parsed without structural errors.
- Requested labels and admin blocks were removed or replaced correctly.
- `index.html`: HTTP 200.
- `map.html`: HTTP 200.

A full interactive browser visual regression was not claimed in this environment.

### Remaining limitations

- The admin login remains prototype-only client-side authentication.
- `Prototype online` in the admin header and prototype wording on the login screen were not changed because they were outside the confirmed screenshot requests.
- Functional-zone label visibility and zone-boundary accuracy remain deferred for a later map-specific pass.

### Rollback guidance

Restore the four modified files from the previous archive, or re-add the removed navbar status, footer wording, admin sidebar brand, admin security note, and their associated CSS rules.

### Next recommended step

Review the updated desktop and mobile admin layouts visually, then handle the deferred Echo Map zone-label and zone-boundary work as a separate interaction/data stage.

---

## 2026-07-13 — Feature Foundation: Building Walls, Accounts, Language, Theme and Integration Adapters

### Stage

Focused feature foundation while preserving the existing static architecture. Map region redesign was explicitly deferred.

### Objective

Add building-specific profiles and walls, authenticated posting, flexible note placement, improved shapes, photo crop controls, three-language support, dark mode and safe integration boundaries for BISHENG and Cloudinary.

### Files inspected

- `index.html`
- `map.html`
- `app-data.js`
- `app-router.js`
- `app-wall.js`
- `app-admin.js`
- `echomap.js`
- all existing CSS files
- existing `AGENTS.md`, `README.md`, audit and optimization logs
- selective KMK Digital Twin building and metadata JSON as read-only source material

### Files added

- `app-place.js`
- `config/app-config.js`
- `data/campus-buildings.js`
- `i18n/index.js`
- `i18n/locales/en.js`
- `i18n/locales/ms.js`
- `i18n/locales/zh.js`
- `services/auth-service.js`
- `services/auth-ui.js`
- `services/theme-service.js`
- `services/translation-service.js`
- `services/cloudinary-adapter.js`
- `services/bisheng-adapter.js`
- `ROADMAP.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `HANDOFF.md`
- documentation under `docs/`

### Files modified

- `AGENTS.md`
- `README.md`
- `index.html`
- `map.html`
- `app-data.js`
- `app-router.js`
- `app-wall.js`
- `app-admin.js`
- `echomap.js`
- `style-core.css`
- `style-wall.css`
- `OPTIMIZATION_LOG.md`
- `CODE_AUDIT.md`

### Behaviour before

- Only community walls existed.
- Users could post without registering or signing in.
- New notes used automatically generated positions.
- Five note shapes were available.
- Photo display had no user crop-scale control.
- No formal UI language system or user-note translation toggle existed.
- No light/dark preference existed.
- No explicit BISHENG or Cloudinary adapter contract existed.

### Behaviour after

- A 30-building Echo Wall-owned registry is available without runtime Digital Twin dependency.
- Every registered building has a profile route and a dedicated building wall route.
- Building profiles show localized descriptions and highest-scoring notes over a generated bird's-eye outline.
- Posting requires a signed-in local prototype user.
- Signed-in users may publish anonymously or with a display name.
- Users choose note positions on a preview board.
- Ten note shapes are available.
- Users choose photo crop scale from 100% to 180% and `cover` or `contain` display.
- UI language preference supports English, Bahasa Melayu and Chinese in a separate `i18n/` folder.
- User notes expose an original/translated toggle through a configurable translation endpoint.
- Light, dark and system themes persist locally.
- Cloudinary signed upload and BISHENG assistant bridges are prepared without exposing private secrets.
- Map-note posting now requires a signed-in user, while region redesign remains untouched.

### Data migration

Existing notes are normalized to schema version 2. Existing community notes become `contextType: "community"`. New building notes use `contextType: "building"` and `placeId`. Existing storage key remains `echo-wall-notes` for compatibility.

### Tests executed

- `node --check` on all root, service, configuration, locale and data JavaScript files.
- Static HTML duplicate-ID check.
- Local asset-path check.
- CSS brace-balance check.
- Local HTTP response checks.

### Test results

- JavaScript syntax: passed.
- Further static checks are recorded in the build report.
- Headless Chromium did not exit reliably in the container, so full visual and interactive browser regression is not claimed.

### Remaining limitations

- Local authentication is prototype-only.
- Live translation requires a backend endpoint.
- Cloudinary requires a signature endpoint and configured cloud name.
- BISHENG requires the group member's deployed endpoint and credentials strategy.
- Admin user-auth integration is still separate from the existing prototype admin login.
- Map region redesign and building clicks beyond `B_PUSTAKA` remain deferred.

### Rollback guidance

Restore the previous root files and remove `app-place.js`, `config/`, `data/`, `i18n/`, `services/` and the new documentation files. Existing note data remains readable by the previous build only after removing building notes or restoring a pre-migration LocalStorage backup.

### Next recommended step

Perform desktop and mobile visual QA. Then connect one production integration at a time, starting with production authentication or translation, not both in the same stage.

---

## 11. Pustaka 预览与功能区标准交互（2026-07-14）

### 单一目标

在扩展到其他建筑前，固定 `B_PUSTAKA 地图标记 → 右侧建筑预览 → 专属留言墙` 和功能区单选/清除/事件隔离标准。没有新增建筑、修改 GIS、坐标或旧留言。

### 方案比较

建筑预览：

1. 让整个右栏统一滚动：结构更少，但长简介/留言会把“进入建筑留言墙”推离视口。
2. 右栏拆成可滚动内容区和固定底部行动区：多一个容器，但在桌面与窄屏都保持入口清晰。

采用方案 2。

功能区图层：

1. 六个矩形一直挂载，仅把未选择区域设为透明：切换样式直接，但透明交互层仍可能拦截地图空白与自由留言事件。
2. 所有矩形默认不挂载，选择时只把当前矩形加入单一 `zoneLayer`：能从图层结构保证最多一个区域，并降低事件冲突。

采用方案 2。原有六个 `zoneId` 和边界坐标完全保留。

### 实现

- `map.html` 按现有浏览器全局顺序加载 `data/campus-buildings.js`。
- `echomap.js` 只查找 `B_PUSTAKA`，添加一个可键盘点击的 Leaflet 标记。
- 点击标记时复用原右侧栏显示唯一预览，不新增弹窗或第二侧栏。
- 预览把注册表中的 `Pustaka (Perpustakaan)` 拆为显示名称与现有别名，并从现有 `category`、`zoneId`、`description` 读取类别、功能区与简介；功能区显示名来自 `CAMPUS_ZONES`。
- 从 `echo-wall-notes` 读取匹配 `contextType: "building"`、`placeId: "B_PUSTAKA"` 且未隐藏的留言，按 `createdAt` 排序，显示总数和最多两条最近摘要；零留言使用明确空状态。
- 预览内容区可滚动并截断长简介/留言，行动按钮放在滚动区外；620px 以下元数据改为单列。
- 行动按钮直达 `index.html#/place/B_PUSTAKA/wall`，复用现有 Hash Router 和建筑墙。
- “Functional zones”只展开现有右栏选择器，不直接显示任何矩形；选中时只挂载一个无填充边框和永久名称。
- 当前区域卡片、已显示边框、地图空白、选择器关闭按钮或再次点击“Functional zones”都会清除选择。
- 建筑标记禁用 Leaflet 点击冒泡；建筑与区域事件都显式停止原始事件，避免触发区域或自由位置留言。
- 地图空白先清除区域选择，再继续原有登录判断和自由位置留言流程。
- `pageshow` 时重读留言；语言变化时重建预览并刷新区域名称。

### 自动检查结果

- 全部 `*.js` 的 `node --check`：通过。
- HTML 重复 ID：无。
- 本地 HTML 资源路径：无缺失。
- `tinycss2` 未安装；改用无依赖扫描器检查 CSS 注释、字符串和大括号结构：通过。
- `map.html`、`index.html` 与 `data/campus-buildings.js` 本地 HTTP：200。
- `#/place/B_PUSTAKA/wall` 路由解析：`place-wall / B_PUSTAKA`。
- Pustaka 注册表夹具确认 `id`、`wallKey`、`zoneId`、名称和类别未改变，`CAMPUS_ZONES.learning` 可用。
- 精确执行可见留言读取函数：空存储为 0；两个可见 Pustaka 留言按新到旧返回，并排除一个隐藏 Pustaka 留言与一个其他建筑留言。
- 静态交互断言确认区域层默认未挂载、矩形无填充、单层清除逻辑及建筑/区域传播保护存在。
- `git diff --check`：通过；仅有仓库行尾转换提示。

### 未执行测试

内置浏览器在本次会话中没有可用实例（浏览器列表为空），因此没有宣称完成真实桌面/390px 渲染、建筑/区域/地图空白点击隔离、入口导航与返回、刷新/history 或 Console 测试。

### 回滚

反向移除 `map.html` 的区域选择器/扩展预览结构与相关样式；在 `echomap.js` 恢复原区域常驻切换段，并移除本轮名称拆分、元数据、最近留言、空状态和单区域挂载函数；删除三个 locale 文件中新增的本轮地图词条。若要同时回滚上一轮试点，再移除注册表脚本、`B_PUSTAKA` 标记与预览/路由入口。没有新增存储键或数据迁移，不需要清理 LocalStorage，也不得改写旧留言。

---

## 12. B_PUSTAKA 透明建筑点击区域（2026-07-14）

### 单一目标

只把永久 Pustaka 图标替换为透明建筑点击面，保留现有右侧预览、留言墙入口、功能区和自由位置留言。

### 参考与方案比较

- 只读参考：Digital Twin `src/gis/buildings.json` 的 `B_PUSTAKA.polygon`（24 个 local-ENU 顶点）及 `src/gis/manifest.json` 的原点 `6.424347, 100.419381`。
- 方案 1：用建筑外接矩形作为透明热区，代码更短，但会把相邻空地纳入点击范围。
- 方案 2：按 Digital Twin 原点把 24 个顶点转换为经纬度，保存为 EchoWall 自有轻量快照。

采用方案 2；Digital Twin 没有被修改，也不是运行时依赖。

### 实现

- `data/campus-buildings.js` 只为 `B_PUSTAKA` 增加 `mapFootprint`。
- `echomap.js` 移除永久 Marker/图标/Tooltip，改用默认 stroke/fill opacity 均为 0 的 SVG Leaflet polygon。
- 悬停时显示轻微描边与淡填充；点击后填充恢复为 0，只保留轮廓并打开原右侧预览。
- 建筑点击面位于功能区图层上方，禁用冒泡并停止原始事件，避免区域或自由位置留言误触。
- 地图空白会清除建筑轮廓和预览，再继续原有自由位置留言流程。
- 三语言侧栏提示由“Pustaka 标记”改为“Pustaka 建筑区域”。

### 验证

- 全部 JavaScript `node --check`：通过。
- 24 个 EchoWall 顶点逐点匹配 Digital Twin 转换结果，误差不超过六位小数舍入范围。
- 透明默认态、悬停、点击、空白清除、无 Pustaka 图标和事件传播保护契约：通过。
- HTML 重复 ID、本地资源、CSS 结构和本地 HTTP：通过。
- 内置浏览器列表为空；真实悬停、桌面/390px、点击隔离和 Console 仍需人工预览。

### 回滚

删除 `B_PUSTAKA.mapFootprint`；在 `echomap.js` 删除 footprint/pane/选择状态并恢复上一版 `PUSTAKA_POSITION` 与 Marker 段；在 `map.html` 恢复 Marker 样式；恢复三语言 `map.zoneIdle` 文案。无需修改路由、留言墙、LocalStorage 或 Digital Twin。

---

## 13. 移除地图直接留言创建（2026-07-14）

### 单一目标

地图只负责建筑预览、功能区选择和历史地点留言查看；地图空白不再创建留言或显示登录提示。

### 方案比较

1. 只移除 `map.on("click")` 的编辑器调用，保留表单、写入和草稿代码：改动更少，但会留下不可达的写入路径和维护歧义。
2. 删除编辑器、遮罩、登录提示、草稿标记和 `MAP_KEY` 写入函数，同时保留 `loadMapNotes()` 与旧标记渲染。

采用方案 2。旧 `echowall_map_notes` 不删除、不迁移、不覆盖。

### 实现

- 地图空白点击只清除 Pustaka/功能区选择。
- 建筑点击仍只打开原右侧预览；功能区点击仍只选择或清除区域。
- 删除直接留言编辑器 DOM、保存事件、登录判断、Toast、草稿 Marker 和 LocalStorage 写入。
- 保留旧地图留言读取、隐藏过滤、标记和 Popup；保留建筑留言墙与入口。
- 路由、`placeId`、`wallKey`、留言墙 UI 和 Digital Twin 均未修改。

### 验证

- 全量 JavaScript `node --check`、HTML/资源、CSS、LocalStorage 只读契约与本地 HTTP：通过。
- 登录/未登录使用相同无动作地图空白处理；静态契约确认没有 AuthService、编辑器、登录提示或 `MAP_KEY` 写入。
- 旧留言夹具在调用地图初始化前后保持字节一致，并仍进入旧标记渲染路径。
- 内置浏览器列表为空；真实建筑/功能区/空白点击、留言墙入口和 Console 仍需人工预览。

### 回滚

只回滚 `echomap.js` 本节对应的 hunk，恢复编辑器/遮罩、`saveMapNotes`、登录提示、草稿 Marker 和原地图空白创建事件。不得删除或重写 `echowall_map_notes`；其他地图、路由和留言墙文件无需回滚。

---

## 14. 八栋重点建筑地图链路人工验收（2026-07-16）

### 验收范围

- 建筑：`B_PUSTAKA`、`B_MASJID`、`B_DEWAN_KULIAH`、`B_BLOK_TUTORAN_MAKMAL`、`B_LANGKASUKA`、`B_SERAMBI`、`B_DEWAN_MAHAWANGSA`、`B_KAFETERIA_A`。
- 链路：建筑列表 → 地图定位 → 建筑轮廓 → 建筑预览 → 专属留言墙 → 返回地图状态恢复。
- 环境与输入：桌面、平板、手机；鼠标、Enter、Space。
- 恢复状态：地图中心与缩放、列表选中、建筑轮廓、建筑预览、页面/列表/预览滚动位置，以及成功恢复后的一次性快照删除。
- 代表性建筑：Pustaka、Tutoran/Makmal 多环轮廓、Kafeteria A。
- 快照：`echowall_map_return_v1`，版本 1，TTL 30 分钟。

### 边界

当前仍是比赛前端原型；没有实现生产后端或生产级认证，也没有改变 LocalStorage 留言结构。

---

## 15. 建筑照片排序与详情页布局人工验收（2026-07-27）

### 单一目标

完成建筑列表的照片优先排序，以及建筑详情页右侧照片展示和桌面单屏布局；不扩展认证、地图、seed、LocalStorage 或测试架构。

### 方案比较与选择

- 排序方案一是在 `CAMPUS_BUILDINGS` 上直接执行 `sort()`，实现短但会改变共享建筑数据顺序，因此未采用。
- 排序方案二是在 renderer 内创建带原始索引和分组 rank 的稳定副本，再排序并渲染。采用此方案，确保 `B_MASJID` 第一、有照片建筑优先、无照片建筑最后，并保持组内原顺序。
- 详情布局采用条件媒体区：有照片时右侧渲染相册，无照片时右侧渲染原2D轮廓。未新增重复相册、第三方依赖或全局路由状态。

### 已验收实现

- 建筑列表排序来自稳定副本，不原地修改建筑源数组。
- 有照片详情页不再在左侧显示小相册；右侧大区域显示固定4:3、`object-fit: cover` 的相册。
- 多图保留内部横向 scroll-snap、左右按钮和 `1/N` 计数；单图不显示按钮或计数。
- 无照片建筑不生成空相册，继续显示右侧2D俯瞰轮廓。
- 图片加载失败时显示该建筑的2D轮廓 fallback。
- 桌面详情页使用导航栏下方的可用视口高度，页面主体不纵向滚动；左侧名称、line-clamp 简介、runtime 可见留言数和进入留言墙按钮保持首屏可见。
- 较矮桌面使用紧凑规则；移动端恢复自然纵向布局，且相册横向滚动不会造成页面横向溢出。
- 建筑ID、照片路径、地图数据、留言过滤与留言墙行为均保持不变。

### 测试与验收记录

- 用户已完成人工验收，确认建筑照片排序和详情页布局可接受。
- renderer 隔离断言通过：`B_MASJID` 第一、照片/无照片组稳定、源数组未变、单图无控制器、多图有控制器与计数、无照片使用轮廓、`isHidden` 留言不计数。
- `node --check app-place.js`：通过。
- `git diff --check`：通过，仅输出既有换行符警告。
- 未新增测试框架，也未宣称新的自动浏览器测试结果。

### 回滚

只反向移除 `app-place.js` 中本节的稳定副本排序、详情条件媒体区和留言墙入口布局 hunk，以及 `style-core.css` 中本节的详情视口高度、overflow、右侧4:3相册、简介 clamp、紧凑桌面和移动端恢复规则。工作区包含其他未提交修改，禁止整体恢复文件。不要删除既有 `photos` metadata 或 `assets/buildings/` 照片；无需清理 LocalStorage，也不得改动建筑ID、地图坐标、seed、认证或管理员代码。

## 2026-07-28 — Portable demo seed startup

Compared two approaches: embedding seed JSON directly in `app-data.js` versus generating a separate classic-script bundle. The separate generated bundle was selected because it preserves application boundaries, keeps source JSON reviewable, and avoids `fetch` under `file://` without introducing modules or a framework.

The loader now installs the bundle synchronously once, assigns negative runtime-only IDs, and uses the existing `ready`/`loading` guard so refresh initialization and route calls cannot repeatedly concatenate seed notes. LocalStorage write paths remain unchanged and receive only user-note state.

Rollback: remove the bundle script tags and generated artifact, then revert the portable validation/activation helpers and bundle branch in `app-data.js`; retain the JSON source snapshots.
## 2026-07-29 — Deterministic KMK seed reduction

Compared a manually maintained key allowlist with deterministic stratified selection. Selected the latter: complete-content/no-media-reference notes rank first, then each language/identity stratum is ordered by the existing `demoSeedKey`. This keeps the process repeatable while preserving BM majority, minority EN/ZH coverage and the named/anonymous balance without rewriting content.

Idempotency check passed: rerunning the reducer left the seed SHA-256 unchanged (`AFE8C6892BABB078BC92206F839C93E7A13B2C6F1EDA17D72DC32CCF16186FA7`).

## 2026-08-01 — Portable demo release refresh

Compared copying the browser's complete LocalStorage state with rebuilding from the already curated static seed sources. Copying LocalStorage was rejected because it could mix sessions, prototype accounts, passwords or real user notes into a public artifact. The deterministic static-source path was selected; no unknown LocalStorage records were imported because the automated browser had no available instance.

The existing bundle builder regenerated 696 runtime-only notes. A new ZIP was created from an explicit 50-file whitelist instead of updating the old archive in place. The extracted files matched the current working tree byte-for-byte, so current UI, card display-number code, maps, locales, themes, community/building walls, photos and local AI implementation are represented without an architecture change.

Verification passed: portable validator, 25 deployed `node --check` runs, `git diff --check`, route parsing, double-load seed count 696/696 with zero LocalStorage writes, local AI answer/refusal checks, 16/16 photo decoding and HTTP delivery, and archive path/content security scans.

Rollback: replace only the refreshed ZIP with the previous matching artifact. If reverting the generated bundle too, keep it paired with the prior seed sources and validator contract; preserve all unrelated working-tree changes and LocalStorage.
# 2026-08-22 — STUDY-V2-008 / FINAL-QA

No new optimization was implemented in this verification-only pass. Existing Study behavior retained: approved-only overlay avoids manifest mutation, load-more prevents large subject dumps, and the global search has a small debounce. No performance claim was made from browser measurement.
