import Link from "next/link"

import { formatPersianNumber } from "@/lib/format"

/**
 * Numbered pagination built from real backend totals (`pagination.totalPages`).
 *
 * LINK-BASED, PATH-BASED: every page is a normal <a href> to its own URL, so it
 * works without JavaScript, is crawlable, and — because the URL is a path and
 * not a query string — each page can be statically generated and revalidated
 * like every other page (see the note in app/category/[slug]/_category-page).
 *
 * `hrefForPage` is supplied by the caller, which owns the URL shape.
 */
export default function Pagination({
	page,
	totalPages,
	hrefForPage,
}: {
	page: number
	totalPages: number
	hrefForPage: (page: number) => string
}) {
	if (totalPages <= 1) {
		return null
	}

	const baseClass =
		"flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm transition-colors"

	return (
		<nav
			aria-label="صفحه‌بندی"
			className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
		>
			{page > 1 ? (
				<Link
					href={hrefForPage(page - 1)}
					rel="prev"
					className={`${baseClass} border border-border font-medium text-ink hover:border-border-strong hover:text-accent`}
				>
					قبلی
				</Link>
			) : (
				<span className={`${baseClass} border border-border text-border-strong`}>
					قبلی
				</span>
			)}

			<ol className="flex flex-wrap items-center gap-1.5">
				{pageWindow(page, totalPages).map((entry, index) =>
					entry === "gap" ? (
						<li
							key={`gap-${index}`}
							aria-hidden="true"
							className="px-1 text-sm text-muted"
						>
							…
						</li>
					) : (
						<li key={entry}>
							{entry === page ? (
								<span
									aria-current="page"
									className={`${baseClass} bg-accent font-bold text-paper`}
								>
									{formatPersianNumber(entry)}
								</span>
							) : (
								<Link
									href={hrefForPage(entry)}
									className={`${baseClass} border border-border text-ink hover:border-border-strong hover:text-accent`}
								>
									{formatPersianNumber(entry)}
								</Link>
							)}
						</li>
					),
				)}
			</ol>

			{page < totalPages ? (
				<Link
					href={hrefForPage(page + 1)}
					rel="next"
					className={`${baseClass} border border-border font-medium text-ink hover:border-border-strong hover:text-accent`}
				>
					بعدی
				</Link>
			) : (
				<span className={`${baseClass} border border-border text-border-strong`}>
					بعدی
				</span>
			)}
		</nav>
	)
}

/** First page, last page, and the current page ±1, with gaps in between. */
function pageWindow(page: number, totalPages: number): Array<number | "gap"> {
	const shown = new Set<number>([1, totalPages])

	for (let candidate = page - 1; candidate <= page + 1; candidate += 1) {
		if (candidate >= 1 && candidate <= totalPages) {
			shown.add(candidate)
		}
	}

	const sorted = [...shown].sort((a, b) => a - b)
	const entries: Array<number | "gap"> = []

	sorted.forEach((value, index) => {
		const previous = sorted[index - 1]

		if (previous !== undefined && value - previous > 1) {
			entries.push("gap")
		}

		entries.push(value)
	})

	return entries
}
