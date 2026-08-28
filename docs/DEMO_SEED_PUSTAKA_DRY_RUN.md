# Batch02 B_PUSTAKA Demo Seed Dry-Run

> 验证日期：2026-07-26  
> 结果：**PASS — STATIC SNAPSHOT ONLY**  
> 本报告不是实际导入批准；未写入便贴、用户、AuthService 或 LocalStorage。

## 1. 范围与来源

- 快照：`data/demo-seed-pustaka.v1.json`
- 验证器：`scripts/validate-demo-seed-pustaka.mjs`
- 来源 ZIP：`docs/EchoWall_Demo_Content_Current_Package_Batch01-08.zip`
- ZIP SHA-256：`8E9DAE085753CABED028ED0C3BF37D24B181458B32849FCBEFAA46B298449C04`
- 来源条目：`EchoWall_Demo_Content_Current_Package_Batch01-08/02_Pustaka/EchoWall_Pustaka_Full_Visual_Seed_Spec_Batch02.md`
- 数据粒度：每行一条 Batch02、`building:B_PUSTAKA` 静态 demo note。

已读取 `AGENTS.md`、`docs/DEMO_CONTENT_IMPORT_READINESS.md` 和 `docs/DEMO_CONTENT_SEED_DECISIONS.md`。当前仓库中不存在 `INNOSTEM_PROJECT_TASK_ROUTER_SOURCE.md`，因此无法读取或应用该文件，也未根据文件名猜测规则。

## 2. 快照契约

- 42 条 note，稳定键完整覆盖 `batch02|building:B_PUSTAKA|note001`–`note042`。
- 快照不包含运行时数值 `id`；数值 ID 仍应在未来实际导入阶段按 ledger 决策分配。
- `seedBatchId` 固定为 `batch02`，`batchId` 固定为 `null`。
- 墙映射固定为：

```text
contextType: building
placeId: B_PUSTAKA
wallKey: building:B_PUSTAKA
```

- 全局顺序固定为 43–84。
- 基准时间为 `2026-07-26T00:00:00.000Z`，因此本批时间范围为：
  - 首条：`2026-07-26T00:42:00.000Z`
  - 末条：`2026-07-26T01:23:00.000Z`
- 42 个 persona 只作为静态 demo author；快照没有 email、password、passwordHash、session 或 role 字段。
- 投票字段全部为 `0`/`null`，`isDemoSeed` 全部为 `true`。
- `imageUrl`、`imageDataUrl`、`imagePublicId` 在 42 条记录中全部为空。
- 9 条照片 note 只保留 `mediaRef`、`imageName`、`imageFit` 和 `imageCropScale` 计划。

## 3. 验证范围

验证器执行以下稳定检查：

1. JSON 可解析、快照版本、来源包哈希与 Batch02 元数据。
2. 42 条记录及 42 个唯一、连续的 `demoSeedKey`。
3. 不存在运行时数值 `id`。
4. 每条记录的 `B_PUSTAKA` 墙映射、`batchId: null` 和全局顺序。
5. 42 个唯一 `demo_pustaka_NNN` 静态作者 ID。
6. 具名/匿名规则及 23/19 计数。
7. 语言分布：BM 24、English 13、中文 5。
8. 分类只使用允许值，并保持源表分布。
9. 全部 10 种 shape 和源表分布。
10. 全部 10 个颜色预设和源表分布。
11. rotation 只使用 `-2`、`-1`、`0`、`1`、`2`，并保持源表分布。
12. 每条固定 `createdAt`、零投票和 `isDemoSeed: true`。
13. 正文非空且不超过 500 字符；实际范围为 34–167 字符。
14. 42 条可显示图片字段为空；9 条媒体计划与指定 note、文件名、fit 和 scale 一致。
15. 不存在 AuthService 登录资料字段。

## 4. 实际运行

命令：

```powershell
node --check scripts\validate-demo-seed-pustaka.mjs
node scripts\validate-demo-seed-pustaka.mjs
```

实际输出：

```text
EchoWall Batch02 B_PUSTAKA demo seed dry-run
Snapshot: data/demo-seed-pustaka.v1.json
Mode: read-only validation; no runtime IDs, imports, users or LocalStorage writes
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

退出码：`0`

## 5. 结论与限制

Batch02 / `B_PUSTAKA` 静态 seed 快照通过本阶段 dry-run，可作为未来导入实现的只读输入。

本阶段没有执行应用 normalize 或浏览器/LocalStorage 导入测试，因为快照刻意不分配运行时数值 `id`，且本任务明确禁止导入和 LocalStorage 写入。实际导入仍被以下独立条件阻塞：

- 产品必须先提供清晰、持续可见的 Demo 内容标识，不得暗示真实用户反馈。
- 数值 ID 和 `demoSeedKey` 映射必须由实际导入阶段写入固定 ledger。
- 前端 AI token 风险仍是独立阻塞项；本任务未复制 token 值，也未修复配置。
- 照片只有计划元数据；不存在批准的图片 URL 或图片载荷。

## 6. 回滚

本任务没有修改应用或导入数据。回滚只删除以下三个新增文件：

```text
data/demo-seed-pustaka.v1.json
scripts/validate-demo-seed-pustaka.mjs
docs/DEMO_SEED_PUSTAKA_DRY_RUN.md
```
