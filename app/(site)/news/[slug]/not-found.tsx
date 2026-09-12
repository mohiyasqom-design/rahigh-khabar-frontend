import Link from "next/link"

/**
 * Shown when `GET /news/:slug` answers 404 — which covers both a wrong URL and
 * an article that is not published. The wording avoids confirming which of the
 * two it is, matching the backend's deliberate ambiguity.
 */
export default function NewsNotFound() {
	return (
		<div className="mx-auto max-w-md rounded-md border border-border px-6 py-14 text-center">
			<p className="text-lg font-bold tracking-headline text-ink">خبر پیدا نشد</p>
			<p className="mt-3 text-sm leading-7 text-muted-dark">
				این خبر در دسترس نیست؛ ممکن است نشانی اشتباه باشد یا این مطلب دیگر
				منتشرشده نباشد.
			</p>
			<Link
				href="/"
				className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
			>
				بازگشت به صفحه اصلی
			</Link>
		</div>
	)
}
