# 施工现况与代码接入点

> 类型：任务源码研究
> 状态：2026-10-06 工作树复核；测试路径为施工依据，未在本轮运行产品套件
> 权威来源：下列现存源文件、package scripts、[测试所有权](../../../../../../docs/development/testing.md)和[施工详表](../construction.md)

本轮基线为 `release/v1.1`，HEAD `4e7b8f1ce920a0fb50d1e126436e1f4cb1d0fdbf`，Node `v24.18.0`，pnpm `11.10.0`。任务仍为 planning，`task.py current --source` 无活动指针。本文件补充较早的 current-capabilities/source-map；遇到媒体和测试组织的时点差异，以当前源码复核为准。

## 1. 现存 API 与持久化

| 现存文件 | 当前事实 | 施工影响 |
| --- | --- | --- |
| `apps/api/src/domains/community/fudaba/routes.ts` | 挂载 exchange/admin exchange；子能力负责中间件与路由。 | 新功能落在 Fudaba 子能力，新写入口复用 Platform、active-account、CSRF、限流及 rollout 写门禁。 |
| `apps/api/src/domains/community/fudaba/cards/request.ts` | 注册上传和元数据编辑使用当前固定字段、正背面与 revision。 | 单独建立新版请求入口；上传 actor 从会话取得，不能让客户端指定 owner。 |
| `apps/api/src/domains/community/fudaba/cards/handlers/upload-owned-media.ts` | 替换图片在确认提交后清理旧对象。 | 先建立快照引用和清理复核，才开放历史版本收录。 |
| `apps/api/src/domains/community/fudaba/cards/handlers/delete-card.ts:35` | soft-delete 后调用 `deleteObjectWithCompensation` 清理两面。 | 解绑和留存的新命令不能沿用当前删除语义。 |
| `apps/api/src/domains/community/fudaba/guest-submissions/ttl-purge.ts:6` | guest 终态三天 TTL，物理清理及媒体删除。 | 排查已排队和旧清理入口；该 TTL 不能用作违规锁定保留期限。 |
| `apps/api/src/domains/community/fudaba/moderation/handlers/admin-card-reviews.ts` | 审核关联对象发布/保护和补偿；当前展示为当前行。 | 审核必须锁定待审版本，diff 对照已批准版本；对象操作继续经 ports。 |
| `apps/api/src/ports/repositories/fudaba.ts` | Fudaba 仓储接口。 | 新版本、收藏、交易聚合使用独立接口，避免不断扩大既有仓储。 |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts` | 统一卡、owner、审核、认领、favorites 与旧交换基础均在此。 | 只改必要桥接；新增交易仓储独立，不在本轮顺便重构整个文件。 |
| `apps/api/migrations/postgresql/0022_fudaba_domain.sql:174` | exchange request 绑定 office/单张 wanted-offered；复合 owner FK、pending 唯一约束及终态 trigger。 | 新名单/digest/receipts 需独立模型；解绑前处理旧 FK 和终态不可变约束。 |
| `apps/api/src/ports/runtime-services.ts:41`、`apps/api/src/runtime/node-services.ts:194`、`apps/api/src/middleware/hono-context.ts:48` | 真实 runtime 接线和 request-context 仓储访问。 | 新 ports 在这些入口注入；仓储和驱动不由 handler 构造。 |
| `apps/api/src/domains/identity/platform-account-security/routes.ts:20` | 已挂载密码、会话、OAuth link、邮箱能力；没有注销入口。 | E1 的账号注销包含新能力及跨域生命周期协调，不能只补一个解绑 callback。 |

`fudaba_card_favorites` 的行、旧 exchange accepted 状态和认领 approved 都不能充当新收录授权。旧 favorite 继续表示公开当前内容的收藏标记；新 CollectionEntry 需要独立取得版本、授权来源与获得时间。

## 2. Contracts、Web 与媒体

| 现存文件 | 接入约束 |
| --- | --- |
| `packages/contracts/src/paths.ts`、`packages/contracts/package.json`、`packages/contracts/src/index.ts` | 新路径 builder、子模块 exports 和根 namespace 一起审查；保留旧 namecards 的 tolerant request 策略。 |
| `packages/contracts/src/fudaba/index.ts`、`packages/contracts/src/fudaba/card-claims.ts` | 当前严格 DTO、publication/claim enum 仍是旧消费者契约；未知 enum、多页、optional back 不能直接灌入旧响应。 |
| `apps/web/app/lib/api/endpoints/fudaba/index.ts` | HTTP facade；新增子模块经这里导出，JSON 使用 `parsed(...)`。 |
| `apps/web/app/route-metadata.ts`、`apps/web/app/routes.ts` | route metadata 拥有路由清单；列表、本人工作区、事务所和状态页已经存在。 |
| `apps/web/app/pages/community/exchange/me/community-exchange-me-workspace.tsx`、`card-workspace.tsx`、`favorite-collection.tsx` | 共用工作区承接 Web/App 页面；把 favorites 和新名片册分成明确资源，不通过改标题偷换数据语义。 |
| `apps/web/app/components/community/idol-multi-select.tsx` | 现有 Wiki 选项不能证明担当资格；组合选择与展开需独立资格投影。 |
| `apps/web/app/components/community/namecard-upload-dialog.tsx` | 现有墙上传走 guest；登录用户仍需切换为 owner 新版上传。 |
| `apps/web/app/components/shared/namecard-preview.tsx`、`apps/web/app/pages/community/components/namecard-thumbnail.tsx` | 已有 contain、两面、缩略图 fallback；可扩为 page viewer，保留原列表和 Dialog 回归。 |
| `apps/web/app/lib/api/endpoints/fudaba/owner-card-media.ts:17`、`apps/web/app/pages/community/exchange/me/use-owner-card-media.ts:6` | Bearer 图片经 API Blob 读取；URL 白名单只支持当前 owner `front/back` 与数字 `v`。收录/邀请/多页媒体需要各自 API-owned path 校验和独立 hook，不能向任意 URL 发送凭据。 |

当前已具备 owner 私有图片读取和 App 媒体回归。施工需复用其取消请求、token refresh、Blob URL 释放及拒绝外域凭据的行为；不能依据旧报告再次把这条路径当缺失功能。公开 URL、未审 owner 图片、grant 图片和已收录 revision 图片的资格查询各自明确。

## 3. Hono 交付与原生入口

| 现存文件 | 接入约束 |
| --- | --- |
| `apps/api/src/app.ts:116`、`:286` | packaged frontend 走 notFound/staticAssets；没有单独的 frontend domain handler。OGP 需在 fallback 前接入。 |
| `apps/api/src/routing/frontend-route-policy.ts:111`、`apps/api/src/routing/frontend-route-delivery.ts:4`、`apps/api/src/infra/http/filesystem/static-assets.ts:352` | 使用生成的 frontend metadata 和静态策略；新增 canonical 页同时检查 API/SPA/asset 所有权。 |
| `apps/api/src/domains/delivery/media/handlers/serve-namecard.ts` | numeric compatibility 图片也有独立公开判断；隐藏/截止/封禁必须穿透此入口。 |
| `apps/web/src-tauri/Info.ios.plist`、`apps/web/src-tauri/capabilities/geolocation.json`、`apps/web/src-tauri/plugins/native-glass/android/src/main/AndroidManifest.xml` | 原生配置由 owned source 维护；这些现存文件不代表已有 BLE 协议或可用后台交换。新的近场 plugin 单独拥有权限、Rust 注册、移动端实现和 facade。 |

现有 sharing 的 Dialog/反应切片与拟恢复的 canonical/OGP 范围分别按 [分享衔接研究](./sharing-integration.md) 评审。设备执行仍走 `app:*`，完全读取 native 权威 spec 的要求仍有效。

## 4. 现存测试位置

| 范围 | 复用位置与新增内容 |
| --- | --- |
| PostgreSQL/HTTP | `apps/api/tests/server/fudaba.test.ts` 已合并原 sibling suites，存在 owner/审核/claim/旧 FK 断言；新聚合可增加独立 `*.test.ts`，复用 `tests/integration/postgres-harness.ts` 和 `tests/fixtures/owner-route-fixture.ts`。 |
| 迁移目录 | `apps/api/tests/integration/migration-catalog.ts` 是 caller-owned fixture；`tests/server/migration-catalog.test.ts` 只验证 fixture。真实顺序/校验和由 `tests/migration/postgres-migrations.test.js` 验证，新 backfill 另测数据。 |
| 身份 | `apps/api/tests/server/platform-account.test.ts`、`platform-session-security.contract.test.ts`、`platform-profile.contract.test.ts`；新注销与 Fudaba 生命周期需要新增跨域集成用例。 |
| 媒体/补偿 | `apps/api/tests/server/object.test.ts`、Fudaba suites、`node-email-delivery-runner.test.ts`。email worker 只能参考 lease/重启测试形态，不能当已有通用 exchange outbox。 |
| Web wire | `apps/web/tests/unit/lib/api/endpoints/fudaba.test.ts` 和 `tests/unit/support/api-client.ts`；同时核对请求、raw JSON、HTTP error、business error。 |
| 页面 | `apps/web/tests/unit/support/harness.tsx`、`tests/unit/routes-app-target.test.ts`；新增收藏/申请/会面组件测试沿用真路由/AuthProvider 上下文。 |
| 浏览器 | `apps/web/tests/e2e/community-exchange.spec.ts`、`community-exchange-me.spec.ts`、`app-owner-card-media.spec.ts`；后者先等待 inventory，再验证 Blob 图片解码和认证恢复。 |

`pnpm --filter @imsweb/api run test:server` 与 `test:migration` 是现存脚本；新增协议文件做 focused Vitest 检查时，按 owner 文档确认 build/fixture 前置。PostgreSQL 集成不设置 `IMS_TEST_POSTGRES_ENABLED=false`；记录执行与 skip 数，不能用 pre-commit 跳过结果验收持久化。

本次工作树已有 `apps/api/scripts/build/build-client.js`、`build-server.js`、`check-client.js` 删除，而 package scripts 仍引用它们。这是既有独立改动。本轮保留；未来启动产品施工时重新运行 workspace preflight，若仍缺失，则把 build/syntax/packaged 验证缺口交回该改动所有者处理。
