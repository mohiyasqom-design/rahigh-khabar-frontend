"use client"

import { useCallback, useEffect, useState } from "react"

import AdminPagination from "@/components/admin/AdminPagination"
import { useSession } from "@/components/admin/session"
import EmptyState from "@/components/EmptyState"
import {
	deleteAdminComment,
	listAdminComments,
	type AdminComment,
} from "@/lib/admin-resources"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { formatJalaliDateTime } from "@/lib/format"
import type { Paginated } from "@/types/api"

const PAGE_SIZE = 20

/**
 * Comment moderation (`GET /admin/comments`, `DELETE /admin/comments/:id`).
 *
 * DELETION IS A SOFT DELETE on the backend: the row stays with `isDeleted`
 * true so the thread keeps its shape, and the public endpoint stops returning
 * the text. The UI therefore says «حذف شده» rather than removing the row from
 * view, and "show deleted" is a filter, not a recycle bin.
 */
export default function CommentsView() {
	const { handleExpiredSession } = useSession()
	const [page, setPage] = useState(1)
	const [includeDeleted, setIncludeDeleted] = useState(false)
	const [data, setData] = useState<Paginated<AdminComment> | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [busyId, setBusyId] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			setData(await listAdminComments(page, PAGE_SIZE, includeDeleted))
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "دریافت دیدگاه‌ها انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [handleExpiredSession, includeDeleted, page])

	useEffect(() => {
		void load()
	}, [load])

	async function remove(comment: AdminComment) {
		if (!window.confirm("این دیدگاه از نمایش عمومی حذف شود؟")) {
			return
		}

		setBusyId(comment.id)
		setError(null)

		try {
			await deleteAdminComment(comment.id)
			await load()
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "حذف دیدگاه انجام نشد."))
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
					<h1 className="text-xl font-extrabold tracking-headline text-ink">دیدگاه‌ها</h1>
					<p className="mt-1 text-sm leading-7 text-muted-dark">
						دیدگاه‌های ثبت‌شده روی اخبار، از تازه‌ترین.
					</p>
				</div>

				<label className="flex items-center gap-2 text-sm text-ink">
					<input
						type="checkbox"
						checked={includeDeleted}
						onChange={(event) => {
							setIncludeDeleted(event.target.checked)
							setPage(1)
						}}
					/>
					نمایش دیدگاه‌های حذف‌شده
				</label>
			</div>

			{error ? (
				<p
					role="alert"
					className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent"
				>
					{error}
				</p>
			) : null}

			{loading && !data ? (
				<p role="status" className="mt-8 text-sm text-muted-dark">
					در حال دریافت دیدگاه‌ها…
				</p>
			) : null}

			{!loading && items.length === 0 ? (
				<div className="mt-6">
					<EmptyState
						title="دیدگاهی ثبت نشده است"
						description="هنوز دیدگاهی برای مدیریت وجود ندارد."
					/>
				</div>
			) : null}

			{items.length > 0 ? (
				<ul className="mt-5 space-y-3">
					{items.map((comment) => (
						<li
							key={comment.id}
							className={`rounded-md border p-4 ${
								comment.isDeleted
									? "border-border-strong bg-paper"
									: "border-border bg-white"
							}`}
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="text-sm font-semibold text-ink">
										{comment.authorName}
										{comment.isDeleted ? (
											<span className="ms-2 rounded-md border border-border-strong px-1.5 py-0.5 text-[11px] font-normal text-muted-dark">
												حذف‌شده
											</span>
										) : null}
									</p>

									<p className="mt-1 whitespace-pre-line text-sm leading-7 text-ink">
										{comment.body}
									</p>

									<p className="mt-2 text-xs text-muted-dark">
										{formatJalaliDateTime(comment.createdAt)} · در خبر:{" "}
										<a
											href={`/news/${comment.newsSlug}`}
											target="_blank"
											rel="noreferrer"
											className="text-link hover:underline"
										>
											{comment.newsTitle}
										</a>
									</p>
								</div>

								{comment.isDeleted ? null : (
									<button
										type="button"
										disabled={busyId === comment.id}
										onClick={() => void remove(comment)}
										className="shrink-0 rounded-md border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/5 disabled:opacity-60"
									>
										{busyId === comment.id ? "در حال حذف…" : "حذف"}
									</button>
								)}
							</div>
						</li>
					))}
				</ul>
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
