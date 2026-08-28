# EchoWall Demo Content Seed Decisions

> 冻结日期：2026-07-26  
> 适用范围：`EchoWall_Demo_Content_Current_Package_Batch01-08.zip`  
> Package SHA-256：`8E9DAE085753CABED028ED0C3BF37D24B181458B32849FCBEFAA46B298449C04`  
> 状态：**DECISIONS FROZEN — NOT AN IMPORT APPROVAL**

## 1. 目的与边界

本文只冻结 Batch01–08 演示内容的导入决策，作为后续 snapshot、dry-run、导入和回滚实现的唯一决策契约。

本任务不执行以下操作：

- 不生成 588 条 snapshot。
- 不创建 AuthService 用户。
- 不导入便贴或写入 LocalStorage。
- 不修改 JavaScript、HTML、CSS 或数据文件。
- 不加入图片 URL、Base64 图片或虚假 Cloudinary 地址。
- 不修复前端 AI token。
- 不 commit、push 或创建 PR。

输入依据：

- `AGENTS.md`
- `docs/DEMO_CONTENT_IMPORT_READINESS.md`

`INNOSTEM_PROJECT_TASK_ROUTER_SOURCE.md` 在当前仓库（包括隐藏文件）中不存在，因此本次无法读取或应用该文件。不得根据其文件名猜测规则。

## 2. 冻结决策总表

| ID | 主题 | 冻结决定 |
|---|---|---|
| D01 | Persona | 444 个 persona 是静态 demo author，不是 AuthService 用户。 |
| D02 | Batch | Community note 的 `batchId` 固定为 `null`；内容文档 Batch 保存为 `seedBatchId`。 |
| D03 | 稳定键 | `demoSeedKey` 固定为 `batchXX\|wallKey\|noteNNN`。 |
| D04 | 数值 ID | 首次实际导入时从现有 `max(id) + 1` 开始，按全局稳定顺序确定性分配。 |
| D05 | 时间与投票 | `createdAt` 使用固定演示基准时间加全局顺序偏移；votes 全部初始化为 0/null。 |
| D06 | 照片 | 可显示图片字段保持空；只保留 `mediaRef`、`imageName`、`fit`、`cropScale` 计划。 |
| D07 | 特例 | Batch01 note 6 的 rotation 固定为 2.5°；CUBIC 保留 `internalArea` 并归入 `B_SERI_JERAI`。 |
| D08 | Ledger | LocalStorage ledger key 固定为 `echo-wall-demo-seed-ledger:v1`。 |
| D09 | Demo 标识 | 实际导入前必须有清晰、持续可见的 Demo 内容标识，不得暗示真实用户反馈。 |
| D10 | AI token | 前端 AI token 风险作为独立阻塞项记录；本任务不复制值、不修复。 |

## 3. D01 — Persona 是静态 demo author

444 个 persona 一律视为**静态演示作者资料**：

- persona ID 继续作为 seeded note 的 `authorUserId`。
- 具名 note 的 `authorNickname` 使用文档 display name。
- 匿名 note 的 `authorNickname` 固定为 `null`，但内部仍保留 persona ID。
- 每条 seeded note 必须包含 `isDemoSeed: true`。
- persona 不写入 `echo-wall-users:v1`。
- persona 不产生 email 登录、passwordHash、session、管理员角色或教育档案。
- 不调用 `AuthService.register()`，也不直接构造 AuthService 用户记录。

已拒绝方案：把 444 个 persona 转成可登录的原型账户。原因是内容包没有完整登录凭据，且该方案会制造虚假、不可维护的登录身份。

## 4. D02 — Batch 字段

### 4.1 Community notes

所有 community note：

```text
batchId: null
```

不得把 Batch06 文档中的 1/2/3 写入 KMKK community note，也不得把 KMPP/KMPK 的应用 batch ID 写入 community note。Community wall 身份只由 `orgId + majorId` 决定。

### 4.2 Seed batch

内容包来源批次保存为独立字段：

```text
seedBatchId: "batch01" ... "batch08"
```

`seedBatchId` 是小写、零补齐的字符串，不是应用 academic batch 的数值 ID。

Building note 继续使用：

```text
batchId: null
seedBatchId: "batch01" ... "batch05"
```

## 5. D03 — `demoSeedKey`

固定格式：

```text
batchXX|wallKey|noteNNN
```

规范：

- `batchXX` 与 `seedBatchId` 相同，例如 `batch01`。
- `wallKey` 使用应用实际墙键：
  - Building：`building:B_SERI_JERAI`
  - Community：例如 `community:2:4`
- `noteNNN` 使用墙内 note 序号，固定三位零补齐：`note001`–`note042`。
- 分隔符固定为 ASCII `|`。
- 不包含 display name、正文、时间戳或数值 note ID。
- 大小写必须保持规范值，不做运行时随机化。

示例：

```text
batch01|building:B_SERI_JERAI|note006
batch06|community:2:4|note001
batch08|community:4:12|note042
```

`demoSeedKey` 是幂等、更新、审计和回滚的主键。不得使用正文、作者名或墙内序号单独判断重复。

## 6. D04 — 数值 `id` 分配

数值 ID 只在首次实际导入时分配：

1. 读取现有 notes 中所有有限数值 `id`。
2. `startId = max(existing ids) + 1`；若没有现有有效 ID，则使用当前应用既有的空库起始规则。
3. 按第 7 节定义的全局稳定顺序分配：

```text
id = startId + globalOrder - 1
```

4. 把每个 `demoSeedKey -> id` 写入 ledger。
5. 重复执行必须复用 ledger 中已有映射，不能重新根据新的 `max(id)` 改号。
6. 如果 ledger 与已存在的 seeded note 映射冲突，导入必须停止，不得自动覆盖或另分配 ID。

因此，“确定性”以**首次导入时的现有数据状态 + 冻结全局顺序 + 持久化 ledger 映射**为边界；不同浏览器若原有 notes 不同，数值 ID 可以不同，但同一浏览器重复执行必须稳定。

## 7. D05 — `createdAt`、顺序与 votes

### 7.1 固定时间策略

固定演示基准时间：

```text
2026-07-26T00:00:00.000Z
```

全局稳定顺序：

1. `seedBatchId` 从 `batch01` 到 `batch08`。
2. 同一 batch 内按内容包文档中的墙顺序。
3. 同一墙内按 `note001` 到 `note042`。

`globalOrder` 为 1–588。时间计算固定为：

```text
createdAt = baseline + (globalOrder - 1) minutes
```

不得使用实际导入时钟、随机时间、文件修改时间或用户设备时区。

### 7.2 Votes

所有 seeded note 固定初始化为：

```text
upvotes: 0
downvotes: 0
score: 0
userVote: null
```

不得为演示内容制造热度、点赞或排名信号。

## 8. D06 — 照片字段

117 个照片条目目前只是媒体计划。实际导入时，可显示图片字段必须保持空：

```text
imageUrl: ""
imageDataUrl: ""
imagePublicId: ""
```

只保留以下计划元数据：

```text
mediaRef
imageName
fit
cropScale
```

字段语义：

- `mediaRef`：稳定的计划媒体引用，可使用文档资产文件名作为引用值。
- `imageName`：文档中的计划资产文件名。
- `fit`：只允许 `cover` 或 `contain`。
- `cropScale`：使用文档数值计划，范围必须保持在当前支持的 1–1.8。

计划元数据不等于图片存在。实际 UI 不得因存在 `mediaRef` 或 `imageName` 而渲染空图片框。

未来只有在照片文件、版权、人脸/隐私检查和 Cloudinary HTTPS URL 全部获批后，才能进行独立媒体导入阶段。

## 9. D07 — Batch01 特例与 CUBIC

### 9.1 Rotation

Batch01、Bangunan Seri Jerai、note 6：

```text
rotation: 2.5
```

原文 3° 不再作为导入值；2.5° 是冻结规范，不修改当前 UI rotation 上限。

### 9.2 CUBIC

CUBIC 不建立独立建筑、墙或路由：

```text
contextType: "building"
placeId: "B_SERI_JERAI"
wallKey: "building:B_SERI_JERAI"
internalArea: "CUBIC"
```

`internalArea` 作为演示内容元数据保留。所有 CUBIC notes 仍归入 Bangunan Seri Jerai building wall。

## 10. D08 — Ledger

固定 LocalStorage key：

```text
echo-wall-demo-seed-ledger:v1
```

Ledger 至少记录：

```text
version
packageHash
packageId
status
noteCount
seedBatchIds
baselineCreatedAt
startId
demoSeedKeyMap
```

冻结值与规则：

- `version: 1`
- `packageHash`：本文顶部的 ZIP SHA-256，大写或小写可在实现中统一，但比较时必须大小写不敏感且字节值相同。
- `packageId`：`echowall-demo-content-batch01-08`
- `status` 只允许实现契约定义的明确状态；只有全部 588 条验证及写入成功后才能标记为 applied。
- `noteCount: 588`
- `seedBatchIds` 固定覆盖 `batch01`–`batch08`。
- `baselineCreatedAt` 固定为第 7 节时间。
- `demoSeedKeyMap` 至少保存每个 `demoSeedKey` 对应的数值 `id`；实现可同时保存 `createdAt` 供审计。

Ledger 不是导入前备份。实际导入仍必须在 LocalStorage 之外保存导入前快照和哈希。

## 11. D09 — Demo 内容标识

实际导入前，产品必须实现并验证清晰的 Demo 内容标识：

- seeded note 必须有 `isDemoSeed: true`。
- 卡片或详情中必须持续可见地显示 Demo 标识，不能只把标识藏在内部字段。
- 至少提供以下等义文案：
  - English：`Demo content`
  - Bahasa Melayu：`Kandungan demo`
  - 中文：`演示内容`
- 墙级页面必须说明这些是虚构演示 persona 和预置内容。
- 匿名/具名样式不能让读者误以为 persona 是真实注册用户。
- 不得使用“真实学生反馈”“已验证用户评价”“真实采用”等表述。
- Demo 标识没有实现并完成三语言与移动端检查前，实际导入保持阻塞。

## 12. D10 — 前端 AI token 独立阻塞项

`docs/DEMO_CONTENT_IMPORT_READINESS.md` 已记录当前前端配置中存在看似私密的 AI token 风险。

本决策冻结如下：

- 该风险独立于演示 seed 数据转换。
- 本文不复制、转述或部分显示 token 值。
- 本任务不修改 `config/app-config.js`，也不执行撤销、轮换或 provider 配置。
- 在任何公开部署或实际演示数据导入前，该安全风险仍必须由独立任务关闭。

## 13. 后续实现的停止条件

后续 snapshot、dry-run 或实际导入发现以下任一情况时必须停止：

- persona 被写入 AuthService 或 `echo-wall-users:v1`。
- community note 的 `batchId` 不是 `null`。
- `seedBatchId`、`demoSeedKey` 或墙映射不符合本文格式。
- 数值 ID 与 ledger 映射冲突。
- `createdAt` 使用运行时随机值或本地时区。
- 任一 seeded note 带有非空图片 URL、Base64 或 public ID。
- Batch01 note 6 不是 2.5°，或 CUBIC 被建成独立墙。
- package hash 与本文不一致。
- 588 条验证未全部通过却把 ledger 标记为 applied。
- Demo 内容标识不可见、缺少三语言或暗示真实用户反馈。
- 实际导入前端 AI token 阻塞项尚未关闭。

## 14. 本阶段回滚

本阶段没有数据导入或代码变更。回滚只需删除：

```text
docs/DEMO_CONTENT_SEED_DECISIONS.md
```

不得为回滚本决策文档而修改或删除任何用户现有文件。
