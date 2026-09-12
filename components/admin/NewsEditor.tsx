"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import NewsForm from "@/components/admin/NewsForm"
import StatusActions from "@/components/admin/StatusActions"
import { useSession } from "@/components/admin/session"
import { getAdminCategories } from "@/lib/categories"
import { errorMessage, errorStatus, isForbidden, isUnauthorized } from "@/lib/errors"
import { formatJalaliDateTime } from "@/lib/format"
import { getAdminNews } from "@/lib/news"
import { canEditNews, editingBlockedReason } from "@/lib/news-status"
import type { Category } from "@/types/category"
import type { AdminNewsItem } from "@/types/news"

/**
 * Loader and shell around `NewsForm`, for both "new article" and "edit".
 *
 * ADMIN DATA IS ONLY REQUESTED AFTER THE SESSION IS CONFIRMED: this component
 * lives inside `AdminGate`, which renders nothing until `GET /auth/me` has
 * answered. There is no speculative fetch of articles or categories before
 * that — an unauthenticated visitor triggers exactly one request, the session
 * check itself.
 *
 * A created article gets a URL of its own (`/admin/news/{id}/edit`) rather than
 * staying on the "new" page, because the backend keys every subsequent
 * operation by that ID and a refresh must not create a second draft.
 */
export default function NewsEditor({ newsId }: { newsId?: string }) {
	const router = useRouter()
	const { user, handleExpiredSession } = useSession()
	const [article, setArticle] = useState<AdminNewsItem | null>(null)
	const [categories, setCategories] = useState<Category[] | null>(null)
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [missing, setMissing] = useState(false)

	const load = useCallback(async () => {
		setLoading(true)
		setLoadError(null)
		setMissing(false)

		try {
			const [loadedCategories, loadedArticle] = await Promise.all([
				getAdminCategories(),
				newsId ? getAdminNews(newsId) : Promise.resolve(null),
			])

			setCategories(loadedCategories)
			setArticle(loadedArticle)
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			// 404 and 403 are different facts and are reported differently: the
			// backend answers 404 `NEWS_NOT_FOUND` for an unknown ID and 403
			// `FORBIDDEN` for an article that belongs to somebody else.
			setMissing(errorStatus(caught) === 404 || isForbidden(caught))
			setLoadError(errorMessage(caught, "بارگذاری خبر انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [handleExpiredSession, newsId])

	useEffect(() => {
		void load()
	}, [load])

	if (loading) {
		return (
			<p role="status" className="text-sm text-muted-dark">
				در حال بارگذاری…
			</p>
		)
	}

	if (loadError) {
		return (
			<div className="rounded-md border border-border p-6">
				<p className="text-base font-bold text-ink">
					{missing ? "این خبر در دسترس شما نیست" : "بارگذاری انجام نشد"}
				</p>
				<p className="mt-3 text-sm leading-7 text-muted-dark">{loadError}</p>

				<div className="mt-5 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void load()}
						className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
					>
						تلاش دوباره
					</button>
					<Link
						href="/admin"
						className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
					>
						بازگشت به داشبورد
					</Link>
				</div>
			</div>
		)
	}

	const readOnlyReason = article ? editingBlockedReason(user, article) : null
	const readOnly = article ? !canEditNews(user, article) : false
	const createdAt = article ? formatJalaliDateTime(article.createdAt) : null
	const updatedAt = article ? formatJalaliDateTime(article.updatedAt) : null

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-extrabold tracking-headline text-ink">
						{article ? "ویرایش خبر" : "خبر تازه"}
					</h1>
					{article ? (
						<p className="mt-2 text-xs text-muted-dark">
							ساخته شده: {createdAt ?? "—"}
							<span className="mx-2 text-border-strong">|</span>
							آخرین به‌روزرسانی: {updatedAt ?? "—"}
						</p>
					) : (
						<p className="mt-2 text-sm leading-7 text-muted-dark">
							پس از ذخیره، خبر در وضعیت پیش‌نویس ساخته می‌شود و صفحهٔ ویرایش آن باز می‌شود.
						</p>
					)}
				</div>

				<Link
					href="/admin"
					className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
				>
					بازگشت به داشبورد
				</Link>
			</div>

			{article ? (
				<StatusActions article={article} onChanged={setArticle} />
			) : null}

			<NewsForm
				article={article}
				categories={categories ?? []}
				readOnly={readOnly}
				readOnlyReason={readOnlyReason}
				onSaved={(saved, mode) => {
					setArticle(saved)

					if (mode === "create") {
						router.replace(`/admin/news/${saved.id}/edit`)
					}
				}}
			/>
		</div>
	)
}
