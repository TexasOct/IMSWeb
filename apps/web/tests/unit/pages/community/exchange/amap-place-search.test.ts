import { expect, it, vi, afterEach } from "vitest"
import { createAMapPlaceSearch } from "~/pages/community/exchange/amap-place-search"
import { loadAMapSdk, type AMapSdk } from "~/pages/community/exchange/amap-sdk"

vi.mock("~/pages/community/exchange/amap-sdk", () => ({ loadAMapSdk: vi.fn() }))
const config = {
  provider: "amap" as const,
  apiKey: "public-test-key",
  securityProxyUrl: "/_AMapService",
}
afterEach(() => vi.useRealTimers())

function fixture() {
  let complete!: (status: string, result: unknown) => void
  const search = vi.fn((_query: string, callback: typeof complete) => {
    complete = callback
  })
  const plugin = vi.fn((_names: string[], callback: () => void) => callback())
  // AMapSdk's unrelated map capabilities are not used by the search service.
  const sdk = {
    plugin,
    PlaceSearch: class {
      search = search
    },
  }
  vi.mocked(loadAMapSdk).mockResolvedValue(sdk as unknown as AMapSdk)
  return {
    search,
    plugin,
    complete: (status: string, result: unknown) => complete(status, result),
  }
}

it("returns explicit native targets and deduplicates POIs without running coordinate conversion", async () => {
  const test = fixture()
  const pending = createAMapPlaceSearch(config)(
    "上海场馆",
    new AbortController().signal
  )
  await vi.waitFor(() => expect(test.search).toHaveBeenCalledOnce())
  const poi = {
    id: "amap-poi",
    name: "场馆",
    pname: "上海市",
    cityname: "上海市",
    address: "测试路",
    location: { getLng: () => 121.5, getLat: () => 31.2 },
  }
  test.complete("complete", {
    poiList: {
      pois: [
        poi,
        poi,
        {
          ...poi,
          id: "bad",
          location: { getLng: () => NaN, getLat: () => 30 },
        },
      ],
    },
  })
  await expect(pending).resolves.toEqual({
    items: [
      {
        id: "amap-poi",
        label: "场馆",
        address: "上海市 测试路",
        target: { kind: "native", provider: "amap", position: [121.5, 31.2] },
      },
    ],
    attribution: "© 高德地图",
  })
})

it("settles cancellation immediately and ignores a late SDK callback", async () => {
  const test = fixture()
  const controller = new AbortController()
  const pending = createAMapPlaceSearch(config)("上海场馆", controller.signal)
  await vi.waitFor(() => expect(test.search).toHaveBeenCalledOnce())
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" })
  controller.abort()
  test.complete("error", { info: "raw key-bearing SDK diagnostics" })
  await rejected
})

it("times out when a plugin never becomes ready and does not start a late search", async () => {
  vi.useFakeTimers()
  let ready!: () => void
  const search = vi.fn()
  const sdk = {
    plugin: vi.fn((_names: string[], callback: () => void) => {
      ready = callback
    }),
    PlaceSearch: undefined as AMapSdk["PlaceSearch"],
  }
  vi.mocked(loadAMapSdk).mockResolvedValue(sdk as unknown as AMapSdk)
  const pending = createAMapPlaceSearch(config)(
    "上海场馆",
    new AbortController().signal
  )
  const rejected = expect(pending).rejects.toMatchObject({ kind: "failed" })
  await vi.advanceTimersByTimeAsync(8000)
  await rejected
  sdk.PlaceSearch = class {
    search = search
  }
  ready()
  expect(search).not.toHaveBeenCalled()
})
