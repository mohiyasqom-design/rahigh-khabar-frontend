"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AdminPagination from "@/components/admin/AdminPagination"
import StatusBadge from "@/components/admin/StatusBadge"
import { useSession } from "@/components/admin/session"
import EmptyState from "@/components/EmptyState"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { formatJalaliDateTime, formatRelativeTime } from "@/lib/format"
import { ADMIN_PAGE_SIZE, changeNewsStatus, listAdminNews } from "@/lib/news"
import type { Paginated } from "@/types/api"
import type { AdminNewsItem } from "@/types/news"

/**
 * The scheduling queue: every article whose status is `SCHEDULED`.
 *
 * WHAT ACTUALLY PUBLISHES THESE: the backend scheduler plugin, which wakes up
 * every `SCHEDULER_INTERVAL_MS` (60s by default) and flips due rows to
 * PUBLISHED. Nothing in the browser does it, so this screen never pretends to
 * "run" the queue — it shows what is queued, when each item is due, and offers
 * the two manual overrides the API really has:
 *   - publish now (`POST /admin/news/:id/status` with PUBLISHED)
 *   - pull back to draft (the same route with DRAFT)
 * Both are SUPER_ADMIN-only on the backend, so they are hidden for an ADMIN
 * rather than shown and answered with 403.
 *
 * OVERDUE ROWS ARE CALLED OUT: if an item's time has passed and it is still
 * queued, the scheduler is probably disabled (`SCHEDULER_ENABLED=false`) or
 * the process is down. Silently showing a past date would hide a real outage.
 */
export default function ScheduledNewsView() {
	const { user, handleExpiredSession } = useSession()
	const [page, setPage] = useState(1)
	const [data, setData] = useState<Paginated<AdminNewsItem> | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [busyId, setBusyId] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	// Fixed at first render so the list does not re-sort under the cursor.
	const [now] = useState(() => new Date())

	const canManage = user.role === "SUPER_ADMIN"

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			setData(
				await listAdminNews({ page, pageSize: ADMIN_PAGE_SIZE, status: "SCHEDULED" }),
			)
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "دریافت صف زمان‌بندی انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [handleExpiredSession, page])

	useEffect(() => {
		void load()
	}, [load])

	async function transition(id: string, status: "PUBLISHED" | "DRAFT") {
		setBusyId(id)
		setError(null)
		setNotice(null)

		try {
			await changeNewsStatus(id, status)
			setNotice(
				status === "PUBLISHED"
					? "خبر بلافاصله منتشر شد و از صف زمان‌بندی خارج شد."
					: "خبر به پیش‌نویس بازگردانده شد و دیگر خودکار منتشر نمی‌شود.",
			)
			await load()
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "تغییر وضعیت خبر انجام نشد."))
		} finally {
			setBusyId(null)
		}
	}

	const items = data?.items ?? []
	const pagination = data?.pagination

	return (
		<section>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-xl font-extrabold tracking-headline text-ink">
						اخبار زمان‌بندی‌شده
					</h1>
					<p className="mt-1 max-w-2xl text-sm leading-7 text-muted-dark">
						این اخبار در زمان تعیین‌شده توسط زمان‌بند سرور (هر یک دقیقه یک‌بار
						بررسی می‌شود) به‌صورت خودکار منتشر می‌شوند؛ بازکردن این صفحه شرط
						انتشار نیست.
					</p>
				</div>

				<button
					type="button"
					onClick={() => void load()}
					disabled={loading}
					className="h-9 rounded-md border border-border px-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
				>
					به‌روزرسانی
				</button>
			</div>

			{error ? (
				<p
					role="alert"
					className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent"
				>
					{error}
				</p>
			) : null}

			{notice ? (
				<p
					role="status"
					className="mt-5 rounded-md border border-link/30 bg-link/5 px-3 py-2.5 text-sm text-link"
				>
					{notice}
				</p>
			) : null}

			{loading && !data ? (
				<p role="status" className="mt-8 text-sm text-muted-dark">
					در حال دریافت صف زمان‌بندی…
				</p>
			) : null}

			{!loading && items.length === 0 ? (
				<div className="mt-6">
					<EmptyState
						title="صف زمان‌بندی خالی است"
						description="هیچ خبری برای انتشار خودکار تنظیم نشده است. زمان انتشار را در فرم ویرایش خبر تعیین کنید."
						action={
							<Link
								href="/admin/news/new"
								className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-paper"
							>
								خبر تازه
							</Link>
						}
					/>
				</div>
			) : null}

			{items.length > 0 ? (
				<ul className="mt-5 space-y-3">
					{items.map((item) => {
						const due = item.scheduledFor ? new Date(item.scheduledFor) : null
						const overdue = due ? due.getTime() < now.getTime() : false

						return (
							<li
								key={item.id}
								className="rounded-md border border-border bg-white p-4"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<StatusBadge status={item.status} />
											<h2 className="text-sm font-bold leading-7 text-ink">{item.title}</h2>
										</div>

										<p className="mt-1 text-xs text-muted-dark">
											{due
												? `زمان انتشار: ${formatJalaliDateTime(item.scheduledFor as string)} (${formatRelativeTime(item.scheduledFor as string, now.getTime())})`
												: "زمان انتشار ثبت نشده است."}
										</p>

										<p className="mt-1 text-xs text-muted-dark">
											نویسنده: {item.author.displayName}
										</p>

										{overdue ? (
											<p className="mt-2 rounded-md border border-accent/30 bg-accent/5 px-2 py-1.5 text-xs leading-6 text-accent">
												زمان این خبر گذشته ولی هنوز منتشر نشده است؛ احتمالاً زمان‌بند سرور
												غیرفعال است. می‌توانید دستی منتشر کنید.
											</p>
										) : null}
									</div>

									<div className="flex shrink-0 flex-wrap items-center gap-2">
										<Link
											href={`/admin/news/${item.id}/edit`}
											className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
										>
											ویرایش و تغییر زمان
										</Link>

										{canManage ? (
											<>
												<button
													type="button"
													disabled={busyId === item.id}
													onClick={() => void transition(item.id, "PUBLISHED")}
													className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
												>
													{busyId === item.id ? "در حال انجام…" : "انتشار فوری"}
												</button>
												<button
													type="button"
													disabled={busyId === item.id}
													onClick={() => void transition(item.id, "DRAFT")}
													className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
												>
													لغو زمان‌بندی
												</button>
											</>
										) : null}
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			) : null}

			{!canManage && items.length > 0 ? (
				<p className="mt-3 text-xs leading-6 text-muted-dark">
					انتشار فوری یا لغو زمان‌بندی فقط از عهدهٔ مدیر ارشد برمی‌آید؛ این محدودیت در سرور
					اعمال می‌شود.
				</p>
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
