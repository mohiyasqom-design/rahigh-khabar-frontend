import { formatJalaliDateTime } from "@/lib/format"
import type { Comment } from "@/types/news"

/**
 * Read-only list of comments.
 *
 * `user.avatarUrl` and `user.username` are `string | null` here, matching the
 * backend response schema. The previous `avatarUrl?: string` shape made
 * `avatarUrl: null` a type error at every call site.
 */
export default function CommentList({
	comments,
	className = "",
}: {
	comments: Comment[]
	className?: string
}) {
	if (comments.length === 0) {
		return (
			<p className={`text-sm text-muted-dark ${className}`}>
				هنوز نظری ثبت نشده است. اولین نفر باشید.
			</p>
		)
	}

	return (
		<ul className={`space-y-4 ${className}`}>
			{comments.map((comment) => {
				const timestamp = formatJalaliDateTime(comment.createdAt)

				return (
					<li
						key={comment.id}
						className="rounded-md border border-border/60 bg-white p-4"
					>
						<div className="mb-2 flex items-center gap-2">
							{comment.user.avatarUrl ? (
								/* Google avatar hosts are not configured in next.config.ts
								   remotePatterns, so next/image would fail at runtime. */
								/* eslint-disable-next-line @next/next/no-img-element */
								<img
									src={comment.user.avatarUrl}
									alt=""
									width={32}
									height={32}
									className="h-8 w-8 rounded-full object-cover"
									referrerPolicy="no-referrer"
								/>
							) : (
								<span
									aria-hidden="true"
									className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-xs text-muted-dark"
								>
									{comment.user.displayName.slice(0, 1)}
								</span>
							)}

							<div>
								<p className="text-sm font-semibold text-ink">
									{comment.user.displayName}
									{comment.user.username ? (
										<span
											dir="ltr"
											className="ms-2 text-xs font-normal text-muted"
										>
											@{comment.user.username}
										</span>
									) : null}
								</p>
								{timestamp ? (
									<time
										dateTime={comment.createdAt}
										className="text-xs text-muted"
									>
										{timestamp}
									</time>
								) : null}
							</div>
						</div>

						{/* Plain text: the backend strips all markup from comments. */}
						<p className="whitespace-pre-line text-sm leading-7 text-ink">
							{comment.content}
						</p>
					</li>
				)
			})}
		</ul>
	)
}
