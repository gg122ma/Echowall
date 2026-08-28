# EchoWall Demo Content Import Readiness

> 诊断日期：2026-07-26  
> 范围：`EchoWall_Demo_Content_Current_Package_Batch01-08.zip` 与 `00_CURRENT_PROGRESS_SUMMARY.docx`  
> 工作目录：`C:\Users\LALok\Documents\EchoWall latest version\EchoWall latest version\EchoWall-Feature-Foundation`  
> 本文只做导入前诊断；未导入数据、未修改网站代码、未创建登录用户、未填写图片 URL。

## 1. 结论

**内容包完整，但当前不适合直接导入。**

- 内容完整性：**PASS**
- 墙与路由映射：**PASS**
- 便贴基础字段兼容性：**CONDITIONAL PASS**
- persona/登录账户兼容性：**BLOCKED**
- 照片可导入性：**BLOCKED（仅有槽位，没有图片或批准 URL）**
- 幂等与回滚：**BLOCKED（当前没有 Batch01–08 专用 seed ledger 或稳定 note key）**
- 总体判定：**NOT READY FOR DIRECT IMPORT**

建议下一阶段先批准一个独立的“静态 seed snapshot + 版本化导入 ledger”任务，只生成可验证的数据模块和 dry-run 校验器；不要直接把 588 条数据写进现有 LocalStorage。

## 2. 诊断依据与限制

已读取或检查：

- 根目录 `AGENTS.md`。
- ZIP 内全部 9 份 Markdown、`MANIFEST.txt`、`SHA256SUMS.txt`。
- 仓库外独立临时目录中的全部 20 个解压文件。
- 仓库中的 `00_CURRENT_PROGRESS_SUMMARY.docx`，并与 ZIP 内副本对比。
- 当前工作树中的 `app-data.js`、`app-wall.js`、`app-router.js`、`data/campus-buildings.js`、`services/auth-service.js`、`services/cloudinary-adapter.js` 与 `config/app-config.js`。

限制：

- 仓库及 ZIP 内都没有 `INNOSTEM_PROJECT_TASK_ROUTER_SOURCE.md`，因此无法应用该路由源文件；本诊断以用户指令、`AGENTS.md` 和当前代码为准。
- 本次优先使用 Markdown 作为内容数据源。DOCX 只做 ZIP/OOXML 结构、正文和摘要数字核对，没有把 8 份批次 DOCX 逐页渲染为图片；本任务不修改或交付 DOCX。
- 未执行浏览器导入、LocalStorage 写入、跨设备、性能或集成测试，因为用户明确禁止导入和修改网站代码。

## 3. 输入包完整性

### 3.1 文件与哈希

- ZIP：`docs/EchoWall_Demo_Content_Current_Package_Batch01-08.zip`
- ZIP SHA-256：`8E9DAE085753CABED028ED0C3BF37D24B181458B32849FCBEFAA46B298449C04`
- ZIP 条目：20
- 解压后文件：20
- 未压缩总字节：771,509
- 不安全条目：0（未发现绝对路径、`..` 目录穿越或符号链接）
- `MANIFEST.txt` 列出 18 个内容文件；加上 `MANIFEST.txt` 与 `SHA256SUMS.txt` 后，和实际 20 个文件完全一致。
- `SHA256SUMS.txt` 中 19 个校验值全部通过；该文件未对自身做哈希，这是正常现象。

### 3.2 DOCX

- 仓库 DOCX SHA-256：`7BEE827BA832D3951AC37CCB11D3F28FBE64C255E3AD6D9A61743FBC4ABCE634`
- ZIP 内 DOCX SHA-256：相同
- `word/document.xml` 存在并可解析。
- DOCX 表格与正文包含 14 墙、588 便贴、444 persona、117 照片槽位及 Batch01–08 明细。

## 4. 实际数量核对

以下不是引用汇总文档，而是从 8 份批次 Markdown 的完整视觉字段表逐行解析所得。

| Batch | 实际墙数 | 实际便贴 | 唯一 persona ID | 照片槽位 |
|---:|---:|---:|---:|---:|
| 01 | 1 | 42 | 42 | 9 |
| 02 | 1 | 42 | 42 | 9 |
| 03 | 1 | 42 | 42 | 9 |
| 04 | 1 | 42 | 42 | 9 |
| 05 | 1 | 42 | 42 | 9 |
| 06 | 4 | 168 | 72 | 32 |
| 07 | 2 | 84 | 72 | 16 |
| 08 | 3 | 126 | 90 | 24 |
| **合计** | **14** | **588** | **444** | **117** |

逐表验证：

- 14 面墙都正好有 42 条便贴。
- 每面墙的本地序号均完整覆盖 1–42。
- 每面墙有 42 个不同 `authorUserId`，同墙无重复作者。
- 588 条正文全部不同。
- 117 个照片资产文件名全部不同。
- 0 条便贴缺少 `authorUserId`。
- 0 条正文超过当前 500 字符限制。
- 234 个社区 persona 全部存在于 Batch06–08 的用户池，用户池声明的使用次数与实际引用次数完全一致。

### 4.1 墙映射

| 类型 | 文档映射 | 当前代码映射 | 结果 |
|---|---|---|---|
| Building | `building:B_SERI_JERAI` | `B_SERI_JERAI` + 同名 `wallKey` | PASS |
| Building | `building:B_PUSTAKA` | `B_PUSTAKA` + 同名 `wallKey` | PASS |
| Building | `building:B_DEWAN_KULIAH` | `B_DEWAN_KULIAH` + 同名 `wallKey` | PASS |
| Building | `building:B_LANGKASUKA` | `B_LANGKASUKA` + 同名 `wallKey` | PASS |
| Building | `building:B_BLOK_TUTORAN_MAKMAL` | `B_BLOK_TUTORAN_MAKMAL` + 同名 `wallKey` | PASS |
| Community | KMKK `orgId:2`, majors 4–7 | 完全一致 | PASS |
| Community | KMPP `orgId:3`, majors 8–9 | 完全一致 | PASS |
| Community | KMPK `orgId:4`, majors 10–12 | 完全一致 | PASS |

代码依据：

- 组织、batch 与 major：`app-data.js:5`–`app-data.js:53`
- 建筑 ID/wallKey：`data/campus-buildings.js:409`、`:567`、`:570`、`:734`、`:737`、`:858`、`:2216`、`:2334`、`:3489`、`:3744`
- Community route：`app-router.js:23`、`app-wall.js:188`–`app-wall.js:198`
- Building route：`app-router.js:16`–`app-router.js:17`、`app-wall.js:280`–`app-wall.js:301`

## 5. ID 与 persona 诊断

### 5.1 已有 ID

- 444 个 persona ID 全局唯一。
- Batch01–05 提供 210 个隐式 persona：每条建筑便贴有一个 `demo_*` author ID，但没有独立用户池记录。
- Batch06–08 提供 234 个显式 persona 用户池记录，并为社区便贴提供完整引用。
- Community 的 `orgId + majorId` 和 Building 的 `placeId + wallKey` 都能映射到当前代码。

### 5.2 缺失或冲突

1. **没有全局 note ID。**  
   文档中的 `No.` 只在每面墙内重复 1–42，不能直接作为当前 schema 要求的数值 `id`。

2. **没有稳定 seed key。**  
   当前记录没有 `seedPackageId`、`demoSeedKey` 或等价字段，无法安全区分“已导入”与“未导入”。

3. **缺少统一 `createdAt`。**  
   当前 UI 的“最新”排序和详情日期依赖 `createdAt`。直接省略会出现 1970 排序基准或 `Unknown date`。

4. **Batch06 的 batch 数字不可直接写入 note schema。**  
   KMKK 用户池写的是 `1/2/3`，但当前 KMKK 的合法 `batchId` 是 `4/5/6`。如果把 1/2/3 写入 `orgId:2` 的 community note，`normalizeStoredNote()` 会因 batch 与 org 不匹配而丢弃记录。Batch06 契约又说 batch 只属于用户资料，因此必须先明确：

   - community note 的 `batchId` 统一为 `null`；或
   - 将用户池中的 1/2/3 映射为应用 batch 4/5/6。

5. **persona 不等于可登录账户。**  
   Batch01–05 没有 email/passwordHash/createdAt；Batch06–08 虽有 `.invalid` 邮箱，但没有可用密码资料。直接把 444 persona 写入 `echo-wall-users:v1` 会制造不可维护的原型登录账户，并与本次“不得创建登录用户”冲突。

### 5.3 persona 方案比较

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| A. 将 persona 作为静态 demo author profile，不写入 AuthService | 不创建登录账户；便贴仍可显示具名/匿名作者；最符合安全边界 | 需要明确“seed author 不等于注册用户” | **推荐** |
| B. 创建 444 个本地 AuthService 用户 | 可让 author ID 在用户表中存在 | 需要制造密码/时间戳；`.invalid` 账户不可真实投递；扩大安全和维护风险 | 不推荐 |

后续应先修正文档措辞或验收标准：如果采用方案 A，应把“演示注册用户”改为“演示 persona/seed author”。

## 6. Schema 兼容性

| 字段/行为 | 结果 | 说明 |
|---|---|---|
| `schemaVersion: 2` | 可补充 | 文档未逐条写出，但当前 normalize 固定为 2。 |
| `contextType` | PASS | Building/Community 契约与当前代码一致。 |
| `placeId` / `wallKey` | PASS | 5 个建筑均存在。 |
| `orgId` / `majorId` | PASS | 9 个社区墙均存在。 |
| `batchId` | PARTIAL | Batch07/08 正确；Batch06 有 1/2/3 与 4/5/6 冲突。 |
| `category` | PASS | 588 条全部属于 `academic/koko/campus_life/emotional`。 |
| `shape` | PASS | 10 种形状全部由当前 `SHAPES` 支持。 |
| `color` | PASS | 10 个颜色值与 `NOTE_COLOR_PRESETS` 完全一致。 |
| `rotation` | PARTIAL | 587 条可按文档显示；Batch01 note 6 为 3°，当前 UI 会截成 2.5°。 |
| `content` | PASS | 无重复，均不超过 500 字符；渲染使用 `escapeHtml()`。 |
| `isAnonymous` / `authorNickname` | PASS | 文档可转换为匿名 `null`、具名 displayName。 |
| `authorUserId` | PARTIAL | 便贴都有 ID，但不应自动转为登录用户。 |
| `id` | BLOCKED | 文档没有全局数值 ID。 |
| `createdAt` | BLOCKED | 文档没有逐条时间戳。 |
| vote/score 字段 | 可补充 | 应确定性初始化为 0/null，不应伪造热度。 |
| `imageName/imageFit/imageCropScale` | PASS | 当前 schema 支持，scale 范围 1–1.8。 |
| `imageUrl/imageDataUrl` | BLOCKED | 117 个槽位中实际图片为 0，批准 URL 为 0。 |
| `internalArea: CUBIC` | PARTIAL | 可作为附加字段被对象展开保留，但不是当前一等 schema/UI 字段。 |
| `isDemoSeed` | PARTIAL | note normalize 会保留附加字段，但当前没有正式 seed registry。 |

代码依据：

- note normalize 与图像限制：`app-data.js:180`–`app-data.js:236`
- LocalStorage load/save：`app-data.js:282`–`app-data.js:375`
- 分类和形状：`app-data.js:131`–`app-data.js:137`
- 颜色预设、图片大小：`app-wall.js:1`–`app-wall.js:18`
- rotation 显示截断：`app-wall.js:417`–`app-wall.js:418`
- 发布字段：`app-wall.js:782`–`app-wall.js:820`
- 本地用户 schema：`services/auth-service.js:1`–`services/auth-service.js:143`

## 7. 照片诊断

- 117 是**照片槽位数**，不是现有照片数。
- ZIP 内没有 WebP/JPEG/PNG 资产，也没有批准的 Cloudinary HTTPS URL。
- 当前 Cloudinary 配置为空；`CloudinaryAdapter` 在未配置时会回退到 Base64 LocalStorage。
- 若 117 张照片都按 450 KB 上限存为本地数据，理论上可达到约 51.4 MiB，明显不适合作为 LocalStorage 导入方案。

导入前规则：

1. 照片未批准时，`imageUrl`、`imageDataUrl`、`imagePublicId` 必须为空。
2. 可以保留 `imageName`、`imageFit`、`imageCropScale` 作为资产计划元数据，但 UI 不应显示不存在的照片。
3. 只有经过批准的 `res.cloudinary.com` HTTPS URL 才能进入 `imageUrl`。
4. 在 Cloudinary backend signature endpoint 可用前，不批量导入照片。

## 8. 幂等方案

### 8.1 方案比较

| 方案 | 幂等 | 已有安装 | 回滚 | 结论 |
|---|---|---|---|---|
| A. 独立静态 snapshot + versioned seed ledger | 可按稳定 key upsert | 可增量应用 | 可按 package/batch 精确删除 | **推荐** |
| B. 直接追加到 `SEED_NOTES`/`SEED_BUILDING_NOTES` | 仅空 LocalStorage 或现有 building boolean 生效 | 不可靠 | 只能粗粒度处理 | 不推荐 |
| C. 一次性 DevTools/LocalStorage 脚本 | 单设备可执行 | 不可跨设备复现 | 易覆盖用户数据 | 不推荐 |

### 8.2 推荐契约

后续实现至少需要：

- `seedPackageId`：固定绑定本 ZIP SHA-256。
- `demoSeedKey`：例如 `batch01|building:B_SERI_JERAI|note:001`。
- `seedBatchId`：导入包批次 01–08，与应用的 academic `batchId` 分开。
- `isDemoSeed: true`。
- 版本化 ledger，例如 `echo-wall-demo-seed-ledger:v1`，记录 package hash、每批状态、计数与 `demoSeedKey -> numeric note id` 映射。

规则：

1. 第一次导入只为不存在的 `demoSeedKey` 分配无冲突数值 ID。
2. 重复执行按 `demoSeedKey` upsert，不按正文、显示名或墙内序号判断。
3. 先在内存完成 588 条 normalize 和全部计数验证，再写 LocalStorage。
4. 写入失败时恢复导入前快照；不能留下 notes/users 两个 key 的半完成状态。
5. 当前 444 persona 不写入 AuthService；如未来另有明确批准，再单独设计账户迁移。

## 9. 风险

| 等级 | 风险 | 影响 | 处理 |
|---|---|---|---|
| Critical | `config/app-config.js` 当前包含一个看似私密的前端 AI token | 违反仓库“不得在前端放私密凭据”的规则；可能泄露或被滥用 | 在任何公开部署前撤销/轮换并移除；本文不复制 token 值 |
| High | 无全局 note ID、稳定 seed key、package ledger | 重复执行会产生重复或碰撞 | 先实现推荐幂等契约 |
| High | 444 persona 与 AuthService 登录用户模型不匹配 | 可能制造虚假/不可登录账户 | 采用静态 demo author profile |
| High | Cloudinary 未配置且图片回退 LocalStorage | 批量照片会触发配额和跨设备失败 | 图片保持空；配置签名上传后另做阶段 |
| Medium | Batch06 batch 1/2/3 与 KMKK 合法 4/5/6 冲突 | 记录可能在 normalize 时被丢弃 | 明确为 null 或做 4/5/6 映射 |
| Medium | 约 70 条中文便贴会触发当前 legacy Chinese migration 检查 | 未在旧映射表中的中文会在每次 load 时触发额外 LocalStorage 重写 | 导入前修正 migration 的版本门槛/命中条件 |
| Medium | LocalStorage 是单浏览器、单设备数据 | 无跨设备同步；新设备会独立 seed | 明确原型限制；生产需后端 |
| Medium | 588 条记录会在每次 load 时整体 parse/normalize/save | 启动和存储成本尚未测量 | 导入阶段做桌面/移动性能测试 |
| Low | Batch01 note 6 的 3° 被截成 2.5° | 与视觉规格不完全一致 | 批准改为 2°/2.5°，或调整 UI 上限 |
| Low | 缺少逐条 createdAt 与初始 vote policy | 排序和日期不确定 | 使用公开、确定性、非伪造的 seed 时间策略；vote 全部为 0 |

## 10. 回滚方案

未来任何导入任务开始前：

1. 导出并哈希以下 key 的原始值：
   - `echo-wall-notes`
   - `echo-wall-users:v1`
   - `echo-wall-schema-version`
   - `echo-wall-building-seed:v1`
   - 新增的 demo seed ledger
2. 快照必须保存在 LocalStorage 之外；现有 `echo-wall-notes-backup:v1` 只服务 schema migration，不能作为本包唯一回滚。
3. 导入后验证 14/588/444/117 以及每墙 42 条，再标记 ledger 为 applied。
4. 精确回滚只删除同时满足以下条件的记录：
   - `isDemoSeed === true`
   - `seedPackageId` 与本包 hash 一致
   - `demoSeedKey` 属于目标 batch
5. 不得仅按 `isDemoSeed`、displayName、正文或数值 ID 粗删。
6. persona 若未来独立存储，只删除不再被任何剩余 note 引用的本包 persona。
7. 任一步验证失败，恢复全部导入前 key 原文，并再次核对 hash。

## 11. 导入前必须关闭的阻塞项

- [ ] 决定 persona 是静态 demo author，还是另行批准创建账户；本报告推荐前者。
- [ ] 定义全局 `demoSeedKey`、数值 ID 分配与 package ledger。
- [ ] 决定逐条 `createdAt` 的确定性策略，vote/score 统一为 0/null。
- [ ] 解决 Batch06 batch 1/2/3 与 4/5/6 的映射。
- [ ] 处理 Batch01 note 6 的 rotation 3°。
- [ ] 修正 legacy Chinese migration 对新中文内容的重复写入行为。
- [ ] 撤销/轮换并移除当前前端 AI token。
- [ ] 明确照片保持空；不得使用虚假 URL 或相对路径。
- [ ] 完成 dry-run：0 写入、588 条 normalize、14 墙和所有引用检查通过。
- [ ] 完成实际导入后的刷新、重复执行、移动端、LocalStorage 配额、页面性能与回滚测试。

## 12. 本次未执行

- 未导入任何便贴或 persona。
- 未修改 `app-data.js`、`app-wall.js`、AuthService 或其他网站代码。
- 未创建登录用户。
- 未填写图片 URL、Base64 占位或 Cloudinary 假链接。
- 未 commit、push 或创建 PR。
- 未更新 `CHANGELOG.md`、`HANDOFF.md`、`CODE_AUDIT.md`、`OPTIMIZATION_LOG.md`，因为用户要求本次唯一新增文件为本报告。
