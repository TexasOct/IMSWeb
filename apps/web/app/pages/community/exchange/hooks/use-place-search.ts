import { useEffect, useRef, useState } from "react"
import { hasAsciiControl } from "@imsweb/contracts/fudaba"
import { isApiError } from "~/lib/api"
import { MapSearchError } from "~/lib/maps/map-search"

export interface PlaceSearchDisplay {
  id: string
  label: string
  address: string
  attribution?: string
}
export type PlaceSearcher<Place> = (
  query: string,
  signal: AbortSignal
) => Promise<{ items: Place[]; attribution: string; notice?: string }>

function emptyResults<Place>() {
  return {
    results: [] as Place[],
    attribution: "",
    busy: false,
    error: null as string | null,
    searched: false,
    revision: 0,
  }
}

export function usePlaceSearch<Place>(searcher: PlaceSearcher<Place> | null) {
  const [query, setQuery] = useState("")
  const [state, setState] = useState(() => ({
    owner: searcher,
    ...emptyResults<Place>(),
  }))
  if (state.owner !== searcher)
    setState({ owner: searcher, ...emptyResults<Place>() })
  // Results belong to their exact configured service, including its credentials.
  // A new owner is empty immediately, before passive cleanup aborts old work.
  const { results, attribution, busy, error, searched, revision } =
    state.owner === searcher ? state : emptyResults<Place>()
  const request = useRef<AbortController | null>(null)

  function update(
    patch: Partial<ReturnType<typeof emptyResults<Place>>>,
    advance = false
  ) {
    setState((current) => {
      const previous =
        current.owner === searcher ? current : emptyResults<Place>()
      return {
        ...previous,
        ...patch,
        owner: searcher,
        revision: previous.revision + (advance ? 1 : 0),
      }
    })
  }

  useEffect(() => {
    return () => {
      request.current?.abort()
      request.current = null
    }
  }, [searcher])

  async function submit(value = query, disabled = false) {
    const nextQuery = value.slice(0, 120),
      search = nextQuery.trim()
    if (
      search.length < 2 ||
      hasAsciiControl(search) ||
      disabled ||
      request.current ||
      !searcher
    )
      return false
    const controller = new AbortController()
    request.current = controller
    setQuery(nextQuery)
    update({ busy: true, error: null })
    try {
      const response = await searcher(search, controller.signal)
      if (controller.signal.aborted) return false
      update(
        {
          results: response.items,
          attribution: response.attribution,
          error: response.notice ?? null,
          searched: true,
        },
        true
      )
    } catch (nextError) {
      if (controller.signal.aborted) return false
      update({
        error:
          (isApiError(nextError) && nextError.status === 429) ||
          (nextError instanceof MapSearchError && nextError.kind === "busy")
            ? "地点搜索正忙，请稍后再试。"
            : isApiError(nextError) && nextError.status === 503
              ? "地点搜索服务尚未配置，请联系管理员。"
              : nextError instanceof MapSearchError &&
                  nextError.kind === "unavailable"
                ? "当前地图的地点搜索未获授权，请联系管理员检查地图源配置。"
                : "地点暂时无法搜索，请稍后再试。",
      })
    } finally {
      if (request.current === controller) {
        request.current = null
        update({ busy: false })
      }
    }
    return true
  }
  function edit(value: string) {
    setQuery(value.slice(0, 120))
    update({ error: null })
  }
  function resetResults(keepAttribution = false) {
    request.current?.abort()
    request.current = null
    update(
      {
        busy: false,
        results: [],
        searched: false,
        error: null,
        ...(!keepAttribution ? { attribution: "" } : {}),
      },
      true
    )
  }
  return {
    query,
    edit,
    results,
    attribution,
    busy,
    error,
    searched,
    revision,
    submit,
    resetResults,
  }
}

export type PlaceSearchModel<Place> = ReturnType<typeof usePlaceSearch<Place>>
