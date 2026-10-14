# 跨平台近场交换与 Apple 权限

> 类型：任务研究
> 状态：2026-10-06 补充核查；API 能力已查证，未进行双机射频测试
> 权威来源：下列 Apple、Android 和 Google 官方文档；产品约束来自本轮用户对话和 [PRD](../prd.md)

## 1. 用户目标与推荐范围

用户希望 iOS 与 Android 之间有类似 Apple NameDrop 的联系人交换体验，优先省去手动加入 Wi-Fi、切换热点和系统配对等明显操作，并要求确认 Apple 是否开放所需能力。这里的 Wi-Fi 偏好是交互要求，不能自行扩大为禁止手机使用已有 Wi-Fi 上网。

推荐 E6 先验证前台原生 BLE/GATT：双方安装 IMSWeb App，打开交换页，在首次蓝牙授权后发现对方、核对身份和名单、双方确认。近场 transport 不使用 Wi-Fi；服务端请求可以走各自已有的移动数据或 Wi-Fi。完全无网络时，只有具备有效预发凭据的设备才可按现有离线协议保存待同步回执，不能显示服务器已完成。

以下结论分开使用：公开 API 和 SDK 声明证明平台提供能力；共同协议、交互和授权链属于本任务的设计建议；发现速度、机型覆盖、射频稳定性和靠近效果仍须真机测量。本轮没有安装插件、修改系统权限或运行设备构建。

## 2. 技术选择

| 技术 | 已查证能力 | 交互与互通边界 | 本任务取舍 |
| --- | --- | --- | --- |
| 原生 BLE/GATT | [Core Bluetooth](https://developer.apple.com/documentation/corebluetooth) 提供 central/peripheral、service/characteristic；Android 提供 [扫描/广播](https://developer.android.com/reference/android/bluetooth/le/BluetoothLeAdvertiser) 和 [GATT server](https://developer.android.com/reference/android/bluetooth/BluetoothManager)。 | 同一协议可作为 iOS/iOS、Android/Android、iOS/Android 前台候选；需要一端 central、一端 peripheral，广播角色须按 Android 硬件探测。App 内授权和确认，不要求用户加入网络。 | E6 主方案建议；真实支持组合在 spike 后公布。 |
| Google Nearby Connections | [官方首页](https://developers.google.com/nearby/?hl=en)明确支持 Android 与 iOS 互通；[overview](https://developers.google.com/nearby/connections/overview?hl=en)说明内部组合 Bluetooth、BLE、Wi-Fi，可离线连接。 | 可隐藏传输细节，但不能当作纯 BLE。[iOS setup](https://developers.google.com/nearby/connections/swift/get-started?hl=en)列有蓝牙、本地网络/Bonjour，以及高速热点连接涉及的定位说明；[连接文档](https://developers.google.com/nearby/connections/swift/manage-connections?hl=en)建议双方核对验证码。 | 保留为替代方案，首版不同时接入两套发现协议；采用前需评审额外权限和 Google SDK 依赖。 |
| NFC：iPhone reader + Android HCE | Apple 的 [NFCISO7816Tag](https://developer.apple.com/documentation/corenfc/nfciso7816tag) 可按声明的 AID 选择 tag 并收发 APDU；[Android HCE](https://developer.android.com/develop/connectivity/nfc/hce)可模拟 ISO-DEP 卡并响应 APDU。 | 由两个公开 API 推导的跨平台原型候选，未实测。iPhone 是读卡方、Android 是模拟卡方，双方 token 可经命令/响应传输；iPhone 会出现 [NFC 读卡界面](https://developer.apple.com/documentation/corenfc/building-an-nfc-tag-reader-app)。不因此获得普通 iPhone/iPhone 对等交换能力。 | 专项补充，可与 NFC 邀请 URL 区分验证；不作为 E6 基础依赖。 |
| UWB / Nearby Interaction | [Apple Nearby Interaction](https://developer.apple.com/documentation/nearbyinteraction)可在支持硬件上提供距离/方向，device token 仍需另一个通道交换。 | Apple peer 和符合其协议的第三方 accessory 支持不能推导为通用 Android 手机互通，也不能推导为所有 iPhone 均有 UWB。 | 可研究部分设备的近距离增强，不能替代跨平台发现基础。 |
| Wi-Fi Aware | [Apple framework](https://developer.apple.com/documentation/WiFiAware)在 iOS 26 开放，无需热点或互联网；[官方双机示例](https://developer.apple.com/documentation/WiFiAware/Building-peer-to-peer-apps)先用 DeviceDiscoveryUI 配对再连接。 | 需要支持的系统/硬件及初次系统配对；标准支持不等于任意 Android 手机实现已兼容。 | 首次会面交互成本较高，暂不作为默认名片交换 transport。 |
| 声音/高频短码 | [ggwave 源仓库](https://github.com/ggerganov/ggwave)提供小数据声波传输及移动端示例。 | 需要麦克风权限，有系统使用指示和硬件/环境差异；传码不是距离证明，不能承诺所有人都听不到。 | 记录研究，不作为主方案。 |

系统 NameDrop 的联系人卡、触发条件和界面不能由 Core Bluetooth 权限直接取得。与此同时，不能概括成“Apple 完全没有开放第三方靠近分享”：Apple 的 [SharePlay Q&A](https://developer.apple.com/news/?id=94dxn2w2)明确介绍让系统识别当前可分享内容后，以设备靠近发起文档分享、SharePlay 或协作。这属于 Apple 系统分享方向，没有在该来源中给出 Android 互通能力，也不替代本任务的双方授权和持有账本。

## 3. 权限、开发者资格与用户操作

| 平台/能力 | 所需配置与用户授权 | 不应承诺的行为 |
| --- | --- | --- |
| iOS 前台 BLE | 在自有 `Info.plist` 声明 [NSBluetoothAlwaysUsageDescription](https://developer.apple.com/documentation/bundleresources/information-property-list/nsbluetoothalwaysusagedescription)，按功能需要创建 Core Bluetooth manager，由系统获取蓝牙授权。普通前台 Core Bluetooth 不依赖受限的 NFC/SE entitlement。 | 不跳过授权、不替用户开启关闭的蓝牙、不把 usage key 名中的 Always 当永久后台运行权。 |
| MFi | [Apple MFi FAQ](https://mfi.apple.com/en/faqs)将仅用 BLE/Core Bluetooth/标准 iOS profile 的 accessory 列为无需加入 MFi；HomeKit 和 MFi Hearing Aid 有例外。本方案是普通自有 GATT 协议。 | 无需 MFi 不等于已通过 App Store 审核，也不代表能用私有协议或系统 NameDrop 接口。 |
| iOS 纯 BLE 的其他权限 | BLE 发现/GATT 本身不做局域网发现或定位；交换 IMSWeb 自有名片不读取手机通讯录，因此本方案不为 BLE 请求本地网络、定位或联系人访问。App 已有其他功能的权限独立处理。 | 如果后续接入 Bonjour、热点、定位或手机通讯录，就必须按实际使用增加相应权限，不能沿用“纯 BLE”说明。 |
| Android 12+ | [官方蓝牙权限](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions?hl=en)：按实际角色声明并请求 BLUETOOTH_SCAN、BLUETOOTH_ADVERTISE、BLUETOOTH_CONNECT，用户会看到 Nearby devices 授权。 | `neverForLocation` 必须符合不推导物理位置的实际行为，可能过滤部分 beacon；不能仅为少弹一次权限就机械设置。 |
| 较旧 Android | 按目标 SDK/OS 的扫描政策处理定位权限与系统状态；后台要求另算。 | 不承诺所有 Android 版本只有一个附近设备弹窗。 |
| iOS NFC 读卡 | reader-session entitlement、NFCReaderUsageDescription、受控 AID 列表及系统 reader session。 | reader entitlement 不等于 iPhone 可自由模拟卡，也不能去掉读卡界面。 |
| iOS NFC 卡模拟 | [NFC & SE 平台](https://developer.apple.com/support/nfc-se-platform/)和 [EEA HCE](https://developer.apple.com/support/hce-transactions-in-apps/)有用途、地区、协议和资格条件；当前列出的许可用途没有通用社交名片交换。 | 不把“iOS 完全没有卡模拟”当结论，也不将受限卡模拟批准视为普通 App 的默认能力。 |

首版在用户进入近场交换并点击开始时才请求新增蓝牙权限，不在 App 启动或浏览名片墙时扫描。拒绝、系统限制、蓝牙关闭、硬件角色缺失分别给出恢复提示；不反复弹窗，保留二维码/线上会面入口及用户已选名单。QR 会面需要服务端网络，不能把它标成无网络 BLE 的替代完成路径。

避免系统配对弹窗是待验收的交互目标。GATT 特征的认证/加密要求可能触发系统配对；连接本身不证明账号身份。首版以受控临时握手材料和应用层身份/双方授权校验设计，不能为了省配对而公开完整资料或忽略 MITM/中继威胁。spike 必须记录是否实际出现配对或网络弹窗，出现时先分析特征权限与协议，再评审体验。

## 4. 近场流程与距离边界

1. 两人打开交换页，App 探测能力、权限和蓝牙状态，开始限定在页面生命周期内的扫描/广播。
2. 仅广播共同 service UUID；[Apple peripheral 文档](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/PerformingCommonPeripheralRoleTasks/PerformingCommonPeripheralRoleTasks.html)支持的广告字段有限，不把 accountId/cardId/短期 token 塞进 local name，也不依赖任意 manufacturer payload。
3. 一个 central 与一个 peripheral 建立 GATT 会话，交换短期 rendezvous token、nonce 和适用的有限期凭据，处理双连接/重复发现。无网络证据不足时只保留草稿。
4. 在线按认证服务端会面解析最小身份展示；离线只使用可验证且允许展示的凭据内容。蓝牙名称、MAC、RSSI 或任意 peer 提供的头像不直接成为可信身份。
5. 出现单个候选时可以显示待核对预览；多人候选必须显式选人。共同短验证码建议绑定双方已认证会话、nonce 和名单摘要，辅助当面核对；验证码本身不替代完整认证和授权，也不证明距离。
6. 复用 NC-20 的双方名单确认、滑动或可访问性按钮。只有服务器回执可显示完成；本地离线双授权显示待同步，动画和震动只是状态反馈。
7. 离开页面、取消或前台会话被打断后停止/暂停 native 发现并清理临时连接，保留已形成的回执日志；恢复后重查资格和服务器终态。E7 授权的后台流程另有生命周期。

RSSI 只可辅助候选排序和粗略信号提示，不能直接作为账号选择、自动同意、距离授权或“已碰到”的判断。首版文案不宣称厘米级、顶部接触或无误触；握持/遮挡、手机壳和多人场景必须进入实机矩阵。相邻动画由实际发现/握手/确认状态驱动，不把视觉效果描述为已验证的物理触发。

## 5. 后台文档的适用范围

[Apple 传统后台 BLE 指南](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)描述 background mode 下扫描合并、间隔、广告频率、local name 省略及 iOS-only service UUID overflow；这些限制仍需在对应系统和模式下测试，不能拿前台结果推导后台跨平台发现。

2026-10-06 直接复核的 [当前 Core Bluetooth 文档](https://developer.apple.com/documentation/corebluetooth)另说明 iOS 26 起，在已有 CBManager 且进入后台前启动 Live Activity 的条件下，App 可延续某些前台权限，例如不提供 service UUID 的扫描和关闭 duplicate filter 的扫描。它提供一个可见、已启动的后台会话研究方向；文档不能代替 Android 发现其广告的实测，也不能证明 force-quit 后常驻、无限时长、重启自动恢复或跨平台擦肩必达。E7 必须分列传统模式与 iOS 26 Live Activity，且后者不称为无感静默。

## 6. 发布前证据

- 前台覆盖 iOS/iOS、Android/Android、iOS/Android；跨平台分别验证两端 central/peripheral 方向，不把一对设备成功当所有 Android 机型支持。
- 清洁首次安装和已授权复用两种状态，记录真实系统弹窗；BLE transport 不依赖加入同一 Wi-Fi、热点或进入系统配对设置。
- 移动数据、已有不同 Wi-Fi、没有同一局域网和双方断网分别测试。断网完成语义以预发凭据/双授权 receipt 为边界。
- 权限拒绝/撤回、蓝牙关闭、扫描或广播缺失、多人/同名候选、断连/重复连接、页面退出、切后台后恢复分别验证。
- 每次记录机型、OS/App/协议版本、双方角色、操作步骤、发现/握手/提交延迟、误选/失败分类与必要脱敏日志。延迟和成功率先测量，再在发布评审定义支持范围；本稿没有虚构测量结果。
- NFC reader/HCE、UWB、Apple 系统靠近分享、Nearby Connections、Wi-Fi Aware 只在独立专项通过后增加入口，不在 BLE 不可用时悄悄换 transport 或新增权限。

这些门禁同步到 [执行计划](../implement.md) E6/E7 和 [验收矩阵](../acceptance.md)。技术方案推荐不修改 D-01 至 D-15 的未决产品参数，也不构成开始实施的批准。
