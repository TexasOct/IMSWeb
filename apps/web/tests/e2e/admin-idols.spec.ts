import {
  updateWikiIdolRequestSchema,
  wikiAdminCatalogSchema,
  wikiAdminStoriesSchema,
  wikiIdolMutationResultSchema,
  wikiStoryCoverAssetsSchema,
  wikiStorySourceCatalogSchema,
  wikiStoriesQuerySchema,
} from "@imsweb/contracts/wiki"

import {
  makeWikiAdminAgency,
  makeWikiAdminCatalog,
  makeWikiAdminGroup,
  makeWikiAdminIdol,
  makeWikiAdminStories,
} from "../../mocks/data/wiki"
import { installAdminAuthMock } from "./fixtures/admin-auth"
import { installEmptyWikiCatalogMock } from "./fixtures/homepage"
import { expect, test } from "./fixtures/test"

test("independent catalog editing preserves the story workspace @mobile", async ({
  page,
  api,
}, testInfo) => {
  installEmptyWikiCatalogMock(api)
  await installAdminAuthMock(page, api, {
    user: { dept: "editor", adminRole: null },
  })
  const idol = makeWikiAdminIdol()
  const unit = makeWikiAdminIdol({
    id: 11,
    name: "测试组合",
    folderName: "test_unit",
    entryKind: "unit",
    groupIds: [],
    wikiEnabled: false,
  })
  const agency = makeWikiAdminAgency({
    idols: [idol, unit],
    groups: [makeWikiAdminGroup({ idols: [idol] })],
  })
  const writes: unknown[] = []
  api.expect({
    name: "catalog reads across story, management, save and return",
    method: "GET",
    path: "/api/admin/wiki/catalog",
    responses: { 200: wikiAdminCatalogSchema },
    times: 4,
    handle: () => ({ json: makeWikiAdminCatalog({ agencies: [agency] }) }),
  })
  api.expect({
    name: "edit the selected content page",
    method: "PATCH",
    path: "/api/admin/wiki/idols/10",
    body: updateWikiIdolRequestSchema,
    responses: { 200: wikiIdolMutationResultSchema },
    handle: ({ body, record }) => {
      expect(record.headers["x-csrftoken"]).toBe("admin-e2e-csrf")
      writes.push(body)
      Object.assign(idol, body)
      return { json: { status: "success", idol } }
    },
  })
  api.expect({
    method: "GET",
    path: "/api/admin/wiki/stories",
    query: wikiStoriesQuerySchema,
    responses: { 200: wikiAdminStoriesSchema },
    times: 2,
    handle: () => ({
      json: makeWikiAdminStories({
        idol: { ...makeWikiAdminStories().idol, name: idol.name },
      }),
    }),
  })
  api.expect({
    method: "GET",
    path: "/api/admin/wiki/agencies/1/story-cover-assets",
    responses: { 200: wikiStoryCoverAssetsSchema },
    times: 2,
    handle: () => ({
      json: {
        status: "success",
        agency: { id: agency.id, code: agency.code, name: agency.name },
        assets: [],
      },
    }),
  })
  api.expect({
    method: "GET",
    path: "/api/admin/wiki/story-source-catalog",
    responses: { 200: wikiStorySourceCatalogSchema },
    times: 2,
    handle: () => ({
      json: { status: "success", contentTypes: [], sourcePlatforms: [] },
    }),
  })

  await page.goto("/admin/stories?agencyId=1&idolId=10&query=开场&expanded=1")
  await expect(page.getByRole("textbox", { name: "搜索剧情" })).toHaveValue(
    "开场"
  )
  for (const name of [
    "新增企划",
    "编辑企划",
    "新增栏目",
    "新增内容页",
    "编辑内容页",
  ]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0)
  }
  await page.getByRole("link", { name: "偶像管理", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "条目管理", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "清除定位" }).click()
  await page.getByRole("combobox", { name: "类型", exact: true }).click()
  await page.getByRole("option", { name: "组合", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "编辑内容页 测试组合" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "编辑内容页 天海春香" })
  ).toHaveCount(0)
  await page.getByRole("combobox", { name: "类型", exact: true }).click()
  await page.getByRole("option", { name: "全部类型" }).click()
  await expect(
    page.getByRole("combobox", { name: "类型", exact: true })
  ).toContainText("全部类型")
  await page.getByRole("textbox", { name: "搜索内容页" }).fill("amami_haruka")
  await expect(
    page.getByRole("button", { name: "编辑内容页 天海春香" })
  ).toHaveCount(1)
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    )
  ).toBe(false)
  await page.screenshot({
    path: testInfo.outputPath("catalog-list.png"),
    fullPage: true,
  })
  await page.getByRole("button", { name: "编辑内容页 天海春香" }).click()
  const dialog = page.getByRole("dialog", { name: "编辑内容页", exact: true })
  await expect(
    dialog.getByRole("textbox", { name: "名称", exact: true })
  ).toBeFocused()
  await page.screenshot({
    path: testInfo.outputPath("catalog-editor.png"),
    fullPage: false,
  })
  await dialog
    .getByRole("textbox", { name: "名称", exact: true })
    .fill("天海春香（更新）")
  await dialog.getByRole("button", { name: "保存", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "编辑内容页 天海春香（更新）" })
  ).toBeVisible()
  expect(writes).toEqual([
    expect.objectContaining({ name: "天海春香（更新）", entryKind: "idol" }),
  ])
  await page.getByRole("link", { name: "返回剧情内容" }).click()
  await expect(page.getByRole("textbox", { name: "搜索剧情" })).toHaveValue(
    "开场"
  )
  await expect(
    page.getByRole("heading", { name: "天海春香（更新）", exact: true })
  ).toBeVisible()
  const finalUrl = new URL(page.url())
  expect(finalUrl.searchParams.get("idolId")).toBe("10")
  expect(finalUrl.searchParams.get("expanded")).toBe("1")
  if (testInfo.project.name === "chromium-mobile") {
    await page.getByRole("button", { name: "选择内容页", exact: true }).click()
    const directory = page.getByRole("dialog", {
      name: "选择内容页",
      exact: true,
    })
    await directory
      .getByRole("button", { name: "天海春香（更新）", exact: true })
      .click()
    await expect(directory).toBeHidden()
  }
  await page.screenshot({
    path: testInfo.outputPath("story-readonly-catalog.png"),
    fullPage: true,
  })
})
