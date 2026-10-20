import {
  mapboxGeocodingResponseSchema,
  mapboxGeocodingErrorSchema,
} from "@imsweb/contracts/fudaba/map-delivery"
import { parsed } from "../../parsed"
import { MapSearchError, type MapPlaceSearcher } from "~/lib/maps/map-search"

/** Isolated vendor request: no portal cookies/auth, redirects or result cache. */
export function createMapboxPlaceSearch(accessToken: string): MapPlaceSearcher {
  return async (query, signal) => {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward")
    url.search = new URLSearchParams({
      q: query,
      access_token: accessToken,
      autocomplete: "false",
      limit: "5",
      permanent: "false",
    }).toString()
    try {
      const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
      })
      if (!response.ok) {
        try {
          parsed(mapboxGeocodingErrorSchema).transform(await response.json())
        } catch {
          // Gateways can return HTML or an empty body; status still owns the safe explanation.
        }
        throw new MapSearchError(
          response.status === 429
            ? "busy"
            : response.status === 401 || response.status === 403
              ? "unavailable"
              : "failed"
        )
      }
      const result = parsed(mapboxGeocodingResponseSchema).transform(
        await response.json()
      )
      return {
        items: result.features.map(({ properties, geometry }) => ({
          id: properties.mapbox_id,
          label: properties.name,
          address:
            properties.full_address ||
            properties.place_formatted ||
            properties.name,
          target: { kind: "wgs84" as const, position: geometry.coordinates },
        })),
        attribution: "© Mapbox",
      }
    } catch (error) {
      if (signal.aborted)
        throw new DOMException("Search cancelled", "AbortError")
      throw error instanceof MapSearchError
        ? error
        : new MapSearchError("failed")
    }
  }
}
