# Namecard source map

All anchors refer to the inspected working tree. Existing tests were read, not executed. A database foundation or repository helper does not by itself prove an exposed product workflow.

施工前按 [2026-10-06 现况复核](./construction-baseline.md) 校准 runtime、owner Blob 媒体和现存测试组织；较早的行号是研究时锚点，需要在实际编辑前重新定位。

## Authority and boundaries

| Source | What it establishes |
| --- | --- |
| `.rules:1` | Workspace ownership, PostgreSQL, shared wire contracts, validation owners. |
| `apps/api/.rules:5` | Domain/port/infrastructure separation and request-validation boundary. |
| `apps/web/.rules:5` | Page ownership, endpoint facade, route manifest, Web/App test ownership. |
| `packages/contracts/.rules:7` | Shared HTTP JSON schemas, strict new requests, exact responses. |
| `.trellis/spec/api/backend/index.md:11` | API spec map and focused testing owners. |
| `.trellis/spec/web/frontend/index.md:13` | Web architecture, state, UX, App integration, testing specs. |
| `.trellis/spec/contracts/shared/index.md:12` | Shared schema/export and quality specs. |
| `.trellis/spec/repository/index.md:11` | Rules/boundaries/pre-commit distinctions. |
| `.trellis/spec/guides/index.md:6` | `.rules` authority and cross-layer/reuse guides. |
| `.trellis/spec/api/backend/authentication.md:13` | Cookie versus bearer sessions; App transport. |
| `apps/api/src/domains/community/namecards/README.md:3` | Compatibility wall/reactions/moderation ownership. |
| `apps/api/src/domains/community/fudaba/README.md:3` | Registered cards, claims, offices, guest submissions, directory ownership. |
| `docs/migrations/fudaba-platform.md:12` | Identity separation, migration authority, same-ID claim consent, guest route limits. |

## Database, models, and repositories

| Source | What to inspect for the RFC |
| --- | --- |
| `apps/api/migrations/postgresql/0022_fudaba_domain.sql:84` | Initial card fields, owner FK, media/publication constraints. |
| `apps/api/migrations/postgresql/0022_fudaba_domain.sql:174` | Office-bound exchange requests, ownership FKs, duplicate pending index. |
| `apps/api/migrations/postgresql/0022_fudaba_domain.sql:214` | Likes/favorites as account/card timestamp rows. |
| `apps/api/migrations/postgresql/0022_fudaba_domain.sql:323` | Exchange terminal-state/version transition trigger. |
| `apps/api/migrations/postgresql/0027_fudaba_agency_catalog.sql:86` | Canonical agency references replacing static series references. |
| `apps/api/migrations/postgresql/20260816193000_namecard_ownership_foundation.sql:69` | Claim records and FKs. |
| `apps/api/migrations/postgresql/20260816193000_namecard_ownership_foundation.sql:115` | One open/approved claim per legacy card. |
| `apps/api/migrations/postgresql/20260819000000_namecard_unification_foundation.sql:18` | Numeric card numbers, origins, unified canonical table. |
| `apps/api/migrations/postgresql/20260819000000_namecard_unification_foundation.sql:71` | Published/hidden/rejected/withdrawn status vocabulary. |
| `apps/api/migrations/postgresql/20260819000000_namecard_unification_foundation.sql:78` | Guest private attributes and shared emoji counters. |
| `apps/api/migrations/postgresql/20260820000000_namecard_guest_profile.sql:18` | Final unowned descriptive-content constraint. |
| `apps/api/migrations/postgresql/20260826130000_namecard_legacy_tables_read_only.sql:62` | Legacy source tables reject mutation. |
| `apps/api/src/infra/db/repositories/core-repository.ts:38` | Compatibility surface selects guest/legacy origins. |
| `apps/api/src/infra/db/repositories/core-repository.ts:262` | Compatibility counts/list/detail public predicates and numeric sorting. |
| `apps/api/src/infra/db/repositories/core-repository.ts:393` | Compatibility rejection CAS. |
| `apps/api/src/infra/db/repositories/core-repository.ts:430` | Physical terminal guest-row purge. |
| `apps/api/src/infra/db/repositories/core-repository.ts:530` | Token image replacement/resubmission helpers; compare mounted routes. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:79` | Full selected card fields; no separate uploader/contributor relation. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:141` | Owner-dependent public-card eligibility. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:669` | 1..20 IDs; existence/deletion check without role-kind eligibility. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:1132` | Office detail returns placements without requiring `is_open`. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:1174` | Public/favorite filtering and card-created-time ordering. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2268` | Owner list/detail isolation. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2356` | Registered create transaction and enabled primary series. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2418` | Metadata edit resets approval and overwrites current content. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2482` | Media revision/CAS mutation and previous-key return. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2540` | Soft deletion; owner binding remains. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2586` | Claim series fallback resolution. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2620` | Claim creation eligibility, optional idols, duplicate conflict. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:2957` | Claimed/pending status and viewer claim projection. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:3017` | Registered admin pending queue. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:3155` | Review completion and audit transaction. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:3287` | Claim completion: existing target binding or in-place owner assignment. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:3821` | Exchange insert foundation; no production handler caller found. |
| `apps/api/src/infra/db/repositories/fudaba-repository.ts:3876` | Like/favorite insert/remove eligibility and idempotency. |
| `apps/api/src/ports/repositories/fudaba.ts:892` | Existing exchange repository port; no acceptance/completion collection command. |

## API, contracts, and media

| Source | What it establishes |
| --- | --- |
| `packages/contracts/src/namecards.ts:24` | Numeric compatibility card/claim metadata wire shape. |
| `packages/contracts/src/fudaba/index.ts:285` | Owner card metadata, rights/status/revision DTO. |
| `packages/contracts/src/fudaba/index.ts:469` | Registered card request fields and strict write shape. |
| `packages/contracts/src/fudaba/card-claims.ts:16` | Claim/envelope states and review DTOs. |
| `apps/api/src/domains/community/fudaba/routes.ts:16` | Complete Fudaba capability assembler and private no-store wrapper. |
| `apps/api/src/domains/community/fudaba/access-policy.ts:5` | Cache privacy and independent public-read/write/map flags. |
| `apps/api/src/domains/community/fudaba/cards/routes.ts:30` | Owner/media/like/favorite/placement mutation surfaces and middleware. |
| `apps/api/src/domains/community/fudaba/claims/routes.ts:34` | Historical claim/envelope surfaces. |
| `apps/api/src/domains/community/fudaba/moderation/routes.ts:39` | Registered/claim/admin location review surfaces. |
| `apps/api/src/domains/community/fudaba/directory/routes.ts:39` | Public cards/offices/reactions and authenticated favorites. |
| `apps/api/src/domains/community/fudaba/cards/request.ts:26` | Exact mutable fields; no owner-change, hide, sort, or automatic-accept setting. |
| `apps/api/src/domains/community/fudaba/cards/handlers/create-card.ts:19` | 8 MiB per side; both sides required; owner from session. |
| `apps/api/src/domains/community/fudaba/cards/handlers/upload-owned-media.ts:108` | Layout-specific replacement keys, protected pending media, previous-object cleanup. |
| `apps/api/src/domains/community/fudaba/cards/handlers/delete-card.ts:35` | Deletes card images after soft deletion. |
| `apps/api/src/domains/community/fudaba/cards/handlers/set-card-interaction.ts:24` | Writes interaction before checking public projection. |
| `apps/api/src/domains/community/fudaba/directory/handlers/list-favorite-cards.ts:12` | Favorites reuse public-card projection. |
| `apps/api/src/domains/community/fudaba/moderation/handlers/admin-card-reviews.ts:98` | Review claim, publish/protect, failure reconciliation. |
| `apps/api/src/domains/community/fudaba/moderation/response.ts:31` | Review exposes current card and owner, without prior-version diff. |
| `apps/api/src/domains/community/fudaba/guest-submissions/routes.ts:22` | Guest upload/status/media/withdraw only. |
| `apps/api/src/domains/community/fudaba/guest-submissions/request.ts:10` | 6 MiB aggregate upload budget plus metadata; private token header. |
| `apps/api/src/domains/community/fudaba/guest-submissions/handlers/upload-guest-submission.ts:74` | Two files, 3 MiB each, protected media, normalized-hash duplicate check. |
| `apps/api/src/domains/community/fudaba/guest-submissions/ttl-purge.ts:6` | Three-day terminal retention invoked from upload. |
| `apps/api/src/domains/community/fudaba/card-media-assets.ts:13` | 600x400 bounded JPEG thumbnails and protected/public transitions. |
| `apps/api/src/domains/delivery/media/handlers/serve-namecard.ts:18` | Compatibility approved status determines public media access. |
| `apps/api/src/utils/media/image-upload.ts:13` | Extension/MIME/decoded-image checks and permitted formats. |
| `apps/api/src/utils/media/user-image.ts:13` | WebP conversion/output budget; decoded dimensions returned. |
| `apps/api/src/utils/media/normalize-uploaded-image.ts:10` | Guest input pixel budgets and conditional output downscale. |
| `apps/api/src/domains/community/namecards/public-cards/handlers/list-namecards.ts:21` | Legacy wall counts, claims, thumbnails, media URLs. |

## Wiki and identity

| Source | What it establishes |
| --- | --- |
| `packages/contracts/src/wiki.ts:36` | Page kinds and story subtypes; no product-role eligibility taxonomy. |
| `apps/api/migrations/postgresql/0017_wiki_entry_types.sql:13` | SideM unit/special page classifications. |
| `apps/api/src/infra/db/repositories/wiki-entity-repository.ts:65` | Idol query excludes deleted rows; group/member owners. |
| `apps/api/src/infra/db/repositories/wiki-entity-repository.ts:103` | Ordered Wiki group members. |
| `apps/api/src/domains/content/wiki/catalog/handlers/list-public-catalog.ts:61` | Enabled search entries preserve all entry kinds. |
| `apps/api/src/domains/content/wiki/catalog/handlers/list-public-catalog.ts:121` | Selected-agency group expansion into entries. |
| `apps/web/app/components/community/idol-multi-select.tsx:45` | Candidate filter only agency/name, 20-selection limit. |
| `apps/web/app/pages/community/exchange/me/exchange-me-model.ts:57` | Producer name prefilled from account profile; independent card metadata. |
| `docs/architecture/platform-account-security.md:43` | Account deletion/anonymous rewrite explicitly unimplemented. |
| `docs/architecture/platform-account-security.md:89` | Older proposal retains public content after account deletion. |
| `docs/architecture/platform-account-security.md:117` | Producer署名 is card content and remains under older proposal. |
| `apps/api/src/infra/db/repositories/platform-account-repository.ts:2275` | Implemented status administration suspends/restores and revokes sessions. |

## Web and sharing entry points

| Source | What to reuse or revise |
| --- | --- |
| `apps/web/app/route-metadata.ts:153` | Exchange directory, owner workspace, office slug, submission-status route descriptors. |
| `apps/api/src/routing/frontend-route-delivery.ts:40` | Dynamic owner/office frontend delivery inventory. |
| `apps/web/app/pages/community/index.tsx:54` | Community title metadata and wall owner. |
| `apps/web/app/pages/community/components/namecard-detail-dialog.tsx:326` | Two-side detail entry points. |
| `apps/web/app/components/shared/namecard-preview.tsx:320` | Full-image contain display and side selection. |
| `apps/web/app/pages/community/components/namecard-thumbnail.tsx:42` | Contain thumbnail and fallback to original. |
| `apps/web/app/components/community/namecard-upload-dialog.tsx:141` | Wall upload uses guest submission, even though registered upload exists separately. |
| `apps/web/app/components/community/namecard-upload-dialog.tsx:174` | Clipboard token receipt link, with private status purpose. |
| `apps/web/app/components/community/namecard-claim-dialog.tsx:99` | Existing-card or new historical claim input. |
| `apps/web/app/pages/community/exchange/me/card-editor.tsx:1` | Registered create/edit/front/back upload/delete editor. |
| `apps/web/app/pages/community/exchange/me/favorite-collection.tsx:53` | Current favorite paging/state view. |
| `apps/web/app/lib/api/endpoints/fudaba/index.ts:493` | Public cards/favorites/interactions/owner endpoints. |
| `apps/web/app/lib/api/endpoints/fudaba/card-claims.ts:49` | Envelope/claim/admin-review API client owners. |
| `apps/web/app/pages/community/exchange/community-exchange-page.tsx:429` | Directory title/description; no per-card OGP. |

## Existing tests and their limits

| Source | Existing assertion |
| --- | --- |
| `apps/api/tests/server/namecard.test.ts:224` | Real PostgreSQL guest/namecard persistence. |
| `apps/api/tests/server/namecard.test.ts:386` | Ownership migration. |
| `apps/api/tests/server/namecard.test.ts:495` | Reaction reconciliation. |
| `apps/api/tests/server/namecard.test.ts:579` | Canonical unification migration. |
| `apps/api/tests/server/fudaba.test.ts:253` | Ordered registered multi-idol validation. |
| `apps/api/tests/server/fudaba.test.ts:273` | Claim cross-series selection and zero idols. |
| `apps/api/tests/server/fudaba.test.ts:647` | Interaction authentication/CSRF/write gate/rate limit. |
| `apps/api/tests/server/fudaba.test.ts:767` | Favorites use viewer-scoped query, current DTO. |
| `apps/api/tests/server/fudaba.test.ts:2026` | Failed publication re-protects media before rollback. |
| `apps/api/tests/server/fudaba.test.ts:2124` | Claim objects public before final transition. |
| `apps/api/tests/server/fudaba.test.ts:2231` | Uncertain committed review preserves media. |
| `apps/api/tests/server/fudaba.test.ts:2589` | Claim-review persistence suite. |
| `apps/api/tests/server/fudaba.test.ts:3505` | Direct SQL acceptance then forbidden terminal mutation; no HTTP completion workflow. |
| `apps/api/tests/server/fudaba.test.ts:7559` | Owner isolation and no raw object-key leaks. |
| `apps/api/tests/server/fudaba.test.ts:7588` | Image sniffing and protected uploads. |
| `apps/api/tests/server/fudaba.test.ts:7646` | Metadata revision fencing. |
| `apps/api/tests/server/fudaba.test.ts:7770` | Delete removes protected images and owner access. |
| `apps/api/tests/server/fudaba.test.ts:7827` | Confirmed create/upload survives repository complete-then-throw. |
| `apps/api/tests/server/fudaba.test.ts:7939` | Owner media access is private and account-scoped. |
| `apps/api/tests/server/fudaba.test.ts:8455` | Real PostgreSQL owner/profile write fences. |
| `apps/api/tests/server/fudaba.test.ts:9478` | Public projection and cursors. |
| `apps/api/tests/wiki/public-data.contract.test.ts:21` | Public Wiki catalog and resolved artwork. |
| `apps/api/tests/wiki/public-data.contract.test.ts:97` | Random idol filters actual enabled idol kinds; different from namecard selector. |
| `apps/web/tests/e2e/namecard-claim-workflow.spec.ts:181` | Registered user submits wall claim through mocked HTTP. |
| `apps/web/tests/e2e/namecard-claim-workflow.spec.ts:324` | Claim allows neither series nor idols explicitly chosen. |
| `apps/web/tests/e2e/namecard-claim-workflow.spec.ts:566` | Same-ID envelope requires confirmation. |
| `apps/web/tests/e2e/namecard-claim-workflow.spec.ts:756` | Administrator registered-card and claim review flow. |
| `apps/web/tests/e2e/namecard-upload.spec.ts:147` | Two-side guest dialog upload and focus restoration. |
| `apps/web/tests/e2e/namecard-preview.spec.ts:40` | Side switching without rebuilding preview. |
| `apps/web/tests/e2e/namecard-desktop-reactions.spec.ts:72` | Direct desktop reaction and shared detail counts. |

## Requirement coverage and omissions

| Requirements | Current evidence and RFC work |
| --- | --- |
| NC-01..08 | Producer text/series/idols/owner exist. Reading, eligibility taxonomy, combination expansion, symbolic group, contributors, AI field and separate uploader attribution need design. |
| NC-09..14 | Review/claim states, CAS and compensation exist. Sanction lock, separate display status, optional back, rotation/resource policy, structured rejection and old/new comparison need design. |
| NC-15..19 | Owner inventory and favorites exist. Sorting/quick sets/hiding, detach-preserve delete, public share/OGP, recipient consent and held badges need design. |
| NC-20..24 | Exchange-request SQL foundation exists. No mounted completed exchange, nearby matching, dual confirmation, local failed-record retry, temporary channel or background session workflow was found in inspected production owners. Native feasibility is main-agent research. |
| NC-25..27 | Favorite paging exists, sorted by card creation and filtered by current public eligibility. Durable collection/order/readings/idol-group filters/per-entry hiding need design. |
| NC-28..29 | Historical admin claims exist. Account deletion/detach, claim deadline, expired unowned filtering/stat policy and preservation of recipients' holdings need design. |
| NC-30..33 | Contain preview exists. Fixed container contract, extra page assets/order, alpha/effects and model/texture alternatives need design. |
