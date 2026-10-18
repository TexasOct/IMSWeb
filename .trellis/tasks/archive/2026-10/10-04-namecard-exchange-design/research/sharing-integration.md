# 与现有分享规划的衔接

> 类型：本任务研究证据
> 状态：当前工作树复核
> 权威来源：相关任务规划原文和仓库规则；规划内容不等于已实现功能

## 已确定的边界

- 现有分享任务为 `.trellis/tasks/09-20-social-sharing-foundation/`。其 `task.json` 状态为 `in_progress`，不能据此认为完整分享方案已经上线。
- 该任务 `prd.md` 的 Decisions 明确首个分享对象为 Fudaba，旧 `Namecard` 分享适配、旧链接 alias 和双模型兼容不在范围内。
- 用户已选择生产 Hono 交付单卡 OGP HTML 的路线 A，同时明确暂缓其实施。当前切片是名片列表详情 Dialog 与 emoji 行为。
- 本任务可规划后续公开单卡、OGP、二维码和原生分享的接入依赖，不能改写上述授权范围或替相关任务开始实施。

## 复用点

| 设计点 | 权威落点 | 本任务处理 |
| --- | --- | --- |
| canonical 单卡页面 | 分享任务 `design.md` 的「URL、公开读取与资格」 | 继续使用该任务建议的 `/community/exchange/cards/:cardId`，实施时由 `@imsweb/contracts/paths` 拥有。 |
| 匿名单卡 API | 分享任务 `design.md` 的「URL、公开读取与资格」 | 继续使用其建议的 `GET /api/community/exchange/cards/:cardId`，资格策略需在扩展审核/隐藏模型后统一。 |
| OGP | 分享任务 `design.md` 的「页面交付与社交预览」 | Hono 在静态 fallback 之前输出 HTML；原始 GET/HEAD 响应测试证明，不用 Vite 页面代替。 |
| 公开投影 | 分享任务 `prd.md` 的 Public delivery requirements | 无账号私有字段、审核差异或 revision；交换事务使用另外的登录投影和版本标识。 |
| 二维码 | 分享任务 `design.md` 的「分享图」 | 公开二维码只编码 canonical URL；私有会面二维码使用专用短期凭据，两者区分。 |
| 分享图与渠道 | 分享任务 `design.md` 的「分享投影与渠道动作」 | 同一 ShareProjection 驱动微信/QQ 预览图和小红书竖图；交给系统不等于目标平台发布成功。 |
| 私有资源 | 分享任务 `design.md` 的「风险、兼容与回滚」 | 既有公开对象 URL 无法因隐藏自动撤销；扩展权限需要新的受保护对象交付设计。 |
| 路由登记 | `.trellis/spec/web/frontend/architecture.md` | `route-metadata.ts` 是既有路由所有权来源，避免维护第二份路由清单。 |

## 工作区约束

- API 以 capability 和 runtime-neutral ports 分层；DB、对象存储、native 和队列适配器不得从 handler 直接引入。
- 所有 HTTP JSON 请求、响应和业务错误由 contracts 拥有。新增 JSON 请求默认 strict，响应精确，Web 用 `parsed(...)`。
- 公开 prefix 和 API prefix 由 paths 拥有；本任务中的 URI 是设计草案，不能当成已存在接口。
- Platform cookie 与 App bearer 继续走现有 session 契约；Backoffice 审核权限独立。
- `src-tauri/gen/` 不能手改；native 功能需 owned plugin + capabilities + OS 权限；设备验证走 `app:*` 脚本。
- 服务端持久化仅 PostgreSQL；客户端原生离线日志不等于新增服务端 SQLite runtime。

## 历史查证

已运行 `trellis mem search "名片交换"`。索引命中历史名片页面会话和当前研究会话；未从搜索结果推定任何新的用户决定。当前分享任务持久化的 Decisions 与本轮原始提案是本方案的产品依据。

## 引用

- [分享任务 PRD](../../../../09-20-social-sharing-foundation/prd.md)
- [分享任务系统设计](../../../../09-20-social-sharing-foundation/design.md)
- [API 规则](../../../../../../apps/api/.rules)
- [Web 规则](../../../../../../apps/web/.rules)
- [Contracts 规则](../../../../../../packages/contracts/.rules)
- [领域与能力架构](../../../../../../docs/architecture/domain-capabilities.md)
- [测试所有权](../../../../../../docs/development/testing.md)
- [API 身份契约](../../../../../spec/api/backend/authentication.md)
- [Tauri 集成契约](../../../../../spec/web/frontend/tauri-mobile-integration.md)
