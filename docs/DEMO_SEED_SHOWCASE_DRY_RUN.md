# EchoWall Batch01–08 Showcase Seed Dry Run

> 日期：2026-07-26
> 状态：**PASS — STATIC SHOWCASE DATA ONLY**
> Snapshot：`data/demo-seed-showcase.v1.json`
> Validator：`scripts/validate-demo-seed-showcase.mjs`

## 1. 范围与边界

本阶段只把 Batch01–08 内容包转换为全量静态展示数据，不接入网页、不执行导入。

- 未修改任何运行时 JavaScript、HTML、CSS 或现有数据模块。
- 未写入浏览器 LocalStorage。
- 未修改认证架构，未创建 AuthService 用户。
- 444 个 persona 仅为 snapshot 内的静态 demo author。
- 未分配运行时数值 note ID。
- 未加入图片 URL、Base64 或 Cloudinary public ID。
- 117 个媒体条目仅保留 `mediaRef`、`imageName`、`fit` 与 `cropScale` 计划。
- 未 commit、push 或创建 PR。

## 2. 输入依据

已读取 `AGENTS.md`、`docs/DEMO_CONTENT_IMPORT_READINESS.md`、`docs/DEMO_CONTENT_SEED_DECISIONS.md`、指定 ZIP，以及 ZIP 内全部 9 份 Markdown、`MANIFEST.txt` 与 `SHA256SUMS.txt`。

`INNOSTEM_PROJECT_TASK_ROUTER_SOURCE.md` 在当前仓库内不存在；精确文件搜索无结果。这与 readiness 和 seed decisions 中记录的既有缺失一致，因此本阶段没有猜测该文件内容。

来源完整性：

- ZIP SHA-256：`8E9DAE085753CABED028ED0C3BF37D24B181458B32849FCBEFAA46B298449C04`
- ZIP 条目：20；完整解压文件：20；不安全路径：0
- `SHA256SUMS.txt` 校验：19/19 PASS

## 3. Snapshot 结构

`demo-seed-showcase.v1.json` 显式包含四个集合：

| 集合 | 数量 | 用途 |
|---|---:|---|
| `walls` | 14 | 冻结墙映射、来源 Batch、顺序范围及墙级计数 |
| `notes` | 588 | 每墙 42 条静态 demo 便贴 |
| `personas` | 444 | 静态展示作者；不含邮箱、密码、session 或角色 |
| `mediaPlans` | 117 | 计划媒体引用；不代表图片已存在 |

顶层同时记录 snapshot/package 标识、内容包 SHA-256、固定基准时间、冻结 ledger key、静态 persona 模型和 8 个原始 Batch Markdown 路径。

## 4. 墙与计数

| Global order | seedBatchId | wallKey | Notes | 具名/匿名 | Media |
|---:|---|---|---:|---:|---:|
| 1–42 | `batch01` | `building:B_SERI_JERAI`（CUBIC） | 42 | 23/19 | 9 |
| 43–84 | `batch02` | `building:B_PUSTAKA` | 42 | 23/19 | 9 |
| 85–126 | `batch03` | `building:B_DEWAN_KULIAH` | 42 | 23/19 | 9 |
| 127–168 | `batch04` | `building:B_LANGKASUKA` | 42 | 23/19 | 9 |
| 169–210 | `batch05` | `building:B_BLOK_TUTORAN_MAKMAL` | 42 | 23/19 | 9 |
| 211–252 | `batch06` | `community:2:4` | 42 | 23/19 | 8 |
| 253–294 | `batch06` | `community:2:5` | 42 | 23/19 | 8 |
| 295–336 | `batch06` | `community:2:6` | 42 | 23/19 | 8 |
| 337–378 | `batch06` | `community:2:7` | 42 | 23/19 | 8 |
| 379–420 | `batch07` | `community:3:8` | 42 | 23/19 | 8 |
| 421–462 | `batch07` | `community:3:9` | 42 | 23/19 | 8 |
| 463–504 | `batch08` | `community:4:10` | 42 | 23/19 | 8 |
| 505–546 | `batch08` | `community:4:11` | 42 | 23/19 | 8 |
| 547–588 | `batch08` | `community:4:12` | 42 | 23/19 | 8 |
| **Total** | `batch01–08` | **14 walls** | **588** | **322/266** | **117** |

每墙另核对 42 个不同 `authorUserId`、BM 24 / English 13 / 中文 5、`note001`–`note042` 连续及 42 个不同 `demoSeedKey`。

## 5. 冻结规则验证

验证器检查并通过：

1. 14 墙、588 notes、444 personas、117 media plans。
2. `demoSeedKey` 严格为 `batchXX|wallKey|noteNNN`，588 个全部唯一。
3. Building/Community 的 `placeId`、`orgId`、`majorId`、`wallKey` 映射。
4. 所有 note 的 `batchId` 均为 `null`；来源保存在 `seedBatchId`。
5. 不含运行时数值 `id`；persona 不含 Auth 字段。
6. persona 引用、使用次数、具名/匿名规则。
7. 允许的 category、10 种 shape、10 种 color 与 rotation。
8. `batch01|building:B_SERI_JERAI|note006` rotation 为 `2.5`。
9. 42 条 Batch01 note 均为 `internalArea: CUBIC` 并映射到 `B_SERI_JERAI`，未建立独立墙。
10. `createdAt` 从基准按 `globalOrder - 1` 分钟偏移：第一条 `2026-07-26T00:00:00.000Z`，最后一条 `2026-07-26T09:47:00.000Z`。
11. votes 全部为 `0/null`。
12. 588 条正文均非空、不同且不超过 500 字符；实际范围 32–177。
13. `imageUrl`、`imageDataUrl`、`imagePublicId` 全部为空。
14. 117 个 media plan 与 note 一一对应，`fit` 为 `cover/contain`，`cropScale` 为 1–1.8。
15. Batch02 global order 43–84 与既有 Pustaka snapshot 的 42 条 note 逐字段一致。
16. 四个集合使用冻结 SHA-256，防止正文或映射静默漂移。

集合 SHA-256：

```text
walls       EEA3266814E4649ED0D9B65050F580627970435FD8C344EAD515C8526C7FC095
personas    823A78E92AF45BA42984CF2385D05A62BB58F227FEDD0498C3AA1A86AFE4C88A
mediaPlans  CD6292271793CFA97246D7BDE7D59FE720C11CA92C9DE01474841AA5B55B4E7E
notes       8F15966A814DAB81146FD0BC2A0145D219F18DCF8A08DA92EC81AB40BBED832D
```

## 6. 验证器结果

```powershell
node scripts\validate-demo-seed-showcase.mjs
```

```text
EchoWall Batch01-08 full showcase demo seed dry-run
Snapshot: data/demo-seed-showcase.v1.json
Mode: static validation only; no runtime IDs, imports, Auth users or LocalStorage writes
Walls: 14; notes: 588; notes per wall: 42
Keys: 588 unique
Personas: 444 unique static authors; named notes: 322; anonymous notes: 266
Media plans: 117; non-empty image payloads: 0
Global order: 1-588
CreatedAt: 2026-07-26T00:00:00.000Z to 2026-07-26T09:47:00.000Z
Content length: 32-177 characters; unique bodies: 588
Checks: 14 passed, 0 failed
RESULT: PASS
```

附加检查：

```text
node --check scripts/validate-demo-seed-showcase.mjs  PASS
ZIP source SHA256SUMS 19/19                       PASS
git diff --check                                  PASS
```

## 7. 使用限制与回滚

本 snapshot 是展示数据工件，不是导入批准。不得直接写入 `echo-wall-notes`、不得把 persona 转换为 AuthService 用户、不得因媒体计划存在而显示空图片框，也不得把内容描述为真实学生反馈。

本阶段回滚只删除：

```text
data/demo-seed-showcase.v1.json
scripts/validate-demo-seed-showcase.mjs
docs/DEMO_SEED_SHOWCASE_DRY_RUN.md
```
