"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { getVisitorSession, googleLoginUrl, visitorLogout } from "@/lib/auth"
import type { Session } from "@/types/auth"

/**
 * Header affordance for site visitors: «ورود با گوگل» when anonymous, and the
 * account name plus a sign-out button when signed in.
 *
 * WHY THE CHECK RUNS IN THE BROWSER: the visitor cookie is scoped to the API
 * origin, so a Next.js Server Component has nothing to forward (the same
 * reasoning as `lib/auth.ts` and `components/admin/session.tsx`). The header
 * is also rendered inside statically cached pages, so a server-side answer would
 * be baked into the HTML for every reader. One credentialed `GET /users/me`
 * after mount is the only honest way to know.
 *
 * Nothing is rendered until that call settles, so the bar never flashes a wrong
 * state.
 */
export default function AuthMenu() {
	const [session, setSession] = useState<Session | null>(null)
	const [ready, setReady] = useState(false)
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		let cancelled = false

		getVisitorSession()
			.then((value) => {
				if (!cancelled) {
					setSession(value)
				}
			})
			.catch(() => {
				// A backend failure is treated as "unknown", not as "signed out":
				// the menu simply stays in its anonymous state.
			})
			.finally(() => {
				if (!cancelled) {
					setReady(true)
				}
			})

		return () => {
			cancelled = true
		}
	}, [])

	async function handleLogout() {
		setBusy(true)
		try {
			await visitorLogout()
			setSession(null)
		} catch {
			// Keep the current state; the cookie is still valid.
		} finally {
			setBusy(false)
		}
	}

	if (!ready) {
		// Reserve the space so the header does not jump when the answer arrives.
		return <div className="h-10 w-10" aria-hidden="true" />
	}

	if (!session) {
		const loginUrl = googleLoginUrl()

		// No URL means NEXT_PUBLIC_API_URL is missing or invalid. Saying so beats
		// rendering a button that silently goes nowhere.
		if (!loginUrl) {
			return (
				<span className="text-xs text-white/50">ورود در دسترس نیست</span>
			)
		}

		return (
			<a
				href={loginUrl}
				aria-label="ورود یا ثبت‌نام با گوگل"
				className="flex h-10 w-10 items-center justify-center rounded-full text-paper transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
			>
				<UserIcon />
			</a>
		)
	}

	return (
		<div className="flex items-center gap-2">
			{session.username === null ? (
				<Link
					href="/onboarding"
					className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-opacity hover:opacity-90"
				>
					تکمیل پروفایل
				</Link>
			) : null}

			<span className="flex items-center gap-2 text-sm text-paper">
				{session.avatarUrl ? (
					/* A plain <img>: Google avatar hosts are not in next.config.ts
					   remotePatterns, and next/image would refuse them at runtime. */
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						src={session.avatarUrl}
						alt=""
						width={28}
						height={28}
						className="h-8 w-8 rounded-full object-cover"
						referrerPolicy="no-referrer"
					/>
				) : (
					<UserIcon />
				)}
				<span className="hidden max-w-[10rem] truncate sm:inline">
					{session.displayName}
				</span>
			</span>

			<button
				type="button"
				onClick={handleLogout}
				disabled={busy}
				className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
			>
				{busy ? "در حال خروج…" : "خروج"}
			</button>
		</div>
	)
}

/** Zoomit-style outlined profile circle. */
function UserIcon() {
	return (
		<svg
			width="32"
			height="32"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<circle cx="12" cy="9.5" r="3.3" />
			<path d="M5.6 19c1.4-3 3.6-4.4 6.4-4.4s5 1.4 6.4 4.4" />
		</svg>
	)
}