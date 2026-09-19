/**
 * Web Push in the browser: service worker, permission, subscribe/unsubscribe.
 *
 * ORDER MATTERS, and it is the reason this file exists instead of inline code:
 *   1. the service worker must be registered and ACTIVE before
 *      `pushManager.subscribe()` can be called;
 *   2. `subscribe()` must be called from a user gesture, otherwise Chrome
 *      rejects it and Safari never shows the prompt;
 *   3. only after the browser returns a subscription may it be sent to
 *      `POST /push/subscribe`.
 * Doing these in any other order produces an error that looks like a backend
 * failure but never reached the backend.
 *
 * WHY THE KEY IS CONVERTED: `applicationServerKey` must be a `Uint8Array` of
 * the raw VAPID public key, while the server sends it base64url-encoded, so
 * the string is decoded here. Passing the string through works in Chrome and
 * fails in Firefox — which is exactly the kind of bug that only shows up in
 * production.
 *
 * NOTHING HERE THROWS FOR AN UNSUPPORTED BROWSER. iOS Safari only exposes
 * push for installed (standalone) web apps, and private windows expose no
 * `serviceWorker` at all, so the helpers report the situation and the UI
 * explains it instead of showing a broken button.
 */
import { apiFetch } from "@/lib/api"
import type { PushPublicKey } from "@/types/push"

/** Path of the service worker file served from `public/`. */
export const SERVICE_WORKER_PATH = "/sw.js"

/** True when this browser can actually do Web Push. */
export function isPushSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	)
}

/** True for Safari on iOS/iPadOS, which needs the site installed first. */
export function isIosSafari(): boolean {
	if (typeof navigator === "undefined") {
		return false
	}

	const ua = navigator.userAgent
	const iOS = /iPad|iPhone|iPod/.test(ua) ||
		// iPadOS 13+ reports itself as a Mac, but has a touch screen.
		(ua.includes("Macintosh") && navigator.maxTouchPoints > 1)

	return iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

/** True when the page runs as an installed app (iOS requirement for push). */
export function isStandaloneDisplay(): boolean {
	if (typeof window === "undefined") {
		return false
	}

	return (
		window.matchMedia?.("(display-mode: standalone)").matches === true ||
		(navigator as unknown as { standalone?: boolean }).standalone === true
	)
}

/** base64url → Uint8Array, as required by `applicationServerKey`. */
function decodeBase64Url(value: string): Uint8Array {
	const padding = "=".repeat((4 - (value.length % 4)) % 4)
	const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/")
	const raw = window.atob(base64)
	const bytes = new Uint8Array(raw.length)

	for (let index = 0; index < raw.length; index += 1) {
		bytes[index] = raw.charCodeAt(index)
	}

	return bytes
}

/** Copies bytes into a standalone `ArrayBuffer` accepted by `BufferSource`. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const buffer = new ArrayBuffer(bytes.byteLength)
	new Uint8Array(buffer).set(bytes)
	return buffer
}

/** `GET /push/public-key` — also tells the UI whether push is configured. */
export function getPushPublicKey(): Promise<PushPublicKey> {
	return apiFetch<PushPublicKey>("push/public-key", { cache: "no-store" })
}

/** Registers the service worker and waits until it is ready to receive push. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
	await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" })
	// `ready` resolves with the ACTIVE registration; the one returned by
	// register() may still be installing, and subscribing on it fails.
	return navigator.serviceWorker.ready
}

/** The subscription this browser already has, if any. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
	if (!isPushSupported()) {
		return null
	}

	const registration = await navigator.serviceWorker.getRegistration("/")
	return (await registration?.pushManager.getSubscription()) ?? null
}

/** Sends a browser subscription to the backend in the exact strict shape. */
export async function sendSubscription(subscription: PushSubscription): Promise<void> {
	const json = subscription.toJSON() as {
		endpoint?: string
		keys?: { p256dh?: string; auth?: string }
	}

	if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
		throw new Error("Incomplete push subscription")
	}

	// `subscribeSchema` is .strict(): only `endpoint` and `keys` may be sent,
	// so the raw toJSON() output (which also carries expirationTime) is not
	// forwarded as-is.
	await apiFetch("push/subscribe", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		cache: "no-store",
		body: JSON.stringify({
			endpoint: json.endpoint,
			keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
		}),
	})
}

/** Outcome of asking for permission and subscribing. */
export type PushEnableResult = "subscribed" | "denied" | "dismissed"

/**
 * Asks for permission (if needed) and subscribes this device.
 *
 * MUST be called from a click handler. `denied` means the user refused and the
 * browser will not ask again; `dismissed` means the prompt was closed without
 * an answer, so asking later is still allowed.
 */
export async function enablePush(applicationServerKey: string): Promise<PushEnableResult> {
	const permission = await Notification.requestPermission()

	if (permission === "denied") {
		return "denied"
	}

	if (permission !== "granted") {
		return "dismissed"
	}

	const registration = await registerServiceWorker()
	const existing = await registration.pushManager.getSubscription()

	const subscription =
		existing ??
		(await registration.pushManager.subscribe({
			// Required by every browser: a push message must be visible to the user.
			userVisibleOnly: true,
			// Copied into a fresh, definitely-`ArrayBuffer` buffer: `Uint8Array`'s
			// buffer is typed `ArrayBufferLike` (it may be a `SharedArrayBuffer`),
			// which `BufferSource` does not accept. Runtime behaviour is identical.
			applicationServerKey: toArrayBuffer(decodeBase64Url(applicationServerKey)),
		}))

	// Re-sent even for an existing subscription: the row may have been pruned
	// server-side after the push service reported it as gone.
	await sendSubscription(subscription)
	return "subscribed"
}

/**
 * Unsubscribes this device, backend first.
 *
 * ORDER IS DELIBERATE: the endpoint is needed to tell the backend which row to
 * delete, so the local subscription is only dropped after the server call. If
 * it were reversed and the server call failed, the backend would keep sending
 * to a subscription the browser no longer has.
 */
export async function disablePush(): Promise<void> {
	const subscription = await getExistingSubscription()

	if (!subscription) {
		return
	}

	await apiFetch("push/unsubscribe", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		cache: "no-store",
		body: JSON.stringify({ endpoint: subscription.endpoint }),
	})

	await subscription.unsubscribe()
}
