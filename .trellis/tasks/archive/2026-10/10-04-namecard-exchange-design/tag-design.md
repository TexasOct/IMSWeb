# 名片创作 tag 池、归并与多语言设计

> 类型：任务系统设计补充
> 状态：Draft，纳入 NC-34，待产品评审
> 权威来源：用户本轮新增要求、[PRD](./prd.md)、[系统设计](./design.md)、[标签现状研究](./research/tag-pool-and-i18n.md)

## 1. 用户行为与范围

用户制作或编辑名片时可检索已有创作 tag，也可自由输入未命中的名称。明确确认新词后系统创建或复用 tag 池条目，并关联该名片草稿；提交后标签随名片内容一起审核。标签用于表达创作材料、风格、工艺或主题，不代替担当、企划、所属团体及 AI 自述字段。

tag 池首先服务 Fudaba 名片，跨用户共享；不要求先建设全站通用分类服务。概念 ID、别名和多语言标签的模型支持后续其他领域复用，但当前合并只允许同一 `namecard-creation` scope，避免误合并其他领域的同名标签。

选中已存在 tag 的本地化名称不会创建新 tag。用户自由输入的新中文或外语词不会自动被翻译、判定同义或归并；管理端通过证据与人工确认处理。可输入标签的数量和长度有明确边界，D-15 建议每张 20 个、每词 40 Unicode code points，尚未获用户批准。

## 2. 概念、显示名、别名与关联

| 实体 | 字段草案 | 约束与作用 |
| --- | --- | --- |
| CreationTag | tagId、scope、publicationState=provisional/active、visibility=visible/hidden、canonicalTagId、version、createdBy、createdAt | 稳定 opaque ID；合并由 canonicalTagId 关系表示，不覆盖原 provisional/hidden 限制；不以 slug/label 充当身份。 |
| TagLabel | tagId、locale、displayName、description、labelVersion | 一个概念每语言一个主显示名；语言采用明确 BCP 47 标识，支持列表由运行时语言配置决定。 |
| TagTerm / Alias | termId、tagId、inputLocale、rawText、normalizedText、visibility、source | 用户原词、同义词、旧主名称与翻译检索入口；同 scope/locale/normalizedText 唯一映射。 |
| CardRevisionTag | revisionId、tagId、inputTermId、enteredText、inputLocale、sortIndex | 保存作者原始选择和术语可见性引用，不因管理归并改写审核快照。 |
| TagMergeEvent | eventId、sourceTagIds、targetTagId、expectedVersions、conflictResolution、actor、timestamp | 可审计的归并操作及前后映射。 |
| TagUsageProjection | canonicalTagId、qualifiedCurrentCardCount、projectionVersion | 当前公开获批名片的去重计数；仅作检索排序，不用私有名片数当公开热度。 |

主显示名可翻译、改名，tagId 保持不变。别名属于检索词，不同语言名称属于主显示名，二者不混作一张任意 JSON 字典。原始词与 normalizedText 分开，归一化采用 NFKC、首尾空白和明确大小写规则；不得去掉会改变意义的标点或变音字符。过长、全空白或不允许的控制字符显式报错，不能静默截断。

每个可检索 TagLabel 必须在同一事务同步对应的唯一 Term；新增/改译名若撞到另一 root 的同语言词，则返回冲突，不能让 label 已显示却无法按该词检索。旧主名称变为保留 termId 的别名，原文和可见性引用仍能查证。首期不支持同 scope/locale/normalizedText 同时映射多个概念；不同语言同形词可分别存在，未知语言输入命中多个 root 时返回 TAG_AMBIGUOUS 让用户选择已有概念。

用户输入语言未知时使用 `und`，不因为界面是中文就声称标签内容为中文。输入框可让用户声明语言，但不强制填写；管理端可以核实语言并补 labels。不同语言的同一字符串可能属于不同概念，检索返回候选 ID 与必要描述，歧义时由用户选择，不自动归并。

## 3. 建池与名片版本

1. 用户在已有名片草稿中输入词。候选搜索返回 active tag 的该语言主名、别名命中、是否已有关联及最小公开使用量。
2. 用户明确选择「创建新标签」时提交 rawText/inputLocale 和幂等键。服务端先解析可检索主名/别名，再在唯一 term 约束下 create-or-resolve；同 scope、inputLocale 和 normalizedText 的并发输入得到同一 concept。und 输入跨语言命中同一个 root 时提示复用，命中多个 root 返回候选并要求明确选择；不能用未知语言绕过已存在译名创建重复概念。
3. 新词先是 provisional，草稿作者和管理员可见；获批公开名片引用后激活，未获批草稿不能单独污染匿名公共候选。首次仅用于获批隐藏卡的新词仍留在非公开池，但具体授权收件人/持有者可在该版本内读取合法原文，按第 6 节的 resource-context 策略处理。
4. 名片提交保存 CardRevisionTag 和 enteredText，关联及顺序属于内容 hash；编辑标签与改图片一样产生新内容版本和审核差异。
5. 旧标签合并后再次选词，会解析到当前 canonical ID；已经获批的 revision 保留原 tagId 与原文，canonical 解析作为派生索引，不改旧 content hash、回执或 acquiredRevisionId。

新增词和编辑名片复用当前身份、CSRF/bearer、配额与审核边界。仅为搜索候选不创建标签；取消草稿不创建公开使用量。无任何名片引用的 provisional 条目可在保留期后清理，但被审核/收藏快照引用的 stable ID 不物理删除。

隐藏或删除 tag 不等于删名片。管理隐藏后，该概念和禁止公开的别名退出匿名检索与展示；本人编辑和管理员保留必要原文及原因，合法名片图片与交易记录仍受原有状态轴控制。禁止以创建同词新 tag 绕过 hidden 条目，命中禁用词时进入明确人工核查。

## 4. 管理端归并

归并流程包含检索、预览、冲突解决、确认和审计：

1. 选择一个目标概念和一个或多个来源 tag，服务端解析 canonical root；预览展示各语言名称、别名、隐藏状态、来源和影响的当前名片数量。
2. 同 locale 存在不同主名称时，管理员明确选择保留哪一主名，另一名称可作为别名；不能无提示覆盖已经审核的翻译。
3. 相同 locale/normalizedText 别名已指向第三个概念时，返回冲突与处理选项。首期只能明确将第三概念纳入本次同义审核、重命名冲突词，或保持原映射并取消该变更；不提供与唯一 Term 约束矛盾的一词多义映射，也不能抢占检索词。
4. 同事务按固定 tagId 顺序锁所有相关 root 和 term，校验 expectedVersions、scope 与状态，拒绝自合并、环和失效预览。
5. 所有来源根和既有归并子项通过 canonicalTagId 直接指向目标 root，保持解析一跳或受明确上限约束，UI 派生 merged 状态。保留来源 publicationState/visibility；迁移 terms/labels 也尊重原词隐藏标记，provisional 或 hidden 不因指向 active root 自动公开。
6. 写 TagMergeEvent 与投影重建 outbox。读请求基于当前 DB canonical 状态和 live visibility，不能让过期搜索缓存泄露隐藏名。后续重建计数和搜索索引可重试、可重跑。

同张名片同时带来源和目标标签时，当前展示、过滤与计数只算一次 canonical tag；原始 CardRevisionTag 行保留作者当时的输入次序和署名事实。源 tagId 仍可作为旧筛选参数解析，不能返回不存在而让旧链接和本地日志失效。

这是管理术语的归并，不是批量修改名片内容。归并后无需对所有旧名片重审；如果管理方要改作者 enteredText 或增删标签关联，仍需走新的名片内容版本。

## 5. 撤销、拆分与并发

管理端提供事件记录和逆向预览，但不能承诺任意归并都可一键精确撤销。若没有后续归并、名称/别名变更和新引用，可按 event expectedVersions 生成受控逆向事务；如已有后续变化，创建显式拆分操作，管理员只选择术语、语言名和原 source ID 的 canonical 映射，不按单张名片重写关联。

拆分不能凭空把历史 CardRevisionTag 和已交换回执改成新的创作事实。旧 stable ID 的历史输入仍可查证，新版本按拆分后的概念选择。撤销/拆分也产生 audit 与 outbox，并有 stale-preview 冲突。

需要重新分类个别名片时，由作者编辑 tagId/enteredText 并提交新内容版本复审；没有管理端静默逐卡改 CardRevisionTag 的能力。新引用不会按 enteredText 猜测它应该回到哪个来源概念。

归并与用户新增/关联并发时，写入最终解析 canonical root 并在提交前复查 version；源被合并后不能继续增加独立 active term。当前接口返回 canonical ID，客户端刷新选择器，不丢掉用户原文。管理接口重复幂等调用返回同一 merge event，不同 payload 复用同键返回冲突。

## 6. tag i18n 与 fallback

tag i18n 是运行时业务内容翻译，不把用户自由词塞进前端静态 UI 文案文件。Web UI 的「创建标签」「合并」等界面文案遵守现有语言机制；TagLabel 通过 contracts/API 交付。

API 明确接收 locale 或返回完整已获批准的 labels，选择哪一种依 payload 规模确定。列表默认返回 resolvedLabel、resolvedLocale、fallbackUsed 及 tagId；后台返回完整 labels 和审核状态。缓存 key 包含 locale、canonical mappingVersion 和公开资格，不能用中文结果满足日文缓存请求。

当前全站 UI 运行时固定中文，虽然已有 en 静态资源。TagLocalePolicy 独立于 UI SupportedLanguage，默认 tag 显示跟随当前中文；后台提供语言编辑/预览，用户通过明确的「标签名称语言」偏好或筛选控件指定 requestedTagLocale。建议首批 tag 语种 zh-CN/en/ja，语言集合属于 D-15；不因此解除全站 provider 的固定中文。未开启 tag 语言选择能力时，保存翻译、API 显式 locale 和后台预览仍可用，前台使用默认 fallback。

tag locale 使用独立 resolver 和已配置 BCP 47 列表，不调用当前只解析 zh/en 的 `resolveLanguage` 处理 ja。公开搜索和名片/册输出明确 requestedTagLocale，管理接口返回完整 labels；本期不把标签业务翻译混入全站资源 key。

推荐 fallback 顺序：精确 locale → 已配置的同语言父级/区域映射 → tag 指定默认语言 → 第一个获准可展示名称 → 原始创建词。最后一级不伪装为已翻译结果，fallbackUsed 和真实语言可供 UI 标示。语言继承关系来自配置，不能仅按字符串截断把不同书写体系合并。没有翻译时标签仍能显示和筛选，不创建新的 ID。

管理员补译时保留谁改、何时改、labelVersion 和冲突版本；导入/导出带 stable tagId、locale、文本和版本，不按列位置推断对应关系。首期采用人工维护，机器翻译如以后接入只能做待审建议，不自动发布或合并。

名片详情和持有快照保留作者 enteredText，必要时另展示规范标签的当前本地化名称；搜索/筛选面板使用本地化规范名，均按 stable/canonical ID 查询。切换语言只改显示，不改关联、顺序、cardId 或交易摘要。

显示策略区分 pool-context 与 resource-context。匿名公共候选/热度要求 active 且 source/term/root 可见；名片的 private grant 收件人和 CollectionEntry 持有者凭具体获批版本的读取权，可展示该版本的合法标签，即使概念仍为 provisional。只能读取这张卡实际引用的词，不能凭持有一张卡枚举非公开 tag 池。自己的名片册标签筛选也只从自己的条目产生候选；后续有公开获批引用时激活池条目，不改原关联或交易。

两类 context 均在 fallback 前检查来源 tag、inputTermId 和 canonical root 的管理可见性。source/term/root 任何 hidden 都显示「标签已隐藏」占位；公共搜索/筛选/计数同时排除。即使目标 root active，也不回显隐藏 enteredText。所有名称不可展示时也用占位，不能回退隐藏创建词。作者本人编辑和有权限的审核者可读取受保护原文及理由；缓存/搜索命中必须重新执行同一规则。provisional 的非公开池状态本身不能抹去合法受邀/持有者对获批标签的读取权。

## 7. HTTP 与 contracts 草案

继续在 Fudaba scope 内新增 `card-tags` capability 和 `@imsweb/contracts/fudaba/card-tags` 子模块，Web endpoint 镜像组织；paths 统一拥有 shared prefix。所有表名和 suffix 是提案，实施前与现有结构对账。

| 动作 | 方法与 suffix 草案 | 约束 |
| --- | --- | --- |
| 搜索 | GET `card-tags?query&locale&cursor` | 匿名只出 active、当前可公开词；明确 locale fallback，固定上限/分页。 |
| 自定义建池 | POST `me/card-tags/resolve-or-create` | 登录、幂等、normalize/unique、限额；仅返回合法可关联概念。 |
| 名片关联 | 使用卡片 create/update/submit 的 tags 字段 | 严格结构，stable ID + enteredText/inputLocale，owner 固定，审核版本化。 |
| 公开/名片册筛选 | card/collection 查询中的 canonicalTagIds 与 AND/OR | 单卡同 canonical 去重；旧源 ID 自动解析；隐藏/私有计数不泄露。 |
| 管理池 | GET `admin/card-tags`、PATCH `admin/card-tags/:id` | Backoffice；state、默认语言、规范名与原因审计。 |
| 标签翻译 | PUT `admin/card-tags/:id/labels/:locale` | expectedVersion、locale 校验、同语言冲突处理。 |
| 归并预览 | POST `admin/card-tag-merges/preview` | source/target、版本、术语/语言冲突和引用影响。 |
| 归并提交 | POST `admin/card-tag-merges` | 预览版本 + 冲突决定 + 幂等键，事务与审计。 |
| 撤销/拆分 | POST `admin/card-tag-merges/:id/reverse-preview`、POST `admin/card-tag-splits` | 后续修改检测，受控变更，不改历史回执。 |

建议错误包括 TAG_INVALID、TAG_DISABLED、TAG_LIMIT_EXCEEDED、TAG_AMBIGUOUS、TAG_MERGE_CONFLICT、TAG_MERGE_CYCLE、TAG_LOCALE_INVALID。错误结构按现有 Fudaba error policy 扩展，不能另写局部 JSON schema。新请求 strict，响应 exact，API schema 执行仍限于 request boundary。

## 8. 查询、迁移和发布

标签查询至少需要 `(scope, state)`、`(scope, inputLocale, normalizedText)`、`(revisionId, tagId)` 和 root 解析索引，具体搜索方式依当前查询技术和数据量决定，不新增搜索服务作为首期依赖。usage projection 统计公开资格的 distinct cardId，不按 alias 行数或当前用户量计数。

既有名片没有标签时返回空数组，不从 bio、trade note、团体或 AI 标记自动抽取。当前获批版本的 tags 空值迁移不触发再次审核；用户新增 tags 产生新版本。离线 manifest 和 receipt 使用的 content hash 已涵盖 tags 原始引用，但管理端后续翻译/归并不改变该 hash。

先部署 tag 表/contract 和只读查询，再接 owner 输入与审核 diff，再开公开筛选，最后开管理归并/i18n。归并功能发布前，所有读写消费者必须能解析旧 source ID；否则只读保留 mapping 并关闭归并写入口。回滚不删除 tag/alias/merge 表或修改快照，保持读取 canonical root 的兼容服务。

## 9. 验收

- 用户输入未匹配词可显式创建，输入已存在的翻译或别名复用同概念；并发与重试不生成重复池项。
- provisional 不污染公共候选，名片审核通过后可发现；隐藏词不能靠同词新增或旧缓存重现。
- 管理端合并中文/英文同类词后，旧 tagId、过滤 URL、名片册和离线记录继续可解析；同一卡规范标签、计数只算一次。
- 同 locale 名称冲突、别名第三方占用、环、self-merge、并发归并和 stale preview 均有明确失败；不静默丢翻译。
- 新增/改 TagLabel 同事务创建/更新唯一 Term，原主名保留 termId；und 输入已有译名不创建重复概念，跨语言歧义需明确选择。
- 切换 locale 显示已维护译名；缺译用可追溯 fallback；不创建重复 tag，也不改卡片原始标签、获得时间或回执。
- 更新语言名不修改内容 hash；用户编辑 enteredText 或关联则重审；已交换快照原文可保留，管理隐藏显示必要占位。
- 隐藏来源合并到 active 目标及全部译名不可展示时，公开/持有者输出占位；原文 fallback、过滤和热度不得绕过隐藏。
- 首次自定义词仅用于获批隐藏卡时，受邀者/合法持有者可在该版本读取原文和参与个人筛选；匿名 tag 池不可检索，管理 hidden 仍覆盖此权限。
- 撤销安全前提和显式拆分可复核；后续改动不能被一键归并逆转覆盖。
- HTTP 401/403/409/429、contracts raw-equality、PostgreSQL unique/transaction、Web 输入/locale/filter 和管理 merge preview 具备对应测试。

## 10. 产品建议的确认范围

D-15 推荐：标签可选；跨用户共享 Fudaba 创作池；显式建词、provisional 随获批名片激活；每卡 20 个、每词 40 code points；原文快照 + 当前规范词本地化；人工归并和翻译；tag 语种 zh-CN/en/ja，与固定中文 UI 独立。可选替代为新词立即公开、更高标签数量、只显示规范译名或要求先管理审核独立标签。公开时机、语言、数量及显示选择会改变噪声、存储、原作者表达与体验，须在 E1/E2 实施前确认。
