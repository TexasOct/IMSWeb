import { useEffect, useState } from "react"
import { useLocation } from "react-router"

import { useOptionalPlatformSession } from "~/components/platform/platform-session-provider"
import { getNamecardNotifications } from "~/lib/api/endpoints/fudaba/card-claims"

let cachedUnread: number | null = null
let inFlight: Promise<void> | null = null
const listeners = new Set<(unread: number) => void>()

function publish(unread: number) {
  cachedUnread = unread
  for (const listener of listeners) listener(unread)
}

function loadUnread(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = getNamecardNotifications()
    .send()
    .then((result) => {
      publish(result.unread)
    })
    .catch(() => {
      // Signed out or offline: no badge rather than a broken header.
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/**
 * Publishes a new count to every mounted badge.
 *
 * Call this after marking notifications read so the header avatar, the header
 * menu entry, the App tab bar and the message panel all agree immediately.
 */
export function setNamecardUnread(unread: number) {
  publish(unread)
}

/**
 * Refetches the count and republishes it.
 *
 * The badges live in persistently mounted chrome (header, App tab bar), so they
 * never remount on navigation; whoever changes the recipient's inbox elsewhere
 * - another device, a reviewer, the scheduler - is only noticed when this runs.
 */
export function refreshNamecardUnread(): Promise<void> {
  return loadUnread()
}

/**
 * Unread in-app notification count.
 *
 * Shared by the header account menu (avatar badge), the App tab bar and the
 * message panel so they agree without each triggering its own request for the
 * same payload. Refreshes on every navigation and when the window regains
 * focus, because a badge that only loads once lies after the first message.
 */
export function useNamecardUnread(): number {
  const { pathname } = useLocation()
  const { status } = useOptionalPlatformSession()
  const [unread, setUnread] = useState(cachedUnread ?? 0)
  // Anonymous visitors have no inbox; asking would only produce a 401 on every
  // page load, and the header renders without a badge either way.
  const signedIn = status === "authenticated" || status === "restricted"

  useEffect(() => {
    listeners.add(setUnread)
    return () => {
      listeners.delete(setUnread)
    }
  }, [])

  useEffect(() => {
    if (!signedIn) return
    void loadUnread()
  }, [pathname, signedIn])

  useEffect(() => {
    if (!signedIn) return
    const refresh = () => {
      void loadUnread()
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [signedIn])

  return signedIn ? unread : 0
}
