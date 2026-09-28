"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import {
	checkUsernameAvailable,
	getVisitorSession,
	updateVisitorProfile,
} from "@/lib/auth"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { ACCEPTED_IMAGE_INPUT, describeFileProblem } from "@/lib/media"
import { uploadAvatar } from "@/lib/media-upload"
import {
	DISPLAY_NAME_MAX_LENGTH,
	USERNAME_MAX_LENGTH,
	USERNAME_MIN_LENGTH,
	USERNAME_PATTERN,
} from "@/types/auth"

const CHECK_DELAY_MS = 500

/**
 * One-time profile completion for a new Google visitor.
 *
 * THE SESSION IS LOADED HERE, IN THE BROWSER. The visitor cookie belongs to the
 * API origin, so a Server Component cannot read it; the previous version called
 * a `next/headers` helper that could only ever return null in a split-origin
 * deployment.
 *
 * AVATAR UPLOAD, ADDED IN STAGE 10 PART 5. `PATCH /users/me` still takes JSON
 * with `username` and `displayName` only; the picture goes to the separate
 * multipart route `POST /users/me/avatar`, which answers with the stored URL.
 * The two are therefore sent as two different requests — the old form posted a
 * `FormData` containing an image to the JSON route and got 415 every time.
 *
 * The upload happens IMMEDIATELY on pick rather than on submit, because the
 * backend stores it right away and returns the final URL, which is what the
 * preview must show. A Google picture remains the default when nothing is
 * uploaded.
 *
 * THE USERNAME IS WRITE-ONCE, enforced server-side (409 `USERNAME_ALREADY_SET`).
 */
export default function OnboardingForm() {
	const router = useRouter()

	const [loading, setLoading] = useState(true)
	const [signedOut, setSignedOut] = useState(false)
	const [username, setUsername] = useState("")
	const [displayName, setDisplayName] = useState("")
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
	const [usernameError, setUsernameError] = useState<string | null>(null)
	const [checking, setChecking] = useState(false)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [avatarBusy, setAvatarBusy] = useState(false)
	const [avatarError, setAvatarError] = useState<string | null>(null)
	const avatarInputRef = useRef<HTMLInputElement | null>(null)

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const requestRef = useRef(0)

	useEffect(() => {
		let cancelled = false

		getVisitorSession()
			.then((session) => {
				if (cancelled) return

				if (!session) {
					setSignedOut(true)
					return
				}

				// Already onboarded: there is nothing to do on this page.
				if (session.username !== null) {
					router.replace("/")
					return
				}

				setDisplayName(session.displayName)
				setAvatarUrl(session.avatarUrl)
			})
			.catch((err) => {
				if (!cancelled) {
					setError(errorMessage(err, "خواندن حساب کاربری انجام نشد."))
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false)
				}
			})

		return () => {
			cancelled = true
		}
	}, [router])

	// Clear any pending debounce when the component goes away.
	useEffect(
		() => () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}
		},
		[],
	)

	const scheduleCheck = useCallback((value: string) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current)
		}

		if (value.length === 0) {
			setUsernameError(null)
			setChecking(false)
			return
		}

		if (value.length < USERNAME_MIN_LENGTH) {
			setUsernameError(`نام کاربری حداقل ${USERNAME_MIN_LENGTH} نویسه است.`)
			setChecking(false)
			return
		}

		if (!USERNAME_PATTERN.test(value)) {
			setUsernameError(
				"فقط حروف کوچک انگلیسی، عدد و زیرخط مجاز است.",
			)
			setChecking(false)
			return
		}

		setUsernameError(null)
		setChecking(true)

		const requestId = ++requestRef.current

		timerRef.current = setTimeout(() => {
			checkUsernameAvailable(value)
				.then((available) => {
					// Ignore an answer for a name the user has already changed.
					if (requestId !== requestRef.current) return
					setUsernameError(available ? null : "این نام کاربری قبلاً گرفته شده است.")
				})
				.catch(() => {
					if (requestId !== requestRef.current) return
					// Advisory only: the unique index is the real gate on submit.
					setUsernameError(null)
				})
				.finally(() => {
					if (requestId === requestRef.current) {
						setChecking(false)
					}
				})
		}, CHECK_DELAY_MS)
	}, [])

	async function handleAvatarPick(file: File | undefined) {
		if (!file) {
			return
		}

		// Same client-side guard the media library uses: type and size are
		// checked before the bytes travel, so an oversized file fails instantly
		// instead of after a long upload that the backend would reject.
		const problem = describeFileProblem(file)

		if (problem) {
			setAvatarError(problem)
			return
		}

		setAvatarBusy(true)
		setAvatarError(null)

		try {
			const url = await uploadAvatar(file)
			setAvatarUrl(url)
		} catch (err) {
			if (isUnauthorized(err)) {
				setSignedOut(true)
			} else {
				setAvatarError(errorMessage(err, "بارگذاری عکس پروفایل انجام نشد."))
			}
		} finally {
			setAvatarBusy(false)

			// Reset the input so picking the SAME file again still fires change.
			if (avatarInputRef.current) {
				avatarInputRef.current.value = ""
			}
		}
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()

		const trimmedName = displayName.trim()

		if (!USERNAME_PATTERN.test(username)) {
			setUsernameError("نام کاربری معتبر نیست.")
			return
		}

		setSaving(true)
		setError(null)

		try {
			await updateVisitorProfile({
				username,
				...(trimmedName.length > 0 ? { displayName: trimmedName } : {}),
			})
			router.push("/")
			router.refresh()
		} catch (err) {
			if (isUnauthorized(err)) {
				setSignedOut(true)
			} else {
				setError(errorMessage(err, "ذخیرهٔ پروفایل انجام نشد."))
			}
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return <p className="text-sm text-muted-dark">در حال بارگذاری…</p>
	}

	if (signedOut) {
		return (
			<div className="rounded-md border border-border bg-white px-4 py-5 text-sm text-muted-dark">
				<p>برای تکمیل پروفایل ابتدا باید وارد شوید.</p>
			</div>
		)
	}

	const submitDisabled =
		saving || checking || username.length === 0 || usernameError !== null

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="flex items-center gap-3">
				{avatarUrl ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						src={avatarUrl}
						alt=""
						width={48}
						height={48}
						className="h-12 w-12 rounded-full object-cover"
						referrerPolicy="no-referrer"
					/>
				) : (
					<span className="h-12 w-12 rounded-full border border-border bg-paper" />
				)}

				<div>
					<input
						ref={avatarInputRef}
						id="avatar"
						type="file"
						accept={ACCEPTED_IMAGE_INPUT}
						className="hidden"
						onChange={(event) => void handleAvatarPick(event.target.files?.[0])}
					/>

					<button
						type="button"
						onClick={() => avatarInputRef.current?.click()}
						disabled={avatarBusy || saving}
						className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
					>
						{avatarBusy ? "در حال بارگذاری…" : "بارگذاری عکس پروفایل"}
					</button>

					<p className="mt-1 text-xs text-muted">
						در صورت عدم بارگذاری، عکس حساب گوگل شما استفاده می‌شود.
					</p>

					{avatarError ? (
						<p role="alert" className="mt-1 text-xs text-accent-strong">
							{avatarError}
						</p>
					) : null}
				</div>
			</div>

			<div>
				<label htmlFor="username" className="block text-sm font-semibold text-ink">
					نام کاربری *
				</label>
				<input
					id="username"
					name="username"
					type="text"
					dir="ltr"
					autoComplete="off"
					maxLength={USERNAME_MAX_LENGTH}
					value={username}
					onChange={(event) => {
						// Lower-cased here too, because the backend lower-cases before
						// validating and the field must show what will be saved.
						const next = event.target.value.trim().toLowerCase()
						setUsername(next)
						scheduleCheck(next)
					}}
					disabled={saving}
					aria-invalid={usernameError !== null}
					className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink text-start disabled:bg-paper"
					placeholder="my_username"
				/>
				<p className="mt-1 text-xs text-muted">
					{USERNAME_MIN_LENGTH} تا {USERNAME_MAX_LENGTH} نویسه، حروف کوچک انگلیسی، عدد یا
					زیرخط. این نام بعد از ثبت قابل تغییر نیست.
				</p>
				{checking ? (
					<p className="mt-1 text-xs text-muted">در حال بررسی…</p>
				) : null}
				{usernameError ? (
					<p className="mt-1 text-xs text-accent-strong">{usernameError}</p>
				) : null}
			</div>

			<div>
				<label htmlFor="displayName" className="block text-sm font-semibold text-ink">
					نام نمایشی
				</label>
				<input
					id="displayName"
					name="displayName"
					type="text"
					maxLength={DISPLAY_NAME_MAX_LENGTH}
					value={displayName}
					onChange={(event) => setDisplayName(event.target.value)}
					disabled={saving}
					className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink disabled:bg-paper"
					placeholder="علی محمدی"
				/>
			</div>

			{error ? (
				<div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent-strong">
					{error}
				</div>
			) : null}

			<button
				type="submit"
				disabled={submitDisabled}
				className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{saving ? "در حال ثبت…" : "ادامه"}
			</button>
		</form>
	)
}
