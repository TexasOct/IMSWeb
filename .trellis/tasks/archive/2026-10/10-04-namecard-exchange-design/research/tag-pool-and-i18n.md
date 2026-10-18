# 创作标签与 i18n 现状核对

> 类型：本任务研究证据
> 状态：当前源码与测试断言复核，未执行产品测试
> 权威来源：本文件列出的工作树源码与 package manifest；用户新增 NC-34

## 当前事实

- 当前 Fudaba card 的数据库字段、contracts 请求与响应、owner 编辑模型没有创作 tag 池/关联字段；证据见 [现状研究](./current-capabilities.md) 和 [source-map](./source-map.md) 的 card model/request/editor 锚点。不能把企划/担当选择或团体署名改名当自由标签。
- 对 `apps/api/migrations/postgresql`、`apps/api/src/domains`、`packages/contracts/src`、Web API/admin 源码做 tagId/alias/merge/tags/标签定向查找，没有定位到可直接复用的名片自由术语、管理归并或运行时 tag 翻译能力。匹配到的「企划标签」是 office seriesCodes 验证，与创作 tag 池不同：`apps/api/src/domains/community/fudaba/offices/request.ts:81`。
- Web 已有 `i18next`/`react-i18next`，manifest 分别声明 `^26.3.6`/`^17.0.10`。这是依赖约束，不是实际安装/解析版本的证明，本设计不依赖某个未核实的新增库 API。
- `apps/web/app/i18n/resources.ts:1` 定义 defaultNamespace=common、defaultLanguage=zh-CN，并保存中英文资源；SupportedLanguage 来源于资源键。
- `apps/web/app/i18n/config.ts:8` 初始化 `supportedLngs: [defaultLanguage]`、lng/fallback 为默认语言，`load: "currentOnly"`。不能依据资源有 en 就声称当前运行时可切英文。
- `apps/web/app/i18n/provider.tsx:10` 在 languageChanged 后持久化默认中文，并把请求的非默认语言切回默认；这是当前产品行为。
- `apps/web/app/i18n/language.ts:5` 的 resolveLanguage 辅助函数可解析 zh/en，其他返回中文；这不覆盖 provider 的固定中文策略。
- `apps/web/app/components/shared/language-switcher.tsx:11` 存在 zh/en 切换映射，但单独组件不是运行时切换能力证明。

## 测试证据与复用边界

- `apps/web/tests/unit/i18n/provider.test.tsx:24` 明确断言固定中文时忽略 stored/requested language，切英文后仍回到 zh-CN。
- `apps/web/tests/unit/i18n/language.test.ts:21` 覆盖 helper 的语言回退和资源 key 一致性；日语单独候选返回中文，不能声称已有日语 UI。
- 本轮读了这些测试，没有运行或声称 tag 本地化通过。未来 tag 的 locale/fallback/merge/concurrency 需要新 contracts/API/PostgreSQL/Web 测试。

## 设计结论

1. 创作 tags 建在 Fudaba card-tags capability，稳定概念 ID、词形/别名、语言主名与 revision 关联分层；复用身份、数据库事务、request-validation、audit/outbox 和 Web endpoint 架构。
2. UI 静态文案继续按现有 i18next 机制；用户 tag 名称是业务内容，放入数据库 TagLabel，不扩写前端静态 resources 来装自由词。
3. TagLocalePolicy 与全站 UI SupportedLanguage 分开。当前默认跟随已解析 UI 中文；管理端可维护和预览其他语言，用户如要切 tag 显示语种，通过明确的 tag 专用偏好/选择器，而不擅自解除全站固定中文。
4. tag schema 可保存合法 BCP 47 语言与 und。首批可展示/维护语种建议 zh-CN/en/ja，属于 D-15 的产品参数，不能称为当前既有多语言支持。
5. 明确 locale 后，search/cache/projection 按 locale + canonical mappingVersion 隔离；source tagId 和原始 enteredText 保留，管理归并/译名更新不改历史内容 hash。

## 查证方式

首次 read-only worker 未完成，后续定位 agent 的结果句柄被清理，因此最终结论以主会话实际读取的上述文件为准。未通过工具权限边界读取临时目录日志，也未以失败工具的猜测充当证据。
