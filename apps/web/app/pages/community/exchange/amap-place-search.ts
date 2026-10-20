import type { FudabaMapSearchConfig } from "@imsweb/contracts/fudaba/map-delivery"
import {
  MapSearchError,
  type MapPlaceSearcher,
  type MapSearchPlace,
} from "~/lib/maps/map-search"
import { assertMapActive } from "~/lib/maps/map-lifecycle"
import { loadAMapSdk } from "./amap-sdk"

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The official JS service reuses our JS key and server-owned security proxy. */
export function createAMapPlaceSearch(
  config: Extract<FudabaMapSearchConfig, { provider: "amap" }>
): MapPlaceSearcher {
  return async (query, signal) => {
    assertMapActive(signal)
    const sdk = await loadAMapSdk(config)
    assertMapActive(signal)
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (items?: MapSearchPlace[], error?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal.removeEventListener("abort", abort)
        if (error) reject(error)
        else resolve({ items: items ?? [], attribution: "© 高德地图" })
      }
      const abort = () =>
        finish(undefined, new DOMException("Search cancelled", "AbortError"))
      const timer = setTimeout(
        () => finish(undefined, new MapSearchError("failed")),
        8000
      )
      signal.addEventListener("abort", abort, { once: true })
      const search = () => {
        if (settled) return
        if (!sdk.PlaceSearch)
          return finish(undefined, new MapSearchError("unavailable"))
        try {
          new sdk.PlaceSearch({
            pageSize: 5,
            pageIndex: 1,
            city: "全国",
            citylimit: false,
            extensions: "base",
          }).search(query, (status, result) => {
            if (settled) return
            if (status === "no_data") return finish([])
            if (
              status !== "complete" ||
              !record(result) ||
              !record(result.poiList) ||
              !Array.isArray(result.poiList.pois)
            )
              return finish(undefined, new MapSearchError("failed"))
            try {
              const items: MapSearchPlace[] = []
              const seen = new Set<string>()
              for (const poi of result.poiList.pois) {
                if (
                  !record(poi) ||
                  typeof poi.id !== "string" ||
                  !poi.id ||
                  typeof poi.name !== "string" ||
                  !poi.name ||
                  !record(poi.location)
                )
                  continue
                const location = poi.location
                if (
                  typeof location.getLng !== "function" ||
                  typeof location.getLat !== "function"
                )
                  continue
                const longitude: unknown = location.getLng(),
                  latitude: unknown = location.getLat()
                if (
                  typeof longitude !== "number" ||
                  typeof latitude !== "number" ||
                  !Number.isFinite(longitude) ||
                  !Number.isFinite(latitude) ||
                  Math.abs(longitude) > 180 ||
                  Math.abs(latitude) > 90 ||
                  seen.has(poi.id)
                )
                  continue
                seen.add(poi.id)
                const address = [
                  poi.pname,
                  poi.cityname,
                  poi.adname,
                  poi.address,
                ].filter(
                  (value): value is string =>
                    typeof value === "string" && Boolean(value.trim())
                )
                items.push({
                  id: poi.id,
                  label: poi.name,
                  address: [...new Set(address)].join(" ") || poi.name,
                  target: {
                    kind: "native",
                    provider: "amap",
                    position: [longitude, latitude],
                  },
                })
                if (items.length === 5) break
              }
              finish(items)
            } catch {
              finish(undefined, new MapSearchError("failed"))
            }
          })
        } catch {
          finish(undefined, new MapSearchError("failed"))
        }
      }
      try {
        if (sdk.PlaceSearch) search()
        else if (sdk.plugin) sdk.plugin(["AMap.PlaceSearch"], search)
        else finish(undefined, new MapSearchError("unavailable"))
      } catch {
        finish(undefined, new MapSearchError("failed"))
      }
    })
  }
}
