"use client"

import { useCallback, useEffect, useState } from "react"

import CommentForm from "./CommentForm"
import CommentList from "./CommentList"
import { errorMessage } from "@/lib/errors"
import { formatPersianNumber } from "@/lib/format"
import { listComments } from "@/lib/news"
import type { Comment } from "@/types/news"

const PAGE_SIZE = 20

/**
 * The comments block under an article.
 *
 * WHY THE LIST IS FETCHED IN THE BROWSER: the article page is statically
 * revalidated every 60 seconds. Rendering comments on the server would show a
 * reader a list that is up to a minute stale and, worse, would make a brand new
 * comment invisible until the next revalidation. Fetching here keeps the page
 * cacheable and the discussion live.
 *
 * The total also comes from the server response (`pagination.total`), never
 * from `comments.length`, so it stays right across pages.
 */
export default function CommentsSection({
	newsId,
	initialCount,
}: {
	newsId: string
	initialCount: number
}) {
	const [comments, setComments] = useState<Comment[]>([])
	const [total, setTotal] = useState(initialCount)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(false)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(
		async (targetPage: number) => {
			setLoading(true)
			setError(null)

			try {
				const result = await listComments(newsId, targetPage, PAGE_SIZE)

				setComments((current) =>
					targetPage === 1 ? result.items : [...current, ...result.items],
				)
				setTotal(result.pagination.total)
				setPage(result.pagination.page)
				setHasMore(result.pagination.page < result.pagination.totalPages)
			} catch (err) {
				setError(errorMessage(err, "خواندن نظرات انجام نشد."))
			} finally {
				setLoading(false)
			}
		},
		[newsId],
	)

	useEffect(() => {
		void load(1)
	}, [load])

	function handleCommentAdded(comment: Comment) {
		// Prepend: the API orders newest first.
		setComments((current) => [comment, ...current])
		setTotal((current) => current + 1)
	}

	return (
		<section className="mx-auto mt-12 w-full max-w-3xl border-t border-border pt-8">
			<h2 className="mb-6 text-xl font-bold tracking-headline text-ink">
				نظرات
				<span className="ms-2 text-sm font-normal text-muted">
					{formatPersianNumber(total)}
				</span>
			</h2>

			<CommentForm newsId={newsId} onCommentAdded={handleCommentAdded} />

			{error ? (
				<p className="mt-6 text-sm text-accent-strong">{error}</p>
			) : (
				<CommentList comments={comments} className="mt-6" />
			)}

			{loading ? (
				<p className="mt-4 text-sm text-muted">در حال بارگذاری…</p>
			) : null}

			{hasMore && !loading ? (
				<button
					type="button"
					onClick={() => void load(page + 1)}
					className="mt-6 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-paper"
				>
					نمایش نظرات بیشتر
				</button>
			) : null}
		</section>
	)
}
