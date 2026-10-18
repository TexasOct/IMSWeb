import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  installFetchMock,
  jsonResponse,
  requestFrom,
} from "@/tests/unit/support/api-client"
import {
  clearCsrfCookie,
  setCsrfCookie,
} from "@/tests/unit/support/auth-cookies"
import { renderPage } from "@/tests/unit/support/harness"
import AdminCardsUnitsPage from "~/pages/admin/cards/units"

const toasts = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: toasts,
}))

const agenciesPayload = {
  success: true,
  agencies: [
    { id: 2, code: "765as", name: "本家", color: "#f34f6d", wikiEnabled: true },
    {
      id: 1,
      code: "namecard-other",
      name: "其他",
      color: "#8A8A8A",
      wikiEnabled: false,
    },
  ],
}

const listPayload = {
  success: true,
  units: [
    {
      id: 9,
      nameCn: "Project Fairy",
      nameJa: "プロジェクト・フェアリー",
      nameEn: null,
      aliases: "妖精",
      displayOrder: 0,
      revision: 1,
      agencies: [{ id: 2, code: "765as", name: "本家", color: "#f34f6d" }],
      members: [
        {
          characterId: 30,
          nameCn: "星井美希",
          nameJa: "星井美希",
          nameEn: null,
          category: "idol",
        },
      ],
      createdAt: "2026-10-18T12:00:00+08:00",
      updatedAt: "2026-10-18T12:00:00+08:00",
    },
  ],
  pageInfo: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
  },
}

/**
 * Serves the reads the page issues on mount, recording every URL so a test can
 * assert on the query the debounced search produced.
 */
function installPageApi(listStatus = 200) {
  const requestedUrls: URL[] = []
  const fetchMock = installFetchMock(async (input, init) => {
    const url = new URL(requestFrom(input, init).url, "http://ims.test")
    requestedUrls.push(url)
    if (url.pathname.endsWith("/cards/characters/agencies")) {
      return jsonResponse(agenciesPayload)
    }
    return listStatus === 200
      ? jsonResponse(listPayload)
      : jsonResponse({ error: "boom" }, listStatus)
  })
  return { fetchMock, requestedUrls }
}

beforeEach(() => {
  setCsrfCookie("backoffice", "csrf-token")
})

afterEach(() => {
  clearCsrfCookie("backoffice")
  vi.clearAllMocks()
})

describe("admin namecard units page", () => {
  it("lists the catalog with its paging summary", async () => {
    installPageApi()

    renderPage(<AdminCardsUnitsPage />, { route: "/admin/cards/units" })

    expect(await screen.findByText("共 1 条记录，第 1 页")).toBeInTheDocument()
    expect(screen.getByText("Project Fairy")).toBeInTheDocument()
    expect(screen.getByText("1 人")).toBeInTheDocument()
  })

  it("surfaces a failed load with a retry action", async () => {
    installPageApi(500)

    renderPage(<AdminCardsUnitsPage />, { route: "/admin/cards/units" })

    expect(await screen.findByText("无法读取组合列表")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument()
  })

  it("searches once typing pauses", async () => {
    const { requestedUrls } = installPageApi()

    renderPage(<AdminCardsUnitsPage />, { route: "/admin/cards/units" })
    await screen.findByText("共 1 条记录，第 1 页")

    await userEvent.type(
      screen.getByPlaceholderText("搜索中文名 / 日文名 / 英文名 / 别名"),
      "Fairy"
    )

    await waitFor(() => {
      expect(
        requestedUrls.some((url) => url.searchParams.get("query") === "Fairy")
      ).toBe(true)
    })
  })

  it("opens the editor dialog from the create action", async () => {
    installPageApi()

    renderPage(<AdminCardsUnitsPage />, { route: "/admin/cards/units" })
    await screen.findByText("共 1 条记录，第 1 页")

    await userEvent.click(screen.getByRole("button", { name: "新增组合" }))

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "新增组合" })
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("中文名")).toBeInTheDocument()
  })
})
