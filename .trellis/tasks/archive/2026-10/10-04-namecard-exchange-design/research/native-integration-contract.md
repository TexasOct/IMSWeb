# 原生接入的聚焦上下文

> 类型：任务研究上下文
> 状态：已核对 workspace 规则与 native spec
> 权威来源：`apps/web/.rules`、`.trellis/spec/web/frontend/tauri-mobile-integration.md`、`apps/web/src-tauri/` 当前自有源

## 注入大小与完整读取

原 native spec 为 40062 bytes，超过当前 `context_injection.max_file_bytes=32768`。本文件作为精简上下文，防止自动注入把位于文件后半段的权限、owned plugin 和 deep-link 契约截掉；不修改注入配置，也不替代权威 spec。实施原生功能前必须直接完整读取 [Tauri 集成 spec](../../../../../spec/web/frontend/tauri-mobile-integration.md) 及其中与该能力有关的文档引用。

本任务完整 design 也可能超过单次注入或 read 返回上限。任何 implement/check agent 都必须确认 prd/design/implement 已读至文件末尾，并继续分段读取 tag-design、acceptance 与上述文件的相关链接；不能把注入前半段当完整设计或遗忘末尾产品确认门禁。

## 实施必须遵守

- App shell、平台 plugins 和 TypeScript facade 属于 `apps/web`，不能把 native 能力放进 contracts 或 API；HTTP 上传 envelope 的 JSON 仍属于 contracts。
- 自有原生实现位于 `apps/web/src-tauri/plugins/<plugin>/`。Rust 注册、Swift/Kotlin 代码、capabilities 和 OS 权限要共同接线。
- `src-tauri/gen/` 为 derived output，不手改、不提交。新包装命令不直接调用 Tauri CLI，设备工作走现有 `app`/`app:doctor`。
- 目标、profile、device 使用参数，不新增每种组合的 package script。必须运行 doctor 后才能报告设备构建阻塞。
- 原生命令只接受能力需要的有限结构，不接受任意路径、任意待签名数据或 URL；token、私钥、交换者资料不写普通日志。
- App 使用 Platform bearer；cookie、refresh 和 OAuth 返回继续现有身份契约。现有 `imsweb://oauth/callback` 只属于 OAuth，不借作名片交换凭据通道。
- Shell 统一拥有恢复和 deep-link 分发；不让每个页面分别订阅系统事件并造成重复处理。
- 浏览器、App-target Playwright、simulator/真实设备的证据分别报告。前两者证明界面/契约，不能证明 BLE、NFC、系统后台或第三方接收。

## 本次近场设计限制

当前 Cargo/plugin/capabilities 没有 BLE/NFC。E6 推荐 foreground BLE/GATT spike：iOS/iOS、Android/Android、iOS/Android 均按实际 central/peripheral 能力验证，确认广播、扫描、GATT、首次授权及无手动网络加入/系统配对体验，再冻结 receipt 协议和进入后台实验。iOS 广告仅依赖允许的服务发现标识，短期 rendezvous token 经 GATT；不能要求 arbitrary advertisement payload。设备时钟不是服务器授权依据，所有离线 receipt 受 submitBefore、当前资格和撤销检查。

普通前台 Core Bluetooth 的 user authorization 与 Tauri command capability 分开配置；NSBluetoothAlwaysUsageDescription 不授予永久后台执行，MFi 也不是本自有 GATT 协议前置。Android 权限按 OS/角色探测，neverForLocation 必须符合实际行为。开始近场才申请新增权限，拒绝/关闭/缺硬件保留选卡与 QR/线上入口；纯 BLE 不新增本地网络/联系人权限。

native facade 对 UI 提供权限/蓝牙/角色能力和发现/握手状态，认证后的最小对象才可预览；RSSI 不作为账号身份或自动同意。多人须选人并可核对绑定会话的短码，双方确认名单才生成有效授权。退出页面/切后台暂停前台监听，E7 独立授权；本地 receipt 待同步与服务端 committed 分别展示。

iOS 26 CBManager + Live Activity 可以延续某些前台能力，作为可见会话单独测试，不推导常驻静默。NFC reader/HCE、Nearby Connections、UWB/Wi-Fi Aware/Apple 靠近内容分享也不能默认替换 BLE 或隐式增加权限。详见 [近场与权限研究](./proximity-exchange-and-permissions.md)、[平台研究](./native-capability-matrix.md) 和 [完整系统设计](../design.md) §9 至 §12。
