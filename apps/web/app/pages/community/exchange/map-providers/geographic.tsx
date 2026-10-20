import type { FudabaGeographicMapConfig } from "@imsweb/contracts/fudaba/map-delivery"
import type { ExchangeMapRenderer } from "../exchange-map-renderer"
import { createGeographicDriver } from "../geographic-driver"
import { ProviderOfficeMap } from "../provider-office-map"

export function createMapRenderer(
  config: FudabaGeographicMapConfig
): ExchangeMapRenderer {
  const driver = createGeographicDriver(config)
  return (props) => (
    <ProviderOfficeMap
      {...props}
      driver={driver}
      attribution={{
        segments: [
          { kind: "link", label: "© 高德地图", href: "https://www.amap.com/" },
          { kind: "text", value: " · " },
          {
            kind: "link",
            label: "© Mapbox",
            href: "https://www.mapbox.com/about/maps/",
          },
          { kind: "text", value: " · " },
          {
            kind: "link",
            label: "© OpenStreetMap",
            href: "https://www.openstreetmap.org/copyright",
          },
          { kind: "text", value: " · " },
          {
            kind: "link",
            label: "Improve this map",
            href: "https://apps.mapbox.com/feedback/",
          },
        ],
      }}
    />
  )
}
