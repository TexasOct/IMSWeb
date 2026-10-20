import { beforeEach, expect, it, vi } from "vitest"
import { MapSearchError, type MapSearchPlace } from "~/lib/maps/map-search"
import { loadExchangeMapSearch } from "~/pages/community/exchange/exchange-map-search"

const mocks = vi.hoisted(() => ({
  amap: vi.fn(),
  mapbox: vi.fn(),
  createAMap: vi.fn(),
  createMapbox: vi.fn(),
}))
vi.mock("~/pages/community/exchange/amap-place-search", () => ({
  createAMapPlaceSearch: mocks.createAMap,
}))
vi.mock("~/lib/api", () => ({
  createMapboxPlaceSearch: mocks.createMapbox,
  searchFudabaPlaces: vi.fn(),
  sendWithAbort: vi.fn(),
}))
const config = {
  provider: "federated" as const,
  mainland: {
    provider: "amap" as const,
    apiKey: "public-amap-key-1234567890",
    securityProxyUrl: "/_AMapService",
  },
  overseas: {
    provider: "mapbox" as const,
    accessToken: "pk.public-mapbox-token-1234567890",
  },
}
const native: MapSearchPlace = {
  id: "same-id",
  label: "虹桥站",
  address: "上海",
  target: { kind: "native", provider: "amap", position: [121.327, 31.194] },
}
const canonical: MapSearchPlace = {
  id: "same-id",
  label: "Tokyo Station",
  address: "Tokyo",
  target: { kind: "wgs84", position: [139.767, 35.681] },
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.createAMap.mockReturnValue(mocks.amap)
  mocks.createMapbox.mockReturnValue(mocks.mapbox)
  mocks.amap.mockResolvedValue({ items: [native], attribution: "© 高德地图" })
  mocks.mapbox.mockResolvedValue({
    items: [canonical],
    attribution: "© Mapbox",
  })
})

it("searches both authorized services, preserves native targets and keeps result attribution independent", async () => {
  const search = await loadExchangeMapSearch(config)
  const signal = new AbortController().signal
  const result = await search("station", signal)
  expect(mocks.createAMap).toHaveBeenCalledWith(config.mainland)
  expect(mocks.createMapbox).toHaveBeenCalledWith(config.overseas.accessToken)
  expect(mocks.amap).toHaveBeenCalledWith("station", signal)
  expect(mocks.mapbox).toHaveBeenCalledWith("station", signal)
  expect(result.items.map((place) => place.id)).toEqual([
    "amap:same-id",
    "mapbox:same-id",
  ])
  expect(result.items.map((place) => place.target)).toEqual([
    native.target,
    canonical.target,
  ])
  expect(result.items.map((place) => place.attribution)).toEqual([
    "© 高德地图",
    "© Mapbox",
  ])
  expect(result.attribution).toBe("© 高德地图 · © Mapbox")
  expect(result.notice).toBeUndefined()
})

it("retains useful results with a static partial-service notice and no vendor diagnostics", async () => {
  mocks.mapbox.mockRejectedValue(new Error("private upstream diagnostic"))
  const result = await (
    await loadExchangeMapSearch(config)
  )("上海", new AbortController().signal)
  expect(result.items).toHaveLength(1)
  expect(result.attribution).toBe("© 高德地图")
  expect(result.notice).toContain("部分地点服务暂不可用")
  expect(JSON.stringify(result)).not.toContain("private upstream")
})

it("does not report a worldwide no-result answer when one empty service is the only success", async () => {
  mocks.amap.mockResolvedValue({ items: [], attribution: "© 高德地图" })
  mocks.mapbox.mockRejectedValue(new MapSearchError("unavailable"))
  await expect(
    (await loadExchangeMapSearch(config))("Tokyo", new AbortController().signal)
  ).rejects.toMatchObject({ kind: "unavailable" })
})

it("isolates a search-module load failure and preserves the other service", async () => {
  mocks.createAMap.mockImplementation(() => {
    throw new Error("chunk unavailable")
  })
  const result = await (
    await loadExchangeMapSearch(config)
  )("Tokyo", new AbortController().signal)
  expect(result.items[0]?.id).toBe("mapbox:same-id")
  expect(result.attribution).toBe("© Mapbox")
  expect(result.notice).toContain("部分地点服务")
})

it("forwards one cancellation owner to both services and rejects late results", async () => {
  let resolveAMap!: (value: unknown) => void,
    resolveMapbox!: (value: unknown) => void
  mocks.amap.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveAMap = resolve
      })
  )
  mocks.mapbox.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveMapbox = resolve
      })
  )
  const controller = new AbortController()
  const search = await loadExchangeMapSearch(config)
  const pending = search("station", controller.signal)
  controller.abort()
  resolveAMap({ items: [native], attribution: "© 高德地图" })
  resolveMapbox({ items: [canonical], attribution: "© Mapbox" })
  await expect(pending).rejects.toMatchObject({ name: "AbortError" })
  expect(mocks.amap.mock.calls[0]?.[1]).toBe(controller.signal)
  expect(mocks.mapbox.mock.calls[0]?.[1]).toBe(controller.signal)
  mocks.amap.mockClear()
  mocks.mapbox.mockClear()
  await expect(search("station", controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  })
  expect(mocks.amap).not.toHaveBeenCalled()
  expect(mocks.mapbox).not.toHaveBeenCalled()
})
