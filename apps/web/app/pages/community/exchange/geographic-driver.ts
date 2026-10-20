import type { FudabaGeographicMapConfig } from "@imsweb/contracts/fudaba/map-delivery"
import "mapbox-gl/dist/mapbox-gl.css"
import { createMapboxRasterSource } from "~/lib/api"
import type { MapDriver } from "~/lib/maps/map-engine"
import { assertMapActive } from "~/lib/maps/map-lifecycle"
import { MapDisplayError } from "~/lib/maps/map-errors"
import { createAMapDriver } from "./amap-driver"
import { loadAMapSdk } from "./amap-sdk"
import { loadAMapMapBoundary } from "./amap-map-boundary"
import { geographicTileRenderer } from "./geographic-raster"
import { mapWorldPoint } from "./geographic-map-geometry"

/** One AMap camera and renderer. Overseas imagery enters as disposable raster tiles. */
export function createGeographicDriver(
  config: FudabaGeographicMapConfig
): MapDriver {
  const base = createAMapDriver(config.mainland)
  return {
    id: "geographic",
    containerClassName: base.containerClassName,
    async open(container, options) {
      assertMapActive(options.signal)
      const sdk = await loadAMapSdk(config.mainland)
      const boundary = await loadAMapMapBoundary(sdk, options.signal)
      assertMapActive(options.signal)
      const controller = new AbortController()
      const abort = () => controller.abort()
      options.signal.addEventListener("abort", abort, { once: true })
      const pixelRatio = window.devicePixelRatio > 1 ? 2 : 1
      const load = createMapboxRasterSource(
        config.overseas,
        controller.signal,
        pixelRatio
      )
      const logo = document.createElement("a")
      logo.className =
        "mapboxgl-ctrl-logo absolute z-20 left-[calc(var(--map-attribution-left)+80px)] bottom-(--map-attribution-bottom)"
      logo.href = "https://www.mapbox.com/"
      logo.setAttribute("aria-label", "Mapbox")
      logo.target = "_blank"
      logo.rel = "noopener noreferrer"
      let disposed = false
      const cleanup = () => {
        if (disposed) return
        disposed = true
        controller.abort()
        options.signal.removeEventListener("abort", abort)
        logo.remove()
      }
      try {
        const driver = createAMapDriver(config.mainland, {
          // AMap's 256-pixel zoom is one level above the shared 512-pixel camera.
          zoomOffset: 1,
          install(sdk, map) {
            if (!sdk.TileLayer?.Flexible)
              throw new MapDisplayError(
                "unsupported-provider",
                "当前高德 SDK 不支持海外地图图层。"
              )
            const layer = new sdk.TileLayer.Flexible({
              cacheSize: 64,
              opacity: 1,
              zIndex: 100,
              tileSize: 256,
              dataZooms: [2, 22],
              createTile: geographicTileRenderer(
                sdk,
                boundary,
                load,
                controller.signal,
                options.onResourceError,
                {
                  pixelRatio,
                  priority(x, y, z) {
                    const center = map.getCenter()
                    const point = mapWorldPoint([
                      center.getLng(),
                      center.getLat(),
                    ])
                    const dx = Math.abs(
                      (x + 0.5) / 2 ** z - (((point.x % 1) + 1) % 1)
                    )
                    return (
                      Math.abs(z - map.getZoom()) * 1024 +
                      Math.hypot(
                        Math.min(dx, 1 - dx),
                        (y + 0.5) / 2 ** z - point.y
                      ) *
                        2 ** z
                    )
                  },
                }
              ),
            })
            try {
              map.add(layer)
              container.append(logo)
            } catch (error) {
              layer.destroy()
              throw error
            }
            return () => {
              cleanup()
              layer.destroy()
            }
          },
        })
        return await driver.open(container, options)
      } catch (error) {
        cleanup()
        throw error
      }
    },
  }
}
