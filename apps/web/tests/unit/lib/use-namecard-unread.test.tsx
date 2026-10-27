import { fireEvent, screen, waitFor } from "@testing-library/react"
import { Link } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { useNamecardUnread } from "~/lib/use-namecard-unread"
import { renderPage } from "@/tests/unit/support/harness"

const inbox = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock("~/lib/api/endpoints/fudaba/card-claims", () => ({
  getNamecardNotifications: () => ({ send: inbox.send }),
}))

function Badge() {
  return <output data-testid="badge">{useNamecardUnread()}</output>
}

function renderShell() {
  // MemoryRouter without any <Routes>: the probe renders on every path, which
  // is exactly how the badges behave inside the persisted chrome.
  return renderPage(
    <>
      <Badge />
      <Link to="/account/me/claims">open inbox</Link>
    </>
  )
}

describe("useNamecardUnread", () => {
  it("refetches the count on navigation and on window focus", async () => {
    let unread = 0
    inbox.send.mockImplementation(() => {
      unread += 1
      return Promise.resolve({ unread })
    })

    renderShell()

    await waitFor(() =>
      expect(screen.getByTestId("badge")).toHaveTextContent("1")
    )
    expect(inbox.send).toHaveBeenCalledTimes(1)

    // The badges live in persisted chrome, so a route change must not be the
    // only thing that never reaches the server again.
    fireEvent.click(screen.getByText("open inbox"))
    await waitFor(() =>
      expect(screen.getByTestId("badge")).toHaveTextContent("2")
    )
    expect(inbox.send).toHaveBeenCalledTimes(2)

    fireEvent.focus(window)
    await waitFor(() =>
      expect(screen.getByTestId("badge")).toHaveTextContent("3")
    )
    expect(inbox.send).toHaveBeenCalledTimes(3)
  })
})
