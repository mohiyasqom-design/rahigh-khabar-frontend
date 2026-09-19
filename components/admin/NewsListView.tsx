"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AdminPagination from "@/components/admin/AdminPagination"
import StatusBadge from "@/components/admin/StatusBadge"
import { useSession } from "@/components/admin/session"
import EmptyState from "@/components/EmptyState"
import { getAdminCategories } from "@/lib/categories"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { formatJalaliDateTime } from "@/lib/format"
import { ADMIN_PAGE_SIZE, listAdminNews } from "@/lib/news"
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/news-status"
import type { Paginated } from "@/types/api"
import type { Category } from "@/types/category"
import type { AdminNewsItem, NewsStatus } from "@/types/news"

/**
 * Stage 10 Part 5 — the "all news" screen of the rewritten panel.
 *
 * DIFFERENT FROM `DashboardView`, which stays as the landing summary: this one
 * adds a category filter, shows the queue time of scheduled articles and is
 * reused for the drafts shortcut through `fixedStatus`.
 *
 * FILTERING IS SERVER-SIDE, never a client-side `Array.filter`: the list is
 * paginated, so filtering the current page would silently hide matches that
 * live on other pages. `status` and `categoryId` are sent to
 * `GET /admin/news`, and the page is reset to 1 whenever a filter changes
 * because page 4 of the old filter is usually empty under the new one.
 *
 * WHAT EACH ROLE SEES IS DECIDED BY THE BACKEND: `newsPolicy.scope` limits an
 * ADMIN to their own articles. This component sends the same request either
 * way.
 */

type Filter = NewsStatus | "ALL"

interface Props {
	/** Locks the status filter, for the drafts/scheduled shortcuts. */
	fixedStatus?: NewsStatus
	title?: string
	description?: string
}

export default function NewsListView({ fixedStatus, title, description }: Props) {
	const { user, handleExpiredSession } = useSession()
	const [filter, setFilter] = useState<Filter>(fixedStatus ?? "ALL")
	const [categoryId, setCategoryId] = useState<string>("")
	const [categories, setCategories] = useState<Category[]>([])
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
				categoryId: categoryId || undefined,
			})

			setData(result)
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "دریافت فهرست اخبار انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [categoryId, filter, handleExpiredSession, page])

	useEffect(() => {
		void load()
	}, [load])

	// The category filter needs names; a failure here must not break the list,
	// so the selector simply stays empty.
	useEffect(() => {
		let active = true

		getAdminCategories()
			.then((items) => {
				if (active) {
					setCategories(items)
				}
			})
			.catch(() => undefined)

		return () => {
			active = false
		}
	}, [])

	const items = data?.items ?? []
	const pagination = data?.pagination

	return (
		<section>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-extrabold tracking-headline text-ink">
						{title ?? "همه اخبار"}
					</h1>

					<p className="mt-2 text-sm leading-7 text-muted-dark">
						{description ??
							(user.role === "SUPER_ADMIN"
								? "همهٔ اخبار سامانه در هر وضعیتی، با صافی وضعیت و دسته‌بندی."
								: "اخبار خودتان؛ محدودبودن فهرست در سرور اعمال می‌شود.")}
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

			<div className="mt-6 flex flex-wrap items-center gap-2">
				{fixedStatus ? null : (
					<div className="flex flex-wrap gap-2" role="group" aria-label="صافی وضعیت">
						{(["ALL", ...STATUS_ORDER] as Filter[]).map((option) => {
							const active = filter === option

							return (
								<button
									key={option}
									type="button"
									aria-pressed={active}
									disabled={loading}
									onClick={() => {
										setFilter(option)
										setPage(1)
									}}
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
				)}

				<label className="ms-auto flex items-center gap-2 text-xs text-muted-dark">
					<span>دسته‌بندی</span>

					<select
						value={categoryId}
						disabled={loading}
						onChange={(event) => {
							setCategoryId(event.target.value)
							setPage(1)
						}}
						className="rounded-md border border-border bg-white px-2 py-1.5 text-xs text-ink"
					>
						<option value="">همه دسته‌بندی‌ها</option>

						{categories.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
				</label>
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
						description="با این صافی‌ها خبری وجود ندارد."
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
									<th scope="col" className="px-4 py-3 text-start font-semibold">زمان</th>
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
											{item.status === "SCHEDULED" && item.scheduledFor
												? `انتشار: ${formatJalaliDateTime(item.scheduledFor)}`
												: formatJalaliDateTime(item.updatedAt)}
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
										className="font-semibold leading-7 text-ink transition-colors hover:text-accent"
									>
										{item.title}
									</Link>

									<StatusBadge status={item.status} />
								</div>

								<p className="mt-2 text-xs text-muted-dark">
									{item.categories.map((category) => category.name).join("، ") || "بدون دسته‌بندی"}
								</p>

								<p className="mt-1 text-xs text-muted-dark">
									{item.status === "SCHEDULED" && item.scheduledFor
										? `انتشار: ${formatJalaliDateTime(item.scheduledFor)}`
										: formatJalaliDateTime(item.updatedAt)}
								</p>
							</li>
						))}
					</ul>
				</>
			) : null}

			{pagination && pagination.totalPages > 1 ? (
				<AdminPagination
					page={pagination.page}
					totalPages={pagination.totalPages}
					total={pagination.total}
					busy={loading}
					onChange={setPage}
				/>
			) : null}
		</section>
	)
}
