"use client"

import Link from "next/link"

/**
 * Error boundary for the admin panel.
 *
 * Separate from `app/(site)/error.tsx` because the public one renders inside
 * the public chrome and speaks to readers; this one speaks to an editor and
 * keeps them inside the panel. The underlying message is not printed: an
 * unexpected render error can carry internals, and every *expected* failure
 * (bad credentials, 403, 409 slug conflict, expired session) is already shown
 * in place by the component that made the request.
 */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
	return (
		<div className="mx-auto w-full max-w-shell px-4 py-16">
			<div className="mx-auto max-w-md rounded-md border border-border bg-white px-6 py-12 text-center">
				<h1 className="text-lg font-bold tracking-headline text-ink">خطایی رخ داد</h1>
				<p className="mt-3 text-sm leading-7 text-muted-dark">
					انجام این بخش از پنل ممکن نشد. می‌توانید دوباره تلاش کنید یا به داشبورد برگردید.
				</p>

				<div className="mt-6 flex flex-wrap justify-center gap-2">
					<button
						type="button"
						onClick={reset}
						className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
					>
						تلاش دوباره
					</button>
					<Link
						href="/admin"
						className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
					>
						داشبورد
					</Link>
				</div>
			</div>
		</div>
	)
}
