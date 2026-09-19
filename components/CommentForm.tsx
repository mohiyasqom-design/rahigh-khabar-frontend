"use client"

import { useState } from "react"

import { googleLoginUrl } from "@/lib/auth"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { formatPersianNumber } from "@/lib/format"
import { createComment } from "@/lib/news"
import type { Comment } from "@/types/news"

/** Mirrors the backend's `COMMENT_MAX_LENGTH`. */
const MAX_LENGTH = 1000

export default function CommentForm({
	newsId,
	onCommentAdded,
}: {
	newsId: string
	/** Typed, not `any`: the parent prepends the real comment the server created. */
	onCommentAdded: (comment: Comment) => void
}) {
	const [content, setContent] = useState("")
	const [pending, setPending] = useState(false)
	const [needsLogin, setNeedsLogin] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()

		const trimmed = content.trim()
		if (trimmed.length === 0) return

		setPending(true)
		setError(null)

		try {
			const comment = await createComment(newsId, trimmed)
			onCommentAdded(comment)
			setContent("")
			setNeedsLogin(false)
		} catch (err) {
			if (isUnauthorized(err)) {
				setNeedsLogin(true)
			} else {
				setError(errorMessage(err, "ثبت نظر انجام نشد؛ دوباره تلاش کنید."))
			}
		} finally {
			setPending(false)
		}
	}

	const loginUrl = googleLoginUrl()
	const remaining = MAX_LENGTH - content.length

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			<label htmlFor="comment-content" className="sr-only">
				متن نظر
			</label>
			<textarea
				id="comment-content"
				name="content"
				value={content}
				onChange={(event) => setContent(event.target.value)}
				maxLength={MAX_LENGTH}
				disabled={pending}
				placeholder="نظر خود را بنویسید…"
				rows={3}
				className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted disabled:bg-paper"
			/>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-xs text-muted">
					{formatPersianNumber(remaining)} نویسهٔ باقی‌مانده
				</span>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setContent("")}
						disabled={pending || content.length === 0}
						className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
					>
						لغو
					</button>
					<button
						type="submit"
						disabled={pending || content.trim().length === 0}
						className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{pending ? "در حال ارسال…" : "ارسال"}
					</button>
				</div>
			</div>

			{needsLogin ? (
				<p className="text-xs text-muted-dark">
					برای ثبت نظر باید وارد شوید.{" "}
					{loginUrl ? (
						<a href={loginUrl} className="text-link underline">
							ورود با گوگل
						</a>
					) : null}
				</p>
			) : null}

			{error ? <p className="text-xs text-accent">{error}</p> : null}
		</form>
	)
}
