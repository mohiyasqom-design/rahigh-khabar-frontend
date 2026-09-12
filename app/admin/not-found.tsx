import Link from "next/link"

/**
 * 404 inside the panel.
 *
 * The public 404 (`app/not-found.tsx`) renders the masthead, the verse banner
 * and the category bar — none of which belong behind the login. A mistyped
 * admin URL should keep the editor in the panel instead of dropping them onto
 * the newspaper front page.
 */
export default function AdminNotFound() {
	return (
		<div className="mx-auto w-full max-w-shell px-4 py-16">
			<div className="mx-auto max-w-md rounded-md border border-border bg-white px-6 py-12 text-center">
				<h1 className="text-lg font-bold tracking-headline text-ink">این صفحه در پنل وجود ندارد</h1>
				<p className="mt-3 text-sm leading-7 text-muted-dark">
					نشانی واردشده درست نیست یا دسترسی به آن حذف شده است.
				</p>

				<Link
					href="/admin"
					className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
				>
					بازگشت به داشبورد
				</Link>
			</div>
		</div>
	)
}
