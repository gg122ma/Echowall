# Repository Audit

## 审计结论

本文件按以下优先级建立当前 EchoWall 的真实 Feature Map：

1. 当前源码、当前种子数据、当前本地资源与可执行测试；
2. InnoSTEM 官方比赛规则；
3. 原比赛视频 `8月1日(1).mp4`；
4. `EchoWall_网站介绍_2分15秒视频剧本_参考录屏手册修订版.pdf`；
5. `EchoWall_网站录屏连续流程与详细录制手册_2026_07_30.pdf`；
6. 其他说明或规划文件。

结论不是“把功能全部展示一遍”，而是用 130 秒证明一条真实可运行的链路：

> Echo Map 的地点信息 → Pustaka 地点页与地点墙 → All KM Students 的真实问答互动 → Echo Library 的真实题目 PDF 与配套答案 → Ask Echo 返回地点 → 三语言界面 → 原 Impact 段落。

本次只新增两份视频审计/剧本文档，没有修改网站源码、数据、样式或功能。

## 审计方法与证据

- 用 `rg` 检查入口、hash router、render 函数、DOM id/class、导航目标、服务层和数据注册表。
- 逐项检查 Map、Community、Study、Ask Echo、i18n、theme、auth/profile、media、comments、question/solved、resource opening。
- 用本地 HTTP 服务加载当前项目，而不是直接双击 `file://`。
- 对关键 HTML、Leaflet、图片、题目 PDF、答案 PDF 做 HTTP 状态与文件头验证。
- 对关键 JavaScript 做 `node --check`。
- 执行仓库现有 Community 与 Study 测试。
- 在隔离 VM 中调用当前 Ask Echo adapter，验证本地响应及动作目标。
- 完整提取并逐页查看 3 份 PDF；抽帧和接触表观看原比赛 MP4，并定位网站段与 Impact 交接帧。

### 本地运行验证结果

| 检查项 | 结果 | 实际证据 |
|---|---:|---|
| `index.html` | PASS | HTTP 200，19,339 bytes，HTML |
| `map.html` | PASS | HTTP 200，18,767 bytes，HTML |
| 本地 Leaflet JS | PASS | HTTP 200，147,552 bytes |
| Pustaka 实景图 | PASS | HTTP 200，130,289 bytes，JPEG |
| SM015 题目 PDF | PASS | HTTP 200，2,337,008 bytes，`%PDF-` |
| SM015 答案 PDF | PASS | HTTP 200，1,081,173 bytes，`%PDF-` |
| 关键 JS 语法 | PASS | Router、Community、Study、Wall、Place、Map、Ask Echo 均通过 `node --check` |
| Sticky Wall 测试 | PASS | 61/61；包含滚动容器、Modal scroll lock、过滤/搜索、10 色确定性分布 |
| Community seed 互动测试 | PASS | 38/38；seed 评论/回复可持久化，真实用户数据不受影响 |
| Study 测试 | PASS | 74/74；资源、上传服务及相关约束通过 |
| Ask Echo 本地调用 | PASS | `Where is the library?` 稳定返回 Pustaka 地点、Sun–Thu 08:00–16:30，并提供 `View details` |

### 验证边界

当前执行环境能启动网站并验证 HTTP、脚本、服务与数据，但没有可供自动化控制的 Chrome/in-app Browser 会话。因此：

- 本文不会把“鼠标逐步完成整条流程”和“Console 0 new errors”伪写为已亲眼 PASS。
- 选中的动作都有当前源码、当前数据、当前资源和自动测试支撑。
- 原生 PDF viewer 的外观、在线 OSM tile、实际 1920×1080 构图和交互 Console，标为录制机复核项。
- 最终剧本已避开依赖未证实状态的功能，并为每个风险动作提供替代镜头。

## 当前架构

### 关键源码索引

| 审计域 | 当前 source of truth |
|---|---|
| 主入口 / 全局 DOM | `index.html` |
| 独立地图入口 / Map DOM | `map.html` |
| hash router / route initialization / Home | `app-router.js` |
| 主数据装配 / runtime notes | `app-data.js` |
| Community hub / college pages | `app-community.js`、`data/community-config.js` |
| Sticky Wall / post / question / modal / vote / comments UI | `app-wall.js`、`style-wall.css`、`style-comments.css` |
| Comments / permissions | `services/comment-service.js`、`services/permission-service.js` |
| KMK Map interaction | `echomap.js`、`data/campus-map-config.js`、`data/campus-building-registry.js` |
| Building detail / photos / hours / events rendering | `app-place.js`、`data/campus-buildings.js`、`data/campus-building-hours.js` |
| Study routes / search / filter / resource detail | `app-study.js`、`services/study-resource-service.js` |
| Study data / real files | `data/study-resource-manifest.js`、`data/study-subjects.js`、`assets/study-files/` |
| Ask Echo UI / local answer adapter | `services/ai-assistant.js`、`services/free-ai-adapter.js`、`data/kmk-knowledge-base.js` |
| I18N | `i18n/index.js`、`i18n/locales/en.js`、`ms.js`、`zh.js` |
| Theme / preference menu | `services/theme-service.js`、`services/preferences-ui.js` |
| Auth / profile UI | `services/auth-service.js`、`services/auth-ui.js` |
| Demo data | `data/demo-seed-bundle.v1.js`、`data/demo-seed-all-student-km.v1.js` |

Navigation 的当前事实同时来自 `index.html` 顶部 navbar、Home CTA，以及各 render 函数中的 `navigate(...)` / `location.href`。没有用 README 中的规划 route 代替当前 router。

### Entry points

| 入口 | 作用 | 重要依赖 |
|---|---|---|
| `index.html` | 主 SPA；Home、Place、Community、Study、Auth UI、Ask Echo、Modal/Drawer | `app-router.js`、各 render 模块、localStorage、IndexedDB |
| `map.html` | 独立 Echo Map 文档；不是 SPA hash route | 本地 Leaflet、`echomap.js`、建筑数据、远程 OSM raster tiles |

### Router

- 主站采用 `location.hash` 路由，由 `app-router.js` 解析并调用页面 render 函数。
- `map.html` 是独立文档；由 Map 进入地点详情时跳转到 `index.html#/place/:placeId`。
- 从 Map 返回地点详情会记录 return source，地点页的 Back 会回到 Map。
- legacy route 会 redirect 到当前 canonical Community route，不适合作为录制入口。

### State management 与 storage

| 状态 | 当前实现 | 录制影响 |
|---|---|---|
| Wall UI 状态 | 模块级 `wallState` | 排序、分类、搜索在当前页即时重绘 |
| Notes / comments | localStorage + demo seed bundle | 使用干净录制 profile 可保持可重复；评论会真实持久化 |
| Auth / profile | localStorage；Web Crypto hash | 只作为预先登录条件，不进入成片 |
| Theme / language | localStorage | 录制前锁定 Light + English；i18n 场景后恢复 English |
| Map return state | sessionStorage | Map → Place → Back 可保留来源和部分视图状态 |
| Study upload blob | IndexedDB | 本次不展示上传；内置资源直接使用本地文件 |
| Study browse/search | 运行时 view state | 搜索、过滤、排序均为本地确定性逻辑 |

## 当前真实数据概况

### Community / Sticky Wall

- Demo seed bundle：696 条；All KM Students 独立 seed：67 条；当前随仓库分发的 seed 总量 763 条，另叠加本地用户 notes。
- All KM Students：67 条，其中 44 Questions、23 Discussions；34 English、20 Bahasa Melayu、13 Chinese。
- All KM Students 当前 44 个 seed questions 全部为 `open`；没有可供普通登录用户演示的 seed `solved` 状态。
- All KM Students seed 当前没有图片、没有预置评论、投票分数为 0。
- KMK Jurusan Sains：73 条；Akaun：25 条；Computer Science：10 条。
- Community seed notes 的投票是只读显示；评论和回复使用共享 `CommentService`，可以真实提交并跨刷新保留。
- 当前 10 种 Sticky 颜色通过确定性分配；仓库测试验证 All Student 与 KMK/Sains 分布。

### Map / Building

- KMK 建筑注册表共 32 项；19 项配置为可打开 Preview 的重点建筑。
- 当前 Map sidebar 的静态/i18n description 仍写着“fourteen focus buildings”，与 19 个 `opensPreview:true` 配置不一致。成片不口播数量，也不放大该说明；这是显示文案风险，不影响 Pustaka 选择链路。
- `Fit campus`、建筑列表/footprint 选择、Preview、结构化开放时间、`More details`、`Enter Wall` 均有真实事件处理。
- Pustaka 有 1 张真实照片；Masjid 有 5 张；32 栋中有 10 栋配置照片。
- Pustaka 结构化时间：Sunday–Thursday 08:00–16:30；Friday/Saturday closed。
- 建筑详情页会渲染 purpose、hours、special notes、events 区、visible notes 和地点墙入口。
- 当前建筑数据没有任何实际 event 记录；页面只能展示 empty state。
- 当前没有面向用户的 building review 数据或 review UI。Moderation schema 中的 `review` 不是公开 Building Reviews 功能。
- OSM raster tile 来自 `https://{s}.tile.openstreetmap.org/...`；Map 的底图画面需要录制时在线，建筑 footprint/数据本身是本地的。
- 主站与 Map 的 Google Fonts 也从 `fonts.googleapis.com` / `fonts.gstatic.com` 加载；录制前必须预热，否则 fallback font 会改变 match-cut 几何。

### Study / Echo Library

- 当前 manifest 共 2,468 条：2,318 auto parsed、150 manual review；2,284 条可发布。
- 468 个 related references；460 个资源属于互相可追踪的 question/scheme pair。
- 377 个实际 demo 文件均存在：363 PDF、8 PPTX、6 DOCX；审计时没有缺失文件。
- 真实 demo subject 包含 EA025、EE025、EM025、AA015、AP015、SM015、DC014、DP014、DP024。
- 全局搜索按 exact code、prefix、title、topic、year 排序；全局过滤为 Year / Source / Sort。
- Subject 页面有 category tabs 及 Year / Subtype / Source / Sort；PSPM/Pre-Pra 可按年份分组并显示 question ↔ scheme 关系。
- Resource Detail 显示 subject、semester、type、year、source、verification，并提供 related resource。
- PDF 用新 tab 打开；非 PDF 下载；不可用资源会显示诚实 disabled/unavailable 状态。
- 最终剧本使用的真实 pair：
  - Question ID：`study_ef439e254b209e14981f`
  - Title：`SM015_Matematik 1_sesi 2023_2024`
  - File：`assets/study-files/study_ef439e254b209e14981f.pdf`
  - 14 页；第一页明确出现 SM015、Matematik、2023/2024。
  - Scheme ID：`study_198f7e13702317aa00cd`
  - Title：`Past Year SM015 2023-2024 (Answer Scheme)`
  - 6 页；手写解答带红/蓝标记；与 question 互为 related resource。

### Ask Echo

- 当前没有启用远程模型；使用本地、确定性的 rule/RAG adapter 和校园知识库。
- `Where is the library?` 是 UI 内置 suggestion，不需长时间输入。
- 实际响应包含 Pustaka/Library、Blok Library、Sun–Thu 08:00–16:30，并提供 `View details`。
- 动作会导航到 `#/place/B_PUSTAKA`。
- 合理表述是“local campus knowledge base / guided campus Q&A”，不能声称通用生成式 AI 或联网实时回答。

### I18N / Theme / Auth

- English、Bahasa Melayu、Chinese 均有本地字典；切换会重绘当前 route。
- Light、Dark、System 均可选择；主题保存在 localStorage。
- Ask Echo panel 的静态 label 会随语言更新，但已经生成的 response 不会自动重译；所以切语言前应关闭 Ask Echo。
- Auth/register/sign-in/profile 是本地 prototype，当前可用，但比赛证明价值低且耗时，不进入成片。

## ORIGINAL_EDIT_LANGUAGE

原比赛视频时长约 4:51，1920×1080、30fps；网站段约从 00:58 开始，约在 03:28–03:30 交给 Impact 真人镜头。

### 应保留的编辑语言

- Intro 与真人 campus 画面是慢速 dolly/gimbal、浅景深、2–5 秒镜头，整体为克制的暖/冷对比。
- 网站进入方式不是突然 screen capture，而是黑场品牌字样 → 旋转设备 → tablet/phone/laptop 屏幕 → UI 全屏。
- UI 部分用 brown/gold、off-white、纸张/Sticky motif，与网站当前视觉系统一致。
- 常见节奏是“先给页面全貌，再快速推到交互对象，再展示结果”。
- 有明显的透视推进、device mockup、页面物体 match 和短促 zoom rhythm。
- 字体风格偏粗窄标题配手写元素；不宜换成完全不同的科技 HUD 风格。

### 当前显得过时、应收敛的部分

- 旧版本的极端透视旋转和连续大幅 zoom 过多；新段落只在入口和 Impact handoff 使用一次设备透视。
- 旧网站画面信息密度低，一些长时间停留在旧 Home、Registration、Profile，不能证明当前 prototype 的深度。
- 旧段落大量展示“页面存在”，而不是“动作产生结果”。新剧本每个功能都必须出现可见结果。
- 原片实测响度约 -14.4 LUFS、LRA 12.5、true peak 约 +0.8 dBFS；新增 UI 音效应轻，最终混音应避免继续顶峰。

### 可延续的 sound design

- Map fit：短而柔和的地图 ease/whoosh。
- Building card / Sticky：轻纸张触碰声，不用重点击音。
- Community → Study：在 `SM015` text match 上加入很短的铅笔划线声。
- PDF open：轻 page snap；Question → Scheme：一次翻页声。
- Ask Echo：低音量消息出现声。
- Language switch：三次同音色、不同音高的短 tick。
- 避免 generic fade 和每次点击都配音效。

# Runtime Route Map

## CURRENT_ROUTE_MAP

| Route | Render function / entry | Feature | Status | Dependencies | Recording suitability |
|---|---|---|:---:|---|---|
| `#/` | `renderHome` | Home hero、入口、统计、Community/Study/Map promo | A | I18n、theme、seed counts | 只用于 Impact handoff；裁掉可见的 Admin trust-row 文案 |
| `map.html` | 独立文档 + `echomap.js` | Echo Map KMK | A/RISK | 本地 Leaflet + 远程 OSM tiles + building registries | 强；录制前预热 tiles |
| `#/places` | `renderPlaceDirectory` | Building Stories / building directory | B | building data、photos | 可用但与 Map 重复；不进成片 |
| `#/place/:placeId` | `renderPlaceProfile` | 建筑详情、照片、purpose、hours、events empty state、wall CTA | A | building data、hours、photos、notes | 强；用 Pustaka，并 cut 掉 empty events |
| `#/place/:placeId/wall` | `renderBuildingWall` | 地点 Sticky Wall | A | notes、wall renderer | 强；只展示读取与打开 note |
| `#/community` | `renderCommunityHub` | All KM Students + 12 college communities | A | organizations、seed counts | 可用，但最终直接从 match cut 进入 All Student |
| `#/community/all` | `renderCommunityGlobalWall` | All KM Students 全校墙 | A | All Student seed、CommentService | 最强 Community 入口 |
| `#/community/:orgId` | `renderCollegeLanding` | College landing、Jurusan/general/map links | A | organization/major registry | 有效但耗时；最终不单独展示 |
| `#/community/:orgId/general` | `renderCommunityCollegeGeneralWall` | College general wall | A | seed bundle、wall renderer | 可录；不如 All Student 问答链路集中 |
| `#/community/:orgId/jurusan/:majorId` | `renderWall` | Jurusan Sticky Wall | A | major registry、seed bundle | KMK/Sains 可录；本次为 130 秒让位 |
| `#/study` | `renderStudyHome` | Jurusan、全局 Search、Year/Source/Sort | A | StudyResourceService、manifest | 最强 Study 入口 |
| `#/study/:jurusan` | `renderStudyJurusan` | Jurusan semesters | A | subject registry | 可用，最终由 search 跳过层级 |
| `#/study/:jurusan/sem/:semester` | `renderStudySemester` | Subject cards / resource counts | A | subject/resource registry | 可用，最终由 search 跳过层级 |
| `#/study/:jurusan/sem/:semester/:subjectCode` | `renderStudySubjectShell` | Subject resource list、tabs、filters、year grouping | A | manifest、filters | 强但时间不足；审计保留，成片不展开 |
| `#/study/resource/:resourceId` | `renderStudyResourceDetail` | Metadata、open file、related question/scheme | A | manifest、local assets/IndexedDB | 最强；必须展示真实 PDF 结果 |
| `#/study/upload` | `renderStudyUploadShell` | Study upload prototype | B/C | Auth、IndexedDB、moderation state | 不录；文件选择和审核状态耗时且风险高 |
| `#/org/:orgId/map` | `renderOrgCampusMap` | 非 KMK campus framework map | C | campus map config；部分 registry 为空 | 不录 |
| `#/org/:orgId/buildings` | `renderOrgBuildingRegistry` | 非 KMK building framework | C/D | empty/incomplete registry | 不录 |
| `#/org/:orgId/building/:buildingId` | `renderOrgBuildingDetail` | framework detail | C/D | incomplete registry | 不录 |
| legacy `#/org/:id`、`#/wall/...` | redirect | 旧 Community 路由兼容 | B | router redirect | 不作为录制入口 |
| `#/admin` | `renderAdmin` | 未完成管理页 | EXCLUDED | Admin modules | 严禁出现在画面、旁白或 on-screen text |

# Current Feature Status

## 分级定义

- **A — reliable and visually strong**：当前功能与数据均存在，结果清楚，适合录制。
- **B — working but visually weak**：当前可用，但信息密度、空状态或时间效率较弱。
- **C — partial / risky**：路径或 UI 存在，但依赖、权限、数据状态或录制稳定性不足。
- **D — planned only / not a real public feature**：只有框架、schema 或规划痕迹，不能当作已完成功能。
- **E — broken**：当前行为明确失败。最终候选中没有使用 E。

## Echo Map / Building

| Feature | Grade | 事实判断 | 视频决定 |
|---|:---:|---|---|
| Map load | A/RISK | 本地 Leaflet 正常；OSM tile 依赖网络 | KEEP；录制前预热并准备已加载 take |
| Fit campus | A | 有直接 click handler，fit 到 KMK bounds | KEEP |
| Building selection | A | sidebar 与 footprint 都能打开 Preview | KEEP；选 Pustaka |
| Building information | A | 名称、类别、zone、description、note count | KEEP |
| Opening hours | A | 结构化周表；Pustaka 有精确时间 | KEEP |
| Events | C | UI 存在，但当前所有 building events 为空 | REMOVE |
| Location posting | B/C | 可用但要登录、填表、提交与恢复状态 | REMOVE；时间与失败成本高 |
| Enter building wall | A | Preview 与 Detail 都有真实入口 | KEEP；从 Detail 进入 |
| Building photos | A/B | Pustaka 有 1 张；部分建筑无图 | KEEP；只用 Pustaka |
| Building reviews | D | 没有公开功能/数据 | REMOVE；不得声称存在 |
| Building Stories | B | 仍存在，但与 Map discovery 重复 | REMOVE；由 Map + Detail 取代 |

## Community

| Feature | Grade | 事实判断 | 视频决定 |
|---|:---:|---|---|
| All KM Students | A | 67 个真实 seed，三语言，Questions/Discussions | KEEP |
| College communities | A | 12 colleges | 审计确认；成片不逐一浏览 |
| Jurusan / KMK Sains | A | 当前有充足 seed，配色/过滤正常 | 可作 fallback；主片用 All Student |
| Sticky Wall scroll | A | 内层 `.wall-canvas-wrap` 是真实滚动容器 | KEEP；只做一次短单向滚动 |
| Post | A/B | 可真实提交；需要恢复录制状态 | 不录，避免创建额外帖子 |
| Question | A | 44 个 All Student seed questions | KEEP |
| Comments | A | seed question 可真实评论并持久化 | KEEP；成为社区场景的可见结果 |
| Replies | A | 深度 0/1 支持并通过测试 | 审计确认；主片不展开，节省时间 |
| Solved | C for demo | 作者/Moderator 才能改；普通用户不能 solve seed，且 seed 无 solved | REMOVE；最新旧剧本此处不成立 |
| Filters | A | Category、Post Type、Hot/New/Unanswered | KEEP Questions filter；不展示全部 |
| Search | A | 可搜索内容；目标 query 唯一命中 | KEEP |
| Vote | C for seed | seed vote 只读，点击不会持久化 | REMOVE；不得录 seed vote |
| Image sticky | B/C for shipped demo | composer 支持图片，但 All Student seed 无图 | REMOVE；不创建假图片帖子 |
| Modal scroll lock | A | 打开加 `overlay-open`；关闭移除 | 录制时关闭 Modal 后再继续页面动作 |

## Study Notes / Echo Library

| Feature | Grade | 事实判断 | 视频决定 |
|---|:---:|---|---|
| Jurusan | A | 3 个当前 Jurusan | 背景可见，不逐层点击 |
| Semester | A | 层级与 route 均存在 | 不逐层点击 |
| Subject | A | subject cards 与实际资源计数 | 由搜索直接进入资源 |
| Resource list / year grouping | A | 当前代码已实现 | 审计确认；主片不展开 |
| Search | A | exact subject/title ranking 有效 | KEEP；搜索真实 SM015 title |
| Global filter | A | Year / Source / Sort | 不录；最新旧稿写成 Jurusan/Semester/Type 不准确 |
| Subject filter | A | Category + Year/Subtype/Source/Sort | 可作 fallback，不混入 130 秒主线 |
| Question ↔ Scheme | A | 当前有 reciprocal related pair | KEEP |
| Resource Detail | A | metadata 与验证状态实际渲染 | KEEP |
| Open PDF | A/RISK | 真实本地 PDF；新 tab；viewer 外观取决于浏览器 | KEEP；先预热文件 |
| Non-PDF | A/B | 8 PPTX、6 DOCX，以下载方式打开 | 审计确认；不录下载 UI |
| Actual demo files | A | 377/377 存在 | KEEP PDF pair |
| Unavailable state | A but weak | 诚实 disabled state | REMOVE；不把失败态作为主展示 |
| Source metadata | A | Detail 显示 source/verification/year/type | KEEP |

## Ask Echo / I18N / Profile

| Feature | Grade | 事实判断 | 视频决定 |
|---|:---:|---|---|
| Ask Echo | A | 本地确定性知识库；稳定 suggestion 与导航动作 | KEEP；准确称为 local knowledge base |
| English / BM / Chinese | A | 本地字典与当前 route 重绘 | KEEP；短 micro-demo |
| Theme | A | Light/Dark/System 均存在 | Light 为最终录制基线；Dark 只做 preflight |
| Auth | B | 本地 prototype，功能存在 | 不展示，只预先登录以提交评论 |
| Profile | B | 本地 prototype，视觉价值低 | REMOVE |

# Recording-Safe Features

## 3–5 个最强展示候选评分

评分中的 Time efficiency 以 10 为“较少时间可证明完整结果”。

| Rank | Candidate | Competition value /10 | Visual value /10 | Reliability /10 | Transition potential /10 | Time efficiency /10 | 决定 |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | Echo Library：Search → metadata → real question PDF → linked scheme | 10 | 9 | 9 | 9 | 7 | WINNER |
| 2 | Echo Map → Pustaka Preview/Detail/Wall | 9 | 10 | 7 | 10 | 7 | WINNER；tile 网络是唯一主要风险 |
| 3 | All KM Students：Question filter → Search → real comment | 9 | 9 | 8 | 10 | 8 | WINNER；预先登录 |
| 4 | Ask Echo：local answer → `View details` | 8 | 8 | 10 | 8 | 9 | WINNER |
| 5 | I18N：同一 Pustaka 页面 EN/BM/ZH | 7 | 7 | 9 | 8 | 10 | WINNER；作为短证明 |
| 6 | Map location post | 8 | 8 | 5 | 8 | 3 | EXCLUDE |
| 7 | KMK/Sains 多墙浏览 | 7 | 8 | 9 | 7 | 5 | FALLBACK；会重复 Community 证明 |
| 8 | Auth/Profile | 4 | 6 | 7 | 4 | 3 | EXCLUDE |
| 9 | Building Stories 全目录 | 5 | 7 | 9 | 5 | 4 | EXCLUDE；Map 已承担发现 |
| 10 | Events / Reviews | 2 | 3 | 1 | 2 | 2 | EXCLUDE |

## 最终选择为什么能证明 Working Prototype

1. Map：一次真实 Fit、一次真实地点选择、一次真实 hours 展开、一次真实页面跳转。
2. Community：不是只看帖子；Filter 和 Search 都有结果，并真实提交一条评论。
3. Study：不是只看资源卡；打开仓库中真实存在的题目 PDF，再打开真实关联答案。
4. Ask Echo：不是空 chat mockup；有稳定知识库回答和可点击的地点动作。
5. I18N：同一真实页面保持布局，三个本地字典切换可见。

# Features To Exclude

| 排除项 | 原因 | 如果误录的风险 |
|---|---|---|
| Admin / moderation / roles / approval / AI moderation | 用户硬约束；Admin 未完成 | 直接违反比赛视频范围与用户要求 |
| Seed vote | 当前是 read-only display | 点击无持久结果，会暴露 prototype 缺口 |
| Mark solved on seed question | 普通用户无权限；All Student seed 没有 solved | 剧本动作无法完成 |
| Building events | 当前数据全部为空 | 只能展示 empty state |
| Building reviews | 当前没有公开 feature | 属于虚构功能 |
| Map direct posting | 需要登录、表单、状态恢复；时间成本高 | file/input 状态与验证错误会拖慢节奏 |
| Image sticky | All Student seed 无图；需临时造帖 | 会把演示变成人工造数据 |
| Study upload | file picker + IndexedDB + moderation/unverified 状态 | 需要 cut 多个不稳定步骤，价值低于 real PDF |
| Non-PDF download | 会触发浏览器下载 UI | 破坏同一用户旅程和镜头控制 |
| Unavailable resource | 是诚实 fallback，不是强证明 | 视觉上像功能失败 |
| Long Building Stories tour | 与 Map 重复 | 牺牲真实互动和 PDF 时间 |
| Auth/Register/Profile | 本地 prototype；与 Practical 核心链路关系弱 | 暴露个人信息、打断节奏 |
| Ask Echo 开放式问题 | 当前知识域有限 | 回答不确定；只用内置稳定 suggestion |
| 非 KMK campus map/building | registry 不完整 | 可能只出现 framework/empty state |
| Home 全幅 trust row | 当前包含 `Admin moderation` 文案 | 违反 NO ADMIN；Impact handoff 必须裁切 |

# Old Script Compatibility Matrix

| Old Scene | Old Purpose | Current Equivalent | Still Exists? | Better Current Feature? | Visual Value | Keep / Replace / Remove | Reason |
|---|---|---|:---:|---|:---:|---|---|
| Home → Echo Map | 从产品首页进入地图 | `map.html` Echo Map KMK | Yes | Map 仍是固定开场 | High | KEEP，但直接以 Map 开始 | 用户硬约束 MAP FIRST；不浪费时间浏览 Home |
| Map direct location post | 证明地点发帖 | Map note overlay/composer | Yes | Map → Detail/Wall 更短更可靠 | Medium | REPLACE | 发帖需登录与长表单；地点信息与 Wall 已能证明实际价值 |
| Pustaka wall photo note | 展示地点记忆与图片 | `#/place/B_PUSTAKA/wall` | Partly | Pustaka Detail 的真实照片更稳定 | High | REPLACE | Pustaka 有真实 building photo；当前 shipped wall 不保证目标 image sticky |
| Pustaka seed vote | 展示互动 | Seed vote 只读 | UI only | Real comment 更强 | Low | REMOVE | Seed vote 不能真实持久化 |
| 回到 Home 作为段落分隔 | 重置视觉 | 不需要 | Yes | 连续对象转场 | Low | REMOVE | 打断用户旅程；每次回 Home 会像功能列表 |
| Home → KMK Community → Sains | 展示社区层级 | `#/community/1/jurusan/1` 等 canonical route | Yes | All KM Students 的跨社区问答 | Medium | REPLACE | All Student 更能承接地点墙并导向 Study |
| Category / search on Community | 证明发现内容 | Wall filter/search | Yes | 仍是强动作 | High | KEEP | 当前真实可用；目标 query 唯一命中 |
| Ask Echo 开放式提问 | 展示助手 | 本地 knowledge-base suggestion | Yes | 使用内置 `Where is the library?` | High | REPLACE | 固定 suggestion 更稳定，且能回到真实地点页 |
| EN / BM / Chinese | 展示可访问性 | Navbar language menu | Yes | 同页状态 match | Medium | KEEP，压缩 | 9 秒即可看到相同页面三语变化 |
| Building Stories：Masjid/Pustaka 长浏览 | 展示地点故事 | `#/places` 与 `#/place/:id` | Yes | Map → Pustaka Detail | Medium | REPLACE | Map 已承担地点发现；保留真实 photo/hours，删除重复目录 |
| Logout / Register / Sign-in / Profile | 展示账户闭环 | 本地 Auth/Profile prototype | Yes | Community real comment 已隐含用户状态 | Low | REMOVE | 时间成本高、非核心、可能暴露数据 |
| 最新稿：All Student question → comment → solved | 展示问答闭环 | comment 可用；seed solved 不可用 | Partly | comment visible result | High/Low | KEEP comment；REMOVE solved | 普通用户不能 solve seed；所有 All Student seed questions 为 open |
| 最新稿：Study search/filter | 展示检索 | Search + Year/Source/Sort | Yes | exact-title Search 更快 | High | KEEP Search；REMOVE filter from main cut | 最新稿中的 Jurusan/Semester/Resource Type 不是全局实际 filter |
| 最新稿：Question → Scheme → PDF | 展示真实学习资源 | reciprocal pair + two real PDFs | Yes | 当前最强功能证明 | Very high | KEEP / EXPAND | 当前资源与文件均真实存在，必须展示打开结果 |
| 最新稿：Ask Echo → i18n | 助手和多语言收尾 | 当前 Ask + Pustaka language switch | Yes | Ask action 可回到同一 Pustaka | High | KEEP / REORDER | 先 `View details` 回地点，再在同页切三语，链路更自然 |
| Website → Impact | 交给已锁定 Impact | Home hero → 原 physical laptop → student | Yes | 精确 screen match | Very high | KEEP / REFINE | 原片本来就在约 03:28 用 Home 全屏转入实体 laptop；最自然 |

# Competition Constraints

## 官方规则对本段的要求

- 完整成片先有约 1 秒 cover，再进入内容结构；该 cover 不计入本网站段的内部 00:00。
- 完整参赛视频为 3–5 分钟。
- 结构包含 Idea、Practical & Usability、Impact & Contribution。
- Product 项评分权重 85%，其中 Idea 20%、Practical & Usability 20%、Impact & Contribution 25%，另有 abstract/documentation；Video 15%。
- 项目必须以 prototype/model 方式证明，而不是只陈述概念。

## 对网站段的具体推导

- 本段主要服务 **Practical & Usability**，所以镜头必须优先显示“动作 → 可见结果”。
- Idea 与 Impact 已锁定，本文件不重写两者。
- 网站第一功能固定为 Echo Map；不讨论其他入口。
- 硬上限 135 秒；最终目标 130 秒。
- 不以“功能数量”作为价值；只保留 5 个互相连接的强证明。
- VO 只描述被当前功能支撑的价值，不使用“AI understands everything”“real-time live events”“verified by administrators”等未被当前行为支撑的宣传句。
- Admin 不出现在画面、旁白、字幕、鼠标路径或 browser history。

# Recommended Story Flow

## 一条连续用户旅程

```text
Idea 最后设备/品牌画面
  ↓ 当前 Echo Map 填满同一设备屏幕
Fit campus → 选择 Pustaka → 展开开放时间
  ↓ More details
Pustaka 实景图、用途与结构化时间
  ↓ Enter Wall
Pustaka 地点墙的一张蓝色 rounded note
  ↓ 同色同形 CARD MATCH
All KM Students 的蓝色 rounded question
  ↓ Questions → Search → comment 中出现 “SM015”
SM015 text match
  ↓
Echo Library exact-title search → metadata
  ↓ Open PDF
真实 SM015 question paper
  ↓ Related Answer Scheme
真实手写 scheme PDF
  ↓ 红色圆圈 OBJECT MATCH 到 Ask Echo launcher
Ask Echo：Where is the library? → local answer
  ↓ View details
Pustaka Detail
  ↓ 同页 EN → BM → 中文 → EN
Echo Wall brand → Home hero crop
  ↓ 原片 screen/perspective match
实体 laptop → 既有 Impact 真人镜头
```

## 显式时间预算

| Segment | Time | Seconds |
|---|---|---:|
| Idea handoff → Map first frame | 00:00–00:04 | 4 |
| Map：Fit / Pustaka / hours / More details | 00:04–00:20 | 16 |
| Pustaka Detail：photo / purpose / hours / Enter Wall | 00:20–00:34 | 14 |
| Pustaka Wall：scroll / open matching note | 00:34–00:45 | 11 |
| All KM Students：match / filter / search / comment | 00:45–01:10 | 25 |
| Echo Library：search / detail / question PDF / scheme PDF | 01:10–01:43 | 33 |
| Ask Echo：stable prompt / answer / View details | 01:43–01:57 | 14 |
| I18N：EN / BM / Chinese / restore EN | 01:57–02:06 | 9 |
| Home crop → existing Impact handoff | 02:06–02:10 | 4 |
| **TOTAL** | **00:00–02:10** | **130** |

## Impact handoff frame

原 MP4 在约 03:28 先显示 Home 全屏，随后把网页做透视缩放送入实体 laptop 屏幕，并在约 03:30 切到学生真人 Impact 画面。最终网站段应复用这条编辑语法：

- 当前网站最后停在 `#/` Home hero；只使用上方 headline、book visual 与品牌区域的裁切。
- 必须把下方含 `Admin moderation` 的 trust row 放到裁切外，不能在成片出现。
- 用 corner-pin / perspective scale 把当前 Home crop 放入原实体 laptop screen。
- 保留原片 laptop → student 的 cut 和之后 Impact 内容；不改 Impact VO。

# Transition Feasibility Matrix

| ID | Type | Outgoing element | Incoming element | Outgoing bounding-position concept | Incoming bounding-position concept | Required capture state | Editing method | Difficulty | Fallback |
|---|---|---|---|---|---|---|---|:---:|---|
| T0 | STATE MATCH CUT + UI PANEL EXPANSION | Idea 结尾的设备/品牌屏幕 | 当前 `map.html` 全景 | 设备屏幕居中，占画面约 35–55% | Map 先被限制在相同屏幕框，再扩到全画幅 | OSM tiles 已加载，Map 无 Preview，cursor 在空白 | 10–14 frames corner-pin + scale；不 fade | MEDIUM | 从 Idea 的 EchoWall logo 做 8-frame logo/text match 到 Map header |
| T1 | SHARED ELEMENT + POSITION MATCH | Map Preview 的 Pustaka icon/title 与 `More details` | Pustaka Detail 的 icon/H1 | Preview 位于右侧栏上半部 | Detail H1 位于左侧 copy 上方 | hours 已折叠回简洁状态；click 后目标页已加载 | 在 click 后 4–6 frames 推向标题，cut loading，再从同方向 ease out | LOW | 直接 click cut；保留 title 在同一水平带 |
| T2 | SCROLL CONTINUITY + TEXT MATCH | Detail 下方 `Pustaka (Perpustakaan) Wall` / `Enter Wall` | Wall header 的 Pustaka 标题 | CTA 位于左侧 copy 下方 | Wall title 位于上方 context bar | 先录 top result，再另录 scroll 尾段；不让 empty events 停留 | 在向下 scroll motion 中切掉中段；click 后标题 text match | MEDIUM | 从 Detail top 直接 jump cut 到 CTA，使用同一左边缘作 position match |
| T3 | STATE MATCH CUT + CARD MATCH | Pustaka note modal：rounded、`#BFDBFE`、`Saya guna teknik 45 minit belajar...` | All Student modal：rounded、`#BFDBFE`、`Best quiet study spot?` | 两个 modal 均居中，同宽同圆角 | 完全相同 | 两个 raw clip 都以 modal 已打开且 cursor 在背景空白开始 | 2–4 frame hard match；只让内容发生变化 | LOW | 若颜色/顺序受本地数据影响，按文本搜索两张目标 note 后再开 modal |
| T4 | TEXT MATCH | 新评论中的 `SM015` | Study search input 开头 `SM015` | Modal comments 区中下部；后期 crop 把词置于上中部 | Search input 在页面 hero 上中部 | 评论已出现；Study query 已准备好但尚未显示完整结果 | 6–10 frames scale/position match；中间切掉 paste | MEDIUM | 用 `SM015` 的 on-screen overlay 作 bridge，再切 Search result |
| T5 | SHARED ELEMENT | Search result title `SM015_Matematik 1_sesi 2023_2024` | Resource Detail H1 同标题 | 结果列表中上部 | Detail H1 上部 | 搜索唯一目标在首屏；Detail assets 已预热 | click 后 5-frame title scale，cut page transition | LOW | 直接 hard cut，保持标题左边缘一致 |
| T6 | UI PANEL EXPANSION | Resource Detail 的 `Open PDF` button | Question PDF 第一页白纸 | button/metadata card 中下部 | PDF page 居中，占画面主体 | PDF 已在后台预热；viewer zoom 已固定 | 从 button 白色/浅色区域扩成 PDF page；cut loading/tab switch | MEDIUM | click 后 hard cut 到稳定 PDF page，保留轻 page-snap SFX |
| T7 | TEXT MATCH + CARD MATCH | Question PDF 第一页的 `SM015` / 2023–2024 | Detail 中 `Related Answer Scheme` title | PDF 上方标题带 | Related card 同一上方水平带 | close tab 后 question detail 保持原 scroll | 8-frame crop 从 PDF code 到 related title；隐藏 tab loading | MEDIUM | close PDF 后直接展示 related card 1 秒，再 click |
| T8 | UI PANEL EXPANSION | Scheme Detail 的 `Open PDF` | 手写 Scheme PDF 第一页 | button/card 中下部 | 白纸居中 | scheme PDF 已预热到 page 1 | 6–8 frame page expansion，cut viewer loading | MEDIUM | hard cut 到稳定 scheme page |
| T9 | OBJECT MATCH | Scheme PDF 的红色圈注 | 圆形 Ask Echo launcher | 后期 crop/reframe 到右下安全区 | launcher 固定右下 | PDF page 1 以能看清红圈的 zoom；关闭 tab 后 scheme detail launcher 可见 | 6–8 frames position/scale match；随后 click launcher，panel expansion | MEDIUM | 先回 Detail，再用 launcher 的圆形 pulse 作 MASK TRANSITION |
| T10 | SHARED ELEMENT + UI PANEL COLLAPSE | Ask reply 的 `Library` 与 `View details` | Pustaka Detail H1/photo | Ask panel 右侧；action 在回复下方 | Pustaka H1 左上、photo 右侧 | 使用稳定 suggestion；reply 完整停 1.5 秒 | click action；panel 向 launcher 收合，同时 page cut 到 Pustaka | LOW | 直接 click cut，保留 `Pustaka` text match |
| T11 | STATE MATCH CUT + TEXT MATCH | Pustaka Detail English title/labels | 同页 Bahasa Melayu labels | 页面几何完全固定 | 页面几何完全固定 | Ask panel 已关闭；页面 top；BM assets 已加载 | 2–3 frame cut on menu click；固定 H1/photo | LOW | 分别录 3 个稳定 take 后硬切，不录 rerender 抖动 |
| T12 | STATE MATCH CUT + TEXT MATCH | 同页 BM | 同页 Chinese | 相同 | 相同 | top state 一致 | 同 T11 | LOW | 同 T11 |
| T13 | STATE MATCH CUT + TEXT MATCH | 同页 Chinese | 同页 English | 相同 | 相同 | 最后必须恢复 EN | 同 T11 | LOW | 同 T11 |
| T14 | SHARED ELEMENT | Navbar Echo Wall brand | Home hero 的 Echo Wall/headline/book | 左上 navbar | Home 上半部品牌/hero | click brand；Home 已预热；Light/EN | 6-frame brand push，cut smooth-scroll/reveal animation | LOW | 直接在 Home 已稳定状态开始下一 take |
| T15 | SCREEN MATCH + POSITION MATCH | 当前 Home hero 上方 crop | 原片实体 laptop 中的网页屏幕 | crop 居中，headline/book 占主体；trust row 在画外 | laptop screen 同中心与透视四角 | 当前 Home 100% capture；后期 crop；原 Impact 原始片段保持 | 10–14 frame perspective scale + corner pin，沿用原片 laptop → student cut | HIGH | 从 book icon 做 OBJECT MATCH 到 laptop 屏幕中心，再保留原 cut |

## 运行状态结论

| Scene group | Status | 说明 |
|---|:---:|---|
| Map / Pustaka | RISK | 代码、数据、HTTP 均 PASS；OSM tile 与实际鼠标构图需录制机复核 |
| Community question/comment | PASS with precondition | 搜索/过滤/seed comment 自动测试通过；需要预先登录且使用干净 profile |
| Study real PDF pair | PASS/RISK | 资源、关系、HTTP 文件均 PASS；原生 PDF viewer 外观需录制机复核 |
| Ask Echo | PASS | 本地 adapter 已实际执行并返回目标 action；面板构图需录制机复核 |
| I18N | PASS/RISK | 字典、菜单、rerender 逻辑存在；三语画面需录制机复核 |
| Console | NOT YET OBSERVED | 关键脚本语法/VM/现有测试无报错，但本环境无法建立可控浏览器 Console，不能声称 0 new errors |

最终脚本把所有 C/D/E 候选排除；剩余 RISK 均是录制环境或画面构图风险，不是已知功能失败。
