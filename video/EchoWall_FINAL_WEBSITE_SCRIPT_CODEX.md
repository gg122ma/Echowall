TOTAL TARGET:
130 sec

VOICEOVER WORD COUNT:
144

ESTIMATED VO TIME:
60–62 sec at 140–145 wpm

# 使用说明

- 本文件只设计已锁定 Idea 与 Impact 之间的网站介绍段，不修改两者内容。
- Website segment 从自己的 `00:00` 起算，最终在 `02:10` 交给原 Impact 镜头。
- 第一项网站功能固定为 Echo Map。
- 录制基线：1920×1080、60fps capture、browser zoom 100%、Light、English、本地 HTTP server。
- 最终输出可按原片 30fps timeline 剪辑。
- 所有 raw clip 都遵守：2 秒稳定开头 → 动作 → 真实可见结果 → 所需结束状态 → 2 秒稳定结尾。
- Cursor 在每个 raw clip 的开头/结尾停在无按钮、无文字的空白区；click 前停 0.35–0.5 秒，结果后停 0.8–1.5 秒。
- 输入只现场打 3–5 个字符，其余 paste；剪掉长输入过程。
- 切掉 loading、blank tab、file picker、PDF viewer 初始化和 route reveal 抖动。
- 不使用 generic fade。

# Master Table

| Timecode | Duration | Route/Page | Exact UI | Action | Visible Result | VO | On-screen Text | Transition In | Transition Out |
|---|---:|---|---|---|---|---|---|---|---|
| 00:00–00:04 | 4s | `map.html` | `Echo Map KMK`、KMK campus、`Fit campus` | 当前 Map 先在 Idea 结尾设备屏幕内出现，再扩至全屏 | 当前网站真实 Map 成为网站段第一画面 | — | 无新增字；保留原品牌语言 | T0 STATE MATCH + UI PANEL EXPANSION | 连续到 Map action |
| 00:04–00:20 | 16s | `map.html` | `#fit-campus`、Pustaka footprint/list card、Pustaka Preview、hours toggle、`More details` | Fit；选 Pustaka；展开时间；收起；点 More details | Campus fits；Pustaka 高亮；Sunday–Thursday 08:00–16:30 可读；进入详情 | “EchoWall begins where campus questions happen: on the map. Students can fit the whole campus, choose a building, and check structured opening hours before they move.” | `PLACE`，1.2s，原片粗窄字体，小尺寸 | Map action 连续剪辑 | T1 SHARED ELEMENT / POSITION MATCH |
| 00:20–00:34 | 14s | `#/place/B_PUSTAKA` | Pustaka H1、实景图、Purpose、Opening Hours、`Enter Wall` | 稳定展示 top；单向 scroll；在 motion 中 cut 到 wall CTA；点击 | 真实地点照片与实用信息；进入地点墙 | “The same place opens into a profile with real photos, practical guidance, and a wall for location-based knowledge.” | `PLACE-BASED KNOWLEDGE`，1.5s | T1 title/icon match | T2 SCROLL CONTINUITY + TEXT MATCH |
| 00:34–00:45 | 11s | `#/place/B_PUSTAKA/wall` | Pustaka Wall、蓝色 rounded note：`Saya guna teknik 45 minit belajar...` | 一次短向下滚动；打开目标 note | note 以 `#BFDBFE` rounded modal 居中；地点知识有具体内容 | — | 无新增字 | T2 title match | T3 exact CARD/STATE MATCH |
| 00:45–00:52 | 7s | `#/community/all` | 同色同形 modal：`Best quiet study spot?`；关闭后露出 `All KM Students` | match cut；停 0.8s；关 modal | 视野从单一地点自然扩到全校墙 | “Across All KM Students, questions can be narrowed and searched, then answered in context.” | `PEOPLE`，1.2s，在关闭 modal 后出现 | T3 CARD MATCH | 连续到 filter/search |
| 00:52–01:10 | 18s | `#/community/all` | Questions filter、Search、`Calculus revision group` question、comments composer | 点 Questions；输入/粘贴 query；开目标 question；提交指定评论 | 搜索唯一结果；新评论即时出现在 thread；文字中出现 `SM015` | “A useful reply becomes a direct path to the learning material behind it.” | `QUESTION → USEFUL REPLY`，不超过 1.5s | Community 连续操作 | T4 TEXT MATCH on `SM015` |
| 01:10–01:18 | 8s | `#/study` → `#/study/resource/study_ef439e254b209e14981f` | `#study-search-input`、exact result、Resource Detail metadata | query 从 `SM015` 扩为完整 title；点唯一 result | Detail 显示 subject、semester、type、year、source、verification | “Echo Library searches real resources by subject code. Each detail page preserves the year, type, source, and verification status,” | `LEARNING`，1.2s | T4 text/position match | T5 shared title → T6 PDF expansion |
| 01:18–01:27 | 9s | Question Resource Detail → native PDF tab | `Open PDF`、SM015 question PDF page 1 | 点 Open PDF；cut loading；稳定在 page 1 | 真实 Ministry/SM015/2023–2024 question paper 可读 | “then opens the actual question paper” | `REAL QUESTION PAPER`，1.2s | T6 UI PANEL EXPANSION | T7 `SM015` TEXT MATCH |
| 01:27–01:43 | 16s | Question Detail → Scheme Detail → native PDF tab | `Related Answer Scheme`、scheme metadata、`Open PDF`、handwritten page 1 | 关 question tab；点 related scheme；开 PDF；稳定展示红/蓝手写解答 | reciprocal link 和真实 answer scheme 都有可见结果 | “and its linked answer scheme.” | `LINKED ANSWER SCHEME`，1.5s | T7 text/card match；T8 page expansion | T9 red circle → Ask launcher OBJECT MATCH |
| 01:43–01:57 | 14s | Scheme Detail overlay → `#/place/B_PUSTAKA` | Ask Echo launcher/panel、suggestion `Where is the library?`、reply、`View details` | 关 PDF tab；点 Ask；点 suggestion；等待/切掉 delay；点 View details | local answer 显示 Library、hours；动作打开 Pustaka Detail | “For quick campus guidance, Ask Echo responds from a local knowledge base and links the answer back to the relevant place.” | `LOCAL CAMPUS KNOWLEDGE`，1.5s | T9 OBJECT MATCH + panel expansion | T10 shared `Library/Pustaka` |
| 01:57–02:06 | 9s | `#/place/B_PUSTAKA` | Navbar language menu；同一 Pustaka top state | EN → BM → Chinese → EN；每态稳定约 1 秒 | 同一页面布局中 label/description 实际切换；最终恢复 English | “The same journey is available in English, Bahasa Melayu, and Chinese.” | 无新增字；让 native `EN / BM / 中文` 可见 | T10 shared element | T11–T13 STATE/TEXT MATCH；T14 brand match |
| 02:06–02:10 | 4s | `#/` Home hero crop → 原 Impact footage | Echo Wall brand、hero headline/book；原实体 laptop screen | 点 brand；cut reveal；只取 hero 上方；corner-pin 进入原 laptop | 当前网站变成真实使用场景中的 laptop，随后进入锁定 Impact | “One campus, one practical path from place, to people, to learning.” | 无新增字 | T14 SHARED ELEMENT | T15 SCREEN/POSITION MATCH → existing Impact |

# SCENE 1 — MAP TO PLACE TO PLACE-BASED WALL

## PURPOSE

用一条不返回 Home 的真实路径证明：EchoWall 不只是“有地图”，而是把校园位置、开放时间、地点资料和对应的地点墙连接起来。

## COMPETITION FUNCTION

Practical & Usability：地点选择产生结构化、可行动的信息，并能进入同一地点的社区记忆。

## ROUTE

`map.html` → `index.html#/place/B_PUSTAKA` → `#/place/B_PUSTAKA/wall`

## START STATE

- 本地 HTTP server 已运行。
- 1920×1080，Light，English，100% zoom。
- OSM tiles 已完整加载并缓存；Map 在 KMK，非 KMK switch 不动。
- Map 没有打开建筑 Preview；`Fit campus` 可见。
- Pustaka Detail、Pustaka cover、Pustaka Wall 已分别预热过一次。
- Pustaka Wall 目标 note 已定位：rounded、`#BFDBFE`，内容以 `Saya guna teknik 45 minit belajar...` 开始。
- Cursor 在 Map 右上无建筑、无 control 的空白处。

## EXACT RECORDING STEPS

1. 录 Map clean state 的 2 秒稳定 handle；该画面同时作为 T0 进入后的完整全屏结果。
2. Cursor 移到 `Fit campus`，停 0.4 秒，点击；等待地图 ease 完整结束，再停 1 秒。
3. 点击 Pustaka footprint；若 footprint 命中在录制机上不稳定，点击 sidebar 的 `Pustaka (Perpustakaan)` card。
4. 等 Preview 完整出现 1 秒；让 Pustaka 名称、Library 类别/zone 和 note count 可读。
5. 点击 hours row，展示 Sunday–Thursday 08:00–16:30 与 Friday/Saturday Closed；保持 1.5 秒。
6. 再点一次收起 hours，停 0.5 秒；点击 `More details`。
7. 剪掉文档跳转/加载；从 Pustaka Detail top 的 2 秒稳定 handle 进入。先让 H1、真实 cover photo、purpose 与 opening-hours block 同时可辨认。
8. 做一次连续向下 scroll。录完整 motion，但在后期从 purpose/hours 直接切到靠近底部的 Wall CTA，不停留在空 Events 区。
9. `Pustaka (Perpustakaan) Wall` 与 `Enter Wall` 稳定 1 秒；点击 `Enter Wall`。
10. 剪掉 route transition。Pustaka Wall 加载后，cursor 放到墙纸空白；稳定 2 秒。
11. 单向向下滚动一次，把目标蓝色 rounded note 放到中间安全区；停 0.5 秒，点击。
12. Modal 完成后保持至少 2 秒；cursor 移到 overlay 左上空白，不能遮住 note 内容。

## WHAT MUST BE VISIBLE

- `Echo Map KMK` 与 `Fit campus`。
- Pustaka 被实际选择，而不是后期贴图。
- Sunday–Thursday 08:00–16:30。
- Pustaka 真实建筑照片、Purpose/Opening Hours 的至少一个完整结果。
- `Enter Wall` click 后真实进入 Pustaka Wall。
- 目标 modal 的蓝色 `#BFDBFE`、rounded 形状和首行文字。

## WHAT MUST NOT BE VISIBLE

- Admin、moderation、roles、approval 或相关字样。
- 未加载的灰色 Map tiles、tile error、非 KMK empty framework。
- Map posting composer、location posting、Auth dialog。
- 不放大或口播 sidebar 的 focus-building 数量；当前 description 的“fourteen”与 19 个 Preview 配置不一致。
- Building Events 的 empty state 长时间停留。
- Building Reviews；当前没有该功能。
- 在 Wall 上来回滚动、滚动条抖动或 cursor 抢画面。

## VOICEOVER

> EchoWall begins where campus questions happen: on the map. Students can fit the whole campus, choose a building, and check structured opening hours before they move. The same place opens into a profile with real photos, practical guidance, and a wall for location-based knowledge.

## ON-SCREEN TEXT

- `PLACE`：00:06 左右，1.2 秒。
- `PLACE-BASED KNOWLEDGE`：Pustaka Detail top，1.5 秒。
- 用原片粗窄全大写字体、off-white/gold；不改变网站本身样式。

## CURSOR PLAN

- 入口/结尾均在空白区域。
- 只突出 5 个有结果的 click：Fit、Pustaka、hours、More details、Enter Wall、note。Pustaka 选择视为一次；不要多点 footprint。
- Cursor motion 采用短直线或轻弧线；click 前 0.4 秒，结果后至少 0.8 秒。

## SCROLL PLAN

- Map Preview 内不滚；所有重要信息应通过稳定 capture state 放在可见区。
- Detail 只向下滚一次；在 scroll motion 中删掉经过 empty Events 的中段。
- Wall 只向下滚一次；目标 note 一到中心就停止。

## RAW RECORDING LENGTH

建议 82–95 秒，分为 3 条 raw clips：Map 32–36 秒、Pustaka Detail 26–32 秒、Pustaka Wall 24–27 秒。每条都含 2 秒前后 handle。

## FINAL EDIT LENGTH

45 秒：Map entry/interaction 20 秒；Place Detail 14 秒；Wall 11 秒。

## TRANSITION IN

T0 — STATE MATCH CUT + UI PANEL EXPANSION。

- Outgoing：锁定 Idea 结尾的 EchoWall 设备/品牌屏幕。
- Incoming：已加载的当前 Map clean state。
- Edit：当前 Map 先被 corner-pin 到设备屏幕四角，再于 10–14 frames 扩为全画幅。
- Fallback：EchoWall logo text match 到 `Echo Map KMK` header。

## TRANSITION OUT

T3 — exact CARD/STATE MATCH。

- Outgoing：Pustaka modal，rounded、`#BFDBFE`、居中。
- Incoming：All Student `Best quiet study spot?` modal，同 rounded、同 `#BFDBFE`、同中心尺度。
- Edit：2–4 frames hard match；背景和内容改变，卡片轮廓不动。
- Fallback：若本地用户数据影响排序，录前按目标文本查找并开 modal；不要改 seed。

## EXACT END FRAME

Pustaka note modal 完全稳定，modal 外轮廓占画面中心约 55–65% 宽；关闭按钮清楚但 cursor 不在其上；蓝色背景与 rounded corner 可见。

## NEXT EXACT START FRAME

All KM Students 的 `Best quiet study spot?` modal 完全稳定；同样的中心、尺度、rounded corner 与蓝色 `#BFDBFE`；cursor 同样停在 overlay 左上空白。

## FAIL CONDITIONS

- OSM tiles 未加载、Fit 没有产生明显地图重构图。
- 选错建筑或开放时间不是 Pustaka 的 08:00–16:30。
- Pustaka 照片 broken/fallback。
- scroll 停在 `No current events` / `No upcoming events`。
- `Enter Wall` 后不是 Pustaka Wall。
- modal 目标颜色/shape 与下一 scene 不匹配。
- 任何 Admin 或 moderation 内容进入画面。

# SCENE 2 — ALL KM STUDENTS QUESTION TO USEFUL REPLY

## PURPOSE

从地点墙自然放大到全校墙，并用真实 Filter、Search、Question Detail 和 Comment result 证明 Community 是可互动的，不只是预填卡片。

## COMPETITION FUNCTION

Practical & Usability：学生可以在全校内容中缩小范围、定位问题并给出可见回复；回复中的 subject code 成为下一步学习检索入口。

## ROUTE

`#/community/all`

## START STATE

- 使用专用干净 browser profile；已通过正常 Auth 流程预先登录，但不在成片展示 Auth/Profile。
- All KM Students 为默认稳定 seed；没有额外本地 notes 改变目标卡片。
- 准备两个独立 capture state：
  1. `Best quiet study spot?` modal 已打开，用于 T3 incoming；
  2. `Calculus revision group` 搜索前的 All Student clean wall。
- 若同一录制需要重拍评论，复制一份新的干净 profile；不要在成片里删除/管理评论。
- 指定评论文本：`For SM015, I’m free after 8 — let’s compare methods.`

## EXACT RECORDING STEPS

1. 在录制前用 All Student Search 找到 `Best quiet study spot?`，打开 modal，再开始 raw clip；保留 2 秒稳定 handle。
2. T3 match 进入后停 0.8 秒，点击右上 close；等待 body scroll lock 解除并露出 `All KM Students` header。
3. Cursor 放空白 0.5 秒；点击 Post Type 的 `Questions` filter，等待墙面重排后停 0.8 秒。
4. 点击 Search；只打 `Calc`，paste `ulus revision group`；剪掉 paste 中段，保留结果收敛。
5. 确认唯一目标 question 在首屏，停 0.5 秒后点击。
6. Question modal 完整出现；让 `Question · Open` badge 和题目文字可读，但不要尝试 `Mark as solved`。
7. 点击 comment textarea；只打 `For S`，paste 其余文本；不要勾选 Show name，避免个人资料进入画面。
8. Cursor 放到空白 0.4 秒，再点击 `Send`。
9. 等 CommentService 更新 modal；必须看到新评论完整出现、comments count 更新，保持至少 2 秒。
10. 结束构图把评论中的 `SM015` 放在画面中下部可 crop 区，cursor 移到 modal 外空白。

## WHAT MUST BE VISIBLE

- 关闭 match modal 后的 `All KM Students`。
- `Questions` filter 的 active state 和墙面重排结果。
- Search 从多帖收敛到 `Calculus revision group`。
- Question/Open badge。
- `Send` 后的新评论，不是只展示 textarea 里的未提交文字。
- 新评论中的 `SM015`。

## WHAT MUST NOT BE VISIBLE

- 登录、注册、Profile、Admin、moderation。
- 对 seed post 点 Agree/Disagree；seed vote 是只读显示。
- `Mark as solved` click；普通用户不能解决 seed question。
- 伪造 solved badge 或旧稿中的 solved 结果。
- 重复测试评论、个人 email/nickname、其他录制残留。
- image sticky 或临时造图帖子。

## VOICEOVER

> Across All KM Students, questions can be narrowed and searched, then answered in context. A useful reply becomes a direct path to the learning material behind it.

## ON-SCREEN TEXT

- `PEOPLE`：关闭第一张 modal、露出 All KM Students 后 1.2 秒。
- `QUESTION → USEFUL REPLY`：评论发送前后 1.5 秒。

## CURSOR PLAN

- modal 开始/结束时 cursor 均在 overlay 空白。
- close → Questions → Search → target card → comment field → Send，是唯一 click 路径。
- 不 hover vote；不经过用户头像/昵称。

## SCROLL PLAN

- Wall 不做自由浏览；Search 结果应在首屏。
- Modal 内如果 comment composer 不在首屏，只向下滚一次；录前固定 viewport 使新评论和 `SM015` 可见。
- 发送后不反向滚动；以结果静止帧结束。

## RAW RECORDING LENGTH

建议 50–60 秒，分 2 条 raw clips：match modal 10–14 秒；filter/search/question/comment 40–46 秒。每条含 2 秒前后 handle。

## FINAL EDIT LENGTH

25 秒：modal match/reveal 7 秒；filter/search/comment 18 秒。

## TRANSITION IN

T3 — 同色同形 CARD MATCH；参数见 Scene 1 Transition Out。

## TRANSITION OUT

T4 — TEXT MATCH。

- Outgoing：已提交评论中的 `SM015`。
- Incoming：Echo Library search input 中完整 query 的开头 `SM015`。
- Bounding concept：后期 crop 把 outgoing `SM015` 移到上中部；incoming search input 本来就在上中部。
- Edit：6–10 frames 轻 scale/position match，剪掉 paste；加一次短铅笔划线声。
- Fallback：使用同字体风格的 `SM015` on-screen text 作 6-frame bridge，再切 Search field。

## EXACT END FRAME

Question modal 的 comments 区稳定；新评论已经落入 thread；`SM015` 清楚、没有 selection highlight；comments count 已更新；cursor 在左侧 overlay 空白。

## NEXT EXACT START FRAME

`#/study` 的 `#study-search-input` 在上中部；字段显示以 `SM015` 开头的完整 title，搜索结果已经稳定出现；cursor 在 search field 右侧空白。

## FAIL CONDITIONS

- Search 不是唯一命中目标 question。
- Send 后评论未进入 thread，或只看到未提交 textarea。
- 弹出 Auth dialog。
- seed vote 被点击。
- 尝试 solved，出现 permission/toast 或无结果。
- `SM015` 被 modal crop/scroll 遮住，无法 text match。
- Comment thread 有明显重复录制内容。

# SCENE 3 — ECHO LIBRARY REAL QUESTION AND LINKED SCHEME

## PURPOSE

用当前仓库里的真实 SM015 资源完成最强 prototype 证明：搜索不是装饰，详情不是占位，Question 与 Scheme 的关系可追踪，文件确实能打开。

## COMPETITION FUNCTION

Practical & Usability：从 Community 的 subject code 直接定位学习资源；真实元数据和实际文档降低寻找资料的时间成本。

## ROUTE

`#/study` → `#/study/resource/study_ef439e254b209e14981f` → native PDF tab → `#/study/resource/study_198f7e13702317aa00cd` → native PDF tab

## START STATE

- 两个 PDF 已分别在当前浏览器通过 HTTP 打开一次，避免首次载入延迟。
- Browser 允许本地站点打开新 tab；PDF viewer zoom 固定，sidebar/thumbnails 关闭，页面居中。
- Question query：`SM015_Matematik 1_sesi 2023_2024`。
- Question page 1 和 Scheme page 1 均确认无 broken glyph、无 download error。
- 原生 browser chrome 尽量不录；若必须录全屏，关闭 bookmarks bar、downloads shelf、扩展提示和通知。

## EXACT RECORDING STEPS

1. 从已稳定的 Study Search state 开始 raw clip；保留 2 秒 handle。若需重录输入，现场打 `SM015` 后 paste `_Matematik 1_sesi 2023_2024`，剪掉中段。
2. 确认结果标题精确为 `SM015_Matematik 1_sesi 2023_2024`；停 0.5 秒，点击。
3. Resource Detail 稳定后保留 1.5–2 秒；让 Subject、Semester、Type、Year、Source、Verification 至少四项可读。
4. 点击 `Open PDF`；切掉新 tab blank/loading，直接进入稳定的 Question page 1。
5. 保持 page 1 约 2 秒，让 `SM015`、Matematik 与 2023/2024 可辨；不快速 scroll。
6. 关闭 PDF tab，返回原 Question Detail 的相同 scroll state；不要在成片显示关闭 tab 的鼠标路径。
7. 对准 `Related Answer Scheme` card/title；停 0.5 秒，点击。
8. Scheme Detail 稳定后保留 title、type/year/source 至少 1 秒；点击 `Open PDF`。
9. 切掉 viewer loading；稳定展示手写 Scheme page 1 约 3 秒。
10. 为 T9 准备 ending take：保持题目页内容可读，同时把一处红色圈注保留在可后期 crop/reframe 的右侧安全区；cursor 放 viewer 灰色空白。

## WHAT MUST BE VISIBLE

- Exact title search result。
- Question Resource Detail 的真实 metadata。
- Question PDF page 1 的 `SM015`、Matematik、2023/2024。
- `Related Answer Scheme` 的真实可点击关系。
- Scheme Resource Detail。
- Scheme PDF page 1 的手写解题内容与红/蓝标记。

## WHAT MUST NOT BE VISIBLE

- 文件系统本地私有路径、Downloads shelf、browser permission prompt。
- Study Upload、file picker、Admin approval、moderation queue。
- `Unavailable` resource 或 broken PDF。
- 将全局 filter 说成 Jurusan/Semester/Resource Type；当前全局实际为 Year/Source/Sort。
- 快速滚过 PDF、展示太小而不可读、停在空白页。
- 非 PDF 下载 UI。

## VOICEOVER

> Echo Library searches real resources by subject code. Each detail page preserves the year, type, source, and verification status, then opens the actual question paper and its linked answer scheme.

## ON-SCREEN TEXT

- `LEARNING`：search result 进入 Detail 时 1.2 秒。
- `REAL QUESTION PAPER`：Question PDF 稳定后 1.2 秒。
- `LINKED ANSWER SCHEME`：Scheme PDF 稳定后 1.5 秒。

## CURSOR PLAN

- Search state 开头 cursor 在 input 右侧空白。
- 唯一关键 click：exact result、Question Open PDF、Related Scheme、Scheme Open PDF。
- PDF 内不乱动 cursor；结束停 viewer 灰色 margin。

## SCROLL PLAN

- Study Search result 与 metadata 通过预置 viewport 保持首屏，不做探索性滚动。
- PDF page 1 尽量不滚；若 Scheme 的圈注需 reposition，只做一次缓慢向下 scroll 并在停止后保留 2 秒。
- 不展示 page thumbnail 快速跳动。

## RAW RECORDING LENGTH

建议 66–78 秒，分 4 条 raw clips：Search/Question Detail 20 秒、Question PDF 14–18 秒、Scheme navigation/detail 16–20 秒、Scheme PDF 16–20 秒。

## FINAL EDIT LENGTH

33 秒：Search/Detail 8 秒；Question PDF 9 秒；related scheme/real Scheme PDF 16 秒。

## TRANSITION IN

T4 — `SM015` TEXT MATCH；参数见 Scene 2 Transition Out。

## TRANSITION OUT

T9 — OBJECT MATCH + UI PANEL EXPANSION。

- Outgoing：Scheme page 1 的红色圈注。
- Incoming：关闭 PDF tab 后 Scheme Detail 右下角的圆形 Ask Echo launcher。
- Bounding concept：用后期 crop 把红圈与 launcher 都放在右下安全区，同中心、近似直径。
- Edit：6–8 frames position/scale match；随后 click launcher，panel 向左上展开。
- Difficulty：MEDIUM。
- Fallback：若 native viewer 不能稳定构图，直接回 Scheme Detail，用 launcher pulse 作圆形 mask transition；不使用 fade。

## EXACT END FRAME

Scheme PDF page 1 稳定，手写答案清楚；一处红色圈注处于右侧可 crop 区；browser loading 指示消失；cursor 在灰色 margin。

## NEXT EXACT START FRAME

Scheme Resource Detail 稳定，圆形 Ask Echo launcher 位于右下；后期将其 match 到上一帧红圈；cursor 在 launcher 外侧空白。

## FAIL CONDITIONS

- Exact title 搜索未出现或点入错误 resource。
- PDF 没有真实打开，只停在 Detail 或 loading。
- Question/Scheme 文件对应错误。
- Related Scheme link 不存在或不是 reciprocal target。
- PDF 页面太小，SM015/手写内容不可辨。
- Browser download/permission/error UI 进入画面。
- 用 unavailable 或 non-PDF 资源替代。

# SCENE 4 — ASK ECHO CLOSES THE CAMPUS LOOP

## PURPOSE

把 Study 的静态文档场景带回可行动的校园地点：Ask Echo 用当前本地知识库回答一个稳定问题，并通过真实 action 返回 Pustaka。

## COMPETITION FUNCTION

Practical & Usability：学生不用离开当前任务即可取得简短校园指引，并继续到相关地点资料。

## ROUTE

Scheme Resource Detail 上的全局 Ask Echo panel → `#/place/B_PUSTAKA`

## START STATE

- 已关闭 Scheme PDF tab，underlying route 是 `#/study/resource/study_198f7e13702317aa00cd`。
- Ask panel 关闭，launcher 可见。
- 当前语言 English；Ask suggestion 包含 `Where is the library?`。
- 本地 adapter 已启用；不依赖远程 API/token。
- Pustaka Detail 已预热。

## EXACT RECORDING STEPS

1. 从 T9 对齐后的稳定 launcher state 开始；停 0.5 秒，点击 launcher。
2. Ask panel 展开结束后停 0.8 秒；确保 panel title `Ask Echo` 和 suggestion 可见。
3. 点击 `Where is the library?`；不要自由输入其他问题。
4. 录完整等待，但后期切掉约 450ms delay；从用户 prompt 直接切到 reply 出现。
5. 让 response 中的 Library/Pustaka、地点与开放时间可读至少 1.5 秒。
6. Cursor 对准 `View details`，停 0.4 秒，点击。
7. 切掉 route reveal；Pustaka Detail top 稳定 2 秒，H1 与 photo 必须出现。

## WHAT MUST BE VISIBLE

- `Ask Echo` panel。
- UI 自带 suggestion `Where is the library?`。
- 真实返回的 Library/Pustaka 和 hours。
- `View details` action。
- action 后真实进入 Pustaka Detail，而不是只关闭 panel。

## WHAT MUST NOT BE VISIBLE

- OpenRouter/API key、远程模型品牌、network console。
- “AI understands everything”“real-time assistant”等夸大文字。
- 无关自由提问、fallback error、timeout。
- Ask response 仍打开时切语言；旧 response 不会自动重译。
- Admin 或 moderation。

## VOICEOVER

> For quick campus guidance, Ask Echo responds from a local knowledge base and links the answer back to the relevant place.

## ON-SCREEN TEXT

`LOCAL CAMPUS KNOWLEDGE`，response 出现时显示 1.5 秒；不要覆盖 reply 或 action button。

## CURSOR PLAN

- launcher 外空白开始；launcher → suggestion → View details 是唯一 click path。
- reply 出现后 cursor 先移开 0.8 秒，让观众读结果，再移到 action。
- Pustaka Detail 结束时 cursor 停右侧 photo 外的空白。

## SCROLL PLAN

不滚动。预置 viewport 使 suggestion、reply 与 action 都在 panel 可见范围内。

## RAW RECORDING LENGTH

建议 30–38 秒；一条 Ask clip 22–28 秒，一条 Pustaka result clip 8–10 秒，均含 handle。

## FINAL EDIT LENGTH

14 秒。

## TRANSITION IN

T9 — Scheme 红圈到圆形 launcher 的 OBJECT MATCH；参数见 Scene 3。

## TRANSITION OUT

T10 — SHARED ELEMENT + UI PANEL COLLAPSE。

- Outgoing：Ask reply 中的 Library/Pustaka 与 `View details`。
- Incoming：Pustaka Detail 的 H1 与 photo。
- Edit：click 后让 panel 向 launcher 方向收合，cut loading；用 `Pustaka` text/meaning 保持连续。
- Difficulty：LOW。
- Fallback：直接 click cut，保持同方向视线从右侧 panel 移到左侧 H1。

## EXACT END FRAME

Pustaka Detail top，English，Light；H1、photo、description top 可见；Ask panel 已关闭；语言菜单关闭；cursor 在右下空白。

## NEXT EXACT START FRAME

完全相同的 Pustaka Detail top、同一 scrollY、同一 viewport、同一 Light/English state；cursor 仍在右下空白。

## FAIL CONDITIONS

- Ask response 是 fallback/timeout 或内容与 Pustaka 不符。
- `View details` 不存在或动作未打开 Pustaka。
- 展示 loading bubble 太久。
- 出现远程 API、token 或 console。
- Ask panel 未关闭就进入语言场景。

# SCENE 5 — THREE LANGUAGES AND IMPACT HANDOFF

## PURPOSE

用同一 Pustaka 页面快速证明三语言界面，并以当前 Home hero 无缝进入原比赛视频已经锁定的实体 laptop / Impact 镜头。

## COMPETITION FUNCTION

Practical & Usability：多语言界面降低使用门槛；最后的现实设备镜头把 prototype 交回 Impact，而不重写 Impact 论述。

## ROUTE

`#/place/B_PUSTAKA` → `#/`

## START STATE

- Pustaka Detail top、Light、English、Ask panel closed。
- Navbar language menu 可见；browser zoom 100%。
- BM、Chinese、English 三个状态预先各切换一次，确保字典加载和行高构图已确认。
- Home hero 已预热；点击 brand 后不需等远程字体/图片。
- 原 MP4 的 Home full-screen → physical laptop → student Impact 原始镜头已经在编辑 timeline 对齐。

## EXACT RECORDING STEPS

1. 保持 Scene 4 的同一 ending state 2 秒。
2. 点击 Language trigger；停 0.3 秒；点 `BM`。等待 current route 重绘稳定，保持约 1 秒。
3. 再开 menu，点 `中文`；保持约 1 秒。
4. 再开 menu，点 `EN`；确认页面恢复 English，保持约 1 秒。
5. 确认 menu 关闭、Ask panel 关闭、Light 未变；cursor 移到左上 navbar brand 前停 0.4 秒。
6. 点击 Echo Wall brand；切掉 Home reveal/loading，进入已经稳定的 Home hero take。
7. 成片只使用 Home hero 上方 crop：Echo Wall brand、headline、hero book；下方 trust row 全部在画外。
8. 用 10–14 frames corner-pin / perspective scale，把当前 Home crop 放进原片实体 laptop screen。
9. 保留原片 laptop → student 的原切点；从这里进入锁定 Impact，不新增、不改写 Impact。

## WHAT MUST BE VISIBLE

- Native language trigger 的 `EN`、`BM`、`中文`。
- 同一 Pustaka 页面 title/labels/description 有真实文本变化，几何保持相近。
- 最后恢复 English。
- Home hero 上方的 Echo Wall brand、headline、book visual。
- 原片实体 laptop screen 和下一帧真人 Impact。

## WHAT MUST NOT BE VISIBLE

- Home trust row 中的 `Admin moderation`；必须完全裁出画面。
- Admin route、moderation UI、Profile、email。
- Dark Mode 切换；Dark 只在 preflight 验证，不进主片。
- Ask panel 中旧 English response 留在 BM/Chinese 画面。
- language rerender 抖动、menu 半开、字体加载闪烁。
- generic fade to Impact。

## VOICEOVER

> The same journey is available in English, Bahasa Melayu, and Chinese. One campus, one practical path from place, to people, to learning.

## ON-SCREEN TEXT

不加额外字幕。Native `EN / BM / 中文` 与页面文本变化已足够；最后一句 VO 压在 Home → laptop transition 上。

## CURSOR PLAN

- 右下空白开始。
- 每次 menu：trigger → option，点击后立刻移到右侧空白，不遮文字。
- 最后点击 brand 后 cursor 在 Home take 中不可见或停在 navbar 外空白。

## SCROLL PLAN

Pustaka Detail 保持 top，不滚。Home 保持 top，不滚。

## RAW RECORDING LENGTH

建议 30–38 秒：Pustaka language take 20–26 秒；Home stable take 10–12 秒。原 Impact footage 不计入新增 raw。

## FINAL EDIT LENGTH

13 秒：三语 9 秒；Home → Impact handoff 4 秒。

## TRANSITION IN

T10 — Ask `View details` 到 Pustaka Detail；使用 Scene 4 的完全相同 ending/start state。

## TRANSITION OUT

T15 — SCREEN MATCH + POSITION MATCH。

- Outgoing：当前 Home hero 上方 crop，headline/book 居中；任何 `Admin moderation` 文案都在画外。
- Incoming：原片约 03:29 的实体 laptop 屏幕。
- Bounding concept：Home crop 先满幅，再与 laptop screen 四角相合。
- Required state：Home hero 图片/字体完全加载；原片 laptop frame 未被重定时破坏。
- Edit：10–14 frames perspective scale/corner pin；沿用原片 laptop → student hard cut。
- Difficulty：HIGH。
- Fallback：以 hero book icon 做 OBJECT MATCH 到 laptop screen 中心，再进入原 cut；仍不得 fade。

## EXACT END FRAME

当前 Home hero crop 已完整贴合实体 laptop 屏幕；画面外框已经是原比赛视频的真实 laptop shot；网页 crop 内没有 Admin/moderation 字样。

## NEXT EXACT START FRAME

原比赛视频锁定的 laptop → student Impact 首帧，时间与原音轨保持不变。

## FAIL CONDITIONS

- 任一语言没有产生真实 UI 文本变化。
- 最后没有恢复 English 或 Light。
- Ask panel/old reply 覆盖三语言页面。
- Home crop 露出 `Admin moderation`。
- corner pin 与 laptop 四角漂移、网页比例变形明显。
- 改写、裁短或覆盖原 Impact 的首句/首帧。

# Exact Script Verification

## 已完成的实际证据复核

| Scene | Result | Evidence | Remaining recording risk | Required response |
|---|:---:|---|---|---|
| Scene 1 Map → Pustaka → Wall | RISK | `map.html`/Leaflet/建筑图片 HTTP PASS；Fit/Preview/hours/More Details/Wall handlers 与数据均存在；Pustaka 08:00–16:30 确认 | OSM tile 网络、实际 1080p footprint hit、Detail scroll 构图未能在可控浏览器亲眼复走 | 录制前执行 Checklist M1–M6；失败用 sidebar card、预热 tile 和 T2 fallback |
| Scene 2 All Student → Comment | PASS WITH PRECONDITION | 61/61 Sticky Wall + 38/38 seed interaction；Questions/Search/Comment/scroll lock 逻辑通过；目标 seed 与文本存在 | 录制 profile 必须已登录且无重复评论 | 用新 profile clone；若 Auth 弹出则该 take FAIL 并重置，不在画面处理 |
| Scene 3 Study → real PDFs | PASS/RISK | 74/74 Study；question/scheme reciprocal IDs 确认；两文件 HTTP 200、PDF header 正确 | 原生 PDF viewer UI、tab opening 构图需录制机确认 | 预热两文件并锁定 viewer zoom；失败不改网站，采用 hard-cut fallback |
| Scene 4 Ask Echo | PASS | 当前 local adapter 已执行；稳定返回 Library/Pustaka/hours 与 `View details` | panel 在 1080p 是否无需 scroll 需录制机确认 | 调整浏览器全屏，不缩放网站；若 action 下折，只录 reply take + action result take |
| Scene 5 I18N → Impact | PASS/RISK | 三语言字典、menu、current-route rerender 与 Home navigation 均存在；原 MP4 handoff 帧已定位 | 三语换行、Home crop 与原 laptop corner-pin 需编辑机复核 | 分别录稳定 language takes；Home 必须裁掉 trust row |
| Console | NOT YET VERIFIED | 关键 JS `node --check`、VM 执行、仓库 tests 均无新错误 | 当前环境没有可控浏览器 Console | 正式录制机按 C1–C3 观察 Console；任何 new error 都使对应 take FAIL |

没有把任何已知 FAIL 功能写进最终路径。所有 RISK 都有明确的录制前检查和不改变网站的 fallback。

# FINAL_RECORDING_CHECKLIST

## A. 环境与可重复性

- [ ] A1. 从项目目录启动本地 HTTP server；绝不使用 `file://`。
- [ ] A2. 1920×1080、60fps capture、100% browser zoom；最终 timeline 为原片 30fps。
- [ ] A3. Light、English；系统通知、downloads shelf、bookmarks bar、扩展 popup 关闭。
- [ ] A4. 使用专用录制 profile；已正常登录测试账号，但不展示 Auth/Profile。
- [ ] A5. 保存一份干净 profile clone；每次重录评论从 clone 开始，避免重复 thread。
- [ ] A6. 清除无关 tabs；只保留网站与两个预热 PDF。
- [ ] A7. 确认没有打开或访问 `#/admin`；browser history dropdown 不进入画面。
- [ ] A8. 预热 Google Fonts；Inter/Caveat 等字体实际加载后再锁构图，避免 fallback font 改变换行和 match geometry。

## M. Map / Building preflight

- [ ] M1. `map.html` 首屏无灰 tile、无 tile error；KMK campus 完整。
- [ ] M2. `Fit campus` 一次 click 有可见 ease 结果。
- [ ] M3. Pustaka sidebar card 和 footprint 均能打开 Preview；正式 take 优先使用命中更稳定者。
- [ ] M4. Pustaka hours 显示 Sunday–Thursday 08:00–16:30、Friday/Saturday closed。
- [ ] M5. `More details` 打开正确 Pustaka photo；照片没有 fallback/broken icon。
- [ ] M6. Detail scroll 中间 cut 可完全跳过 empty Events；`Enter Wall` 可见且打开正确 Wall。
- [ ] M7. 不放大、不口播 `fourteen focus buildings`；该静态 description 与当前 19 个 Preview 配置不一致。

## C. Community preflight

- [ ] C1. `Best quiet study spot?` modal 为 rounded、`#BFDBFE`；与 Pustaka 目标 modal 录一张 still 比对中心/尺度。
- [ ] C2. 关闭 modal 后页面 scroll lock 确实解除；mouse wheel/trackpad 正常。
- [ ] C3. `Questions` active state 清楚。
- [ ] C4. `Calculus revision group` 搜索只留下目标 question。
- [ ] C5. 登录状态不会在点击 comment 时弹 Auth。
- [ ] C6. 指定评论中 `SM015` 完整；Send 后进入 thread 并更新 count。
- [ ] C7. 不点 vote、不点 solved、不显示重复评论。

## S. Study preflight

- [ ] S1. Exact query `SM015_Matematik 1_sesi 2023_2024` 命中正确 question resource。
- [ ] S2. Resource Detail 的 subject/year/type/source/verification 在 1080p 至少四项可读。
- [ ] S3. Question `Open PDF` 新 tab 已获允许；page 1 清楚显示 SM015/Matematik/2023–2024。
- [ ] S4. 关闭 tab 后回到同一 Detail scroll state。
- [ ] S5. `Related Answer Scheme` 指向 `Past Year SM015 2023-2024 (Answer Scheme)`。
- [ ] S6. Scheme PDF page 1 有清楚手写内容和可用于 T9 的红圈。
- [ ] S7. Viewer 不显示 error、download shelf、私有路径或长 loading。

## E. Ask Echo / i18n preflight

- [ ] E1. Ask panel 内置 suggestion `Where is the library?` 可见。
- [ ] E2. 回答包含 Library/Pustaka 与 hours；不是 fallback/timeout。
- [ ] E3. `View details` 打开 `#/place/B_PUSTAKA`。
- [ ] E4. 关闭 Ask 后再切语言。
- [ ] E5. Pustaka 同一 top state 在 BM/Chinese/English 均无遮挡；最后恢复 English。
- [ ] E6. Theme 保持 Light；另在录制前快速看 Dark 无明显 layout regression，但不录 Dark。

## T. Transition / edit preflight

- [ ] T1. T0 当前 Map 已贴入原 Idea 设备 frame；Map first 约束没有被 Home 抢先。
- [ ] T2. T3 两张 modal still 的 shape、颜色、中心和尺度相符。
- [ ] T3. T4 outgoing/incoming 的 `SM015` 可在 6–10 frames 内对齐。
- [ ] T4. T6/T8 的 PDF loading 全部被剪掉，但 click 与结果因果仍清楚。
- [ ] T5. T9 红圈与 Ask launcher 对齐；若不稳立即采用圆形 mask fallback。
- [ ] T6. T15 Home crop 完全不含 `Admin moderation`，corner-pin 四角稳定。
- [ ] T7. 原 laptop → student Impact cut、Impact VO 与音轨保持原样。
- [ ] T8. 全段总长 130 秒；绝不超过 135 秒。

## Q. Final quality gate

- [ ] Q1. 每个 action 后都有真实 visible result；没有“只点不见结果”的镜头。
- [ ] Q2. 每条 raw clip 有 2 秒稳定 start/end handle。
- [ ] Q3. Cursor 开始/结束在空白，click 前后有停顿，没有乱绕。
- [ ] Q4. 页面 scroll 只单向；中间 loading、长 typing、空 events 已切除。
- [ ] Q5. On-screen text 不覆盖 native result；字体/颜色延续原片，而不是全新 HUD。
- [ ] Q6. VO 144 words；英文发音实录为 60–62 秒，结果帧有呼吸空间。
- [ ] Q7. Map、Community comment、Question PDF、Scheme PDF、Ask action、三语言结果全部在最终 export 中可见。
- [ ] Q8. Admin、moderation、roles、approval、Auth/Profile 没有出现在任何 frame 或旁白。
- [ ] Q9. Light Mode 主片 PASS；Dark Mode preflight 无明显 regression。
- [ ] Q10. 正式录制全过程打开 DevTools Console 观察：0 new errors；如出现任何新 error，对应 take 标为 FAIL 并重录/改用已列 fallback。
- [ ] Q11. Final website segment timecode 为 00:00–02:10；Impact 从 02:10 按原锁定内容继续。

STOP
