# App 搜索条与聚焦全屏修订

## Authority and scope

用户于 2026-10-17 明确要求“现在开始实现”，并要求 iOS、Android 逻辑一致。本修订延续既有 in_progress 任务，覆盖历史 A 方案中与以下要求冲突的搜索条高度、更多位置、App 聚焦档位和聚焦态刷新规则。其他业务与历史验收记录保留。本轮独立工作树为 `.worktrees/exchange-search-focus`，分支 `codex/exchange-search-focus`，基线 `ccb93917eb052399fc891cbd66102c2e077be906`。

## Requirements and acceptance

- F1：App 折叠态搜索胶囊的可见高度不得超过同机型下方导航栏可见主体高度；不能把安全区或透明容器算入导航高度。保留至少 44pt/CSS px 命中区、可读文字和大字级可用性。
- F2：更多从搜索胶囊中分离成独立圆形按钮，仍位于搜索条右侧的原相对位置。两者之间可见间隔，圆形按钮不挤压文字；实际命中只属于可见表面。
- F3：iOS 和 Android App 激活搜索立即进入安全区内的全屏搜索表面，不先停在半屏。软键盘、查询、提交和结果阅读使用同一套状态规则。下拉手柄/标题区直接收起并退出聚焦，关闭/取消及系统返回/键盘退出沿既有语义提供等价操作。不得因恢复焦点重新弹出键盘。
- F4：App 全屏聚焦/搜索态不显示独立刷新控件；刷新功能原有浏览态/更多/名录所有权按现状保留，不改请求语义。
- F5：聚焦到非聚焦的几何、内容和导航恢复协调过渡，拖动结束连续吸附，不先卸载内容或瞬间跳到最终布局；反向展开使用一致动效。系统减少动效仍受尊重。
- F6：显式提交、最少字符数、错误/重试、IME、结果和选点保留、来源署名、筛选/名录/来源互斥、能力失败清理与桌面行为保持现有合同。原生与 DOM 不能同时显示或留下透明拦截层。
- F7：用户在截图反馈中补充要求处理 Android 工具行与底部导航之间的过大留白。DOM 折叠表面按可见导航主体停靠，安全区只计一次；零/非零安全区及大字级下间距保持紧凑、无重叠，保留地图间隙与搜索退出恢复。技术目标沿用 12px 间隔，不调整导航本身的定位。
- F8：用户继续要求 Android 搜索框大小保持恒定。App DOM 折叠搜索条固定 44px 高，右侧更多仍为 44×44px；导航主体高度、底部安全区和字号改变不再拉高搜索条。横向沿现有可用屏幕/导航对齐规则适配，激活后的全屏输入及普通 Web 布局保持现状。

## Behavior ownership and implementation plan

最小行为差异是 App 搜索展示与聚焦退出的布局和生命周期，不涉及搜索供应方或 API。现有页面私有控制器拥有共同状态，Android 使用 DOM，iOS 26+ 使用 UIKit；两种呈现消费同一状态和事件语义。先定位真实状态与几何 owner，再确定是否需要新增 app-local 字段；不能为纯几何修订扩大 HTTP 合同。

本轮为 DOM/UIKit 两个可独立测试的呈现边界加一个共享接线边界，按顺序单写者执行；每个组件形成精确差异和验证交接后才进入下一阶段。源码勘察阶段只读，返回必要文件、现有合同、约束和最小修改面。

| Lane | Owner scope | Isolation | Gate / handoff |
| --- | --- | --- | --- |
| Recon | 只读追踪 controller、DOM、UIKit、导航实际几何与现有测试 | 本轮 worktree | 文件/符号/当前状态和必要修改面，持久化报告 |
| Shared/DOM | 私有控制器、DOM 组件/样式、必要 App 接线及对应测试；先冻结共享状态/几何合同 | 本轮 worktree，序列独占 | focused units、App DOM 浏览器用例，说明供 UIKit 消费的合同 |
| UIKit | 搜索 Swift 布局/视图及确需的原生接线/对应验证 | 同一 worktree，前一写者退出后独占 | Swift/目标 iOS 构建、对应 native 几何/焦点/拖动证据 |
| Integration | 仅处理两份交接的兼容接线、跨端回归、文档/规范 | 同一 worktree，组件退出后独占 | 静态/构建、跨端状态一致性、最终差异 |
| Independent check | 精确最终增量、用户 F1–F6 和真实验收证据 | 只读 fresh context；修复回原 owner | PASS/REWORK/BLOCKED 与源文件定位 |

本轮不改全站导航视觉、后端、搜索数据、私有 Apple 材质、共享 SDK/签名/系统设置，不发布、不推送、不安装到用户物理设备。设备构建使用已有 app wrapper；生成目录不可手改。主工作树七处原有 staged 改动与原始任务记录保持不变。

## Verification plan

### Implementation decisions for the sequential handoff

- Retain the app-local `collapsed` / `medium` / `large` wire names. In App mode activation targets `large` immediately and `large` means the full available safe host, including with a keyboard; Web desktop retains its current detents. Do not grow HTTP contracts.
- Keep keyboard editing separate from presentation. Blur on dismissal, retain expanded content while its exit animation settles, and release navigation suppression and restore the non-input trigger focus when the exit finishes. Interrupted exit, unmount, capability fallback and reduced motion must terminate cleanly. Native and DOM use equivalent completion semantics.
- A downward gesture from the fullscreen handle/title dismisses to collapsed without an intermediate stop. Preserve result scrolling, IME and explicit search submission. Collapse animation starts from the live dragged geometry.
- F1 concerns the search pill itself, excluding the separate tools row. Measure DOM navigation from its actual fallback surface; use only a public, safe-area-excluded native body measurement, with a conservative 44pt fallback when unavailable. Keep More an independent surface and hit region. Do not use the docking union or a transparent host height as the body height.
- Start with existing `navigationFrame` and event fields. The Shared/DOM owner must report any minimal additional app-local geometry field and its validation before UIKit implementation starts. UIKit owns the actual native geometry producer and must validate the fallback against real runtime frames.

The current manifest removes obsolete research from automatic injection; those historical files remain intact. Read relevant complete sections of `components-and-ux.md`, `testing.md` and `tauri-mobile-integration.md` directly via the spec index/context pointers, avoiding truncated full-file injections. The isolated `.pi/agents/` copies temporarily expose native `apply_patch`; they are implementation infrastructure and must not be included in the product delivery.

按仓库 testing owner 执行必要 lint/typecheck、搜索模型/DOM/native bridge 回归、App DOM 浏览器测试和构建。浏览器验证 iOS/Android App fixture 的全屏、下拉取消、内容保留、键盘/导航恢复、更多圆形与搜索条分离；高度与命中在未自动滚动前测量。

UIKit 使用本轮自有模拟器验证真实输入、软键盘、连续收起/展开、旋转、更多/来源返回和减少动效。动画至少保留过程帧或录像/状态证据，不能用最终静态截图代替流畅性判断。Android DOM 浏览器证据与 Android 设备/原生构建证据分开报告。保留环境阻塞与未执行项，不把历史 PASS 或新版浏览器截图当作本轮原生运行证据。
