"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"

import CoverImagePicker, {
	type CoverSelection,
} from "@/components/admin/CoverImagePicker"
import RichEditor from "@/components/admin/RichEditor"
import { errorMessage, isUnauthorized, SESSION_EXPIRED_MESSAGE } from "@/lib/errors"
import { createNews, updateNews } from "@/lib/news"
import type { Category } from "@/types/category"
import {
	NEWS_FIELD_LIMITS,
	NEWS_SLUG_PATTERN,
	type AdminNewsItem,
	type NewsUpdateInput,
	type NewsWriteInput,
} from "@/types/news"

/**
 * The article editor — one form for both `POST /admin/news` and
 * `PATCH /admin/news/:id`.
 *
 * SHAPED BY THE REAL SCHEMAS (`news.schema.ts`), not by guesswork:
 *   - the fields below are exactly the ones `createNewsSchema` accepts. That
 *     schema is `.strict()`, so sending anything else — `status`, `authorId`,
 *     `publishedAt` — would be a 400, which is why the editor cannot set them.
 *   - `maxLength` on every input mirrors the backend's own limits, and the
 *     same limits are re-checked before sending so the editor gets a Persian
 *     message instead of a round-trip.
 *   - at least one category is required (`categoryIds` is `min(1)`), so the
 *     multi-select is a required field, not a nicety.
 *   - a PATCH must carry at least one field, so only CHANGED fields are sent
 *     and an unchanged form does not call the API at all.
 *
 * BODY IS PLAIN TEXT. The backend stores `body` as an unsanitised `String` and
 * declares no markup format, and the public page renders it as text. A rich
 * text editor here would produce markup that the site would then show as
 * literal characters, so the body is a plain textarea — deliberately.
 *
 * NO CONCURRENCY CONTROL EXISTS. The backend has no version field, accepts no
 * `If-Match`, and does not compare `updatedAt` on write, so two editors saving
 * the same article overwrite each other silently (last write wins). Nothing
 * here can fix that from the client side; the note under the form states it
 * instead of faking a protection that does not exist.
 */
interface FormValues {
	title: string
	slug: string
	summary: string
	lead: string
	body: string
	categoryIds: string[]
	seoTitle: string
	metaDescription: string
	/**
	 * Stage 10 Part 5. The raw value of an `<input type="datetime-local">`,
	 * i.e. `YYYY-MM-DDTHH:mm` in the browser's own time zone, NOT an ISO
	 * instant. It is converted on the way out by `toIsoWithOffset`.
	 */
	scheduledFor: string
}

/**
 * `datetime-local` has no time zone, while the backend schema is
 * `.datetime({ offset: true })` and rejects a bare local string. These two
 * helpers are the only place the conversion happens.
 *
 * The offset is taken from the value itself (`getTimezoneOffset` of that exact
 * date), not from "now", so a time scheduled across a DST boundary still means
 * the wall-clock moment the editor typed.
 */
function toLocalInput(iso: string | null): string {
	if (!iso) {
		return ""
	}

	const date = new Date(iso)

	if (Number.isNaN(date.getTime())) {
		return ""
	}

	const pad = (value: number) => String(value).padStart(2, "0")

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
		date.getHours(),
	)}:${pad(date.getMinutes())}`
}

function toIsoWithOffset(localValue: string): string | null {
	const trimmed = localValue.trim()

	if (!trimmed) {
		return null
	}

	const date = new Date(trimmed)

	if (Number.isNaN(date.getTime())) {
		return null
	}

	const pad = (value: number) => String(value).padStart(2, "0")
	const offsetMinutes = -date.getTimezoneOffset()
	const sign = offsetMinutes >= 0 ? "+" : "-"
	const absolute = Math.abs(offsetMinutes)

	return (
		`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
		`T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
		`${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
	)
}

function valuesOf(article: AdminNewsItem | null): FormValues {
	return {
		title: article?.title ?? "",
		slug: article?.slug ?? "",
		summary: article?.summary ?? "",
		lead: article?.lead ?? "",
		body: article?.body ?? "",
		categoryIds: article ? article.categories.map((category) => category.id) : [],
		seoTitle: article?.seoTitle ?? "",
		metaDescription: article?.metaDescription ?? "",
		scheduledFor: toLocalInput(article?.scheduledFor ?? null),
	}
}

function coverOf(article: AdminNewsItem | null): CoverSelection | null {
	if (!article?.coverImageId || !article.coverImage) {
		return null
	}

	return {
		id: article.coverImageId,
		url: article.coverImage.url,
		altText: article.coverImage.altText,
		width: article.coverImage.width,
		height: article.coverImage.height,
	}
}

/** Empty string means "no value"; the backend takes null to clear a field. */
function orNull(value: string): string | null {
	const trimmed = value.trim()
	return trimmed === "" ? null : trimmed
}

export default function NewsForm({
	article,
	categories,
	readOnly,
	readOnlyReason,
	onSaved,
}: {
	/** Null in create mode. */
	article: AdminNewsItem | null
	categories: Category[]
	readOnly: boolean
	readOnlyReason: string | null
	onSaved: (saved: AdminNewsItem, mode: "create" | "update") => void
}) {
	const initial = useMemo(() => valuesOf(article), [article])
	const initialCover = useMemo(() => coverOf(article), [article])

	const [values, setValues] = useState<FormValues>(initial)
	const [cover, setCover] = useState<CoverSelection | null>(initialCover)
	const [orphanUploadId, setOrphanUploadId] = useState<string | null>(null)
	const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
	const [saving, setSaving] = useState(false)
	const [failure, setFailure] = useState<string | null>(null)
	const [sessionLost, setSessionLost] = useState(false)
	const [notice, setNotice] = useState<string | null>(null)

	// Re-seed when the loaded article changes (e.g. after a status transition
	// returns a fresh copy of the record).
	useEffect(() => {
		setValues(initial)
		setCover(initialCover)
	}, [initial, initialCover])

	const dirty =
		JSON.stringify(values) !== JSON.stringify(initial) ||
		(cover?.id ?? null) !== (initialCover?.id ?? null)

	// Only a full page unload can be intercepted. In-app navigation between
	// admin pages is NOT blocked — the App Router exposes no supported hook for
	// that — so this guard is honest about being partial.
	useEffect(() => {
		if (!dirty || readOnly) {
			return
		}

		function warn(event: BeforeUnloadEvent) {
			event.preventDefault()
			event.returnValue = ""
		}

		window.addEventListener("beforeunload", warn)
		return () => window.removeEventListener("beforeunload", warn)
	}, [dirty, readOnly])

	function setField<TKey extends keyof FormValues>(key: TKey, value: FormValues[TKey]) {
		setValues((current) => ({ ...current, [key]: value }))
		setNotice(null)
	}

	function toggleCategory(id: string) {
		setValues((current) => ({
			...current,
			categoryIds: current.categoryIds.includes(id)
				? current.categoryIds.filter((value) => value !== id)
				: [...current.categoryIds, id],
		}))
		setNotice(null)
	}

	/** Mirrors the backend validation so the editor is warned before a 400. */
	function validate(): boolean {
		const found: Partial<Record<keyof FormValues, string>> = {}
		const title = values.title.trim()
		const slug = values.slug.trim()
		const lead = values.lead.trim()
		const body = values.body.trim()

		if (!title) {
			found.title = "عنوان الزامی است."
		} else if (title.length > NEWS_FIELD_LIMITS.title) {
			found.title = `عنوان حداکثر ${NEWS_FIELD_LIMITS.title} نویسه می‌تواند باشد.`
		}

		if (!slug) {
			found.slug = "نامک (آدرس یکتا) الزامی است."
		} else if (!NEWS_SLUG_PATTERN.test(slug)) {
			found.slug =
				"نامک فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیرهٔ میانی باشد (مثل rahigh-news-1)."
		} else if (slug.length > NEWS_FIELD_LIMITS.slug) {
			found.slug = `نامک حداکثر ${NEWS_FIELD_LIMITS.slug} نویسه می‌تواند باشد.`
		}

		if (!lead) {
			found.lead = "لید خبر الزامی است."
		} else if (lead.length > NEWS_FIELD_LIMITS.lead) {
			found.lead = `لید حداکثر ${NEWS_FIELD_LIMITS.lead} نویسه می‌تواند باشد.`
		}

		if (!body) {
			found.body = "متن خبر الزامی است."
		} else if (body.length > NEWS_FIELD_LIMITS.body) {
			found.body = "متن خبر بیش از حد مجاز است."
		}

		if (values.categoryIds.length === 0) {
			found.categoryIds = "دست‌کم یک دسته‌بندی انتخاب کنید."
		} else if (values.categoryIds.length > NEWS_FIELD_LIMITS.categories) {
			found.categoryIds = `حداکثر ${NEWS_FIELD_LIMITS.categories} دسته‌بندی مجاز است.`
		}

		if (values.summary.trim().length > NEWS_FIELD_LIMITS.summary) {
			found.summary = `خلاصه حداکثر ${NEWS_FIELD_LIMITS.summary} نویسه می‌تواند باشد.`
		}

		if (values.seoTitle.trim().length > NEWS_FIELD_LIMITS.seoTitle) {
			found.seoTitle = `عنوان سئو حداکثر ${NEWS_FIELD_LIMITS.seoTitle} نویسه می‌تواند باشد.`
		}

		if (values.metaDescription.trim().length > NEWS_FIELD_LIMITS.metaDescription) {
			found.metaDescription = `توضیح متا حداکثر ${NEWS_FIELD_LIMITS.metaDescription} نویسه می‌تواند باشد.`
		}

		setErrors(found)
		return Object.keys(found).length === 0
	}

	/** Only the fields that actually changed, for a minimal PATCH. */
	function changedFields(): NewsUpdateInput {
		const patch: NewsUpdateInput = {}

		if (values.title.trim() !== initial.title.trim()) {
			patch.title = values.title.trim()
		}

		if (values.slug.trim() !== initial.slug.trim()) {
			patch.slug = values.slug.trim()
		}

		if (values.summary.trim() !== initial.summary.trim()) {
			patch.summary = orNull(values.summary)
		}

		if (values.lead.trim() !== initial.lead.trim()) {
			patch.lead = values.lead.trim()
		}

		if (values.body !== initial.body) {
			patch.body = values.body
		}

		const sameCategories =
			values.categoryIds.length === initial.categoryIds.length &&
			values.categoryIds.every((id) => initial.categoryIds.includes(id))

		if (!sameCategories) {
			patch.categoryIds = values.categoryIds
		}

		if ((cover?.id ?? null) !== (initialCover?.id ?? null)) {
			patch.coverImageId = cover?.id ?? null
		}

		if (values.seoTitle.trim() !== initial.seoTitle.trim()) {
			patch.seoTitle = orNull(values.seoTitle)
		}

		if (values.metaDescription.trim() !== initial.metaDescription.trim()) {
			patch.metaDescription = orNull(values.metaDescription)
		}

		// Scheduling is a normal field of the write schema, not a status action:
		// setting it moves a DRAFT/IN_REVIEW/REJECTED article to SCHEDULED, and
		// sending null on a SCHEDULED article sends it back to DRAFT. Both of
		// those transitions happen in the backend, so the form only sends the
		// value and re-renders from the response.
		if (values.scheduledFor !== initial.scheduledFor) {
			patch.scheduledFor = toIsoWithOffset(values.scheduledFor)
		}

		return patch
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (saving || readOnly) {
			return
		}

		setFailure(null)
		setNotice(null)
		setSessionLost(false)

		if (!validate()) {
			setFailure("فرم کامل نیست؛ موارد مشخص‌شده را اصلاح کنید.")
			return
		}

		setSaving(true)

		try {
			if (article) {
				const patch = changedFields()

				if (Object.keys(patch).length === 0) {
					// A PATCH with no fields is a 400 on the backend, so it is not sent.
					setNotice("تغییری برای ذخیره وجود ندارد.")
					return
				}

				const saved = await updateNews(article.id, patch)
				setOrphanUploadId(null)
				setNotice("تغییرات ذخیره شد.")
				onSaved(saved, "update")
				return
			}

			const payload: NewsWriteInput = {
				title: values.title.trim(),
				slug: values.slug.trim(),
				summary: orNull(values.summary),
				lead: values.lead.trim(),
				body: values.body,
				categoryIds: values.categoryIds,
				coverImageId: cover?.id ?? null,
				seoTitle: orNull(values.seoTitle),
				metaDescription: orNull(values.metaDescription),
				scheduledFor: toIsoWithOffset(values.scheduledFor),
			}

			const created = await createNews(payload)
			setOrphanUploadId(null)
			onSaved(created, "create")
		} catch (caught) {
			if (isUnauthorized(caught)) {
				// No automatic redirect: the typed text would be lost. The editor is
				// told what happened and can sign in again in another tab.
				setSessionLost(true)
				setFailure(SESSION_EXPIRED_MESSAGE)
			} else {
				setFailure(errorMessage(caught, "ذخیرهٔ خبر انجام نشد."))
			}
		} finally {
			setSaving(false)
		}
	}

	const fieldClass =
		"mt-2 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm leading-7 text-ink outline-none transition-colors focus:border-accent disabled:bg-paper disabled:text-muted-dark"
	const labelClass = "block text-sm font-semibold text-ink"
	const errorClass = "mt-1.5 block text-xs text-accent"

	return (
		<form onSubmit={handleSubmit} noValidate className="space-y-6">
			{readOnly && readOnlyReason ? (
				<p
					role="status"
					className="rounded-md border border-border-strong bg-paper px-3 py-2.5 text-sm leading-7 text-muted-dark"
				>
					{readOnlyReason} فرم فقط خواندنی است.
				</p>
			) : null}

			<div className="grid gap-5 md:grid-cols-2">
				<div className="md:col-span-2">
					<label htmlFor="title" className={labelClass}>
						عنوان خبر <span className="text-accent">*</span>
					</label>
					<input
						id="title"
						type="text"
						maxLength={NEWS_FIELD_LIMITS.title}
						value={values.title}
						disabled={readOnly || saving}
						onChange={(event) => setField("title", event.target.value)}
						className={fieldClass}
					/>
					{errors.title ? <span className={errorClass}>{errors.title}</span> : null}
				</div>

				<div className="md:col-span-2">
					<label htmlFor="slug" className={labelClass}>
						نامک آدرس (slug) <span className="text-accent">*</span>
					</label>
					<input
						id="slug"
						type="text"
						dir="ltr"
						maxLength={NEWS_FIELD_LIMITS.slug}
						value={values.slug}
						disabled={readOnly || saving}
						onChange={(event) => setField("slug", event.target.value)}
						className={`${fieldClass} text-start`}
					/>
					<span className="mt-1.5 block text-xs text-muted-dark">
						نشانی صفحهٔ خبر از همین مقدار ساخته می‌شود و باید یکتا باشد. سرور فقط حروف کوچک انگلیسی، عدد و خط تیره می‌پذیرد، بنابراین از روی عنوان فارسی به‌صورت خودکار ساخته نمی‌شود.
					</span>
					{errors.slug ? <span className={errorClass}>{errors.slug}</span> : null}
				</div>

				<div className="md:col-span-2">
					<label htmlFor="lead" className={labelClass}>
						لید <span className="text-accent">*</span>
					</label>
					<textarea
						id="lead"
						rows={3}
						maxLength={NEWS_FIELD_LIMITS.lead}
						value={values.lead}
						disabled={readOnly || saving}
						onChange={(event) => setField("lead", event.target.value)}
						className={fieldClass}
					/>
					{errors.lead ? <span className={errorClass}>{errors.lead}</span> : null}
				</div>

				<div className="md:col-span-2">
					<label htmlFor="summary" className={labelClass}>
						خلاصه (اختیاری)
					</label>
					<textarea
						id="summary"
						rows={2}
						maxLength={NEWS_FIELD_LIMITS.summary}
						value={values.summary}
						disabled={readOnly || saving}
						onChange={(event) => setField("summary", event.target.value)}
						className={fieldClass}
					/>
					{errors.summary ? <span className={errorClass}>{errors.summary}</span> : null}
				</div>

				<div className="md:col-span-2">
					<label htmlFor="body" className={labelClass}>
						متن خبر <span className="text-accent">*</span>
					</label>
					<RichEditor 
						value={values.body}
						onChange={(html) => setField("body", html)}
					/>
					{errors.body ? <span className={errorClass}>{errors.body}</span> : null}
				</div>
			</div>

			<fieldset className="rounded-md border border-border p-4">
				<legend className="px-1 text-sm font-semibold text-ink">
					دسته‌بندی‌ها <span className="text-accent">*</span>
				</legend>

				{categories.length === 0 ? (
					<p className="text-xs leading-6 text-accent">
						فهرست دسته‌بندی‌ها از سرور خالی برگشت. ده دستهٔ رسمی سایت با migration مرحلهٔ ۱۰ در دیتابیس ساخته می‌شوند، پس این حالت یعنی آن migration روی این محیط اجرا نشده است. چون هر خبر دست‌کم به یک دسته‌بندی نیاز دارد، تا آن زمان ذخیره ممکن نیست. ساخت و ویرایش دسته‌بندی در این پنل وجود ندارد و فقط مدیر ارشد از طریق API انجام می‌دهد.
					</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{categories.map((category) => {
							const selected = values.categoryIds.includes(category.id)

							return (
								<label
									key={category.id}
									className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
										selected
											? "border-accent bg-accent/10 text-accent"
											: "border-border text-ink hover:border-border-strong"
									} ${readOnly || saving ? "cursor-not-allowed opacity-60" : ""}`}
								>
									<input
										type="checkbox"
										className="sr-only"
										checked={selected}
										disabled={readOnly || saving}
										onChange={() => toggleCategory(category.id)}
									/>
									{category.name}
								</label>
							)
						})}
					</div>
				)}

				{errors.categoryIds ? (
					<span className={errorClass}>{errors.categoryIds}</span>
				) : null}
			</fieldset>

			<CoverImagePicker
				value={cover}
				disabled={readOnly || saving}
				onChange={(selection, uploadedNow) => {
					setCover(selection)
					setNotice(null)

					if (uploadedNow && selection) {
						setOrphanUploadId(selection.id)
					}
				}}
			/>

			<div className="grid gap-5 md:grid-cols-2">
				<div>
					<label htmlFor="seoTitle" className={labelClass}>
						عنوان سئو (اختیاری)
					</label>
					<input
						id="seoTitle"
						type="text"
						maxLength={NEWS_FIELD_LIMITS.seoTitle}
						value={values.seoTitle}
						disabled={readOnly || saving}
						onChange={(event) => setField("seoTitle", event.target.value)}
						className={fieldClass}
					/>
					{errors.seoTitle ? <span className={errorClass}>{errors.seoTitle}</span> : null}
				</div>

				<div>
					<label htmlFor="metaDescription" className={labelClass}>
						توضیح متا (اختیاری)
					</label>
					<input
						id="metaDescription"
						type="text"
						maxLength={NEWS_FIELD_LIMITS.metaDescription}
						value={values.metaDescription}
						disabled={readOnly || saving}
						onChange={(event) => setField("metaDescription", event.target.value)}
						className={fieldClass}
					/>
					{errors.metaDescription ? (
						<span className={errorClass}>{errors.metaDescription}</span>
					) : null}
				</div>
			</div>

			{/* Stage 10 Part 5 — publication scheduling. */}
			<fieldset className="rounded-md border border-border p-4">
				<legend className="px-1 text-sm font-semibold text-ink">زمان‌بندی انتشار</legend>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<label htmlFor="scheduledFor" className="block text-xs font-medium text-muted-dark">
							تاریخ و ساعت انتشار خودکار
						</label>

						<input
							id="scheduledFor"
							type="datetime-local"
							dir="ltr"
							value={values.scheduledFor}
							disabled={readOnly || saving}
							onChange={(event) => setField("scheduledFor", event.target.value)}
							className={`${fieldClass} text-start`}
						/>

						{values.scheduledFor ? (
							<button
								type="button"
								disabled={readOnly || saving}
								onClick={() => setField("scheduledFor", "")}
								className="mt-2 text-xs font-medium text-accent transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
							>
								حذف زمان‌بندی
							</button>
						) : null}
					</div>

					<p className="text-xs leading-6 text-muted-dark">
						با ثبت زمان، خبر پس از ذخیره به وضعیت «زمان‌بندی‌شده» می‌رود و زمان‌بند سرور آن را دقیقاً در همان لحظه منتشر می‌کند؛ ساعت واردشده بر اساس ساعت همین دستگاه است و همراه با اختلاف زمانی به سرور فرستاده می‌شود.
						{article?.status === "SCHEDULED"
							? " با حذف زمان‌بندی، خبر دوباره به پیش‌نویس برمی‌گردد."
							: " برای انتشار فوری به‌جای زمان‌بندی، از دکمه‌های تغییر وضعیت در همین صفحه استفاده کنید."}
					</p>
				</div>
			</fieldset>

			{failure ? (
				<div
					role="alert"
					className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm leading-7 text-accent"
				>
					<p>{failure}</p>

					{sessionLost ? (
						<p className="mt-1 text-xs text-muted-dark">
							متن نوشته‌شده در همین صفحه حفظ شده است. در یک زبانهٔ دیگر وارد شوید و سپس دوباره دکمهٔ ذخیره را بزنید.
						</p>
					) : null}

					{orphanUploadId ? (
						<p className="mt-1 text-xs text-muted-dark">
							تصویری که آپلود کردید روی سرور باقی مانده اما به هیچ خبری متصل نشده است (شناسه: {orphanUploadId}). پاک‌کردن آن فقط از عهدهٔ مدیر ارشد برمی‌آید.
						</p>
					) : null}
				</div>
			) : null}

			{notice ? (
				<p
					role="status"
					className="rounded-md border border-link/30 bg-link/5 px-3 py-2.5 text-sm leading-7 text-link"
				>
					{notice}
				</p>
			) : null}

			<div className="flex flex-wrap items-center gap-3">
				<button
					type="submit"
					disabled={readOnly || saving}
					className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{saving
						? "در حال ذخیره…"
						: article
							? "ذخیرهٔ تغییرات"
							: values.scheduledFor
								? "ذخیره و زمان‌بندی انتشار"
								: "ذخیره به‌عنوان پیش‌نویس"}
				</button>

				{dirty && !readOnly ? (
					<span className="text-xs text-muted-dark">تغییرات ذخیره‌نشده دارید.</span>
				) : null}
			</div>

			<p className="text-xs leading-6 text-muted-dark">
				{article
					? "توجه: سرور سازوکاری برای ویرایش هم‌زمان ندارد؛ اگر کاربر دیگری همین خبر را هم‌زمان ذخیره کند، آخرین ذخیره جایگزین قبلی می‌شود."
					: "خبر تازه بدون زمان‌بندی در وضعیت پیش‌نویس ساخته می‌شود و با ثبت زمان انتشار، مستقیم در صف انتشار قرار می‌گیرد."}
			</p>
		</form>
	)
}
