import Link from "next/link"

import Footer from "@/components/Footer"
import Header from "@/components/Header"

/**
 * Site-wide 404 for URLs that match no route at all.
 *
 * STAGE 8 NOTE: this file renders the public chrome itself. It used to inherit
 * `<Header />`, the centred `<main>` and `<Footer />` from `app/layout.tsx`,
 * but the chrome moved into `app/(site)/layout.tsx` so the admin panel could
 * sit outside it — and a root-level `not-found` is rendered by the ROOT layout,
 * not by the `(site)` one. Repeating the wrapper here keeps the rendered page
 * identical to Stage 7 instead of dropping an unstyled panel onto a bare body.
 */
export default function NotFound() {
	return (
		<>
			<Header />
			<main className="mx-auto w-full max-w-shell flex-1 px-4 py-8 sm:py-10">
				<div className="mx-auto max-w-md rounded-md border border-border px-6 py-14 text-center">
					<p className="text-3xl font-extrabold tracking-headline text-accent">۴۰۴</p>
					<p className="mt-3 text-lg font-bold text-ink">صفحه پیدا نشد</p>
					<p className="mt-3 text-sm leading-7 text-muted-dark">
						نشانی‌ای که دنبال آن بودید وجود ندارد یا حذف شده است.
					</p>
					<Link
						href="/"
						className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
					>
						بازگشت به صفحه اصلی
					</Link>
				</div>
			</main>
			<Footer />
		</>
	)
}
