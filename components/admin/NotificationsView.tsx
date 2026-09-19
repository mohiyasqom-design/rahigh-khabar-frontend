"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"

import { useSession } from "@/components/admin/session"
import { broadcastPush, getPushStatus } from "@/lib/admin-resources"
import { getAdminCategories } from "@/lib/categories"
import { errorCode, errorMessage, isUnauthorized } from "@/lib/errors"
import { formatPersianNumber } from "@/lib/format"
import type { Category } from "@/types/category"
import {
	PUSH_BROADCAST_LIMITS,
	type PushDeliveryReport,
	type PushStatus,
} from "@/types/push"

/**
 * The notifications screen: subscriber status plus a manual Web Push send.
 *
 * TARGETED SENDS ARE REAL, NOT DECORATIVE: choosing a category makes the
 * backend deliver only to visitors who FOLLOW that category, using the same
 * audience query the automatic "new article published" announcement uses.
 * Leaving it on «همه» reaches every stored subscription, including anonymous
 * ones that belong to no account.
 *
 * WHEN PUSH IS NOT CONFIGURED the backend answers 503 `PUSH_NOT_CONFIGURED`
 * because `VAPID_*` is unset. That is an environment fact, not a user error,
 * so the form is disabled with an explanation instead of failing on submit.
 */
export default function NotificationsView() {
	const { handleExpiredSession } = useSession()
	const [status, setStatus] = useState<PushStatus | null>(null)
	const [categories, setCategories] = useState<Category[]>([])
	const [title, setTitle] = useState("")
	const [body, setBody] = useState("")
	const [url, setUrl] = useState("")
	const [categoryId, setCategoryId] = useState("")
	const [loading, setLoading] = useState(true)
	const [sending, setSending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [report, setReport] = useState<PushDeliveryReport | null>(null)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			setStatus(await getPushStatus())
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "دریافت وضعیت اعلان‌ها انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [handleExpiredSession])

	useEffect(() => {
		void load()
	}, [load])

	useEffect(() => {
		let cancelled = false

		void getAdminCategories()
			.then((list) => {
				if (!cancelled) {
					setCategories(list)
				}
			})
			.catch(() => undefined)

		return () => {
			cancelled = true
		}
	}, [])

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (sending) {
			return
		}

		const cleanTitle = title.trim()
		const cleanBody = body.trim()
		const cleanUrl = url.trim()

		if (
			cleanTitle.length < PUSH_BROADCAST_LIMITS.titleMin ||
			cleanTitle.length > PUSH_BROADCAST_LIMITS.titleMax
		) {
			setError(
				`عنوان باید بین ${PUSH_BROADCAST_LIMITS.titleMin} تا ${PUSH_BROADCAST_LIMITS.titleMax} نویسه باشد.`,
			)
			return
		}

		if (
			cleanBody.length < PUSH_BROADCAST_LIMITS.bodyMin ||
			cleanBody.length > PUSH_BROADCAST_LIMITS.bodyMax
		) {
			setError(
				`متن باید بین ${PUSH_BROADCAST_LIMITS.bodyMin} تا ${PUSH_BROADCAST_LIMITS.bodyMax} نویسه باشد.`,
			)
			return
		}

		setSending(true)
		setError(null)
		setReport(null)

		try {
			const result = await broadcastPush({
				title: cleanTitle,
				body: cleanBody,
				// Strict schema: empty strings would be rejected, so optional fields
				// are omitted entirely when unused.
				...(cleanUrl ? { url: cleanUrl } : {}),
				...(categoryId ? { categoryId } : {}),
			})

			setReport(result)
			setTitle("")
			setBody("")
			setUrl("")
			await load()
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(
				errorCode(caught) === "PUSH_NOT_CONFIGURED"
					? "اعلان روی این سرور فعال نیست؛ کلیدهای VAPID تنظیم نشده‌اند."
					: errorMessage(caught, "ارسال اعلان انجام نشد."),
			)
		} finally {
			setSending(false)
		}
	}

	const enabled = status?.enabled ?? false
	const fieldClass =
		"mt-2 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent disabled:bg-paper"
	const labelClass = "block text-sm font-semibold text-ink"

	return (
		<section>
			<h1 className="text-xl font-extrabold tracking-headline text-ink">اعلان‌ها</h1>
			<p className="mt-1 max-w-2xl text-sm leading-7 text-muted-dark">
				اعلان مرورگری (Web Push) برای کاربرانی که اجازه داده‌اند. هنگام انتشار هر خبر
				تازه، اعلان به‌صورت خودکار برای دنبال‌کنندگان همان دسته‌بندی ارسال می‌شود؛ فرم زیر
				برای ارسال دستی است.
			</p>

			<div className="mt-5 grid gap-3 sm:grid-cols-2">
				<div className="rounded-md border border-border bg-white p-4">
					<p className="text-xs text-muted-dark">وضعیت سرویس</p>
					<p className="mt-1 text-sm font-semibold text-ink">
						{loading ? "در حال بررسی…" : enabled ? "فعال" : "غیرفعال (کلید VAPID تنظیم نشده)"}
					</p>
				</div>

				<div className="rounded-md border border-border bg-white p-4">
					<p className="text-xs text-muted-dark">تعداد مشترکان</p>
					<p className="mt-1 text-sm font-semibold text-ink">
						{status ? formatPersianNumber(status.subscribers) : "—"}
					</p>
				</div>
			</div>

			{error ? (
				<p
					role="alert"
					className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent"
				>
					{error}
				</p>
			) : null}

			{report ? (
				<p
					role="status"
					className="mt-5 rounded-md border border-link/30 bg-link/5 px-3 py-2.5 text-sm leading-7 text-link"
				>
					ارسال شد: {formatPersianNumber(report.sent)} · ناموفق:{" "}
					{formatPersianNumber(report.failed)} · اشتراک منقضی‌شدهٔ حذف‌شده:{" "}
					{formatPersianNumber(report.removed)}
				</p>
			) : null}

			<form onSubmit={submit} noValidate className="mt-5 space-y-4 rounded-md border border-border bg-white p-4">
				<div>
					<label htmlFor="push-title" className={labelClass}>
						عنوان <span className="text-accent">*</span>
					</label>
					<input
						id="push-title"
						type="text"
						maxLength={PUSH_BROADCAST_LIMITS.titleMax}
						value={title}
						disabled={!enabled || sending}
						onChange={(event) => setTitle(event.target.value)}
						className={fieldClass}
					/>
				</div>

				<div>
					<label htmlFor="push-body" className={labelClass}>
						متن اعلان <span className="text-accent">*</span>
					</label>
					<textarea
						id="push-body"
						rows={3}
						maxLength={PUSH_BROADCAST_LIMITS.bodyMax}
						value={body}
						disabled={!enabled || sending}
						onChange={(event) => setBody(event.target.value)}
						className={fieldClass}
					/>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<label htmlFor="push-url" className={labelClass}>
							نشانی مقصد (اختیاری)
						</label>
						<input
							id="push-url"
							type="text"
							dir="ltr"
							maxLength={PUSH_BROADCAST_LIMITS.urlMax}
							placeholder="/news/example-slug"
							value={url}
							disabled={!enabled || sending}
							onChange={(event) => setUrl(event.target.value)}
							className={`${fieldClass} text-start`}
						/>
					</div>

					<div>
						<label htmlFor="push-category" className={labelClass}>
							مخاطبان
						</label>
						<select
							id="push-category"
							value={categoryId}
							disabled={!enabled || sending}
							onChange={(event) => setCategoryId(event.target.value)}
							className={fieldClass}
						>
							<option value="">همهٔ مشترکان</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									دنبال‌کنندگان «{category.name}»
								</option>
							))}
						</select>
					</div>
				</div>

				<button
					type="submit"
					disabled={!enabled || sending}
					className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{sending ? "در حال ارسال…" : "ارسال اعلان"}
				</button>

				{!enabled && !loading ? (
					<p className="text-xs leading-6 text-muted-dark">
						برای فعال‌شدن اعلان، متغیرهای VAPID_PUBLIC_KEY، VAPID_PRIVATE_KEY و VAPID_SUBJECT باید روی
						سرور تنظیم شوند.
					</p>
				) : null}
			</form>
		</section>
	)
}
