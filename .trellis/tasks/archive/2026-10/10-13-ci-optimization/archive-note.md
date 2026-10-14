# CI 优化发布验证与归档

> 类型：任务验收及归档记录
> 状态：A1 至 A7 完成；自动 Preview 链路已验证
> 权威来源：GitHub Actions 原生 run/step 回执、release 远端 SHA、Preview 公开 GET 探测及本地 acceptance.md

## 发布身份与结果

2026-10-14 复核，当前本地 HEAD 和 `origin` 的 `release/v1.1` 均为 `c326290cae98856aa2a6a5ccdceb75508002b90e`。该提交整合 `1588688b feat(ci): verify candidates and streamline core validation` 与 release 更新；本次归档不执行新的提交、推送或部署。

- [push CI 与自动 Preview](https://github.com/imas-fan-dev/IMSWeb/actions/runs/38541708079)：completed/success，同 SHA。API、Web、App、基础设施、Web 浏览器、集成与最终 validation 均成功。
- 同 run 的 Web candidate 上传、browser/integration 下载、browser 前身份验证、App candidate 记录校验均 success。
- Preview 完整候选校验、共享构建资源前及发布前新鲜度检查、不可变镜像发布、镜像来源验证、部署前完整候选与新鲜度校验、worker/API 部署、部署后检查均成功。
- [PR CI](https://github.com/imas-fan-dev/IMSWeb/actions/runs/38541718363)：completed/success，同 SHA；PR 发布步骤按设计 skipped。发布证明来自 push run。
- 实际部署记录为 `preview-c326290cae98`；镜像为 `ghcr.io/imas-fan-dev/imsweb-api@sha256:d86495a307a55a386e368ce2732ffad185818fc0691e2ae00e2133b88385819c`。原始日志给出 `DEPLOYMENT_OUTCOME=success`、`VERIFICATION_OUTCOME=success`、`FRESHNESS_OUTCOME=success` 和 `WAS_CURRENT=true`。

## 耗时与公开探测

push run 创建于 `2026-10-14T09:21:09Z`，最终核心 validation 完成于 `09:29:56Z`：8 分 47 秒。整条含 Preview 的 run 于 `09:35:29Z` 完成：14 分 20 秒。本次样本达到 CI ≤15m、Preview ≤18m 目标，不能由单次运行推定所有后续运行的保证。

2026-10-14 归档复核对 `https://preview.idol-master.top` 执行匿名只读 GET：

| 路径 | 结果 |
| --- | --- |
| `/` | 200，HTML |
| `/api/health/ready` | 200，JSON |
| `/api/wiki/test` | 200，JSON |
| `/api/news` | 200，JSON |

公开探测证明当时公共入口可用；镜像及提交身份由同 SHA 的 hosted 发布校验与部署记录证明。

## 证据、限制与闭合

原始完整 hosted 日志、两个 run 的原生 jobs/steps JSON、公开探测回执、原任务文件与 Git/runtime 保全位于 `/Users/texas/.pi/agent/projects-memory/IMSWeb/evidence/task-archive/20261014T215224`。该目录包含 `hosted-ci-38541708079.log`、`hosted-run-38541708079.json`、`hosted-run-38541718363.json` 和 `public-probes.json`。

[acceptance.md](./acceptance.md) 的本地截止记录、原始失败、源码身份、继承 skip、默认 macOS Firefox 启动问题全部保留。较早 `447f2323` 的 CI failure 由后续修复与同 SHA 成功记录区分，不改写为历史成功。本轮证明自动 Preview；手动 redeploy、原生设备 system-browser/deep-link、production 发布和额外 sharding 仍未执行，不属于本轮闭合凭据。

本任务归档前为 `in_progress`。A7 的 release 合入/远端身份、核心 CI、候选消费、镜像来源/新鲜度/部署、公开探测和实测耗时均有证据，因此归档为实现及发布验证完成。使用 `--no-commit`，原工作区 staged 内容与其他任务保持原状。

归档后 `task.py validate` exit 0，implement/check 各 6 条引用有效；保留原 manifest 字节。当前前端测试 spec 为 34995 bytes，超过 32768 注入上限，validator 给出截断 warning，未改动 spec 或注入配置；未来重启实施须完整读取权威 spec。两项归档的 86 个 Markdown 本地文件链接全部存在，`pnpm run check:rules` exit 0（59.022 秒）。HEAD、Git index 原始字节、staged entries 和范围外工作文件均与安全快照一致，社交分享和地图布局任务及其 session 指针保持原状。
