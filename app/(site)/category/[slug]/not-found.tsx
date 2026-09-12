import Link from "next/link"

/**
 * Unknown category slug, or a page number past the end of the listing.
 *
 * Kept separate from the "category exists but is empty" state, which is a
 * normal 200 page with an explanatory panel.
 */
export default function CategoryNotFound() {
	return (
		<div className="mx-auto max-w-md rounded-md border border-border px-6 py-14 text-center">
			<p className="text-lg font-bold tracking-headline text-ink">
				دسته‌بندی پیدا نشد
			</p>
			<p className="mt-3 text-sm leading-7 text-muted-dark">
				این دسته‌بندی وجود ندارد یا شمارهٔ صفحه خارج از محدوده است.
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
