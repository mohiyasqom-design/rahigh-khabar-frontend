"use client"

import { useEffect } from "react"

/**
 * Route error boundary.
 *
 * Reached when a data read fails for a reason other than "not found" — the
 * backend is down, misconfigured, or answered 5xx. That is deliberately NOT
 * shown as an empty page or as "no news", because a reader would read that as
 * "nothing has been published".
 *
 * The raw error is logged to the console for diagnosis but never rendered: it
 * can contain internal URLs and backend messages. `digest` is Next.js's own
 * correlation id for the server-side error and is safe to show.
 */
export default function RouteError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<div className="mx-auto max-w-md rounded-md border border-border px-6 py-14 text-center">
			<p className="text-lg font-bold tracking-headline text-ink">
				در دریافت اطلاعات مشکلی پیش آمد
			</p>
			<p className="mt-3 text-sm leading-7 text-muted-dark">
				ارتباط با سرویس خبر برقرار نشد. لطفاً دوباره تلاش کنید؛ اگر مشکل
				ادامه داشت، کمی بعد سر بزنید.
			</p>
			<button
				type="button"
				onClick={reset}
				className="mt-6 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
			>
				تلاش دوباره
			</button>
			{error.digest ? (
				<p className="mt-4 text-xs text-muted">کد پیگیری: {error.digest}</p>
			) : null}
		</div>
	)
}
