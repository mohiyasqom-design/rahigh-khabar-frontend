"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"

import { errorMessage } from "@/lib/errors"
import {
	enablePush,
	getExistingSubscription,
	getPushPublicKey,
	isIosSafari,
	isPushSupported,
	isStandaloneDisplay,
} from "@/lib/push"

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
				if (active) {
					setPhase(isIosSafari() && !isStandaloneDisplay() ? "needs-install" : "hidden")
				}
				return
			}

			try {
				const key = await getPushPublicKey()
				if (!active) return

				if (!key.enabled || !key.publicKey) {
					setPhase("hidden")
					return
				}

				setPublicKey(key.publicKey)
				const existing = await getExistingSubscription()
				if (!active) return

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
				if (active) setPhase("hidden")
			}
		}

		void bootstrap()
		return () => {
			active = false
		}
	}, [])

	const subscribe = useCallback(async () => {
		if (!publicKey || busy) return

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

	if (phase === "checking" || phase === "hidden" || phase === "subscribed") {
		return null
	}

	const shell =
		"rounded-md border border-border bg-white px-4 py-3 text-sm leading-7 text-ink"

	if (phase === "needs-install") {
		return (
			<Frame>
				<div className={shell} role="note">
					برای دریافت اعلان خبرهای فوری در این مرورگر، باید ابتدا سایت را از منوی اشتراک‌گذاری به صفحهٔ اصلی دستگاه اضافه کنید.
				</div>
			</Frame>
		)
	}

	if (phase === "denied") {
		return (
			<Frame>
				<div className={shell} role="note">
					اجازهٔ اعلان در این مرورگر رد شده است. برای فعال‌سازی، از تنظیمات سایت در مرورگر اجازهٔ اعلان را روی حالت مجاز بگذارید.
				</div>
			</Frame>
		)
	}

	return (
		<Frame>
			<div className={`${shell} flex flex-wrap items-center justify-between gap-3`}>
				<span>اعلان خبرهای فوری رحیق خبر را روی این دستگاه فعال کنید؟</span>
				<span className="flex items-center gap-2">
					<button
						type="button"
						onClick={subscribe}
						disabled={busy}
						className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
					<p role="alert" className="w-full text-xs text-accent-strong">
						{error}
					</p>
				) : null}
			</div>
		</Frame>
	)
}

function Frame({ children }: { children: ReactNode }) {
	return <div className="mx-auto w-full max-w-shell px-4 py-4">{children}</div>
}