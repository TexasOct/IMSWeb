import { expect, it, vi } from "vitest"
import { loadAMapSdk, type AMapSdk } from "~/pages/community/exchange/amap-sdk"
import { createAMapDriver } from "~/pages/community/exchange/amap-driver"

vi.mock("~/pages/community/exchange/amap-sdk", () => ({ loadAMapSdk: vi.fn() }))
vi.mock("~/lib/app-target", () => ({ IS_APP_TARGET: false }))

const config = {
  provider: "amap" as const,
  apiKey: "public-key-1234567890",
  securityProxyUrl: "/_AMapService",
  mapStyle: "amap://styles/normal",
}

function fixture() {
  const focus = vi.fn(),
    destroy = vi.fn(),
    setZooms = vi.fn(),
    markerOptions = vi.fn()
  const sdk: AMapSdk = {
    Map: class {
      on(event: string, callback: () => void) {
        if (event === "complete") queueMicrotask(callback)
      }
      getCenter() {
        return { getLng: () => 121.505, getLat: () => 31.197 }
      }
      getBounds() {
        return {
          getSouthWest: () => this.getCenter(),
          getNorthEast: () => this.getCenter(),
        }
      }
      getZoom() {
        return 18
      }
      getZooms(): [number, number] {
        return [2, 20]
      }
      setZooms = setZooms
      lngLatToContainer() {
        return { getX: () => 100, getY: () => 200 }
      }
      setZoomAndCenter = focus
      panBy() {}
      add() {}
      destroy = destroy
    },
    Marker: class {
      constructor(options: unknown) {
        markerOptions(options)
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
  const open = () =>
    createAMapDriver(config).open(document.createElement("div"), {
      viewport: { center: [121.5, 31.2], zoom: 18 },
      minZoom: 2.3,
      signal: new AbortController().signal,
      onChange: vi.fn(),
      onResourceError: vi.fn(),
    })
  return { sdk, focus, destroy, setZooms, open, markerOptions }
}

it("keeps the latest camera intent when conversions finish out of order and honors canceled selection", async () => {
  const test = fixture()
  const view = await test.open()
  const pending = new Map<number, Parameters<AMapSdk["convertFrom"]>[2]>()
  vi.mocked(test.sdk.convertFrom).mockImplementation(
    (points, _type, callback) => {
      pending.set(points[0]![0], callback)
    }
  )
  const first = view.focus([130, 30], { zoom: 13, duration: 0 })
  const second = view.focus([140, 40], { zoom: 14, duration: 0 })
  pending.get(140)!("complete", {
    info: "ok",
    locations: [{ getLng: () => 140.005, getLat: () => 39.997 }],
  })
  await second
  pending.get(130)!("complete", {
    info: "ok",
    locations: [{ getLng: () => 130.005, getLat: () => 29.997 }],
  })
  await first
  expect(test.focus).toHaveBeenCalledExactlyOnceWith(
    14,
    [140.005, 39.997],
    true,
    0
  )
  const controller = new AbortController()
  const canceled = view.focus([150, 30], {
    zoom: 15,
    duration: 0,
    signal: controller.signal,
  })
  controller.abort()
  pending.get(150)!("complete", {
    info: "ok",
    locations: [{ getLng: () => 150.005, getLat: () => 29.997 }],
  })
  await canceled
  expect(test.focus).toHaveBeenCalledTimes(1)
  view.destroy()
})

it("owns the native map before configuring its zoom range and disposes failed setup once", async () => {
  const test = fixture()
  test.setZooms.mockImplementationOnce(() => {
    throw new Error("setup rejected")
  })
  await expect(test.open()).rejects.toThrow("setup rejected")
  expect(test.destroy).toHaveBeenCalledTimes(1)
})

it("uses native search coordinates unchanged, while canonical search and offices still convert from WGS84", async () => {
  const test = fixture()
  const view = await test.open()
  vi.mocked(test.sdk.convertFrom).mockClear()
  const target = {
    kind: "native" as const,
    provider: "amap",
    position: [121.505, 31.197] as [number, number],
  }
  const marker = await view.addSearchMarker({
    target,
    element: document.createElement("div"),
    anchor: "center",
  })
  await view.focusSearch(target, { zoom: 13, duration: 0 })
  expect(test.sdk.convertFrom).not.toHaveBeenCalled()
  expect(test.markerOptions).toHaveBeenCalledWith(
    expect.objectContaining({ position: target.position })
  )
  expect(test.focus).toHaveBeenLastCalledWith(13, target.position, true, 0)
  await view.focusSearch(
    { kind: "wgs84", position: [122, 30] },
    { zoom: 13, duration: 0 }
  )
  expect(test.sdk.convertFrom).toHaveBeenCalledOnce()
  expect(test.focus).toHaveBeenLastCalledWith(13, [122.005, 29.997], true, 0)
  await expect(
    view.focusSearch(
      { ...target, provider: "other" },
      { zoom: 13, duration: 0 }
    )
  ).rejects.toMatchObject({ kind: "unavailable" })
  marker.remove()
  view.destroy()
})
