# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project direction

Echo Wall is a static HTML/CSS/vanilla-JavaScript campus social wall (Hash Router + Leaflet map). It intentionally has **no framework and no package manager** — do not migrate to React, Next.js, Vue, TypeScript or Vite unless explicitly approved. There is no `package.json`, no bundler and no test runner; Node is only used to run standalone scripts (`node --check`, and the seed-data scripts in `scripts/`).

The KMK Digital Twin is read-only reference material only. Echo Wall owns a lightweight static snapshot of it (`data/campus-buildings.js`, `data/kmk-knowledge-base.js`) and must never depend on the Digital Twin at runtime.

Current approved product model:

```text
Community -> Major -> Community Wall
Building Profile -> Dedicated Building Wall
```

A building wall does not require a batch/major selection. Map region redesign is deferred — do not turn Echo Wall into a navigation system.

## Commands

Run locally (do not open via `file://` — local auth uses Web Crypto and requires HTTP):

```bash
python -m http.server 8000
```

Open `http://localhost:8000/index.html` (community app) or `http://localhost:8000/map.html` (campus map).

Syntax-check all JS after any change (there is no other automated test suite):

```powershell
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Demo-seed data pipeline (`scripts/`, run with plain `node`):

```bash
node scripts/build-demo-seed-bundle.mjs        # merges data/demo-seed-showcase.v1.json + echo-wall-kmk-community-seed.v1.json -> data/demo-seed-bundle.v1.js
node scripts/reduce-kmk-demo-seed.mjs          # applies per-language/anonymity quotas to the KMK community seed
node scripts/validate-demo-seed-pustaka.mjs    # asserts data/demo-seed-pustaka.v1.json matches expected snapshot hash/counts
node scripts/validate-demo-seed-showcase.mjs   # asserts data/demo-seed-showcase.v1.json matches expected snapshot hash/counts
node scripts/validate-portable-demo.mjs        # loads demo-seed-bundle.v1.js in a VM sandbox and checks index.html/map.html reference it
```

Deployment: GitHub Pages (`.github/workflows/deploy-pages.yml`) does **not** deploy the repo directly — on push to `master` it unzips `EchoWall-portable-demo-v1.zip` into `_site` and publishes that. Any change meant to reach production must be reflected inside that zip, not just in the working tree files.

Manual test checklist after JS changes (no automated equivalent exists — perform these in a browser): duplicate HTML IDs, local asset paths, CSS structure, desktop/mobile layouts, sign-up/sign-in/sign-out, posting blocked while signed out, anonymous and named posting, building profile and building wall routes, note position persistence, every note shape, photo crop scale/fit, all three languages, original/translated toggle, light/dark/system themes, LocalStorage reload persistence, console errors.

## Architecture

### Script load order matters

Browser globals are shared across files with no module system — scripts attach to `window` and later scripts depend on earlier ones having already run. Preserve the existing `<script>` order in `index.html` and `map.html` when adding files. Order (index.html): `config/app-config.js` → i18n locale files → `i18n/index.js` → `services/theme-service.js` → `services/preferences-ui.js` → `data/campus-buildings.js` → `data/kmk-knowledge-base.js` → `services/auth-service.js` → `services/translation-service.js` → `services/cloudinary-adapter.js` → `data/demo-seed-bundle.v1.js` → `app-data.js` → `services/map-note-service.js` → `data/study-subjects.js` → `data/study-resource-manifest.js` → `services/study-resource-service.js` → `services/study-submission-service.js` → `app-admin.js` → `app-place.js` → `app-router.js` → `app-study.js` → `app-wall.js` → `services/auth-ui.js` → `services/bisheng-adapter.js` → `services/free-ai-adapter.js` → `services/ai-assistant.js`. `map.html` follows the same prefix, then loads `assets/vendor/leaflet/leaflet.js`, `features/map-note-overlay.js`, `echomap.js`.

### Module boundaries

```text
config/    app-config.js — public integration switches only (window.EchoConfig); never put private secrets here
data/      campus-buildings.js (Echo Wall-owned building snapshot), demo seed bundles/snapshots, kmk-knowledge-base.js
i18n/      index.js (locale selection/lookup) + locales/{en,ms,zh}.js
services/  replaceable provider interfaces — auth-service.js, auth-ui.js, theme-service.js, translation-service.js,
           cloudinary-adapter.js, bisheng-adapter.js, free-ai-adapter.js, ai-assistant.js, map-note-service.js,
           preferences-ui.js
app-*.js   application entry points: app-data.js (notes/state), app-admin.js, app-place.js (building directory/profile),
           app-router.js (hash router), app-wall.js (wall rendering)
echomap.js + features/map-note-overlay.js   Leaflet map page (map.html)
scripts/   Node.js maintenance scripts for the demo seed data pipeline (see Commands)
```

### Routes (hash router)

```text
#/                              Home
#/org/:orgId                    Community context selection
#/wall/:orgId/:majorId          Community wall (current) — legacy #/wall/:orgId/:batchId/:majorId
                                 replaces itself via history.replaceState, dropping batchId
#/places                        Building directory
#/place/:placeId                Building profile
#/place/:placeId/wall           Dedicated building wall
#/admin                         Prototype admin
```

Community-wall filtering requires `contextType === "community"` plus matching `orgId`/`majorId`; `batchId` is legacy metadata retained on old notes but not used for filtering. Building notes use `placeId` and never require `orgId`/`batchId`/`majorId`. Building wall keys are `building:${placeId}`; community wall keys are `community:${orgId}:${majorId}`.

### Note data model (schema version 2)

Notes carry `contextType: "community" | "building"`, shared fields (`category`, `content`, `isAnonymous`, `authorNickname`, `authorUserId`, `shape`, `color`, `rotation`, `positionX/Y`, image fields, `upvotes/downvotes/score/userVote`, `isHidden`, `createdAt`), plus `orgId/batchId/majorId` (community) or `placeId` (building). Full schema: `docs/DATA_MODEL.md`.

### Persistence (LocalStorage — this is a prototype, not a database)

```text
echo-wall-users:v1, echo-wall-user-session:v1     prototype auth (passwords hashed client-side only — not production security)
echo-wall-notes, echowall_map_notes               notes
echo-wall-language:v1, echo-wall-theme:v1         UI preferences
echo-wall-translation-cache:v1                    cached translations
```

### Integration adapters (all replaceable, all must stay secret-free)

No API secret may ever be placed in frontend JavaScript. `AuthService`, the translation endpoint, Cloudinary signing and BISHENG must all be reached through backend-provided public endpoints — see `docs/INTEGRATIONS.md` for exact request/response contracts and the `AuthService` interface (`register`, `signIn`, `signOut`, `getCurrentUser`, `isAuthenticated`) that a production provider must preserve. `EchoConfig.freeAI` in `config/app-config.js` is a separate, additional AI provider switch (`services/free-ai-adapter.js`) alongside the BISHENG bridge (`services/bisheng-adapter.js`); `services/ai-assistant.js` is the chat UI that falls back to local `CAMPUS_BUILDINGS` knowledge when no remote AI endpoint is configured.

## Working conventions

- Modify only the files relevant to the current objective; do not touch unrelated architecture or existing map regions.
- One branch = one objective (see `CONTRIBUTING.md` for branch naming patterns like `feature/production-auth`, `fix/building-wall-mobile`).
- Treat all user-generated content as untrusted and escape it before HTML rendering.
- After completing a stage, update `CHANGELOG.md`, `HANDOFF.md`, `OPTIMIZATION_LOG.md` and `CODE_AUDIT.md`, and record rollback instructions (see recent `HANDOFF.md` entries for the expected level of detail — rollback should target specific hunks, not whole-file restores, since the working tree often has overlapping uncommitted work).
- Do not run `git reset --hard`, `git clean`, or rewrite history; do not commit or push unless explicitly requested.
- `AGENTS.md` contains the full collaboration/task-execution policy (one primary objective per task, ~15–20 minute task budget, stop and report before continuing past that budget, wait for approval between stages) — follow it for task pacing and process, not just architecture.


# Mandatory Task Completion Report & Project Memory

这是 EchoWall 项目的**永久执行规则**。

每次完成任何代码修改、功能开发、Bug 修复、UI 调整、数据修改或结构调整后，Claude **必须执行以下流程**。

## 1. 每次任务结束必须生成报告

最终回复必须包含：

### Completed

* 本次实际完成了什么
* 不要写没有完成的内容

### Modified Files

逐个列出：

```text
filename
→ 修改内容 / 修改原因
```

### Testing

说明实际进行了哪些测试：

```text
Desktop
Mobile
Light Mode
Dark Mode
Language
Router
Existing Features
```

没有测试的项目必须明确写：

```text
Not verified
```

禁止把“理论上应该正常”写成“测试通过”。

### Remaining Issues

* 当前仍存在的问题
* 未完成内容
* 已知限制

如果没有：

```text
None identified.
```

### Next Step

只提出当前最合理的下一步。

不要擅自开始下一阶段。

---

# 2. 每次完成任务必须更新 Project Memory

不要只把结果写在聊天中。

在结束任务之前必须把本次修改记录写入项目文件。

至少检查并按需要更新：

```text
CHANGELOG.md
HANDOFF.md
CODE_AUDIT.md
OPTIMIZATION_LOG.md
```

## CHANGELOG.md

记录：

* 日期
* 新增内容
* 修改内容
* 修复内容
* 验证结果

---

## HANDOFF.md

这是下一次 Claude 接手项目时最重要的上下文。

必须记录：

* 当前实现状态
* 本次修改的位置
* 关键数据结构
* 关键函数 / route / component
* 当前未完成内容
* 已知风险
* 下一步应该从哪里继续
* 必要时提供 rollback boundary

目标：

即使开启新的 Claude session，也可以仅通过：

```text
CLAUDE.md
+
HANDOFF.md
```

快速理解当前状态。

---

## CODE_AUDIT.md

如果本次涉及代码逻辑或架构，记录：

* 检查过的 invariant
* 数据安全
* Router
* Storage
* Auth
* DOM / rendering
* i18n
* Theme
* compatibility
* 测试情况
* 已知技术债

不要把普通 UI 文案调整写成长篇技术审计。

---

## OPTIMIZATION_LOG.md

只有本次确实涉及：

* 性能优化
* 代码复用
* 减少 dependency
* 数据结构改善
* 重复逻辑减少
* UX 优化

才记录。

不要为了完成格式强行制造 optimization。

---

# 3. 报告必须基于真实执行结果

禁止：

```text
Assumed working
Should work
Probably works
Likely fine
```

被写成：

```text
Tested
Verified
Passed
```

只有真正运行过的测试才能写：

```text
Verified
```

例如如果没有测试 Mobile：

必须写：

```text
Mobile: Not visually verified.
```

---

# 4. 不允许遗漏记录

任务完成流程固定为：

```text
Implement
↓
Check changed files
↓
Run available tests
↓
Check regressions
↓
Update project memory files
↓
Produce final completion report
↓
Stop
```

**没有完成 Project Memory 更新，就不算任务完成。**

---

# 5. 新 Session 开始时

每次开始新的开发任务，Claude 应优先读取：

```text
CLAUDE.md
HANDOFF.md
CHANGELOG.md
```

如果涉及架构或历史技术问题，再读取：

```text
CODE_AUDIT.md
OPTIMIZATION_LOG.md
```

然后才开始修改代码。

不要依赖旧聊天上下文。

---

# 6. 防止重复开发

开始任务前检查 `HANDOFF.md` 和 `CHANGELOG.md`。

如果功能已经实现：

不要重新实现。

先检查现有实现，然后只修改用户当前要求的部分。

---

# 7. Scope Discipline

报告中必须区分：

```text
Requested
Completed
Not Completed
Future Work
```

不能因为发现其他问题就顺手扩大任务范围。

未经用户要求：

不要自动进行下一 Phase。

---

# 8. 最终回复固定格式

每次代码任务结束使用：

```text
## Completed

...

## Modified Files

- file
  → ...

## Testing

- Desktop: Verified / Not verified
- Mobile: Verified / Not verified
- Light Mode: Verified / Not verified
- Dark Mode: Verified / Not verified
- Language: Verified / Not verified
- Router: Verified / Not verified
- Existing related feature: Verified / Not verified

## Project Memory Updated

- CHANGELOG.md
- HANDOFF.md
- CODE_AUDIT.md
- OPTIMIZATION_LOG.md

只列实际更新的文件。

## Remaining Issues

...

## Next Step

...
```

完成报告以后停止。

等待用户下一条指令。
