import type { FudabaMapSearchConfig } from "@imsweb/contracts/fudaba/map-delivery"
import { searchFudabaPlaces, sendWithAbort } from "~/lib/api"
import { MapSearchError, type MapPlaceSearcher } from "~/lib/maps/map-search"

interface SearchRegistration {
  matches(config: FudabaMapSearchConfig): boolean
  load(config: FudabaMapSearchConfig): Promise<MapPlaceSearcher>
}

function register<Id extends FudabaMapSearchConfig["provider"]>(
  id: Id,
  load: (
    config: Extract<FudabaMapSearchConfig, { provider: Id }>
  ) => Promise<MapPlaceSearcher>
): SearchRegistration {
  const matches = (
    config: FudabaMapSearchConfig
  ): config is Extract<FudabaMapSearchConfig, { provider: Id }> =>
    config.provider === id
  return {
    matches,
    load(config) {
      if (!matches(config)) throw new MapSearchError("unavailable")
      return load(config)
    },
  }
}

const registrations: SearchRegistration[] = [
  register("nominatim", async () => async (query, signal) => {
    const result = await sendWithAbort(searchFudabaPlaces(query), signal)
    return {
      attribution: result.attribution,
      items: result.items.map((place) => ({
        id: place.id,
        label: place.label,
        address: place.address,
        target: {
          kind: "wgs84" as const,
          position: [place.location.longitude, place.location.latitude],
        },
      })),
    }
  }),
  register("amap", async (config) =>
    (await import("./amap-place-search")).createAMapPlaceSearch(config)
  ),
  register("mapbox", async (config) =>
    (await import("~/lib/api")).createMapboxPlaceSearch(config.accessToken)
  ),
  register("federated", async (config) => {
    const searchers = await Promise.allSettled([
      loadExchangeMapSearch(config.mainland),
      loadExchangeMapSearch(config.overseas),
    ])
    return async (query, signal) => {
      if (signal.aborted) throw new DOMException("Search aborted", "AbortError")
      const results = await Promise.allSettled(
        searchers.map((searcher) =>
          searcher.status === "fulfilled"
            ? searcher.value(query, signal)
            : Promise.reject(new MapSearchError("unavailable"))
        )
      )
      if (signal.aborted) throw new DOMException("Search aborted", "AbortError")
      const success = results.flatMap((result, index) =>
        result.status === "fulfilled" ? [{ ...result.value, index }] : []
      )
      const failed = results.filter((result) => result.status === "rejected")
      const items = success.flatMap((result) =>
        result.items.map((place) => ({
          ...place,
          id: `${result.index === 0 ? "amap" : "mapbox"}:${place.id}`,
          attribution: result.attribution,
        }))
      )
      if (!success.length || (!items.length && failed.length)) {
        const reasons = failed.map((result) => result.reason)
        throw new MapSearchError(
          reasons.some(
            (reason) =>
              reason instanceof MapSearchError && reason.kind === "busy"
          )
            ? "busy"
            : reasons.every(
                  (reason) =>
                    reason instanceof MapSearchError &&
                    reason.kind === "unavailable"
                )
              ? "unavailable"
              : "failed"
        )
      }
      return {
        items,
        attribution: [
          ...new Set(success.map((result) => result.attribution)),
        ].join(" · "),
        ...(failed.length
          ? { notice: "部分地点服务暂不可用，已显示可用服务的结果。" }
          : {}),
      }
    }
  }),
]

export async function loadExchangeMapSearch(
  config: FudabaMapSearchConfig
): Promise<MapPlaceSearcher> {
  const matches = registrations.filter((registration) =>
    registration.matches(config)
  )
  if (matches.length !== 1) throw new MapSearchError("unavailable")
  return matches[0]!.load(config)
}
