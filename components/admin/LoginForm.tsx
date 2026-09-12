"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"

import { getCurrentAdmin, login } from "@/lib/auth"
import { errorMessage, errorStatus } from "@/lib/errors"

/**
 * The only way into the panel.
 *
 * THERE IS NO REGISTRATION, AND THERE CANNOT BE ONE: the backend exposes
 * exactly three auth routes — `POST /auth/login`, `POST /auth/logout` and
 * `GET /auth/me`. No sign-up, no password reset, no invitation endpoint exists,
 * so this form does not link to any. Accounts are created directly in the
 * database (the seed script) or by whoever administers it.
 *
 * NO ENUMERATION: the backend answers a wrong email and a wrong password with
 * the identical 401 `INVALID_CREDENTIALS` / «ایمیل یا رمز عبور نادرست
 * است», and this form shows that message verbatim. It never says "no such
 * user" or "wrong password", because that would leak which emails exist — a
 * distinction the backend refuses to make.
 *
 * THE CREDENTIALS ARE NEVER STORED. On success the backend sets an httpOnly
 * cookie; nothing is written to localStorage, sessionStorage or a JS-readable
 * cookie, and the password state is dropped with the component.
 */
export default function LoginForm() {
	const router = useRouter()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [rateLimited, setRateLimited] = useState(false)
	const [checkingSession, setCheckingSession] = useState(true)

	/**
	 * Where to go after a successful login.
	 *
	 * Read from `window.location` instead of `useSearchParams()` so this page
	 * needs no Suspense boundary and cannot deopt the route into client-side
	 * rendering at build time. Only same-site `/admin/…` paths are accepted — a
	 * `?next=https://evil.example` would otherwise turn the login page into an
	 * open redirect.
	 */
	function safeNextTarget(): string {
		const raw = new URLSearchParams(window.location.search).get("next")

		if (!raw || !raw.startsWith("/admin") || raw.startsWith("//")) {
			return "/admin"
		}

		return raw
	}

	// An editor who is already signed in should not be asked to sign in again.
	// This is the same real backend check the rest of the panel uses.
	useEffect(() => {
		let cancelled = false

		void (async () => {
			try {
				const current = await getCurrentAdmin()

				if (!cancelled && current) {
					router.replace(safeNextTarget())
					return
				}
			} catch {
				// A failed check here is not worth reporting: the form below is the
				// correct next step either way, and submitting it will surface the
				// real error if the backend is genuinely unreachable.
			}

			if (!cancelled) {
				setCheckingSession(false)
			}
		})()

		return () => {
			cancelled = true
		}
	}, [router])

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (submitting) {
			return
		}

		setSubmitting(true)
		setError(null)
		setRateLimited(false)

		try {
			await login({ email: email.trim(), password })
			setPassword("")

			// `replace`, not `push`: the login page must not sit in the back stack.
			router.replace(safeNextTarget())
			router.refresh()
		} catch (caught) {
			setRateLimited(errorStatus(caught) === 429)
			setError(errorMessage(caught, "ورود انجام نشد؛ دوباره تلاش کنید."))
			setSubmitting(false)
		}
	}

	if (checkingSession) {
		return (
			<p role="status" className="text-center text-sm text-muted-dark">
				در حال بررسی نشست…
			</p>
		)
	}

	const fieldClass =
		"mt-2 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent disabled:bg-paper"

	return (
		<form onSubmit={handleSubmit} noValidate className="space-y-5">
			<div>
				<label htmlFor="email" className="block text-sm font-semibold text-ink">
					ایمیل
				</label>
				<input
					id="email"
					name="email"
					type="email"
					dir="ltr"
					required
					autoComplete="username"
					maxLength={254}
					value={email}
					disabled={submitting}
					onChange={(event) => setEmail(event.target.value)}
					className={`${fieldClass} text-start`}
				/>
			</div>

			<div>
				<label htmlFor="password" className="block text-sm font-semibold text-ink">
					رمز عبور
				</label>
				<input
					id="password"
					name="password"
					type="password"
					dir="ltr"
					required
					autoComplete="current-password"
					maxLength={1024}
					value={password}
					disabled={submitting}
					onChange={(event) => setPassword(event.target.value)}
					className={`${fieldClass} text-start`}
				/>
			</div>

			{error ? (
				<p
					role="alert"
					className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm leading-6 text-accent"
				>
					{error}
					{rateLimited ? (
						<span className="mt-1 block text-xs text-muted-dark">
							محدودیت تعداد تلاش در سمت سرور اعمال شده است؛ پس از پایان بازهٔ محدودیت دوباره امتحان کنید.
						</span>
					) : null}
				</p>
			) : null}

			<button
				type="submit"
				disabled={submitting}
				className="w-full rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{submitting ? "در حال ورود…" : "ورود"}
			</button>

			<p className="text-center text-xs leading-6 text-muted-dark">
				این بخش ویژهٔ عوامل تحریریه است و ثبت‌نام عمومی ندارد. برای دریافت حساب با مدیر سامانه تماس بگیرید.
			</p>
		</form>
	)
}
