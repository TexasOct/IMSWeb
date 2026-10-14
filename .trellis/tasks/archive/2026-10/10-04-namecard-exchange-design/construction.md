# 名片交换施工详表

> 类型：任务施工拆分
> 状态：Draft，供对应阶段实施评审；下列工作均未执行
> 权威来源：[PRD](./prd.md)、[系统设计](./design.md)、[实施计划](./implement.md)、[施工现况](./research/construction-baseline.md)和[验收矩阵](./acceptance.md)

本详表把 E0 至 E9 拆成可独立验收的施工批次。现存文件来自本轮源码复核；标为「拟新增」的目录、模型和路径须在阶段评审后创建。D-01 至 D-15 保持待确认，容量和保留期限沿用设计中的推荐值，未因增加施工细节而批准。实现按批次加载对应 spec，避免一次修改所有 workspace。

## 1. 批次、决定与停止点

| 批次 | 阶段 | 最小可验收结果 | 实施前决定/前置 |
| --- | --- | --- | --- |
| C00 | P0 | 读写/媒体/旧客户端清单、只读数据对账、迁移边界和兼容策略 | 确认基线；D-01 首先收敛 |
| C01 | E0 | CardRevision/page/ref 新表和兼容读，公开已批准指针 | D-01、D-14；tag 最小表受 D-15 约束 |
| C02 | E0 | revision 媒体权限与清理复核，旧 FK/claim epoch 兼容 | C01；D-12/13 中影响模型的部分 |
| C03 | E1 | 新版上传、资格、署名、tag 输入、page 编辑与审核闭环 | C02；D-02/03/04/10/14/15 |
| C04 | E1 | 历史再认领、解绑、注销和公开资格统一 | C02/C03；D-07/12/13；身份域生命周期评审 |
| C05 | E2 | 申请/授权、双向原子 commit、receipt/outbox、名片册 API | C03/C04 的相应资格与解绑约束；D-01/07/08 |
| C06 | E2 | 本人名片册、inbox、快速组、隐藏与显式显示更新 | C05；完整 Web/App-target 交互 |
| C07 | E3 | 单卡/公开主页、Hono OGP、分享与私有 grant | C06；明确恢复既有分享任务范围 |
| C08 | E4 | 两账号 QR 会面、固定名单与确认、重连恢复 | C05/C07；复用交易和 grant |
| C09 | E5 | 临时频道、room-fill 批次、pair worker 重启恢复 | C08；D-06/11 |
| C10 | E6 | 前台 BLE 试验和联网会面 adapter | spike 可先行；账本接入依赖 C05/C08、D-09 |
| C11 | E6 | 离线凭据、双签日志与服务器补交 | C10/C05；D-05；密钥/规范化签名协议评审 |
| C12 | E7 | 指定设备组合上的可撤销后台实验 | C10/C11；独立后台范围评审与设备证据 |
| C13 | E8 | 工艺图层/静态降级；3D 独立调研 | C03；D-10；资源预算另验 |
| C14 | E9 | 管理标签归并/拆分、语言显示、重建与审计 | C03/C06 的 stable tag ID 消费者；D-15 |

C00 至 C06 构成首个可验证交付：上传获批名片，两账号完成授权收录，名片册保留取得版本，并通过隐藏、解绑、封禁和媒体清理竞争测试。分享、频道和 native 写入均复用 C05。每批完成时更新 NC 覆盖，不能以阶段名称替代验收用例。

## 2. C00：基线、协议与数据清单

1. 重跑 `docs/development/ai-environment.md` preflight，记录 HEAD、dirty scope、运行中的服务和真实 PostgreSQL 条件。当前三处 build script 删除由原改动所有者负责；记录是否影响本批验证。
2. 只读统计 canonical 卡/来源/owner/claim epoch/office placement、旧 pending/accepted、favorites、对象与补偿队列引用。输出到 ignored `data/migration/`；统计含事务隔离级别和读取范围，不以本机数量推断生产规模。
3. 固定旧 wire 样本：string cardId、numeric compatibility card_number、strict owner/public DTO、正背 URL、publication/claim enum、cookie 与 bearer 错误。冻结升级结果及最低客户端支持策略。
4. 阶段评审列出新 suffix、请求/响应/business error、权限、内容 hash/digest 版本和行为开关。公开 canonical 仍采用分享任务提案；API 路径使用 contracts builder。
5. 子任务计划只引用该批需要的 spec/research；拟新增文件有明确 owner，contexts 中不得把不存在的未来文件当已存在来源。

完成条件：迁移输入可复读；每种旧写/删/公开媒体路径都有处理结果；D 项标明本批必须关闭的部分。本轮只补计划，不在没有生产迁移授权时执行 `--apply`。

## 3. C01：快照、页面与兼容读

现存落点为 PostgreSQL migration catalog、`ports/repositories/fudaba.ts`、`infra/db/repositories/fudaba-repository.ts`、Fudaba cards/moderation 和 runtime 接线。拟新增 `ports/repositories/fudaba-card-revisions.ts` 与对应 SQL 仓储，由 `runtime/node-services.ts` 注入；既有仓储只负责需要的桥接。

按以下顺序施工：

1. 增量 migration 建 `CardRevision`、稳定 pageId/顺序、媒体引用、归属事件和已批准 publication pointer。`fudaba_cards.revision` 保留当前 CAS 用途；新增内容版本 ID 不能复用这个整数充当历史快照。
2. C01a 建版本/页/ref 与默认安全读；C01b 才接最小 Tag/Term/CardRevisionTag 和 canonical resolver。C01b 前关闭影响数据模型的 D-15 部分，完整管理功能留 C14。
3. backfill 以稳定 `(cardId, legacyRevision)` 对账：published 且 rights approved 的源记录才能成为可批准快照；pending/rejected/ownerless 分别映射，缺对象或资格不明列为异常。只为仍可证明的当前内容建基线，不能重建已被覆盖/删除的历史字节或伪造旧取得版本。
4. 批量回填支持 resume key、事务内 CAS、重复运行无新增快照，并对并发编辑做冲突重试/隔离；migration runner 只做受控 schema 演进，大体量数据脚本另有 dry-run/apply/报告。
5. 先保留旧列和旧只读 DTO，再交付拟新增 `@imsweb/contracts/fudaba/card-revisions`。新版 owner/pages 以版本化入口返回；旧响应不新增未知字段、enum 或 null back。
6. 显式批准是发布指针变化；锁定/隐藏为独立资格轴。public/owner/admin/collection 投影共享资格判断，输出字段各自最小化。

验证：新库、升级库、ownerless/缺图、回填重跑/并发写；HTTP raw JSON conformance 和旧 fixtures。完成条件：旧路径保持其声明支持范围，新版页面可以读取稳定版本，媒体未提前回收。

## 4. C02：媒体引用、旧交换约束与回滚

媒体施工覆盖 `upload-owned-media.ts`、`delete-card.ts`、`guest-submissions/ttl-purge.ts`、`card-media-assets.ts`、对象补偿和清理执行端。对象键有版本号仍不能证明对象会长期存活。

1. 在 DB 事务中写 revision/page/ref。版本、CollectionEntry 的 acquired/display、有效 grant、待补交凭据及申诉引用分别定义存活和到期；D-05 的离线 manifest 签发前必须建立对应短期保护引用。
2. 正常替图或删除只释放其有权释放的引用；GC 通过统一引用查询，清理 worker 实际删除前再次检查资格和引用。失败重试及已经排队的历史删除也经过新复核。
   引用创建与 GC 争用同一媒体对象行和 generation fence。GC 在确认零有效引用的事务中将 `live` CAS 为 `deleting` 并写清理任务；新引用只可绑定 `live`，不允许在检查后、物理删除前插入引用。worker 校验任务 generation/lease，成功后置 `deleted`；结果不明走既有补偿/reconciliation。旧清理任务必须先经此 admission，不能直接删 key。
3. revision/page 媒体读使用对象 key 的服务器映射，鉴权 holder/grantee/owner，返回 `private, no-store`；App 复用 Blob 读取形态并为新资源加入准确白名单。公开 URL 曾经发出的缓存撤回限制单独说明。
4. 新版聚合另建 `fudaba_card_exchanges` 等表，旧 `fudaba_exchange_requests` 留历史。先关旧创建/接受写，再向独立 legacy history 附加表回填可证明的 owner/attribution/office/卡/时刻，未知内容版本不推导 consent。推荐 pending 按原 version CAS 合法取消并记原因，须 C00 迁移评审确认；accepted 不生成 CollectionEntry 或新版 receipt。解绑前解除 owner 复合 FK、把 office-placement 复合 FK 改为稳定 cardId 引用，保留原 officeId 与必要墓碑引用。旧终态 trigger 保留，附加 history 避免改写终态行。
5. legacy binding/approved claim 增加历史周期而非删除旧证据；新的绑定唯一性作用于当前有效 epoch，claim 再审核仍需当前证据。
6. 旧 owner DELETE 和替图写入口在新引用生效后使用安全桥接或关闭，并给出明确升级结果。只隐藏新版按钮不能阻止旧客户端删除对象。

验证：owner 替图/软删、grant 撤销、display 更新、两持有者竞争、已排队清理重试、孤立对象、申诉暂停和历史 FK。回滚演练关闭新写，继续读取快照；含旧破坏性清理逻辑的 API/worker 不得作为直接回退目标。

## 5. C03：新版资料、上传与版本审核

现存编辑工作区、owner card handlers、admin review、`idol-multi-select.tsx` 和 namecard preview 是接入点。拟新增的页上传、稿件提交和审核 diff 分开命令，接口由 contracts 定义。

1. 资格 catalog 按 PRD 的四类允许/三类排除管理；保存 Wiki ID 与资格来源，不把 Wiki entryKind 或任意 group 成员当产品资格。服务器校验与 selector 使用同一投影。
2. 资料保存为 revision draft；制作人读法、象征团体、结构署名、自愿 AI、tags 原文与 page 顺序进入内容 hash。规范化规则和 hash 版本固定，管理标签译名更新不改已签 hash。
3. 页上传创建稳定 pageId，以临时上传状态绑定账号/稿件；校验实际解码、字节、尺寸、格式和输出预算。前面必填/可选背面、旋转和多页按 D-02/04 定案，取消/失败有受控对象清理。
4. 先上传后提交引用清单；移页、排序、替图用 expected revision，服务端检测缺页、重复 pageId、跨账号临时对象与并发改稿。
5. 审核列表展示待审 revision 和基准 approved revision 的文本/图片 diff；approve/reject 指定版本和 structured reason，复用对象发布/保护补偿。新编辑不得被旧 approve 命令顺带发布。
6. 管理操作锁停止编辑/申请/交换；safety block 同时收紧所有读投影。AI 字段自愿，退回理由遵守 PRD。
7. 登录墙上传走新版 owner command；匿名显示登录入口，保留历史 guest status/token 的受控读。旧 guest 新提交关闭时间与旧 owner 写策略同批评审。

验证：现存 Fudaba HTTP fixtures、Web endpoint fixtures和上传/审核 E2E；新增单面、多页、旋转、超限、断传、旧 approve 对新稿、锁定竞争。页面继续测可见控件和图片解码，等待 inventory 的准备条件。

## 6. C04：认领、解绑和账号注销

认领接现存 claims/admin review。账号注销需在 `platform-account-security` 新增 deletion 能力并接入 `ports/runtime-services.ts`；身份域通过生命周期 port 调用 Fudaba，禁止直接 import 其 SQL 仓储。

1. 同 cardId 解绑保留取得快照与署名事实，更新归属周期、公开资格和新操作资格；取消旧归属待办/quick-group 项时保留可解释的历史记录。
2. 认领 campaign 使用服务器截止时刻；wall/list/search/count/media 使用相同资格。legacy 证据保留，新的 owner epoch 不继承旧 owner 的自动接受或设备授权。
3. 账号注销定义二次验证、重试 ID、账号冻结及撤销顺序，与现存 password/session/OAuth/email 安全能力保持一致。单卡主动解绑与整账号注销为不同命令。
4. 涉及账户状态、card 解绑、会话/设备 policy 撤销的 PostgreSQL 步骤由生命周期协调统一事务或有明确定义的恢复状态，禁止出现「账号已注销但交换授权仍可提交」窗口。缓存/对象副作用通过可重放事件处理。
5. 注销和 commit 使用共享资格/version fence 与固定锁序；其他人的合法 collection 不级联删除，本人的私有数据按身份域政策处理，audits 和 attribution 采用最小留存。
6. 修改 `docs/architecture/platform-account-security.md` 时同步原先的注销公开内容政策；本任务推荐的解绑/截止政策需在此阶段批准。

C04 先实现现有账号、会话、card、claim 的生命周期以及可供后续命令检查的账号/归属 epoch。C05 的新申请/交易和 C11/C12 的设备/静默模块在各自施工时注册撤销处理并增加竞争回归，之后才开启对应写入口；C04 不预设这些尚未创建的模块已经可调用。

验证：两账号/两持有者、注销重复请求、事务失败/进程重启、解绑与 accepted/commit 竞争、再认领证据、截止前后 public/numeric media。完成条件：注销由真实入口完成，旧 FK 不阻塞、旧写入口不越权、其他人图片仍能解码。

## 7. C05：申请、收录事务与 outbox

拟新增 Fudaba `collections/`、`exchanges/`、`exchange-preferences/` 子能力，contracts 同名业务子模块，ports/SQL 仓储分别拥有聚合。`FudabaRepository`、`hono-context.ts` 与 Node runtime 提供必要桥接。C05 的 DDL 新建 `fudaba_card_exchanges` 及 items/consents/commit/receipt/outbox/collection 表；C02 处理后的旧 office-bound 表只保留兼容历史，新增协议不要求 office placement，也不导入旧 accepted 作为授权。

1. 先交付申请创建、inbox/read、名单 preflight、接受/拒绝/取消及 manual 默认。每个 consent 固定 exchangeId、from/to、cardRevision、offerDigest、来源及授权版本，变化导致重新确认。
   C05 同批交付收件人绑定的最小 PrivateCardGrant 签发/兑换/撤销、受保护 revision 媒体及参与名单 preflight，供隐藏卡人工申请读取；C07 再接私有邀请 UI，复用这套授权，不让 E2 的隐藏卡流程等待 E3 才能安全预览。
2. 自动接受独立设置和 policyRevision；silent 策略留 C12。申请、授权 grant、内容 revision 和 policy 都在 commit 再验，不信任 UI 角标或首次 preflight。
   在本批接入 C04 lifecycle/账号与归属 epoch 的新申请/交易撤销，增加注销与 commit 竞争回归后才开写；C11 和 C12 分别注册其后新增的设备与静默撤销处理。
3. 普通 mutual 保留双向原子语义；room-fill 才按已批准规则预先产生缺失方向。`UNIQUE(holderAccountId, cardId)` 负责跨入口去重，不能单靠 pending unique index。
4. 固定账号/卡/策略等锁序和事务隔离策略；一笔 PostgreSQL 事务写 CollectionEntry、commit、receipt 与 outbox，唯一冲突回滚整笔。相同 exchangeId/相同 payload 重放返回同 receipt，改变 payload 返回 `409`。
5. outbox 为拟新增能力，定义 eventId/type/aggregate/version、lease/retry、consumer dedup、dead-letter/readback；email worker 只供实现模式参考。响应丢失后以 durable receipt 查终态，通知失败不撤销 committed。
6. collection 查询返回 immutable acquiredRevisionId 和独立 displayRevisionId；显式更新不改变获得时间、取得授权和 receipt。holder hide、owner hide、锁与 safety block 分别处理。
7. 排序/筛选由服务端分页；每种排序包含稳定 cardId/entryId tie-breaker，游标固定排序/筛选语义。标签 canonical、组合/多担/越境和数量口径依 D-07/08/15。

验证：真实 PostgreSQL 两账号双连接，同时 collect/mutual、反向锁序、相同/改变 payload、第三方冒充、授权撤回、事务各写点失败、outbox 重启和媒体引用。完成条件：服务器 committed/receipt 是唯一成功依据，投递至少一次不产生重复收藏或通知效果。

## 8. C06：Web/App 名片册和设置

现存 `community-exchange-me-workspace.tsx`、`card-workspace.tsx`、`favorite-collection.tsx` 继续拥有各自资源。拟新增 `collection-workspace.tsx`、inbox 与 preference 子模块；route-ready 页面只传 metadata/App 所需 props，共享逻辑留非 route module。

1. endpoint facade 与 MSW/fixture 先同步严格新 DTO，再接名片册和 inbox；保留当前 favorites，迁移策略只有用户显式确认才执行。
2. 展示获得版本、当前显示版本、交换来源、隐藏状态与失效原因；更新按钮展示确切目标版本，隐藏册项操作只影响本人。
3. 快速组选卡保存稳定 cardId/策略 revision，允许本人获批隐藏卡经单次主动授权；失效项要求重选，摘要不静默减项。
4. 桌面/移动端同一摘要和已持有逻辑；冲突后刷新终态，失败/待同步区分，确认手势有键盘/按钮替代。
5. 复用当前 owner Blob hook 的行为，为 collection/grant/revision 各建准确 URL 校验；测试 token refresh、取消、切账号、Blob 释放、图片加载错误及 safety 占位。

验证：endpoint raw contracts、组件真 AuthProvider/router harness、两独立会话 E2E、App-target WebKit 图片。完成条件：拥有标记与服务器 collection 一致；旧 favorites、列表 Dialog/反应和本人两面预览回归通过。

## 9. C07：分享、主页与 grant

1. 与既有 sharing 任务核对授权切片，确定 canonical 单页/OGP/分享图恢复范围；沿用其 `/community/exchange/cards/:cardId` 提案，paths/route metadata 同步。
2. 公开单卡、公开 profile、OGP/图统一 live visibility projection；viewer 已持有状态独立鉴权，缓存不能混入个人信息。
3. Hono 在 `app.ts` 的 notFound/staticAssets 前接 HTML；GET/HEAD、escaping、canonical、OG/Twitter、状态码及 private/public cache 由 packaged API 测试。新增 HTML/image 成功边界登记 non-JSON manifest 并生成 route inventory。
4. QR/渠道图复用 ShareProjection，字体/生成限额/cache key 均固定；版本隐藏或 safety 改变后重新验资格。第三方系统接收分享不作为发布成功。
5. 接入 C05 已有最小 private grant：私有邀请 UI 展示收件人、确切 revision 和期限，复用兑换/撤销和媒体映射；未参与方、过期/转发 token 不提供身份或图片。owner media facade 不自动扩大到 grant URL。

验证：`test:web-routing` packaged GET/HEAD/asset、匿名/登录/隐藏/ownerless/封禁矩阵、QR 内容、referrer 泄露、伪造 grant、Web/App 页面。完成条件：原始 HTML 有正确元数据，private 数据不进入公开预览。

## 10. C08/C09：现场会面与临时频道

C08 拟新增 `encounters/` 能力：会面 token、参与账号与 nonce、确切 offerDigest、双方确认、取消/过期和状态读取。QR 会面使用独立短期邀请；公开 canonical QR 不充当双方授权。会面 token 和 private-card grant 有不同用途、寿命和撤销边界。

1. 扫码登录/回跳保持邀请安全上下文，展示真实对方与名单；快速组只是预填，确认后重新绑定 digest。
2. 任一方断线、refresh/重启后先读服务器终态；attempt/exchangeId 重用，双设备重试共用 C05 commit。
3. SSE/WebSocket 若本阶段确需加入，先冻结事件版本/auth/重连策略；可以先以轮询闭环验证，不把新实时基础设施列为无条件前置。

C09 拟新增 `rooms/`、member/batch/pair-task 仓储和 bounded worker；worker 启动/关闭由 Node runtime 负责。强随机 joinToken、四位码 uniqueness/枚举防护、容量和时限按 D-06，不能只校验浏览器输入。

4. 冻结成员/名单快照，变动 invalidate consentSnapshotHash；确认前生成 pairOfferDigest/room-fill 确切方向。确认后已持有冲突整对重新确认，不能现场裁剪。
5. 每 pair 复用 C05，记录 skipped/committed/conflict/failed；部分失败不回滚已完成对，成员迟到不继承授权。worker lease 过期可重取，重复执行返回相同 receipt。
6. 估算无向 pair 上限 `n * (n - 1) / 2`，多卡方向另算；若采用 D-06 推荐 20 人，则最多 190 对，这个数量是预算输入，尚无压测通过证据。

验证：C08 两会话二维码和双方确认/可访问性；C09 代码碰撞/耗尽、人数/卡数上限、确认后改名单、worker crash、响应丢失、所有对的授权隔离及 O(n²) 压力。完成条件：参与者能读每对终态，恢复不产生重复收录。

## 11. C10/C11：BLE 前台与离线补交

C10a 是设备可行性试验，可与 E0 并行研究。自有 `apps/web/src-tauri/plugins/<owned-plugin>/` 为拟新增，Rust 注册、capabilities、OS usage 文案、Android manifest 与 TypeScript facade 一起评审。读取完整 native spec，所有构建走 `app:*`。

1. 先证明 central/peripheral、scan/advertise/GATT 和真实授权/拒绝/撤回；记录 iOS/iOS、Android/Android、跨端双角色、OS/机型、协议和延迟。页面退出/切后台停止或暂停。
2. 广告只放最小服务标识；GATT 帧定义协议 version、nonce、消息 kind、长度/分片/顺序/重传上限、连接取消和错误。BLE 承载短期 rendezvous/授权材料，图片经获准媒体接口读取。
3. 双连接/重复发现选定一条 authenticated session；RSSI 排候选，歧义由真人选人和共同验证码核对。验证无需加入同一 Wi-Fi/热点/系统配对，GATT 权限不能以弱化应用认证来绕过弹窗。
4. C10b 将 BLE 发现接 C08 认证会面，再调用 C05；平台差异留 transport adapter，Web 降级为二维码。此处只承诺联网会面，图片/成功终态仍由服务器提供。

C11 在前台稳定协议后增加离线凭据和日志，不能把「BLE 能连」当离线安全方案完成。

5. 固定密钥算法、公钥编码、canonical serialization、hash/signature domain separation、protocol/credential version 和证书有效窗口；server-issued manifest 精确绑定账号、设备、可交换 revision 集合和 submitBefore。具体算法在阶段安全评审定案。
6. native signing command 只接协议结构与预发凭据；安全存储隔离账号，注销/设备撤销清日志或按批准留存，禁止任意数据签名 API。
7. 双签日志先落盘再展示「待同步」，包含 exchangeId、确切双方授权、重试状态和幂等标识；无有效预发凭据仅留草稿。离线大图传输不加入默认范围，预览只使用合法已有缓存，缺图明确占位。
8. 任一方恢复网络上传完整双授权材料；服务器复核当前 owner/lock/资格、凭据撤销/期限并走 C05。冲突给确定失败原因，不能用双方本机时间倒推成功。
9. 更新 App 协议最低版本和能力探测；原生 build、浏览器 fallback、前台设备矩阵、断网/重启/补交分别列证据。

完成条件：声称支持的全部角色对通过实机；两台无网络待同步，任一台恢复完成一次入册；篡改/重放/撤销/过期/时钟修改不会入册。NFC/Nearby/UWB/Wi-Fi Aware 保持专项，未混入该共同协议。

## 12. C12/C13/C14：独立扩展

C12 后台先完成 opt-in/quick-group/接收限额/期限/真实运行状态和关闭后 policyRevision fence，再分别验证传统 iOS 模式、iOS 26 Live Activity、Android 后台/前台 service。锁屏、force-stop、Doze、重启、省电与系统杀进程各留证据；不能由某一组合推导所有组合可用。

C13 基础多图/contain 已在 C03，扩展只增加受控 alpha/preset/parametersVersion 及静态降级。外部 URI、资产/解码/面数预算、转码和无 GPU 回退在独立 3D 研究评审，机关状态图可独立发布。

C14 在 `tag-design.md` 模型上实施管理：TagLabel locale/labelVersion、alias/canonical mapping、merge preview/expectedVersions、固定锁序/环/同语言冲突、audit、outbox 重建和 live hidden fence。回滚使用 reverse preview，不改 CardRevisionTag 原文、取得版本或签名 hash；先证明所有旧 source ID 消费者能读，再开管理归并。运行时 tag locale 继续独立于全站固定中文策略。

## 13. 每批验证与评审材料

命令完整矩阵以 [实施计划 §12](./implement.md#12-验证命令与所有权) 为准。下面补充每批应留的证据，不记录为本轮已通过。

| 批次 | 必须运行/观察的类别 | 停止条件 |
| --- | --- | --- |
| C01/C02/C04/C05/C09 | contracts build/owner、API typecheck/architecture、server 与 migration；真实 Node/PostgreSQL | DB tests skip、不可重跑 backfill、危险 FK/GC、事务或恢复不成立 |
| C03/C06 | 上述相关 API + Web format/lint/typecheck/unit、Web/App-target E2E | 旧 wire 失败、上传资格不一致、控件不可见、受保护图片未解码 |
| C07 | 路由 inventory/non-JSON、`test:web-routing` packaged Hono、页面/分享回归 | 只在 Vite 正常、HEAD/缓存错误、private 内容公开 |
| C08 | 两独立账号 session、拒绝/取消/重连/响应丢失与 C05 幂等 | 单方动画报成功、digest 改动免确认 |
| C10/C11/C12 | `app:doctor`、owned 设备 wrapper、真实权限/角色/生命周期/离线/后台矩阵 | 无设备证据、以 mock 代替射频、未测组合宣称支持 |
| C13/C14 | 真实资产/性能、tag 并发/locale/隐藏/合并回滚、旧消费者 | 资源超预算、签名事实被改、旧 ID 或 hidden fence 失效 |

每批交付目录包含改动文件、DDL/backfill dry-run、wire fixture、测试命令/exit/skip、NC 覆盖、当前 D 决定、开关启用/关闭步骤和回滚读验证。部署与生产数据 apply 单独遵守现有授权；planning 检查只能证明施工文档一致。
