# B_PUSTAKA Demo Seed Preview QA

> 日期：2026-07-26  
> 入口：`?demoSeedPreview=pustaka#/place/B_PUSTAKA/wall`  
> 实现状态：**READY FOR MANUAL BROWSER PREVIEW**  
> 浏览器自动化状态：**BLOCKED — 当前 Codex 会话没有可用的内置浏览器实例**

## 1. 实现范围

本轮实现只增加 B_PUSTAKA 的只读、非持久化预览路径：

- 仅当 `demoSeedPreview=pustaka` 存在时，使用 `fetch()` 读取 `data/demo-seed-pustaka.v1.json`。
- 42 条 seed 保存在独立、冻结的运行时数组中，只在墙视图通过 `getRuntimeNotes()` 与现有 notes 合并。
- 预览 runtime ID 从负数开始，并跳过任何现有数值 ID；不会进入正式 ID 或 ledger。
- 预览参数存在时，`loadNotes()` 强制使用只读路径，不执行 note migration、schema、building seed 或 `echo-wall-notes` 写入。
- `saveNotes()`、note store 写 API、发布入口和投票入口在预览模式下被阻止。
- 预览 seed 不进入管理员使用的持久 notes 数组，因此不能被隐藏、删除或批量管理。
- 预览 seed 的 `imageUrl`、`imageDataUrl` 和 `imagePublicId` 为空；`mediaRef` 等计划字段不会触发图片框。
- 现有 AuthService、地图、hash router 和其他建筑数据未改变。

## 2. 已执行的自动检查

### 2.1 Seed dry-run

命令：

```powershell
node scripts\validate-demo-seed-pustaka.mjs
```

结果：**PASS**

```text
Notes: 42
Keys: 42 unique
Authors: 23 named, 19 anonymous, 42 static IDs
Global order: 43-84
CreatedAt: 2026-07-26T00:42:00.000Z to 2026-07-26T01:23:00.000Z
Media plans: 9; non-empty image payloads: 0
Content length: 34-167 characters
Checks: 16 passed, 0 failed
RESULT: PASS
```

### 2.2 JavaScript 与资源

| 检查 | 结果 | 证据 |
|---|---|---|
| 仓库全部 `*.js` 的 `node --check` | PASS | 0 个语法失败 |
| `scripts/validate-demo-seed-pustaka.mjs` 语法 | PASS | `node --check` 退出码 0 |
| localhost 首页 | PASS | HTTP 200 |
| `data/demo-seed-pustaka.v1.json` | PASS | HTTP 200；`application/json`；42 条 |
| 相关 diff whitespace | PASS | `git diff --check` 无错误；只有仓库既有 LF/CRLF 提示 |

### 2.3 静态契约核对

| 要求 | 结果 | 说明 |
|---|---|---|
| 普通 URL 不调用 seed fetch | PASS（代码路径） | loader 在 `fetch()` 前检查查询参数并立即返回 |
| 指定参数使用 fetch | PASS（代码路径） | 固定读取 `data/demo-seed-pustaka.v1.json` |
| 只合并运行时视图 | PASS（代码路径） | 持久 `notes` 未加入 seed；墙视图读取 `getRuntimeNotes()` |
| 不写 LocalStorage | PASS（代码路径） | 预览参数强制 `loadNotes({readOnly:true})`；`saveNotes()` 和写 API 被阻止 |
| runtime ID 无冲突 | PASS（代码路径） | 从 `-1` 向下分配并检查现有数值 ID 集合 |
| B_PUSTAKA 之外不可见 | PASS（代码路径） | 仍使用既有 `contextType + placeId` 墙过滤 |
| 三语言 Demo 标识 | PASS（代码路径） | 每条预览卡片与模态框输出 EN/BM/中文标识 |
| 墙顶部声明 | PASS（代码路径） | 输出“这些是虚构persona和预置演示内容，不是真实学生反馈。” |
| seed 操作禁用 | PASS（代码路径） | 无投票按钮；发布和 vote handler 有只读 guard；seed 不进入 admin notes |
| 空图片框 | PASS（代码路径） | 图片 DOM 只由 `getNoteImageSource()` 的实际 URL/Data URL 触发 |

## 3. 浏览器检查状态

已按仓库浏览器流程连接一次内置浏览器；浏览器列表为空，因此没有继续重试，也没有改用其他浏览器控制后端。以下项目**未执行，不能标记为 PASS**：

- [ ] 加载前后 `localStorage.getItem("echo-wall-notes")` 原始字符串完全一致。
- [ ] 刷新和退出预览后原始字符串仍完全一致。
- [ ] 预览 URL 实际渲染 42 张 demo seed 卡片。
- [ ] 普通 URL 未请求 JSON 且不显示 demo seed。
- [ ] B_PUSTAKA 以外的墙不显示 Pustaka seed。
- [ ] DOM 中具名 23、匿名 19。
- [ ] 9 个 media plan 不生成 `.note-photo` 空框。
- [ ] 卡片、模态框和顶部说明在页面持续可见。
- [ ] 点赞、举报、删除、隐藏和管理员批量操作不可用于 seed。
- [ ] 页面和控制台没有未处理错误。
- [ ] 桌面及移动宽度下三语言 Demo 标识均可见且不溢出。

结论：**BLOCKED PENDING MANUAL BROWSER QA**。这不是隐藏失败；阻塞原因是当前自动化浏览器实例不可用，而不是测试通过。

## 4. 人工验证步骤

在仓库根目录启动静态服务器后，使用同一个浏览器标签页执行：

1. 打开普通 URL：

   ```text
   http://127.0.0.1:4173/#/place/B_PUSTAKA/wall
   ```

2. 在控制台保存原始字符串到不会写 LocalStorage 的 `window.name`，然后进入预览：

   ```js
   window.name = localStorage.getItem("echo-wall-notes") ?? "__NULL__";
   location.href = "http://127.0.0.1:4173/?demoSeedPreview=pustaka#/place/B_PUSTAKA/wall";
   ```

3. 预览加载后核对 LocalStorage、数量、作者、标识和空图片框：

   ```js
   const demoCards = [...document.querySelectorAll('[data-demo-seed-preview="pustaka"]')];
   ({
     storageUnchanged: window.name === (localStorage.getItem("echo-wall-notes") ?? "__NULL__"),
     demoCards: demoCards.length,
     named: demoCards.filter(card => !card.querySelector(".note-author")?.textContent.includes("Anonymous")).length,
     anonymous: demoCards.filter(card => card.querySelector(".note-author")?.textContent.includes("Anonymous")).length,
     emptyPhotoFrames: demoCards.filter(card => card.querySelector(".note-photo")).length,
     labelsComplete: demoCards.every(card => {
       const text = card.querySelector(".demo-seed-label")?.textContent || "";
       return text.includes("Demo content") && text.includes("Kandungan demo") && text.includes("演示内容");
     }),
     voteButtons: demoCards.filter(card => card.querySelector(".note-votes")).length,
     notice: document.querySelector(".demo-seed-preview-notice")?.textContent.trim(),
     state: window.EchoDemoSeedPreview?.getState(),
   });
   ```

   期望：`storageUnchanged:true`、`demoCards:42`、`named:23`、`anonymous:19`、`emptyPhotoFrames:0`、`labelsComplete:true`、`voteButtons:0`、state 为 `ready/42`。

4. 刷新一次并重复 `storageUnchanged` 检查。打开一条 demo note，确认模态框仍显示三语言 Demo 标识且只有只读提示，没有投票按钮。

5. 保留查询参数，切换到其他建筑墙：

   ```js
   location.hash = "#/place/B_DEWAN_KULIAH/wall";
   ```

   期望：`document.querySelectorAll('[data-demo-seed-preview="pustaka"]').length === 0`。

6. 打开不带查询参数的普通 Pustaka URL并刷新。期望 demo 卡片为 0，且 Performance/Network 中没有本次页面加载产生的 `demo-seed-pustaka.v1.json` 请求。

7. 分别在约 1440×900 和 390×844 视口检查：顶部说明、卡片三语言标签、模态框标签全部可见，无水平溢出。

8. 检查控制台没有 uncaught exception、unhandled rejection 或 seed fetch 错误。完成后执行 `window.name = ""`。

## 5. 回滚

本轮代码回滚仅撤销以下文件中的 Pustaka preview 相关局部修改，并删除本报告：

```text
app-data.js
app-router.js
app-wall.js
style-wall.css
docs/DEMO_SEED_PUSTAKA_PREVIEW_QA.md
```

不得删除或覆盖现有用户的 `echo-wall-notes` 数据。
