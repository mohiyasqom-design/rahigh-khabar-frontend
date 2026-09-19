"use client"

import { useEffect, useState } from "react"

import { googleLoginUrl } from "@/lib/auth"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { formatPersianNumber } from "@/lib/format"
import { getLikeState, toggleLike } from "@/lib/news"

/**
 * Like/unlike control for one article.
 *
 * TWO RULES THAT THE PREVIOUS VERSION BROKE:
 *
 * 1. THE COUNT ALWAYS COMES FROM THE SERVER. It used to do `count + 1` /
 *    `count - 1`, which drifts as soon as anyone else likes the article, and
 *    could even render a negative number after a double click.
 * 2. `liked` IS NEVER TAKEN FROM THE PAGE PAYLOAD. The article page is
 *    statically revalidated (`revalidate = 60`), so any per-visitor flag baked
 *    into it would be served to every reader. The initial count is fine as a
 *    first paint value; the personal state is read once after mount from
 *    `GET /news/:id/likes`.
 */
export default function LikeButton({
	newsId,
	initialCount,
}: {
	newsId: string
	initialCount: number
}) {
	const [liked, setLiked] = useState(false)
	const [count, setCount] = useState(initialCount)
	const [pending, setPending] = useState(false)
	const [needsLogin, setNeedsLogin] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		getLikeState(newsId)
			.then((state) => {
				if (cancelled) return
				setLiked(state.liked)
				setCount(state.likesCount)
			})
			.catch(() => {
				// Keep the server-rendered count rather than showing a wrong one.
			})

		return () => {
			cancelled = true
		}
	}, [newsId])

	async function handleToggle() {
		setPending(true)
		setError(null)

		try {
			const state = await toggleLike(newsId)
			setLiked(state.liked)
			setCount(state.likesCount)
			setNeedsLogin(false)
		} catch (err) {
			if (isUnauthorized(err)) {
				setNeedsLogin(true)
			} else {
				setError(errorMessage(err, "ثبت پسند انجام نشد؛ دوباره تلاش کنید."))
			}
		} finally {
			setPending(false)
		}
	}

	const loginUrl = googleLoginUrl()

	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				onClick={handleToggle}
				disabled={pending}
				aria-pressed={liked}
				className={`flex w-fit items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
					liked
						? "bg-accent/10 text-accent hover:bg-accent/20"
						: "bg-border/50 text-ink hover:bg-border"
				} disabled:cursor-not-allowed disabled:opacity-60`}
			>
				<HeartIcon filled={liked} />
				<span>{liked ? "پسندیدید" : "پسند"}</span>
				<span className="text-xs text-muted-dark">
					{formatPersianNumber(count)}
				</span>
			</button>

			{needsLogin ? (
				<p className="text-xs text-muted-dark">
					برای پسند کردن باید وارد شوید.{" "}
					{loginUrl ? (
						<a href={loginUrl} className="text-link underline">
							ورود با گوگل
						</a>
					) : null}
				</p>
			) : null}

			{error ? <p className="text-xs text-accent">{error}</p> : null}
		</div>
	)
}

function HeartIcon({ filled }: { filled: boolean }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill={filled ? "currentColor" : "none"}
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden="true"
		>
			<path d="M12 20s-7-4.6-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7C19 15.4 12 20 12 20Z" />
		</svg>
	)
}
