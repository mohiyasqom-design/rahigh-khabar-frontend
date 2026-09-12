"use client"

import { usePathname, useRouter } from "next/navigation"
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react"

import { getCurrentAdmin, logout } from "@/lib/auth"
import { errorMessage } from "@/lib/errors"
import type { AdminUser } from "@/types/user"

/**
 * The session gate for every `/admin` page except the login form.
 *
 * WHAT THIS IS: a REAL "who am I" check. On mount it calls
 * `GET /auth/me` on the backend and renders its children only if the backend
 * answers with a user. Nothing is inferred from a flag, a decoded token, a
 * localStorage entry or a JS-readable cookie — there is no such state in this
 * app. The auth cookie is httpOnly and is never read here.
 *
 * WHAT THIS IS NOT: a security boundary. It decides what to RENDER, nothing
 * more. Anyone can open DevTools and flip this component's state, and they
 * would get an admin shell whose every request still fails with 401/403,
 * because the backend re-authenticates and re-authorises each one. The real
 * boundary is the backend's `authenticate` / `requireRole` / `newsPolicy`
 * checks; this gate exists so an editor is not shown a broken UI.
 *
 * WHY IT CANNOT RUN ON THE SERVER: the backend sets its cookie host-only to
 * the API origin (`__Host-rk_auth` in production), so the browser sends it to
 * the API and never to the Next.js origin. A `middleware.ts`, a Server
 * Component or a Server Action would have no cookie to forward and could only
 * pretend to check — so the check is made from the browser, where the cookie
 * actually travels. The trade-off is that the HTML shell of an admin route is
 * reachable before the check resolves; it contains no admin data, because every
 * admin request in this panel is issued after this gate resolves.
 */
interface SessionValue {
	user: AdminUser
	/** Ends the session on the backend, then returns to the login form. */
	signOut: () => Promise<void>
	/** Called by any screen that gets a 401 mid-use. */
	handleExpiredSession: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

/** The confirmed session. Throws if used outside the gate — a programming bug. */
export function useSession(): SessionValue {
	const value = useContext(SessionContext)

	if (!value) {
		throw new Error("useSession must be used inside AdminGate")
	}

	return value
}

type Phase = "checking" | "ready" | "anonymous" | "failed"

export default function AdminGate({ children }: { children: ReactNode }) {
	const router = useRouter()
	const pathname = usePathname()
	const [phase, setPhase] = useState<Phase>("checking")
	const [user, setUser] = useState<AdminUser | null>(null)
	const [failure, setFailure] = useState<string | null>(null)

	/** `/admin/login?next=…` so the editor lands back where they were. */
	const loginHref = useCallback(() => {
		const target = pathname && pathname.startsWith("/admin") ? pathname : "/admin"
		return `/admin/login?next=${encodeURIComponent(target)}`
	}, [pathname])

	const check = useCallback(async () => {
		setPhase("checking")
		setFailure(null)

		try {
			const current = await getCurrentAdmin()

			if (!current) {
				setUser(null)
				setPhase("anonymous")
				router.replace(loginHref())
				return
			}

			setUser(current)
			setPhase("ready")
		} catch (error) {
			// Not a 401: the backend is unreachable or broken. Sending the editor to
			// the login form here would be a lie — their credentials are not the
			// problem and logging in would fail for the same reason.
			setFailure(
				errorMessage(error, "بررسی نشست انجام نشد؛ سرور در دسترس نیست."),
			)
			setPhase("failed")
		}
	}, [loginHref, router])

	useEffect(() => {
		void check()
	}, [check])

	const handleExpiredSession = useCallback(() => {
		setUser(null)
		setPhase("anonymous")
		router.replace(loginHref())
	}, [loginHref, router])

	const signOut = useCallback(async () => {
		// The backend clears the cookie; this component owns no session state to
		// clear beyond the user object it is holding.
		await logout()
		setUser(null)
		setPhase("anonymous")
		router.replace("/admin/login")
		router.refresh()
	}, [router])

	if (phase === "ready" && user) {
		return (
			<SessionContext.Provider value={{ user, signOut, handleExpiredSession }}>
				{children}
			</SessionContext.Provider>
		)
	}

	if (phase === "failed") {
		return (
			<div className="mx-auto w-full max-w-shell px-4 py-16">
				<div className="mx-auto max-w-md rounded-md border border-border bg-white px-6 py-12 text-center">
					<p className="text-base font-bold text-ink">بررسی نشست ممکن نشد</p>
					<p className="mt-3 text-sm leading-7 text-muted-dark">{failure}</p>
					<button
						type="button"
						onClick={() => void check()}
						className="mt-6 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
					>
						تلاش دوباره
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-shell px-4 py-16">
			<p role="status" className="text-center text-sm text-muted-dark">
				{phase === "anonymous"
					? "برای دسترسی به پنل وارد شوید…"
					: "در حال بررسی نشست…"}
			</p>
		</div>
	)
}
