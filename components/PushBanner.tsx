"use client"

import { useCallback, useEffect, useState } from "react"

import { errorMessage } from "@/lib/errors"
import {
	disablePush,
	enablePush,
	getExistingSubscription,
	getPushPublicKey,
	isIosSafari,
	isPushSupported,
	isStandaloneDisplay,
} from "@/lib/push"

/**
 * Stage 10 Part 5 — the push permission prompt.
 *
 * NOTHING IS ASKED AUTOMATICALLY. `Notification.requestPermission()` must run
 * inside a user gesture (Safari ignores it otherwise, and Chrome blocks
 * repeated automatic prompts permanently), so the banner only shows a button
 * and the permission request happens in its click handler.
 *
 * THE BANNER HIDES ITSELF in every case where it could not work, instead of
 * showing a button that fails:
 *   - the browser has no Push API (or the page is in a private window);
 *   - `GET /push/public-key` reports `enabled: false`, i.e. the server has no
 *     VAPID keys configured — asking for permission would waste the one
 *     chance the site gets;
 *   - permission was already denied: the browser will not ask again, so the
 *     reader is told to change it in site settings rather than clicking a
 *     dead button;
 *   - iOS Safari outside an installed app, where subscribing is impossible;
 *     there the banner explains the «Add to Home Screen» requirement.
 *
 * The dismissal is remembered in `localStorage` so the bar does not reappear
 * on every page view for someone who said no.
 */
const DISMISS_KEY = "rk:push-dismissed"

type Phase =
	| "checking"
	| "hidden"
	| "offer"
	| "subscribed"
	| "denied"
	| "needs-install"

export default function PushBanner() {
	const [phase, setPhase] = useState<Phase>("checking")
	const [publicKey, setPublicKey] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let active = true

		async function bootstrap() {
			if (!isPushSupported()) {
				// iOS Safari exposes no PushManager until the site is installed, so
				// the "install first" hint has to be distinguished from a browser
				// that will never support push.
				if (active) {
					setPhase(isIosSafari() && !isStandaloneDisplay() ? "needs-install" : "hidden")
				}

				return
			}

			try {
				const key = await getPushPublicKey()

				if (!active) {
					return
				}

				if (!key.enabled || !key.publicKey) {
					setPhase("hidden")
					return
				}

				setPublicKey(key.publicKey)

				const existing = await getExistingSubscription()

				if (!active) {
					return
				}

				if (existing) {
					setPhase("subscribed")
					return
				}

				if (Notification.permission === "denied") {
					setPhase("denied")
					return
				}

				const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1"
				setPhase(dismissed ? "hidden" : "offer")
			} catch {
				// A failing key endpoint means push cannot be offered; that is not
				// something the reader can act on, so the banner stays hidden.
				if (active) {
					setPhase("hidden")
				}
			}
		}

		void bootstrap()

		return () => {
			active = false
		}
	}, [])

	const subscribe = useCallback(async () => {
		if (!publicKey || busy) {
			return
		}

		setBusy(true)
		setError(null)

		try {
			const result = await enablePush(publicKey)

			if (result === "subscribed") {
				setPhase("subscribed")
				window.localStorage.removeItem(DISMISS_KEY)
			} else if (result === "denied") {
				setPhase("denied")
			}
		} catch (caught) {
			setError(errorMessage(caught, "فعال‌سازی اعلان انجام نشد."))
		} finally {
			setBusy(false)
		}
	}, [busy, publicKey])

	const unsubscribe = useCallback(async () => {
		if (busy) {
			return
		}

		setBusy(true)
		setError(null)

		try {
			await disablePush()
			window.localStorage.setItem(DISMISS_KEY, "1")
			setPhase("hidden")
		} catch (caught) {
			setError(errorMessage(caught, "لغو اعلان انجام نشد."))
		} finally {
			setBusy(false)
		}
	}, [busy])

	if (phase === "checking" || phase === "hidden") {
		return null
	}

	const shell =
		"mb-6 rounded-md border border-border bg-white px-4 py-3 text-sm leading-7 text-ink"

	if (phase === "needs-install") {
		return (
			<div className={shell} role="note">
				برای دریافت اعلان خبرهای فوری در این مرورگر، باید ابتدا سایت را از منوی اشتراک‌گذاری به صفحهٔ اصلی دستگاه اضافه کنید.
			</div>
		)
	}

	if (phase === "denied") {
		return (
			<div className={shell} role="note">
				اجازهٔ اعلان در این مرورگر رد شده است. برای فعال‌سازی، از تنظیمات سایت در مرورگر اجازهٔ اعلان را روی حالت مجاز بگذارید.
			</div>
		)
	}

	if (phase === "subscribed") {
		return (
			<div className={`${shell} flex flex-wrap items-center justify-between gap-3`}>
				<span>اعلان خبرهای فوری روی این دستگاه فعال است.</span>

				<button
					type="button"
					onClick={unsubscribe}
					disabled={busy}
					className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
				>
					{busy ? "در حال لغو…" : "لغو اعلان"}
				</button>

				{error ? (
					<p role="alert" className="w-full text-xs text-accent">
						{error}
					</p>
				) : null}
			</div>
		)
	}

	return (
		<div className={`${shell} flex flex-wrap items-center justify-between gap-3`}>
			<span>اعلان خبرهای فوری رحیق خبر را روی این دستگاه فعال کنید؟</span>

			<span className="flex items-center gap-2">
				<button
					type="button"
					onClick={subscribe}
					disabled={busy}
					className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{busy ? "در حال فعال‌سازی…" : "فعال‌سازی اعلان"}
				</button>

				<button
					type="button"
					onClick={() => {
						window.localStorage.setItem(DISMISS_KEY, "1")
						setPhase("hidden")
					}}
					className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-dark transition-colors hover:border-border-strong"
				>
					فعلاً نه
				</button>
			</span>

			{error ? (
				<p role="alert" className="w-full text-xs text-accent">
					{error}
				</p>
			) : null}
		</div>
	)
}
