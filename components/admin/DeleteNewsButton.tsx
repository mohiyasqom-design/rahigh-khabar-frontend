"use client"

import { useEffect, useId, useRef, useState } from "react"

import { useSession } from "@/components/admin/session"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { deleteNews } from "@/lib/news"
import { canDeleteNews } from "@/lib/news-status"
import type { AdminNewsItem } from "@/types/news"

/**
 * Group 1 — "delete article" with an explicit, irreversible-action confirmation.
 *
 * Renders nothing when the signed-in user may not delete this article (see
 * `canDeleteNews`); the backend enforces the same rule regardless.
 *
 * The dialog is a small in-page modal (no portal), so it stays inside the
 * admin theme wrapper and keeps the admin palette. Focus moves to «انصراف»
 * when it opens — the safe choice — and Escape closes it.
 */
export default function DeleteNewsButton({
	article,
	onDeleted,
	variant = "button",
}: {
	article: Pick<AdminNewsItem, "id" | "title" | "authorId" | "status">
	onDeleted: () => void
	/** `link` = compact text action for table rows. */
	variant?: "button" | "link"
}) {
	const { user, handleExpiredSession } = useSession()
	const titleId = useId()
	const descriptionId = useId()
	const cancelRef = useRef<HTMLButtonElement | null>(null)
	const [open, setOpen] = useState(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!open) return

		cancelRef.current?.focus()

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !busy) setOpen(false)
		}

		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [open, busy])

	if (!canDeleteNews(user, article)) {
		return null
	}

	async function confirmDelete() {
		setBusy(true)
		setError(null)

		try {
			await deleteNews(article.id)
			setOpen(false)
			onDeleted()
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "حذف خبر انجام نشد."))
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			<button
				type="button"
				onClick={() => {
					setError(null)
					setOpen(true)
				}}
				className={
					variant === "link"
						? "text-xs font-medium text-accent transition-opacity hover:opacity-80"
						: "rounded-md border border-accent/40 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/5"
				}
			>
				حذف خبر
			</button>

			{open ? (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
					onClick={(event) => {
						if (event.target === event.currentTarget && !busy) setOpen(false)
					}}
				>
					<div
						role="alertdialog"
						aria-modal="true"
						aria-labelledby={titleId}
						aria-describedby={descriptionId}
						className="w-full max-w-md rounded-md bg-white p-6 text-start shadow-xl"
					>
						<h2 id={titleId} className="text-lg font-bold text-ink">
							حذف همیشگی خبر
						</h2>

						<div id={descriptionId} className="mt-3 space-y-2 text-sm leading-7 text-muted-dark">
							<p>
								خبر «<span className="font-semibold text-ink">{article.title}</span>» برای همیشه حذف می‌شود.
							</p>
							<p className="font-semibold text-accent">
								این عمل غیرقابل بازگشت است: تصویر کاور و تصاویر آپلودشده در متن این خبر هم از سرور پاک می‌شوند
								(مگر آنکه خبر دیگری از همان تصویر استفاده کند). لایک‌ها، نظرها و آمار بازدید این خبر نیز حذف می‌شوند.
							</p>
						</div>

						{error ? (
							<p role="alert" className="mt-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
								{error}
							</p>
						) : null}

						<div className="mt-6 flex flex-wrap justify-end gap-2">
							<button
								ref={cancelRef}
								type="button"
								disabled={busy}
								onClick={() => setOpen(false)}
								className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-border-strong disabled:opacity-60"
							>
								انصراف
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => void confirmDelete()}
								className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{busy ? "در حال حذف…" : "بله، برای همیشه حذف شود"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</>
	)
}
