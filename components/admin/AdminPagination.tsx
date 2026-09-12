"use client"

import { formatPersianNumber } from "@/lib/format"

/**
 * Pagination for the dashboard list.
 *
 * WHY NOT REUSE `components/Pagination.tsx`: that one is link-based on purpose
 * — public pages live at `/page/2`, so each page has a crawlable, statically
 * generated URL. Admin listings are the opposite: they must never be cached or
 * indexed, and the filter state is client state, so paging here is a pair of
 * buttons that refetch with `cache: "no-store"`. Same visual language, honest
 * about being a different thing.
 */
export default function AdminPagination({
	page,
	totalPages,
	total,
	busy,
	onChange,
}: {
	page: number
	totalPages: number
	total: number
	busy: boolean
	onChange: (page: number) => void
}) {
	const buttonClass =
		"flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-ink transition-colors hover:border-border-strong hover:text-accent disabled:cursor-not-allowed disabled:border-border disabled:text-border-strong disabled:hover:text-border-strong"

	return (
		<nav
			aria-label="صفحه‌بندی فهرست اخبار"
			className="mt-6 flex flex-wrap items-center justify-between gap-3"
		>
			<p className="text-sm text-muted-dark">
				صفحه {formatPersianNumber(page)} از {formatPersianNumber(Math.max(totalPages, 1))}
				<span className="mx-2 text-border-strong">|</span>
				{formatPersianNumber(total)} خبر
			</p>

			<div className="flex items-center gap-2">
				<button
					type="button"
					className={buttonClass}
					disabled={busy || page <= 1}
					onClick={() => onChange(page - 1)}
				>
					صفحه قبل
				</button>
				<button
					type="button"
					className={buttonClass}
					disabled={busy || page >= totalPages}
					onClick={() => onChange(page + 1)}
				>
					صفحه بعد
				</button>
			</div>
		</nav>
	)
}
