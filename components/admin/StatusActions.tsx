"use client"

import { useState } from "react"

import StatusBadge from "@/components/admin/StatusBadge"
import { useSession } from "@/components/admin/session"
import { errorMessage, isUnauthorized, SESSION_EXPIRED_MESSAGE } from "@/lib/errors"
import { changeNewsStatus } from "@/lib/news"
import { availableTransitions, STATUS_LABELS, TRANSITION_LABELS } from "@/lib/news-status"
import { formatJalaliDateTime } from "@/lib/format"
import type { AdminNewsItem, NewsStatus } from "@/types/news"

/**
 * Workflow controls for one article.
 *
 * WHAT THE BACKEND ACTUALLY ALLOWS (`news.admin.routes.ts` +
 * `news.policy.ts`), which is what this component offers — nothing more:
 *
 *   - `POST /admin/news/:id/status` is registered with
 *     `requireRole('SUPER_ADMIN')`. A plain ADMIN therefore cannot change ANY
 *     status, not even "submit for review", so no such button is drawn for
 *     them. The note below says so instead of hiding the fact.
 *   - Only the transitions listed in the backend's own table are offered, and
 *     a same-state "change" is not a transition and is never offered.
 *
 * HIDING A BUTTON IS NOT A PERMISSION CHECK. The publish action is only drawn
 * for a SUPER_ADMIN as a UX convenience; the actual boundary is the role check
 * the backend performs on every request. Anyone who calls the endpoint
 * directly — with DevTools, curl, or a modified bundle — gets 403 `FORBIDDEN`
 * regardless of what this component rendered. Every refusal the backend sends
 * is shown here verbatim rather than being pre-empted or reworded.
 */
export default function StatusActions({
	article,
	onChanged,
}: {
	article: AdminNewsItem
	onChanged: (updated: AdminNewsItem) => void
}) {
	const { user } = useSession()
	const [pending, setPending] = useState<NewsStatus | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [done, setDone] = useState<string | null>(null)

	const transitions = availableTransitions(user, article.status)
	const publishedAt = formatJalaliDateTime(article.publishedAt)

	async function apply(status: NewsStatus) {
		if (pending) {
			return
		}

		setPending(status)
		setError(null)
		setDone(null)

		try {
			const updated = await changeNewsStatus(article.id, status)
			onChanged(updated)
			setDone(`وضعیت خبر به «${STATUS_LABELS[updated.status]}» تغییر کرد.`)
		} catch (caught) {
			// The backend's own refusal is the message — it names the allowed
			// targets, which is more useful than anything invented here.
			setError(
				isUnauthorized(caught)
					? SESSION_EXPIRED_MESSAGE
					: errorMessage(caught, "تغییر وضعیت انجام نشد."),
			)
		} finally {
			setPending(null)
		}
	}

	return (
		<section className="rounded-md border border-border p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold text-ink">وضعیت فعلی:</span>
					<StatusBadge status={article.status} />
				</div>

				{publishedAt ? (
					<p className="text-xs text-muted-dark">اولین انتشار: {publishedAt}</p>
				) : null}
			</div>

			{transitions.length > 0 ? (
				<div className="mt-4 flex flex-wrap gap-2">
					{transitions.map((status) => (
						<button
							key={status}
							type="button"
							disabled={pending !== null}
							onClick={() => void apply(status)}
							className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
								status === "PUBLISHED"
									? "bg-accent text-paper hover:opacity-90"
									: "border border-border text-ink hover:border-accent hover:text-accent"
							}`}
						>
							{pending === status ? "در حال انجام…" : TRANSITION_LABELS[status]}
						</button>
					))}
				</div>
			) : (
				<p className="mt-4 rounded-md bg-paper px-3 py-2.5 text-xs leading-6 text-muted-dark">
					{user.role === "SUPER_ADMIN"
						? "برای این وضعیت انتقال مجازی تعریف نشده است."
						: "تغییر وضعیت خبر — از جمله ارسال برای بازبینی و انتشار — در سرور فقط برای مدیر ارشد مجاز است؛ این محدودیت در بک‌اند اعمال می‌شود و قابل دور زدن از سمت مرورگر نیست."}
				</p>
			)}

			{error ? (
				<p role="alert" className="mt-3 text-xs leading-6 text-accent">
					{error}
				</p>
			) : null}

			{done ? (
				<p role="status" className="mt-3 text-xs leading-6 text-link">
					{done}
				</p>
			) : null}
		</section>
	)
}
