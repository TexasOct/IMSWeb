import { beforeEach, expect, it, vi } from "vitest"
import { createGeographicDriver } from "~/pages/community/exchange/geographic-driver"
import { loadAMapSdk, type AMapSdk } from "~/pages/community/exchange/amap-sdk"
import type { FudabaGeographicMapConfig } from "@imsweb/contracts/fudaba/map-delivery"

const mocks = vi.hoisted(() => ({
  district: vi.fn(),
  source: vi.fn(),
  nativeViewport: vi.fn(),
  remember: vi.fn(),
}))
vi.mock("~/pages/community/exchange/amap-sdk", () => ({ loadAMapSdk: vi.fn() }))
vi.mock("~/lib/api", () => ({
  createMapboxRasterSource: mocks.source,
}))
vi.mock("~/lib/app-target", () => ({ IS_APP_TARGET: true }))
vi.mock("~/pages/community/exchange/exchange-map-model", () => ({
  exchangeMapProviderViewport: mocks.nativeViewport,
  rememberExchangeMapProviderViewport: mocks.remember,
}))
const config: FudabaGeographicMapConfig = {
  provider: "geographic",
  mainland: {
    provider: "amap",
    apiKey: "public-amap-key-1234567890",
    securityProxyUrl: "/_AMapService",
    mapStyle: "amap://styles/whitesmoke",
  },
  overseas: {
    provider: "mapbox",
    accessToken: "pk.public-mapbox-token-1234567890",
    styleUrl: "mapbox://styles/mapbox/streets-v12",
  },
  search: {
    provider: "federated",
    mainland: {
      provider: "amap",
      apiKey: "public-amap-key-1234567890",
      securityProxyUrl: "/_AMapService",
    },
    overseas: {
      provider: "mapbox",
      accessToken: "pk.public-mapbox-token-1234567890",
    },
  },
}
function fixture() {
  const destroy = vi.fn(),
    destroyLayer = vi.fn(),
    add = vi.fn(),
    focus = vi.fn(),
    marker = vi.fn(),
    construct = vi.fn(),
    flexible = vi.fn()
  const listeners = new Map<string, () => void>()
  const position = { getLng: () => 121.505, getLat: () => 31.197 }
  const sdk: AMapSdk = {
    DistrictSearch: class {
      search = mocks.district
    },
    Map: class {
      constructor(...args: unknown[]) {
        construct(...args)
      }
      on(event: string, callback: () => void) {
        listeners.set(event, callback)
        if (event === "complete") queueMicrotask(callback)
      }
      getCenter = () => position
      getZoom = () => 14
      getZooms = (): [number, number] => [2, 20]
      setZooms() {}
      getBounds = () => ({
        getSouthWest: () => position,
        getNorthEast: () => position,
      })
      lngLatToContainer = () => ({ getX: () => 200, getY: () => 200 })
      setZoomAndCenter = focus
      add = add
      panBy() {}
      destroy = destroy
    },
    TileLayer: {
      Flexible: class {
        constructor(options: unknown) {
          flexible(options)
        }
        destroy = destroyLayer
      },
    },
    Marker: class {
      constructor(options: unknown) {
        marker(options)
      }
      setMap() {}
    },
    convertFrom: vi.fn<AMapSdk["convertFrom"]>((points, _type, callback) =>
      callback("complete", {
        info: "ok",
        locations: points.map(([lng, lat]) => ({
          getLng: () => lng + 0.005,
          getLat: () => lat - 0.003,
        })),
      })
    ),
  }
  vi.mocked(loadAMapSdk).mockResolvedValue(sdk)
  const frame = document.createElement("div"),
    controller = new AbortController()
  const options = {
    viewport: { center: [120, 31] as [number, number], zoom: 8 },
    minZoom: 2.3,
    signal: controller.signal,
    onChange: vi.fn(),
    onResourceError: vi.fn(),
  }
  const open = () => createGeographicDriver(config).open(frame, options)
  return {
    sdk,
    frame,
    controller,
    options,
    open,
    construct,
    flexible,
    add,
    destroy,
    destroyLayer,
    focus,
    marker,
    listeners,
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.nativeViewport.mockReturnValue(null)
  mocks.source.mockReturnValue(vi.fn())
  mocks.district.mockImplementation((name, callback) => {
    const codes: Record<string, string> = {
      中国: "100000",
      香港特别行政区: "810000",
      澳门特别行政区: "820000",
      台湾省: "710000",
    }
    const code = codes[name as string]
    callback("complete", {
      districtList: [
        {
          adcode: code,
          boundaries: [
            [
              [110, 20],
              [120, 20],
              [120, 30],
            ].map(([lng, lat]) => ({ getLng: () => lng!, getLat: () => lat! })),
          ],
        },
      ],
    })
  })
})
it("opens exactly one interactive AMap with a Flexible layer and disposes it on abort", async () => {
  const f = fixture(),
    view = await f.open()
  expect(f.construct).toHaveBeenCalledOnce()
  expect(f.construct.mock.calls[0]?.[1]).toMatchObject({
    zoom: 9,
    dragEnable: true,
    zoomEnable: true,
  })
  expect(f.add).toHaveBeenCalledOnce()
  expect(f.flexible).toHaveBeenCalledWith(
    expect.objectContaining({ tileSize: 256, cacheSize: 64 })
  )
  expect(view.read().zoom).toBe(13)
  expect(
    f.frame.querySelector('summary[aria-label="查看海外地图版权"]')
  ).toBeNull()
  expect(f.frame.querySelector('a[aria-label="Mapbox"]')).not.toBeNull()
  f.controller.abort()
  view.destroy()
  expect(f.destroyLayer).toHaveBeenCalledTimes(1)
  expect(f.destroy).toHaveBeenCalledTimes(1)
  expect(f.frame.childElementCount).toBe(0)
})
it("focuses native search directly and converts canonical points once; search never persists a viewport", async () => {
  const f = fixture(),
    view = await f.open()
  vi.mocked(f.sdk.convertFrom).mockClear()
  const target = {
    kind: "native" as const,
    provider: "amap",
    position: [121.505, 31.197] as [number, number],
  }
  await view.focusSearch(target, { zoom: 13, duration: 0 })
  await view.addSearchMarker({
    target,
    element: document.createElement("button"),
    anchor: "center",
  })
  expect(f.sdk.convertFrom).not.toHaveBeenCalled()
  expect(f.focus).toHaveBeenLastCalledWith(14, target.position, true, 0)
  f.listeners.get("moveend")!()
  expect(mocks.remember).not.toHaveBeenCalled()
  await view.focus([122, 32], { zoom: 12, duration: 0 })
  expect(f.sdk.convertFrom).toHaveBeenCalledOnce()
  expect(f.focus).toHaveBeenLastCalledWith(13, [122.005, 31.997], true, 0)
  f.listeners.get("moveend")!()
  expect(mocks.remember).toHaveBeenCalledWith("amap", {
    center: [121.505, 31.197],
    zoom: 14,
  })
  view.destroy()
})
it("rejects missing boundaries before creating a map and tears down failed layer installation", async () => {
  const f = fixture()
  mocks.district.mockImplementationOnce((_name, callback) =>
    callback("error", "private vendor error")
  )
  await expect(f.open()).rejects.toThrow(
    "大陆与海外地图边界暂不可用，请重试地图。"
  )
  expect(f.construct).not.toHaveBeenCalled()
  f.add.mockImplementationOnce(() => {
    throw new Error("add failed")
  })
  await expect(f.open()).rejects.toThrow("add failed")
  expect(f.destroyLayer).toHaveBeenCalledTimes(1)
  expect(f.destroy).toHaveBeenCalledTimes(1)
})

it.each(["movestart", "zoomstart"])(
  "does not let a late search conversion replace the user's %s",
  async (event) => {
    const f = fixture(),
      view = await f.open()
    let finish = () => {}
    vi.mocked(f.sdk.convertFrom).mockImplementationOnce(
      (_points, _type, done) => {
        finish = () =>
          done("complete", {
            info: "ok",
            locations: [{ getLng: () => 122.005, getLat: () => 31.997 }],
          })
      }
    )
    const focus = view.focusSearch(
      { kind: "wgs84", position: [122, 32] },
      { zoom: 13, duration: 0 }
    )
    f.listeners.get(event)!()
    finish()
    expect(await focus).toBe(false)
    expect(f.focus).not.toHaveBeenCalled()
    view.destroy()
  }
)
