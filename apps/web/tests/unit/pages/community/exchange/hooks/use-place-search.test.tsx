import { act, renderHook } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { usePlaceSearch } from "~/pages/community/exchange/hooks/use-place-search"
import type { MapPlaceSearcher } from "~/lib/maps/map-search"

type Reply = Awaited<ReturnType<MapPlaceSearcher>>

it("aborts the old provider and ignores its late result without settling the replacement request", async () => {
  let finishFirst!: (value: Reply) => void,
    finishSecond!: (value: Reply) => void
  const first = vi.fn<MapPlaceSearcher>(
    () =>
      new Promise((resolve) => {
        finishFirst = resolve
      })
  )
  const second = vi.fn<MapPlaceSearcher>(
    () =>
      new Promise((resolve) => {
        finishSecond = resolve
      })
  )
  const hook = renderHook(({ searcher }) => usePlaceSearch(searcher), {
    initialProps: { searcher: first },
  })
  let firstRequest!: Promise<boolean>, secondRequest!: Promise<boolean>
  act(() => {
    firstRequest = hook.result.current.submit("Tokyo")
  })
  hook.rerender({ searcher: second })
  expect(first.mock.calls[0]![1].aborted).toBe(true)
  act(() => {
    secondRequest = hook.result.current.submit("上海场馆")
  })
  await act(async () => {
    finishFirst({
      items: [
        {
          id: "old",
          label: "old",
          address: "old",
          target: { kind: "wgs84", position: [139, 35] },
        },
      ],
      attribution: "old",
    })
    await firstRequest
  })
  expect(hook.result.current.results).toEqual([])
  expect(hook.result.current.busy).toBe(true)
  const reply: Reply = {
    items: [
      {
        id: "new",
        label: "上海",
        address: "上海",
        target: { kind: "native", provider: "amap", position: [121.5, 31.2] },
      },
    ],
    attribution: "© 高德地图",
  }
  await act(async () => {
    finishSecond(reply)
    await secondRequest
  })
  expect(hook.result.current.results).toEqual(reply.items)
  expect(hook.result.current.attribution).toBe(reply.attribution)
  expect(hook.result.current.busy).toBe(false)
})

it("reset cancels pending search and permits a retry while ignoring canceled work", async () => {
  let finish!: (value: Reply) => void
  const searcher = vi.fn<MapPlaceSearcher>(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const hook = renderHook(() => usePlaceSearch(searcher))
  let pending!: Promise<boolean>
  act(() => {
    pending = hook.result.current.submit("Paris")
  })
  act(() => hook.result.current.resetResults())
  expect(searcher.mock.calls[0]![1].aborted).toBe(true)
  expect(hook.result.current.busy).toBe(false)
  await act(async () => {
    finish({ items: [], attribution: "canceled" })
    await pending
  })
  expect(hook.result.current.attribution).toBe("")
  expect(hook.result.current.searched).toBe(false)
})

it("does not restore old results on an A→B→A service transition", async () => {
  const first = vi.fn<MapPlaceSearcher>(async () => ({
    items: [],
    attribution: "first",
  }))
  const second = vi.fn<MapPlaceSearcher>(async () => ({
    items: [],
    attribution: "second",
  }))
  const hook = renderHook(({ searcher }) => usePlaceSearch(searcher), {
    initialProps: { searcher: first },
  })
  await act(async () => {
    await hook.result.current.submit("Tokyo")
  })
  expect(hook.result.current.attribution).toBe("first")
  hook.rerender({ searcher: second })
  hook.rerender({ searcher: first })
  expect(hook.result.current.attribution).toBe("")
  expect(hook.result.current.searched).toBe(false)
})
