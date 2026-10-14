# 本轮规划交付验证

> 类型：任务验证证据
> 状态：设计稿已审查，产品参数待确认，未进入实施
> 权威来源：当前工作树、实际命令结果、独立只读评审和本任务原始需求

第 1 至 6 节保留原始设计稿的验证记录和当时基线；2026-10-06 的近场调研补充记录在第 7 节，同日施工细化单独记录在第 8 节，不把历史计数当当前工作树状态。

## 1. 工作区与交付范围

- 源码基线：`release/v1.1`，HEAD `81c3e832edee5ede17f8f6f2d668255c34383e12`。
- 环境实际版本：Node `v24.18.0`，pnpm `11.10.0`。
- 用户同意创建任务并完整规划，随后增加自定义创作 tag、共享池、管理归并和 tag i18n。本轮交付 NC-01 至 NC-34 的设计稿和 PL-01 至 PL-08 的证据。
- 产品代码、原有任务、数据库和 App native 源未修改。当前 Git dirty scope 只有 `.trellis/tasks/10-04-namecard-exchange-design/`；任务状态为 `planning`，没有执行 `task.py start`、commit、push、部署或数据迁移。

## 2. 实际执行的门禁

| 命令或检查 | 结果 | 证明与限制 |
| --- | --- | --- |
| `pnpm run check:rules` | PASS，exit 0 | 4 个 agent scope、899 个 production source、30 个 contracts entrypoints、244 个 mounted method/path、25 个常规 docs 文件通过。该命令不等于本任务所有设计文档语义审查。 |
| `pnpm run check:boundaries` | PASS，exit 0 | root/API/Web/data/deploy workspace 边界通过。 |
| `python3 .trellis/scripts/task.py validate .trellis/tasks/10-04-namecard-exchange-design` | PASS，exit 0 | implement/check 各 14 个真实条目，文件存在且无注入大小警告。 |
| 本任务 Markdown 相对链接、source anchor 和上下文文件大小检查 | PASS | 12 个 Markdown、44 个本地链接存在、209 个源码锚点的文件/行范围有效；contexts 每项在 32768 bytes 以内。语义另由源码复核和独立评审证明。 |
| NC/PL/阶段/决定覆盖检查 | PASS | 34 个唯一 NC 及 34 行验收、8 个 PL、E0 至 E9 共 10 单元、D-01 至 D-15 共 15 项确认状态；无模板占位；Git 只有本任务 15 个文件。 |

首次 task validate 发现原 native spec 40062 bytes 超过 32768 的注入上限。已用带权威引用和完整读取要求的聚焦研究上下文替代自动注入条目，重新 validate 无警告；没有修改全局注入配置或项目 spec。

## 3. 当前证据复核

- 直接读取了删除 handler 和现有 exchange SQL/repository：删除确实清理图片，exchange foundation 确有 office/单卡/owner 复合约束。设计补了 snapshot/媒体引用、外键/trigger/claim epoch 和关闭旧破坏性写入的迁移顺序。
- 直接读取当前 owner strict schema，确认正背 URL 和 publication enum 不能原路径无条件扩展；设计补了新版 wire 和旧客户端支持范围的评审门禁。
- 分享任务 PRD/design 原文确认 Fudaba 首个对象、canonical/Hono OGP 路线和暂缓实施边界，未以相关任务 in_progress 当完整分享已实现。
- 官方 Apple BLE 后台页面另作重点复核：服务 UUID overflow 只供显式扫描的 iOS 设备发现，广告字段与后台 scan/wake 有限制。设计不承诺跨平台后台必达，也不要求 iOS 任意广告 payload。
- 实际读取 Web i18n config/provider/resources/helper 和对应测试：运行时固定中文与存在英文资源分别记录；tag locale/翻译业务机制不擅自解除全站语言政策。
- 研究文件记录当前测试断言和官方资料来源，不代表本轮已运行产品或设备功能。

## 4. 独立设计评审

交换核心初审为 REWORK，七项已逐一修正并复评 PASS：

| 初审缺口 | 设计修正与验收落点 |
| --- | --- |
| 现有 owner 外键阻止解绑 | design §15.1，先历史回填再替换约束，pending/accepted/cancelled 和 claim epoch 验收。 |
| 频道去重与双向原子语义不一致 | §11 的 room-fill、pairOfferDigest 和确认后整对冲突；普通 mutual 不变成单向。 |
| 新版 locked 但旧版仍可操作 | §4 整卡操作锁与 safety 分开，管理员锁定同事务停止整卡新操作。 |
| 隐藏邀请及双方持有位无读授权 | §7.1 grant 签发/兑换/撤销/媒体和参与人限定 preflight。 |
| 更新展示版本改动原始获得事实 | §3 immutable acquiredRevisionId/回执与 displayRevisionId、资格及 GC 分开。 |
| 政策撤销来源混淆 | §7.2 manual/auto/silent 单独引用，统一锁序及 committed 不追溯撤销。 |
| 锁定/申诉/认领计时未闭合 | §15.2 起算事件、申诉暂停、字节/审计分开、截止后新证据申请。 |

tag 专项审查发现并修正四项，最终 PASS：

- 可检索主名称与唯一 Term 同事务维护；删除首期一词多义映射与唯一约束的矛盾，und 译名命中不再重复建概念。
- 拆分仅改术语和 canonical 映射，逐卡关联仍由作者编辑复审。
- publication/visibility/canonical 关系分开，source/term/root hidden 优先于原文和译名 fallback，旧来源不能借 active 目标重现。
- 公共池 active 资格与具体获批隐藏卡授权读取分开；provisional 标签可由合法收件人/持有者读取，不可枚举非公开池。

审查覆盖系统契约和新增标签要求，未修改产品代码，未以审查 PASS 代替实现测试。

## 5. 未执行的产品验证

API/真实 PostgreSQL 交易集成、Web unit/E2E、打包 Hono OGP、native build、BLE/NFC/红外和后台耗电/跨平台设备矩阵尚未运行。本轮没有产品实现，故这些是对应交付单元的未来门禁；没有报告为通过或阻塞。也未启动或停止开发服务。

## 6. 评审与下一阶段

设计稿可交付评审。D-01 至 D-15 有明确推荐、替代影响和实施前确认状态；这不等于产品参数已批准或满足 task start 的收敛要求。第一项需确认的是获得版本保留/新版更新与安全封禁展示，随后按相应阶段关闭其余选择。

完整文档入口为 [PRD](./prd.md)、[系统设计](./design.md)、[tag 设计](./tag-design.md)、[执行计划](./implement.md)和[验收矩阵](./acceptance.md)。

## 7. 2026-10-06 近场与权限补充

### 7.1 本次范围与证据

- 用户要求将当前调研纳入既有 `namecard-exchange-design`；保持原任务 `planning`，未创建或启动实施任务。
- 本次开始时 HEAD 为 `0e6572a5a33107e59e02eb3ba6a64889a17690a6`，Node `v24.18.0`、pnpm `11.10.0`。已有任务文件在 index 中 staged，另有三个 API build script 删除；本次保留其状态，不提交或清理这些修改。
- 新增 [近场与权限研究](./research/proximity-exchange-and-permissions.md)，同步 PRD、design §9/§12/§18、E6/E7、验收矩阵、native 研究/接入约束及两个 context manifest。
- 明确前台 BLE/GATT 的跨平台推荐、普通 Apple 蓝牙授权及 MFi 边界、首次/再次使用、多候选核对、无手动网络加入/系统配对目标和离线待同步语义。NFC reader/Android HCE 等仅作为未实测专项；后台静默保持独立。
- 最新 Core Bluetooth 官方内容直接复核了 iOS 26 CBManager + Live Activity 的部分前台权限延续；Google Swift setup 直接复核了高速热点连接的定位说明。Apple SharePlay 官方 Q&A 的靠近内容分享与系统 NameDrop 联系人控制分别记录，不泛称所有 Apple 靠近分享未开放。
- 这些结果是文档/API 可行性证据，没有产品代码、权限配置、硬件发现速度或设备互通结果。

### 7.2 本次实际检查

| 检查 | 实际结果与证明范围 |
| --- | --- |
| `pnpm run check:rules` | PASS，exit 0；4 个 agent scope、904 个 production source、30 个 contracts entrypoint、244 个 mounted method/path、25 个常规 docs 文件通过。本任务 `.trellis` 文档另查相对链接。 |
| `python3 .trellis/scripts/task.py validate .trellis/tasks/10-04-namecard-exchange-design` | PASS，exit 0；implement/check 各 15 个真实条目，引用存活且没有注入大小警告。 |
| 本任务 Markdown 本地链接及需求行检查 | PASS；13 个 Markdown、57 个本地链接目标和 2 个本地标题 fragment 有效，PRD 与验收保持 34 个 NC 要求行；不把文件存在当源码语义或实机证明。 |
| Context 大小检查 | 最大引用 22935 bytes，小于 32768 注入上限；新增近场研究 13047 bytes。完整 design 仍须依接入上下文分段读至末尾。 |
| `git diff --check -- .trellis/tasks/10-04-namecard-exchange-design` | PASS，exit 0；检查本次任务文档的 unstaged 差异格式。 |

本次未改 workspace imports、HTTP routes 或产品代码，不运行 API/Web 产品套件、native build 或真机射频测试；其未来门禁已写入 E6/E7 和验收专项。没有启动/停止开发服务，也没有 commit、push、迁移或部署。

### 7.3 本次独立只读评审

结果为 PASS，范围仅限本次近场文档增补。评审完整读取 PRD、design（含截断后半段）、implement、acceptance、两个 native 研究、新增近场研究和两个 context manifest，未发现需返工的跨文档矛盾、平台承诺夸大或本范围验收遗漏。

重点复核了前台/后台分界、首次用户授权及 MFi、central/peripheral 角色、免网络加入/系统配对的待实测性质、多候选身份和双方同意、在线完成/离线待同步/无凭据草稿、NFC 非对称原型、Google 额外权限、Apple 靠近内容分享及 iOS 26 Live Activity。D-09 仍是推荐与评审项，任务仍为 planning。

独立评审没有写文件或执行产品测试。PASS 只证明本次设计补充可交付审阅，不证明免配对、硬件覆盖、射频稳定性或后台发现已经实现，也不替代用户对最新实施摘要的批准。

## 8. 2026-10-06 当前现况与施工细化

### 8.1 范围与基线

用户要求根据当前现况完善计划的施工细节，本轮继续更新已有 planning 任务。基线 HEAD 为 `4e7b8f1ce920a0fb50d1e126436e1f4cb1d0fdbf`，分支 `release/v1.1`；Node `v24.18.0`、pnpm `11.10.0`。`task.py current --source` 报告 none；task metadata 仍为 planning。

新增 [施工现况](./research/construction-baseline.md)和 [C00 至 C14 施工详表](./construction.md)，同步 implement、design §20、验收专项、旧研究的时点说明和两个 context manifest。细化旧 DTO、新版页模型、历史快照回填、已排队 GC、账号注销的新能力、交易/outbox、两账号 UI、Hono OGP、BLE 在线/离线拆分与扩展门禁。

既有 owner Blob 图片 facade/hook 及 App 媒体回归作为复用基础；数据库旧 exchange/favorites/claim 仍分别处理。三个 API build script 独立删除保持原状态。未修改产品代码、任务状态、index、数据库、native 或分享任务；没有提交、推送、部署或服务启停。

### 8.2 本次检查

本节仅记录本轮实际结果。规则检查首次受 60 秒工具时限中断；确认该进程已结束后独立重跑，实际 exit 0，日志为 `/tmp/imsweb-namecard-construction-rules-20261006-76288.log`，完成回执为同名 `.json`，内容 `{"code":0,"signal":null}`。

| 检查 | 实际结果与证明范围 |
| --- | --- |
| `pnpm run check:rules` | PASS，exit 0；4 agent scope、904 production source、30 contracts entrypoint、244 mounted method/path，25 常规 docs；JSON wire violations 为 0。 |
| `python3 .trellis/scripts/task.py validate .trellis/tasks/10-04-namecard-exchange-design` | PASS，exit 0；implement/check 各 17 条真实存活引用，最大注入项 25542 bytes，小于 32768。 |
| 本任务相对链接与 fragment | PASS；15 Markdown、77 本地链接、3 标题 fragment 有效。 |
| 需求/施工批次/状态 | PASS；PRD/验收各 34 个 NC 行，C00 至 C14 共 15 批次；产品 checklist 完成数为 0，任务保持 planning。 |
| `git diff --check -- .trellis/tasks/10-04-namecard-exchange-design` | PASS，exit 0；只检查本任务 unstaged 差异。 |
| 独立施工复评 | PASS；前次三项跨文档依赖/迁移不一致已关闭，晚补的 GC 竞争与历史回填边界亦通过。 |

新 baseline 中的现存源码路径已查存活；列出的三个 build script 是明确标注的既有删除例外。HEAD 回读仍为本节基线，task 范围外的 dirty 项仍是这三处删除。未跑 API/Web 产品套件、数据库、设备或 packaged build；该轮检查范围为规划文档。

### 8.3 独立施工评审

只读 reviewer `254023a1-d020-4c4` 初审为 REWORK，发现主 checklist 与详表的三项不一致：E2 隐藏 grant 的阶段归属、E1 对未来撤销模块的前置要求、旧申请扩表与独立新版表的迁移选择。

已统一：E2 同批最小 grant/preflight、E3 接邀请 UI；E1 仅先完成现有生命周期/epoch，E2/E6/E7 各自启用前注册未来模块撤销；新版独立 `fudaba_card_exchanges`、旧表留历史，先停旧写再追加 history/受控取消 pending/替换复合 FK，终态 trigger 保留。旧 accepted 不生成新收藏或回执。

同一 reviewer 聚焦复评返回 PASS，三项 REWORK 均关闭；同时核对了引用/GC 共同对象行锁、generation、`live -> deleting` CAS、新引用仅可绑定 live、worker lease 和历史任务 admission，以及不伪造已丢失历史字节的 backfill 限制。结论只覆盖本次规划修订，未写产品文件或运行产品/实机测试。D 参数与旧 pending 取消建议仍需对应阶段评审。
