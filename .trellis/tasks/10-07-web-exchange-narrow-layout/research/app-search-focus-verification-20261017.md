# App 搜索聚焦修订验证

## Scope and current status

权威需求为 [F1–F8](./app-search-focus-20261017.md)。用户已批准实现；代码位于 `.worktrees/exchange-search-focus` / `codex/exchange-search-focus`，基线为 `ccb93917eb052399fc891cbd66102c2e077be906`。本记录只描述本轮 App 增量；原始规划的全部 AC、历史宽矩阵和历史 PASS 不视为本轮重跑。

Shared/DOM 与 UIKit 的本轮实现及核心验证已完成，F5 减少动态效果回归已在修复包复验。用户已授权将验收交付提交、合入本地 `release/v1.1` 并推送；实际执行结果另存于工作区 `data/verification/release-integration-20261017`。原任务保持 `in_progress` 并保留下文未覆盖的 Android/手动宽矩阵，不把原始规划的全部 AC 标为完成。合并前主工作区七处既有暂存变更、HEAD、分支、staged entries、原始索引字节及已有文件 hash 已逐项确认与入口快照一致；合并时继续保留原有暂存条目和工作文件，不纳入此次提交。

### User acceptance

用户在 F8 最终交付后明确回复“验收通过”，当前交付已获用户确认，包括 Android 折叠搜索条恒定 44px、独立 More 44×44px 和工具行/导航 12px 间距。对应结果入口为工作区 `data/verification/android-search-size-20261017/report/index.html`。用户验收与命令/设备覆盖分开记录：保留原有失败、阻塞及未运行项，不把它们改为自动化 PASS。用户随后明确要求“合并到本地的release/v1.1然后推送”，提交及推送授权已具备；不额外发起手动部署或制品发布。

## Implementation and shared contract

- App 激活直接使用 `large`，覆盖真实安全可用区域及键盘以上区域；普通 Web 的 detent 保持原行为。
- 编辑状态与展开状态分离。取消/选点先退出输入，保留内容和导航/地图抑制，动画完成才提交折叠并恢复非输入入口。UIKit 使用既有 `detent: collapsed` 完成事件；DOM 使用 height transition 完成及清理超时。
- 原生折叠搜索条/独立圆形更多均为 44pt，间隔 12pt；工具行独立。F8 后 DOM 折叠条同样固定 44px，不随导航主体增高。聚焦及保留退出期间不显示或拦截独立刷新/定位皮肤。
- 唯一新增 app-local 布局字段为导航事件的可选 `bodyHeight`；有限值范围为 44 至当前 viewport 高度。无真实公开绘制主体 API 时原生发布保守 44pt；不把安全区、透明 host 或整个 tab strip 当作可见主体。
- 实际浏览器截图发现背景伪元素遮住“查找地点”。已用局部绘制层级修复，重新检查真实文字；输入截图等待几何和有限动画完成。最初失败图片继续保留。

## Verified checks

| 检查 | 结果与范围 |
| --- | --- |
| `pnpm --filter @imsweb/web run test:unit tests/unit/pages/community/exchange tests/unit/pages/community/community-exchange-app-page.test.tsx tests/unit/lib/native-glass-search.test.ts tests/unit/e2e/unit-source-policy.test.ts` | exit 0，26 文件 / 213 用例；后续仅 CSS 层级和 E2E 截图等待修订，不重复无关单测 |
| `pnpm --filter @imsweb/web run test:e2e:app app-map.spec.ts --grep 'keeps DOM search\|selects a searched' --project app-small --project app-iphone --project app-android --project app-landscape` | 修复后 exit 0，6 passed / 1 既有项目条件 skip；320px、iPhone、Android、横屏 DOM fixture，不代表 Android 原生运行 |
| Web `lint` / `typecheck` | 最终均 exit 0；原生交接目录有日志及独立 `.exit` 回执 |
| canonical Web `format --ignore-path <临时范围文件>` | exit 0，运行前后完整 tracked diff 字节一致。全局只读预检发现 11 份非本任务文件的既有格式问题，逐一确认与 HEAD 完全相同后用临时范围保留它们；未改持久配置，临时文件已删除。不声称全项目格式预检通过。 |
| E2E source-policy unit | exit 0 |
| `pnpm run check:rules` / `pnpm run check:boundaries` | 均 exit 0；规则、文档、JSON/非 JSON 边界及跨 workspace 归属检查通过；回执保留在工作区 `data/verification/app-search-focus-20261017/quality` |
| task context validate | 初次通过但有两份超过 32KiB 的注入截断警告；改为注入索引并要求直接读取相关完整章节，最终 implement 5 / check 11 条引用通过且无警告。修正旧 A 合同 reason，明确 F1–F6 优先。 |
| 生产 Swift `ExchangeSearchLayout` / `GlassSurfaceGeometry` | 分别 47 / 32 用例通过；不是 UIKit 视觉或真实事件穿透证据 |
| `node --test apps/web/tests/native/exchange-search-geometry.test.mjs` | exit 0，13/13；验证器回归不替代设备运行 |
| canonical `pnpm run app ios --device 52A5E5D1-9DAB-4D95-8D9E-38867063A907 --release`，三项 origin 显式指向本地 fixture | 最终 exit 0，实际构建、安装、启动 |
| 同一最终包的 edit/results/gestures | 3/3 passed；真实键盘、显式提交、结果滚动、直接下拉退出 |
| 同一最终包的 selection/filter/modals | 3/3 passed；选点/清除/筛选/名录/More 来源返回 |
| `git diff --check` / `git diff --cached --quiet` | 实现者最终检查通过；最终文档收尾后仍须再检查 |

F5 修复前的最终核心包回执目录为 `/tmp/imsweb-search-focus-entry.edLdfH/native-lane`。`build-modal-final.log/.exit`、`modal-final-source.sha256`、`modal-final-binary.sha256`、`modal-final-installed.sha256/.path` 取代其较早的 integrated 绑定。该包构建和安装的 executable SHA-256 均为 `b8a06c6ab344d8d8d95862477bbd41783ea3a70639a1ef660966228e454d4594`。核心流程回执为 `modal-final-replay.log` 和 `modal-final-modals.log`。它们不替代后续 F5 修复包的源码/二进制绑定。

## Current native media and geometry

测试设备为本轮自有 iPhone 18 Pro / iOS 27，402×874pt，原始截图 1206×2622（3×）。原生浏览态搜索 `[20,679][326,723]`、更多 `[338,679][382,723]`、工具行 `[20,735][382,779]`；输入态表面 `[8,62][394,534]`、真实键盘 top 546；结果态 `[8,62][394,828]`。

公开导航 docking `[0,791][402,874]` 不是可见主体。原始图人工轮廓估计约 y791..853（约 62pt）大于 44pt 搜索条；该观察不声称精确公开玻璃 frame API。`final-collapsed.png`、`editing.png` 和 live large→extra-large 的 `final-xl.png/.json` 早于最后一行“模态接管时隐藏 detached More”的修复；后续未改变其几何或字体。

`modal-final-transition.mp4` 是 F5 修复前核心包的展开/键盘/结果/滚动/下拉/收起录像，独立检查已解码并检查过程帧。较早 `final-transition.mp4` 和 `drag-settle-contact-sheet.png` 含带时间戳过程帧，后续仅修改模态接管时的 More 隐藏。F5 修复包的原始录像及对照帧见下文；不能把终态截图当作连续动画证明。

## Recovered review and Reduce Motion regression

独立检查 `d252855e-66ca-4938-a117-033c02c92490` 首次超时，原始 output/meta 的 rejected 状态保留；同一 retained session 的恢复 run `da38bda4-2830-4022-bd40-bf54ee9fef2d` 已完成完整交接，逐一核对六份生产源码 hash 与原 cutoff 一致，结论为该源码和已检查核心证据的 scoped PASS，明确排除补充原生矩阵。LSP 为两份确认 clean、一份 CSS `line-clamp` 兼容建议、五份 push-only 结果不充分；静态 typecheck/lint 回执单独有效，未把沉默当作 clean。

补充验收 `926edf54-4f16-429c-b181-3ff4454483dc` 同样超时；恢复 run `ebb90c5e-5d3f-41a9-afa6-96d42d79b169` 已交接 **REWORK**，不把超时或三次终态成功当作动画 PASS。402pt 设备横屏真实键盘、显式提交、滚动后选点、纵向路由退出/重入已操作；横屏选点最初自动化点到可见列表外的失败仍保留。长地址只见部分字形，不声称完整阅读；重入 caption/query 回到初始状态也不推导新的跨路由持久化要求。

F5 失败原图为 `native-acceptance-extension/reduced-dismiss-11.4-12.0.png`，从 `reduced-motion.mp4` 以 20fps 提取，可见约 250ms 的收缩/淡出。设置页 `REDUCE_MOTION` 从 0 切换为 1，三次 expand/cancel 终态正确，但这些断言不能测动画时长。

父会话随后在同一安装包、同一 PID 23197 中用只读 LLDB 直接验证公开 UIKit 状态：设置关闭时 `UIAccessibilityIsReduceMotionEnabled() == NO`，实际设置开启并无重启返回后为 `YES`；创建独立 `UIViewPropertyAnimator(duration: 0, curve: .easeInOut)` 后读取 `.duration` 得到 **0.2**。因此确认是零时长 property animator 的默认时长，而非猜测设置未传播。恢复原设置后再次读到 `NO`，已 detach。三份原始 LLDB 日志和实际设置操作回执位于工作区 `data/verification/app-search-focus-20261017/reduce-motion-diagnosis`。

修复仅涉及 `GlassSearchView.swift`：开启减少动态效果时完全绕过 property animator，在 `UIView.performWithoutAnimation` 内调用与正常 `.28s` 收起共用的、受 `settling` / `.end` 约束的完成路径。独立增量审查 run `f24cd4c3-b0e2-4475-a1e0-7aafef3da9dc` 已完成 scoped PASS，核对 Swift hash `66d98275bfba49cdd11e47c672da363e140420334e23df32b7f22b9a8faad8f4`，其余五份生产源码与原 cutoff 一致；不把源码审查当作运行证明。

修复包证据位于 `native-lane/reduce-motion-fix`。canonical Release wrapper 首次已编译但安装阶段工具超时，`build.log` 不记为完整成功；同命令重试 `build-retry.exit=0`。构建和安装的 executable SHA-256 均为 **`16673c43214635c048710839f98c73aa7404e3c29578dc1ee3e9895e48ff75d4`**。包路径、源码和二进制绑定分别为 `installed.path`、`source.sha256`、`binary.sha256`、`installed.sha256`。

同一修复包 PID 19924 中父会话直接确认公开 Reduce Motion flag 为 `YES` 并 detach。`reduced.exit=0` 记录三次取消；`select.exit=0` 记录选点/清除；`modals-retry.exit=0` 记录筛选、名录与来源返回。最初 `core.exit=1` / `modals.exit=1` 是结果仍展开而下一流程要求折叠的前置状态错误，明确取消后无源码修改完成重跑，失败回执保留。

`reduced-cancel.mp4` 与原始连续解码帧 `first-dismiss-native-frames.png` 显示展开结果直接切换到折叠条，没有此前逐帧收缩的展开面板；父会话独立检查了该图。系统导航恢复仍是独立系统行为，不声称全屏完全没有动画。实际 Settings 恢复后，同一 PID 公开 flag 为 `NO` 并 detach；`normal.exit=0`、`normal-cancel.mp4` 及父会话检查的 `normal-contact-sheet.png` 保留普通展开、键盘、结果和带保留内容的收起。两台录像进程均已明确停止。

实际投递补测也已完成：在 402×874pt 的折叠布局中，从 12pt 间隔内 `(83%,80%)` 开始滑动后，request ledger 从 134 增至 135，新增地图 offices bbox GET，`gap.exit=0`；父会话随后从 pill 左上透明圆角 `(5%,78%) ≈ (20.1,681.72)pt` 滑动，ledger 从 135 增至 136，保留完整前缀并新增不同 bbox，搜索保持折叠且没有输入框。后者原始前后 ledger、命令、坐标和结果在工作区 `data/verification/app-search-focus-20261017/native-hit-delivery/corner-receipt.json`。这是实际 MapLibre 视口请求投递证据；合成地图只有背景层，不声称真实供应方图块的像素/相机画面对照，也不声称所有圆角都逐一重跑。

### Bug Analysis: zero-duration property animator

#### 1. Root Cause Category

**E / 隐式假设**：把零时长 property animator 等同于立即完成。另有 **D / 测试覆盖缺口**：编译、纯几何和三次最终状态断言均不能观察中间动画。

#### 2. Why the original path failed

最初已读取减少动态效果开关，但只把时长传成 0；真实 UIKit 将其解析为 0.2s。没有追加猜测性设置刷新或多层补丁：同进程公开状态与独立 animator 的实际时长把设置传播和键盘假说区分开。

#### 3. Prevention Mechanisms

| 优先级 | 机制 | 本轮动作 |
| --- | --- | --- |
| P0 | 结构 | 减少动态效果直接复用受保护完成路径，不创建 property animator |
| P0 | 运行验收 | 同进程读取公开 flag，检查原始连续帧，区分 App 面板与系统导航动画 |
| P1 | 规范 | 已写入 `tauri-mobile-integration.md`，避免以后把 Settings/终态成功当作动画证明 |

#### 4. Systematic Expansion

本轮复核范围为搜索收起、重入中断和 live setting 完成路径；未声称审计全仓库动画。现有纯 Swift 几何 runner 不实例化真实 UIKit，因此没有增加镜像源代码的断言来冒充动画回归。

#### 5. Knowledge Capture

原生规范和当前验证记录已实际更新；该应用仓库不维护 Trellis 上游 `src/templates/markdown/spec/`，不创建模板副本。规范与源码属于同一待审提交批次，仍遵循现有一次性提交确认规则。

## Android DOM docking follow-up (F7)

用户从截图指出工具行与底部导航之间空白过大。根因是折叠布局使用全局 `--app-bottom-clearance`（84px 加底部安全区）再加 12px，而可见 DOM 导航已经按自身安全区 offset 定位；34px 安全区、58px 主体时形成约 47px 间隔。

修复只涉及页面私有 DOM docking helper/接线和对应测试。存在位于宿主及 visual viewport 内的可见 DOM 导航时，用其 top 减 12px 替代原预留；缺失、无效或被键盘裁切的导航保持 fallback。普通 Web、原生导航、展开/键盘路径不改协议，不修改 AppTabBar 或全局 scroll padding。

原始复现、修复及静态回执单独位于工作区 `data/verification/android-docking-20261017`：

- `red-browser.json/.log`：exit 1，Android 的新增 docked 断言实际失败；失败原图与 trace 保留。
- `green-browser.json/.log`：exit 0，App Android/small/iPhone/landscape 四项目通过。每项目覆盖 0/24/34px 安全区与 16/20px 字号，并继续全屏、取消、下拉退出和减少动效流程；每种组合的实际工具行/导航间隔为 12px。
- `units.json/.log`：exit 0，9 文件 / 96 用例，包括 docking fallback/坐标转换、搜索/遮挡和 E2E 源规则。
- Web lint/typecheck 均 exit 0；canonical format 只改变两份本任务测试的排版。11 份非本任务既有格式文件先逐一验证与 HEAD 相同，再用临时 ignore 文件排除；临时文件已删除。
- 实际原图检查：默认与较大字号下搜索、更多、工具和导航完整可读，没有旧的大块留白。LSP 两份确认 clean、两份 push-only 不充分，另有五条受既有策略抑制的 findings；不声称全部 LSP clean。
- App target `build:app`、本轮最终仓库规则与 workspace boundaries 均 exit 0。只构建浏览器 App 资源，不是新的 iOS/Android 安装包。
- 独立 reviewer `805aaff5-59eb-4809-8265-aeecbd132009` 完成 scoped PASS，并核对两份生产源码 hash；完整交接为该证据目录的 `independent-review.md`。未发现阻断项；取消/选点后精确 12px 的结论来自重测接线审查，未声称新增了对应运行几何断言。
- 用项目新增报告生成器产出 `report-v2/overview.png`、33 原图自包含 `index.html` 与 `results.md`。4 个必需 DOM 用例与修复前 REWORK/原生 UNRUN 分开；33 张图不是 33 项核心测试。全部图片 decode、筛选、放大/Escape、33 次限速原图下载 hash、390px 无横向溢出、无文件 base 展示、无页面错误/网络请求均实际验证。首轮缺少主工作区依赖导致的生成失败保留，frozen install 后新目录重试成功；没有覆盖旧截图/manifest。

这批浏览器截图是 App DOM fixture 证据。之前的 UIKit 原生包、源码审查和冻结 evidence manifest 继续保留其原绑定；本次没有重建 iOS 或完成 Android emulator 运行，不能把新图册标为原生包验收。

## Android constant collapsed height follow-up (F8)

用户继续要求 Android 搜索框大小恒定。实际 CSS 原为 `height: max(44px, var(--exchange-navigation-body-height, 44px))`，把导航高度耦合到搜索表面；大字级改变导航后，搜索条也随之变高。生产修复只有 App collapsed selector 中的高度改为 44px；不改变普通 Web、全屏输入、导航位置或桥接合同。

本轮证据独立保存在工作区 `data/verification/android-search-size-20261017`，不覆盖 F7 图册、原生包及原始冻结记录：

- `red-browser` exit 1：新增实际边界高度断言期望 44，Android 默认实际为 58；原图/trace 保留。
- `green-browser` exit 0：Android/small/iPhone/landscape 四项目通过，每项目的 0/24/34px 安全区 × 16/20px 字号组合均实测搜索条高 44px、More 为 44×44px、导航间隔 12px，地图间隙可穿透；原有全屏、取消、下拉退出和减少动效流程继续通过。
- `selection-browser` exit 0：iPhone/landscape 两项既有显式提交、选点、来源返回及清除回归通过。未声称新增 Android 选点或放大字号选点的独立运行覆盖。
- 实际检查 Android 默认/20px 字号与 iPhone 选点原图；搜索标题、更多及正常选点摘要可读。Web lint/typecheck 均 exit 0；canonical format exit 0 且受测 CSS/test 字节未改变，11 份原有基线格式文件未改，临时 ignore 已删除。CSS LSP 仅报告原已存在的 `line-clamp` 标准属性兼容建议，无新增错误。
- 单元逻辑及生成器未改，不重复执行历史 213/96/5 项测试或将历史结果计作本轮新运行。新总览/报告继续按 App DOM 证据归属；不是 Android 安装包或新的 UIKit 运行验收。
- 本轮 `build:app`、`check:rules`、`check:boundaries`、task context validate 均有 exit 0 终态回执。规则运行的外层工具曾报 55s 超时，但随后回读三个 JSON 终态及完整日志确认实际命令已完成，没有据外层超时直接重跑或判 PASS。
- `report/overview.png` 对照默认与 20px 字号的前后尺寸；图册收录 38 张本轮运行图和 2 张诊断图，必需用例为 6，不把图片数当作测试数。图册逐张解码、筛选/放大/Escape、40 次限速下载及 hash、390px 布局与无文件 base 渲染均通过，没有页面错误或 HTTP(S) 请求。
- 图册验证器最初两次并发 decode 出现 `EncodingError`，原失败 JSON/log/脚本及诊断保留。图片和生成器未改；验证器在实际加载完成后逐张严格 decode，40 张全部成功。没有加入错误吞没或重试循环，也不推断未经验证的浏览器内存根因。

## Remaining limits

- 未完成：紧凑 375pt / 宽屏 440pt 的最终包观测、全部透明圆角组合、真正中途打断的连续操作和 during-settle live Reduce Motion 切换。已完成的间隔/一个圆角投递和串行重入不扩大为完整矩阵。
- Android `app:doctor` 通过，但当前 emulator 三次启动均出现 `hvf is not enabled on this aarch64 host` / `qemu_mprotect__osdep: mprotect failed: Permission denied` 并停留 offline。普通进程与命令级 HVF 开关均未解决；安装的 JIT/hypervisor entitlements 只读检查存在。未改共享签名、SDK、系统或 shell 配置。回执为 `native-preflight/android-runtime-blocker.json`；三个任务自有失败进程已停止。
- WebKit 下载超时未完成；当前浏览器结果是 DOM fixture 覆盖。不能把它当作 iOS UIKit、Android 安装包或旧 iOS WebKit 运行证明。
- 原生 IME、VoiceOver、真实 XCTest host、真实地图/搜索供应方和物理设备仍未验证。它们不因普通拉丁输入、AX 完整文案或编译通过而自动获得 PASS。
- 补充验收及审查若修改产品源码，必须刷新对应门禁、安装包/源文件绑定和受影响的 review；保留旧 REWORK 与失败回执。

## Evidence retention

父会话已将 Shared/DOM、原生核心包、F5 失败补测、修复包原始媒体/日志/hash、预检和独立审查交接复制到工作区忽略的 `data/verification/app-search-focus-20261017`。该目录的 README、最终 source/evidence manifests 和主工作区保护回执作为本地入口；原始超时/rejected、失败安装与错误前置条件的记录继续保留。临时 agent profiles 和自动生成的 Android icons 不进入产品提交。源码和证据均不发布到外部服务。
