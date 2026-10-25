import AxeBuilder from "@axe-core/playwright"

import { expect, test } from "./fixtures/test"
import { installEmptyWikiCatalogMock } from "./fixtures/homepage"
import { makeCharacterCatalog } from "./fixtures/fudaba-characters"

test("opens every personal hub action as a standalone page with refresh and return @mobile", async ({
  page,
  api,
  isMobile,
}, testInfo) => {
  await page.setViewportSize(
    isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
  )
  await page.addInitScript(() => {
    localStorage.setItem("imsweb.language", "zh-CN")
    document.cookie = "ims_platform_csrf=personal-pages; path=/"
  })
  const session = {
    success: true,
    account: { id: "personal-pages", status: "active" },
    profile: {
      displayName: "页面导航制作人",
      avatarUrl: null,
      homeCity: "上海",
      bio: "",
    },
  }
  await page.context().addCookies([
    {
      name: "ims_platform_access",
      value: "personal-pages-session",
      domain: "127.0.0.1",
      path: "/",
    },
  ])
  await installEmptyWikiCatalogMock(api, { min: 1, max: 8 })
  await api.mock(
    {
      method: "GET",
      path: "/api/community/exchange/characters",
      times: { min: 1, max: 8 },
    },
    (route) => route.fulfill({ json: makeCharacterCatalog() })
  )
  await api.mock(
    {
      method: "GET",
      path: "/api/platform/auth/session",
      times: { min: 1, max: 8 },
    },
    (route) => route.fulfill({ json: session })
  )
  await api.mock(
    { method: "GET", path: "/api/platform/me", times: { min: 5, max: 8 } },
    (route) =>
      route.fulfill({
        json: {
          ...session,
          capabilities: { fudabaWrite: true },
          profile: { ...session.profile, updatedAt: 1 },
        },
      })
  )
  for (const path of [
    "/api/community/exchange/me/series",
    "/api/community/exchange/me/cards",
    "/api/community/exchange/me/offices",
    "/api/community/exchange/me/claim-envelopes",
  ]) {
    await api.mock(
      { method: "GET", path, times: { min: 5, max: 8 } },
      (route) => route.fulfill({ json: { items: [] } })
    )
  }
  await api.mock(
    {
      method: "GET",
      path: "/api/community/exchange/me/favorites",
      times: { min: 5, max: 8 },
    },
    (route) =>
      route.fulfill({
        json: {
          items: [],
          pageInfo: { hasNextPage: false, nextCursor: null },
        },
      })
  )
  await page.goto("/account/me")
  for (const [path, json] of [
    ["/api/platform/me/sessions", { success: true, sessions: [] }],
    [
      "/api/platform/me/oauth-links",
      { success: true, links: [], passwordEnabled: true },
    ],
    ["/api/platform/auth/oauth/providers", { success: true, providers: [] }],
  ] as const) {
    await api.mock({ method: "GET", path, times: 1 }, (route) =>
      route.fulfill({ json })
    )
  }
  await expect(
    page.getByRole("heading", { name: "我的", exact: true })
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath("personal-hub.png"),
    fullPage: true,
  })

  for (const [section, label] of [
    ["profile", "个人资料"],
    ["cards", "交换名片"],
    ["favorites", "收藏夹"],
    ["offices", "事务所与位置"],
    ["claims", "认领消息"],
  ]) {
    await page.getByRole("link", { name: new RegExp(`^${label}`) }).click()
    await expect(page).toHaveURL(new RegExp(`/account/me/${section}$`))
    await expect(
      page.locator(`#profile-workspace-section-${section}`)
    ).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.locator("canvas.maplibregl-canvas")).toHaveCount(0)
    await expect(page).toHaveTitle(`${label} | IMSWeb`)
    await expect(page.getByRole("main")).toHaveCount(1)
    if (section === "offices") {
      await page.reload()
      await expect(
        page.locator("#profile-workspace-section-offices")
      ).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath("personal-offices.png"),
        fullPage: true,
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true)
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
      expect(accessibility.violations).toEqual([])
    }
    await page.getByRole("link", { name: "返回我的", exact: true }).click()
    await expect(page).toHaveURL(/\/account\/me$/)
  }
  // A direct URL must work independently of navigation state, including after reload.
  await page.goto("/account/me/claims")
  await expect(page.locator("#profile-workspace-section-claims")).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/account\/me$/)
  await page.getByRole("link", { name: /帐号安全/ }).click()
  await expect(page).toHaveURL(/\/account\/security$/)
  await expect(
    page.getByRole("heading", { name: "帐号安全", exact: true })
  ).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.getByRole("link", { name: "返回我的", exact: true }).click()
  await expect(page).toHaveURL(/\/account\/me$/)
})
