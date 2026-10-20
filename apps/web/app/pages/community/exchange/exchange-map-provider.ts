import type { MapSearchPlace } from "~/lib/maps/map-search"
import type { ExchangeMapAttribution } from "./exchange-map-attribution"
import type {
  FudabaMapOfficeGroup,
  splitViewportBounds,
} from "./exchange-map-model"

/** Offices and bounds use WGS84; display-only search targets carry their CRS. */
export interface ExchangeMapInteractionProps {
  groups: FudabaMapOfficeGroup[]
  selectedGroupKey: string | null
  selectedPlace?: MapSearchPlace | null
  occlusion?: { x: number; y: number; width: number; height: number } | null
  onSelectGroup: (groupKey: string) => void
  onViewportChange: (bounds: ReturnType<typeof splitViewportBounds>) => void
  onFatalError: (error: Error) => void
  onRetry?: () => void
  onAttributionChange?: (value: ExchangeMapAttribution | null) => void
}
