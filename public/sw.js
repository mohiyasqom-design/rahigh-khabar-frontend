/* eslint-disable no-undef */
/**
 * Rahigh Khabar service worker — Stage 10 Part 5.
 *
 * PUSH ONLY, ON PURPOSE. This worker installs no fetch handler and caches
 * nothing: an offline cache for a news site would serve stale headlines, and
 * Web Push requires nothing more than an active worker. Adding a `fetch`
 * listener that just calls `fetch(event.request)` would slow every request
 * down for no benefit, so it is deliberately absent.
 *
 * `skipWaiting` + `clients.claim` mean a new deploy takes over immediately;
 * otherwise a reader who subscribed months ago would keep running the old
 * worker until every tab was closed.
 *
 * PAYLOAD SHAPE comes from the backend's `push.service.ts`, which sends JSON
 * with `title`, `body` and `url`. The handler still tolerates a plain-text or
 * empty payload, because push services (and DevTools' "Push" button) can
 * deliver one, and a throw inside `push` would drop the notification
 * silently — browsers require a visible notification for every message.
 */

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

function readPayload(event) {
  const fallback = {
    title: "رحیق خبر",
    body: "خبر تازه‌ای منتشر شده است.",
    url: "/",
  }

  if (!event.data) {
    return fallback
  }

  try {
    const data = event.data.json()

    return {
      title: typeof data.title === "string" && data.title ? data.title : fallback.title,
      body: typeof data.body === "string" && data.body ? data.body : fallback.body,
      url: typeof data.url === "string" && data.url ? data.url : fallback.url,
    }
  } catch (error) {
    const text = event.data.text()

    return {
      title: fallback.title,
      body: text || fallback.body,
      url: fallback.url,
    }
  }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event)

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/logo-rahigh-khabar.png",
      badge: "/logo-rahigh-khabar.png",
      dir: "rtl",
      lang: "fa",
      // Collapses repeats of the same article instead of stacking them, and
      // carries the target URL to the click handler.
      tag: payload.url,
      data: { url: payload.url },
    }),
  )
})

/**
 * Clicking a notification focuses an existing tab on the same origin and
 * navigates it, and only opens a new window when there is none. Always calling
 * `openWindow` would leave the reader with a pile of duplicate tabs.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const target = (event.notification.data && event.notification.data.url) || "/"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus()

            if ("navigate" in client) {
              return client.navigate(target)
            }

            return undefined
          }
        }

        return self.clients.openWindow(target)
      }),
  )
})
