# 跨端搜索设计检查记录

## Current App implementation

用户在 Android F8 固定尺寸最终交付后回复“验收通过”。当前交付的用户验收已完成；测试/设备覆盖仍按下方当前验证记录逐项保留，提交与发布未执行。

本轮用户已批准 App 搜索修订，当前任务为 `in_progress`。Shared/DOM 与 UIKit 实现、核心浏览器/原生门禁、F5 减少动态效果修复复验和独立审查已完成；用户已进一步授权提交、合入本地 `release/v1.1` 并推送，Android 环境及未覆盖宽矩阵仍保留。精确结果见 [2026-10-17 App 修订验证](./research/app-search-focus-verification-20261017.md)。以下内容是原始规划记录，保留其当时的 planning 状态和未执行项，不作为当前产品验证结果。

## Planning artifacts

- `prd.md` 覆盖 Web 窄屏、移动 App、原生 iOS Liquid Glass 与 DOM 回退，包含 R1 至 R10 和可观察 AC1 至 AC9；Web 圆润视觉单列为 R10／AC9。
- `design.md` 记录底部伸缩卡片、显式搜索、结果与选点、短横屏、键盘、非编辑焦点恢复、原生能力与抑制所有权。
- `implement.md` 记录共享模型、Web 回退、原生 IPC／UI 的有序实施，以及浏览器和 iOS 设备验收。
- [当前布局](./research/current-layout.md)、[Apple Maps／原生搜索](./research/apple-maps-and-native-search.md) 与 [原生规范索引](./research/native-controls-context.md) 分别记录源码、官方资料和注入边界。
- [layout-wireframe.svg](./layout-wireframe.svg) 和 [layout-preview.png](./layout-preview.png) 展示 Web 折叠、iOS 结果展开及 iOS 选点后折叠。玻璃表面仅为示意，不能证明原生渲染。
- 任务保持 `planning`，没有运行 `task.py start`。

## Actual checks

| 检查 | 结果 |
| --- | --- |
| task context validate | 最终复检通过，exit 0；implement/check 各八条真实引用，无截断警告 |
| context 文件及 Markdown 相对链接 | 最终复检通过；原生规范索引相对链接已校正 |
| SVG XML／PNG | XML 解析通过，1460×1260 最终预览已重新生成；三个状态视图已人工回读 |
| `pnpm run check:rules` | 跨端方案上一轮独立运行通过，exit 0；日志 `/tmp/imsweb-map-search-plan-rules-independent.log`，退出回执同名 `.exit`；圆润修订仅检查任务文件，不重复全仓库规则检查 |

首次同步规则检查在 50000ms 超时，未记为通过。随后独立检查获得明确 exit 0；日志显示 JSON wire violations 为零，文档检查通过。任务目录的链接和上下文另行验证。

## Web rounded revision

本轮按用户意见更新 Web 示意：28px 面板、48px 胶囊搜索、44px 圆形定位／更多、圆润文字工具按钮，去掉竖向硬分隔并减淡边界。搜索交互与 App 原生方案沿用已规划行为，公共样式令牌未修改。最终预览已重新生成并人工回读；SVG XML、圆角规格、相对链接和两份八条 context manifests 均复检通过，task validate exit 0。

## Deferred evidence

本轮只修改此任务的规划文件和结构图。没有产品源码变更、业务请求、服务启动、Web 单元/E2E、原生构建、真实键盘／Liquid Glass／VoiceOver 验证、提交或部署。其余二十二条工作树状态仍存在，未操作其他任务的暂存和未暂存内容。
