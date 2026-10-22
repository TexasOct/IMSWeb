import { expect, test } from "./fixtures/test"
import {
  exerciseUnifiedSearch,
  installUnifiedSearchApis,
} from "./fixtures/exchange-search"

test("searches offices first and places separately without rebuilding the map @mobile", async ({
  api,
  page,
}, info) => {
  const queries = await installUnifiedSearchApis(api)
  await exerciseUnifiedSearch(page, info, false)
  expect(queries).toContain("上海")
})

test("animates the office panel in both directions and respects reduced motion @mobile", async ({
  api,
  page,
}, info) => {
  // This case opens no search or office detail routes.
  await installUnifiedSearchApis(api)
  await page.goto("/community/exchange?view=map")
  await expect(page.locator("[data-map-results-state]")).toHaveAttribute(
    "data-map-results-state",
    "ready"
  )
  const trigger = page.getByRole("button", { name: "范围内事务所列表" })
  await expect(trigger).toBeVisible()
  for (const open of [true, false]) {
    await trigger.click()
    const animations = await page
      .locator(".exchange-web-map-count")
      .evaluate(async (node) => {
        const running = node.getAnimations({ subtree: true })
        const count = running.length
        await Promise.all(running.map((a) => a.finished.catch(() => {})))
        return count
      })
    expect(animations).toBeGreaterThan(0)
    await expect(trigger).toHaveAttribute("aria-expanded", String(open))
    await page.screenshot({
      path: info.outputPath(
        open ? "office-panel-open.png" : "office-panel-closed.png"
      ),
    })
  }
  await page.emulateMedia({ reducedMotion: "reduce" })
  await trigger.click()
  expect(
    await page
      .locator(".exchange-web-map-count")
      .evaluate((node) => node.getAnimations({ subtree: true }).length)
  ).toBe(0)
})
