"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AdminPagination from "@/components/admin/AdminPagination"
import StatusBadge from "@/components/admin/StatusBadge"
import { useSession } from "@/components/admin/session"
import EmptyState from "@/components/EmptyState"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { formatJalaliDateTime, formatPersianNumber } from "@/lib/format"
import { ADMIN_PAGE_SIZE, listAdminNews } from "@/lib/news"
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/news-status"
import type { Paginated } from "@/types/api"
import type { AdminNewsItem, NewsStatus } from "@/types/news"

/**
 * The dashboard list.
 *
 * ALWAYS FRESH, NEVER CACHED: every load goes through `listAdminNews`, which
 * uses `cache: "no-store"`. Stage 7's 60-second `revalidate` is not reused
 * anywhere in the panel — an editor must see a draft the instant it is saved,
 * and unpublished content must never sit in a shared cache.
 *
 * WHAT EACH ROLE SEES IS DECIDED BY THE BACKEND, not here: `newsPolicy.scope`
 * restricts an ADMIN's query to their own articles, while a SUPER_ADMIN gets
 * everything. This component sends the same request either way and displays
 * whatever comes back, so the list can never show more than the session is
 * entitled to.
 */
type Filter = NewsStatus | "ALL"

export default function DashboardView() {
	const { user, handleExpiredSession } = useSession()
	const [filter, setFilter] = useState<Filter>("ALL")
	const [page, setPage] = useState(1)
	const [data, setData] = useState<Paginated<AdminNewsItem> | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			const result = await listAdminNews({
				page,
				pageSize: ADMIN_PAGE_SIZE,
				status: filter === "ALL" ? undefined : filter,
			})

			setData(result)
		} catch (caught) {
			if (isUnauthorized(caught)) {
				// The session died while the panel was open: back to the login form.
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "دریافت فهرست اخبار انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [filter, handleExpiredSession, page])

	useEffect(() => {
		void load()
	}, [load])

	function changeFilter(next: Filter) {
		setFilter(next)
		setPage(1)
	}

	const items = data?.items ?? []
	const pagination = data?.pagination

	return (
		<section>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-extrabold tracking-headline text-ink">داشبورد اخبار</h1>
					<p className="mt-2 text-sm leading-7 text-muted-dark">
						{user.role === "SUPER_ADMIN"
							? "همهٔ اخبار سامانه، در هر وضعیتی، به‌صورت لحظه‌ای از سرور خوانده می‌شود."
							: "اخبار خودتان، به‌صورت لحظه‌ای از سرور خوانده می‌شود. محدود بودن فهرست به اخبار خودتان در سرور اعمال می‌شود."}
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => void load()}
						disabled={loading}
						className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? "در حال به‌روزرسانی…" : "به‌روزرسانی"}
					</button>

					<Link
						href="/admin/news/new"
						className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
					>
						خبر تازه
					</Link>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="صافی وضعیت">
				{(["ALL", ...STATUS_ORDER] as Filter[]).map((option) => {
					const active = filter === option

					return (
						<button
							key={option}
							type="button"
							aria-pressed={active}
							disabled={loading}
							onClick={() => changeFilter(option)}
							className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
								active
									? "border-accent bg-accent/10 text-accent"
									: "border-border text-ink hover:border-border-strong"
							}`}
						>
							{option === "ALL" ? "همه" : STATUS_LABELS[option]}
						</button>
					)
				})}
			</div>

			{error ? (
				<p
					role="alert"
					className="mt-6 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm leading-7 text-accent"
				>
					{error}
				</p>
			) : null}

			{loading && !data ? (
				<p role="status" className="mt-8 text-sm text-muted-dark">
					در حال دریافت اخبار…
				</p>
			) : null}

			{data && items.length === 0 ? (
				<div className="mt-8">
					<EmptyState
						title="خبری یافت نشد"
						description={
							filter === "ALL"
								? "هنوز خبری ثبت نشده است."
								: `در وضعیت «${STATUS_LABELS[filter]}» خبری وجود ندارد.`
						}
						action={
							<Link
								href="/admin/news/new"
								className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
							>
								نوشتن خبر تازه
							</Link>
						}
					/>
				</div>
			) : null}

			{items.length > 0 ? (
				<>
					{/* Table from tablet width up; stacked cards below it. */}
					<div className="mt-6 hidden overflow-x-auto rounded-md border border-border md:block">
						<table className="w-full border-collapse text-start text-sm">
							<thead className="bg-paper text-xs text-muted-dark">
								<tr>
									<th scope="col" className="px-4 py-3 text-start font-semibold">عنوان</th>
									<th scope="col" className="px-4 py-3 text-start font-semibold">وضعیت</th>
									<th scope="col" className="px-4 py-3 text-start font-semibold">دسته‌بندی</th>
									<th scope="col" className="px-4 py-3 text-start font-semibold">نویسنده</th>
									<th scope="col" className="px-4 py-3 text-start font-semibold">آخرین به‌روزرسانی</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => (
									<tr key={item.id} className="border-t border-border">
										<td className="px-4 py-3">
											<Link
												href={`/admin/news/${item.id}/edit`}
												className="font-semibold text-ink transition-colors hover:text-accent"
											>
												{item.title}
											</Link>
											<p dir="ltr" className="mt-1 text-start text-xs text-muted">
												{item.slug}
											</p>
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={item.status} />
										</td>
										<td className="px-4 py-3 text-xs text-muted-dark">
											{item.categories.map((category) => category.name).join("، ") || "—"}
										</td>
										<td className="px-4 py-3 text-xs text-muted-dark">
											{item.author.displayName}
										</td>
										<td className="px-4 py-3 text-xs text-muted-dark">
											{formatJalaliDateTime(item.updatedAt) ?? "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<ul className="mt-6 space-y-3 md:hidden">
						{items.map((item) => (
							<li key={item.id} className="rounded-md border border-border p-4">
								<div className="flex items-start justify-between gap-3">
									<Link
										href={`/admin/news/${item.id}/edit`}
										className="font-semibold text-ink transition-colors hover:text-accent"
									>
										{item.title}
									</Link>
									<StatusBadge status={item.status} />
								</div>
								<p className="mt-2 text-xs text-muted-dark">
									{item.author.displayName}
									<span className="mx-2 text-border-strong">|</span>
									{formatJalaliDateTime(item.updatedAt) ?? "—"}
								</p>
							</li>
						))}
					</ul>

					{pagination ? (
						<AdminPagination
							page={pagination.page}
							totalPages={pagination.totalPages}
							total={pagination.total}
							busy={loading}
							onChange={setPage}
						/>
					) : null}

					<p className="mt-3 text-xs text-muted-dark">
						نمایش {formatPersianNumber(items.length)} خبر در این صفحه.
					</p>
				</>
			) : null}
		</section>
	)
}
