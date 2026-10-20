import { LoaderCircleIcon, LocateFixedIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { Button } from "~/components/ui/button"
import { IS_APP_TARGET } from "~/lib/app-target"
import { GeolocationFailure, getCurrentCoordinates } from "~/lib/geolocation"
import { useNativeGlassControl } from "~/lib/native-glass-controls"
import { cn } from "~/lib/utils"
import type {
  MapDriver,
  MapView,
  MapMarker,
  MapPosition,
} from "~/lib/maps/map-engine"
import {
  createClusterMarker,
  createOfficeGroupMarker,
} from "./exchange-map-markers"
import {
  DEFAULT_EXCHANGE_MAP_VIEWPORT,
  exchangeMapInitialViewport,
  EXCHANGE_MAP_MIN_ZOOM,
  EXCHANGE_MAP_CLUSTER_MAX_ZOOM,
  EXCHANGE_MAP_SEARCH_ZOOM,
  EXCHANGE_MAP_FLOATING_GROUP,
  splitViewportBounds,
} from "./exchange-map-model"
import type { ExchangeMapInteractionProps } from "./exchange-map-provider"
import type { ExchangeMapAttribution } from "./exchange-map-attribution"

type Props = ExchangeMapInteractionProps & {
  driver: MapDriver
  attribution: ExchangeMapAttribution
}
const reducedMotion = () =>
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)

export function ProviderOfficeMap(props: Props) {
  const { driver, groups, selectedGroupKey, selectedPlace, occlusion } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  const runtime = useRef<MapView | null>(null)
  const [ready, setReady] = useState(false)
  const [resourceError, setResourceError] = useState(false)
  const [location, setLocation] = useState({ busy: false, message: "" })
  const [size, setSize] = useState({ width: 0, height: 0 })
  const locationRequest = useRef(0)
  const userMarker = useRef<MapMarker | null>(null)
  const refreshMarkers = useRef(() => {})
  useLayoutEffect(() => {
    latest.current = props
  })

  const focus = useCallback(
    async (
      map: MapView,
      position: MapPosition | import("~/lib/maps/map-search").MapSearchTarget,
      zoom: number,
      avoidSearch = false,
      signal?: AbortSignal
    ) => {
      const frame = avoidSearch ? latest.current.occlusion : null
      const options = {
        zoom,
        duration: frame || reducedMotion() ? 0 : 900,
        ...(signal ? { signal } : {}),
      }
      const outcome = Array.isArray(position)
        ? await map.focus(position, options)
        : await map.focusSearch(position, options)
      if (outcome === false) return false
      if (!frame || runtime.current !== map || signal?.aborted) return
      // Keep the target in the centre of the unobscured map surface.
      if (frame.width < (containerRef.current?.clientWidth ?? 0) * 0.65)
        map.panBy(
          { x: (frame.x + frame.width + 12) / 2, y: 0 },
          reducedMotion() ? 0 : 900
        )
      else
        map.panBy(
          {
            x: 0,
            y: -((containerRef.current?.clientHeight ?? 0) - frame.y + 12) / 2,
          },
          reducedMotion() ? 0 : 900
        )
    },
    []
  )

  async function locateUser() {
    const current = runtime.current
    if (!current) return
    const request = ++locationRequest.current
    setLocation({ busy: true, message: "正在获取您的位置" })
    try {
      const coordinates = await getCurrentCoordinates()
      if (request !== locationRequest.current || runtime.current !== current)
        return
      const position: MapPosition = [
        coordinates.longitude,
        coordinates.latitude,
      ]
      const element = document.createElement("span")
      element.className =
        "block size-4 rounded-full border-[3px] border-white bg-primary shadow-md ring-2 ring-primary/30"
      element.setAttribute("role", "img")
      element.setAttribute("aria-label", "您的当前位置")
      const marker = await current.addMarker({
        position,
        element,
        anchor: "center",
      })
      if (request !== locationRequest.current || runtime.current !== current) {
        marker.remove()
        return
      }
      userMarker.current?.remove()
      userMarker.current = marker
      const outcome = await focus(
        current,
        position,
        Math.max(current.read().zoom, 8)
      )
      if (request !== locationRequest.current || runtime.current !== current)
        return
      setLocation({
        busy: false,
        message: outcome === false ? "" : "已回到您的位置",
      })
    } catch (error) {
      if (request !== locationRequest.current || runtime.current !== current)
        return
      setLocation({
        busy: false,
        message:
          error instanceof GeolocationFailure &&
          error.kind === "permission-denied"
            ? "未获得位置权限"
            : "暂时无法获取您的位置，请重试",
      })
    }
  }
  const { controlRef, refreshGeometry } = useNativeGlassControl(
    "locate",
    {
      kind: "icon-button",
      icon: location.busy ? "loader-circle" : "locate-fixed",
      label: "回到我的位置",
      group: EXCHANGE_MAP_FLOATING_GROUP,
      disabled: !ready || location.busy,
    },
    () => {
      void locateUser()
    }
  )
  useLayoutEffect(() => {
    refreshGeometry()
  }, [refreshGeometry, occlusion, size])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false
    let map: MapView | null = null
    const controller = new AbortController()
    const markers = new Map<
      string,
      { marker: MapMarker; element: HTMLElement; signature: string }
    >()
    let renderGeneration = 0
    let initialized = false
    let failed = false
    setReady(false)
    setResourceError(false)
    setLocation({ busy: false, message: "" })
    const measure = () => {
      setSize({ width: container.clientWidth, height: container.clientHeight })
      if (initialized && map) {
        map.resize?.()
        updateViewport()
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    measure()
    const fail = (error?: Error) => {
      if (disposed || failed) return
      failed = true
      controller.abort()
      container.dataset.mapState = "error"
      latest.current.onFatalError(
        error ?? new Error("地图无法加载，请检查地图服务配置和网络")
      )
    }
    const updateViewport = () => {
      if (!map || disposed) return
      latest.current.onViewportChange(splitViewportBounds(map.read().bounds))
      refreshMarkers.current()
    }
    const initTimer = setTimeout(fail, 20000)
    void driver
      .open(container, {
        viewport: IS_APP_TARGET
          ? exchangeMapInitialViewport()
          : DEFAULT_EXCHANGE_MAP_VIEWPORT,
        minZoom: EXCHANGE_MAP_MIN_ZOOM,
        signal: controller.signal,
        onChange: updateViewport,
        onResourceError: () => {
          if (!disposed) setResourceError(true)
        },
      })
      .then((view) => {
        if (disposed || controller.signal.aborted) {
          view.destroy()
          return
        }
        map = view
        runtime.current = view
        refreshMarkers.current = () => {
          const generation = ++renderGeneration
          const currentGroups = latest.current.groups
          void view
            .project(
              currentGroups.map((group) => [group.longitude, group.latitude])
            )
            .then(async (positions) => {
              if (!map || disposed || generation !== renderGeneration) return
              const cells = new Map<
                string,
                { group: (typeof groups)[number]; position: MapPosition }[]
              >()
              const zoom = view.read().zoom
              currentGroups.forEach((group, index) => {
                const position: MapPosition = [group.longitude, group.latitude]
                const point = positions[index]!
                const key =
                  zoom >= EXCHANGE_MAP_CLUSTER_MAX_ZOOM + 1
                    ? group.key
                    : `${Math.floor(point.x / 56)}:${Math.floor(point.y / 56)}`
                const cell = cells.get(key) ?? []
                cell.push({ group, position })
                cells.set(key, cell)
              })
              const seen = new Set<string>()
              for (const cell of cells.values()) {
                const { group, position } = cell[0]!
                const key =
                  cell.length > 1
                    ? `cluster:${cell.map((item) => item.group.key).join(";")}`
                    : `office:${group.key}`
                seen.add(key)
                const signature = JSON.stringify({
                  position,
                  groups: cell.map((item) => ({
                    colors: item.group.colors,
                    offices: item.group.offices.map(({ id, name }) => [
                      id,
                      name,
                    ]),
                  })),
                })
                const existing = markers.get(key)
                if (existing?.signature === signature) {
                  if (cell.length === 1) {
                    const selected =
                      group.key === latest.current.selectedGroupKey
                    existing.element.setAttribute(
                      "aria-pressed",
                      String(selected)
                    )
                    existing.element.classList.toggle("ring-3", selected)
                    existing.element.classList.toggle(
                      "ring-primary/60",
                      selected
                    )
                  }
                  continue
                }
                markers.delete(key)
                existing?.marker.remove()
                const element =
                  cell.length > 1
                    ? createClusterMarker(cell.length)
                    : createOfficeGroupMarker(
                        group,
                        group.key === latest.current.selectedGroupKey
                      )
                element.addEventListener("click", () => {
                  if (cell.length > 1 && map)
                    void focus(map, position, map.read().zoom + 2).catch(
                      (error: unknown) => {
                        if (!disposed)
                          latest.current.onFatalError(
                            error instanceof Error
                              ? error
                              : new Error("地图无法定位")
                          )
                      }
                    )
                  else latest.current.onSelectGroup(group.key)
                })
                const marker = await view.addMarker({
                  position,
                  element,
                  anchor: "bottom",
                })
                if (disposed || generation !== renderGeneration) {
                  marker.remove()
                  return
                }
                markers.set(key, {
                  element,
                  signature,
                  marker,
                })
              }
              for (const [key, { marker }] of markers) {
                if (!seen.has(key)) {
                  marker.remove()
                  markers.delete(key)
                }
              }
            })
            .catch((error: unknown) => {
              if (!disposed && generation === renderGeneration)
                latest.current.onFatalError(
                  error instanceof Error ? error : new Error("地图点位无法加载")
                )
            })
        }
        initialized = true
        clearTimeout(initTimer)
        container.dataset.mapState = "ready"
        setReady(true)
        latest.current.onAttributionChange?.(latest.current.attribution)
        updateViewport()
      })
      .catch((error: unknown) => {
        if (!disposed)
          fail(error instanceof Error ? error : new Error("地图加载失败"))
      })
    return () => {
      disposed = true
      clearTimeout(initTimer)
      observer.disconnect()
      userMarker.current?.remove()
      userMarker.current = null
      for (const { marker } of markers.values()) marker.remove()
      latest.current.onAttributionChange?.(null)
      refreshMarkers.current = () => {}
      runtime.current = null
      controller.abort()
      map?.destroy()
    }
  }, [driver, focus])

  useEffect(() => {
    if (ready) refreshMarkers.current()
  }, [groups, selectedGroupKey, ready])
  useEffect(() => {
    const current = runtime.current
    if (!current || !ready || !selectedPlace) return
    const element = document.createElement("div")
    element.className =
      "size-5 rounded-full border-3 border-background bg-primary shadow-md"
    element.setAttribute("role", "img")
    element.setAttribute("aria-label", `搜索地点：${selectedPlace.label}`)
    let disposed = false
    const controller = new AbortController()
    let marker: MapMarker | undefined
    const target = selectedPlace.target
    void current
      .addSearchMarker({
        target,
        element,
        anchor: "center",
      })
      .then(async (next) => {
        if (disposed || runtime.current !== current) {
          next.remove()
          return
        }
        marker = next
        await focus(
          current,
          target,
          EXCHANGE_MAP_SEARCH_ZOOM,
          true,
          controller.signal
        )
      })
      .catch((error: unknown) => {
        if (!disposed && runtime.current === current)
          latest.current.onFatalError(
            error instanceof Error ? error : new Error("搜索地点定位失败")
          )
      })
    return () => {
      disposed = true
      controller.abort()
      marker?.remove()
    }
    // Occlusion changes must not repeatedly move an already selected place.
  }, [selectedPlace, ready, focus])

  const bottom = occlusion
    ? occlusion.width < size.width * 0.65
      ? 12
      : Math.max(12, size.height - occlusion.y + 12)
    : undefined
  const sidePanel = occlusion && occlusion.width < size.width * 0.65
  const attributionBottom =
    occlusion && !sidePanel ? Math.max(8, size.height - occlusion.y + 12) : 8
  const attributionLeft =
    occlusion && sidePanel ? Math.max(8, occlusion.x + occlusion.width + 12) : 8
  return (
    <div className="relative size-full min-h-0 bg-[#e8f2f4]">
      <div
        ref={containerRef}
        className={cn("size-full min-h-0", driver.containerClassName)}
        style={
          {
            "--map-attribution-bottom": `${attributionBottom}px`,
            "--map-attribution-left": `${attributionLeft}px`,
            "--map-attribution-right": occlusion ? "64px" : "0px",
          } as CSSProperties
        }
        data-exchange-office-map
        data-map-provider={driver.id}
        data-map-state="loading"
        aria-label="区域事务所地图工作面"
      />
      {resourceError ? (
        <div
          role="status"
          className="absolute top-3 right-3 z-20 max-w-xs rounded-md border bg-background/95 p-3 text-sm shadow-sm"
        >
          <p>部分地图资源加载失败，已保留当前地图。</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              if (latest.current.onRetry) latest.current.onRetry()
              else latest.current.onFatalError(new Error("地图资源加载失败"))
            }}
          >
            重试地图
          </Button>
        </div>
      ) : null}
      <div
        className={
          occlusion
            ? cn(
                "exchange-map-side-controls",
                IS_APP_TARGET && "exchange-map-app-surface"
              )
            : "contents"
        }
        data-exchange-side-controls={occlusion ? "" : undefined}
        style={{ bottom }}
      >
        <div data-exchange-refresh-anchor />
        <Button
          ref={controlRef}
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "absolute z-10",
            IS_APP_TARGET
              ? "exchange-map-app-control exchange-map-app-surface exchange-map-app-pill-top right-3 bottom-[calc(var(--app-floating-bottom)+3rem)] size-12 md:right-2.5 md:bottom-[calc(var(--app-floating-bottom)+2.5rem)] md:size-10"
              : "right-2.5 bottom-20 bg-background/95 shadow-sm backdrop-blur-sm"
          )}
          data-native-glass-control="locate"
          aria-label="回到我的位置"
          aria-busy={location.busy}
          disabled={!ready || location.busy}
          onClick={() => void locateUser()}
        >
          {location.busy ? (
            <LoaderCircleIcon className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <LocateFixedIcon className="size-5" />
          )}
        </Button>
      </div>
      <p
        role="status"
        className="pointer-events-none absolute right-16 bottom-20 z-10 max-w-56 rounded bg-background/95 px-2 text-xs"
        style={{ bottom }}
      >
        {location.message}
      </p>
    </div>
  )
}
