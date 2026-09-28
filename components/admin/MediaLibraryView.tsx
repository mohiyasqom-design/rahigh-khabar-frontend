"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import AdminPagination from "@/components/admin/AdminPagination"
import { useSession } from "@/components/admin/session"
import EmptyState from "@/components/EmptyState"
import { deleteMediaAsset, listMediaLibrary } from "@/lib/admin-resources"
import { errorCode, errorMessage, isUnauthorized } from "@/lib/errors"
import { formatJalaliDateTime, formatPersianNumber } from "@/lib/format"
import {
	ACCEPTED_IMAGE_INPUT,
	describeFileProblem,
	maxUploadSizeBytes,
	megabytes,
	uploadMediaFromDevice,
} from "@/lib/media"
import type { Paginated } from "@/types/api"
import type { MediaItem } from "@/types/media"

const PAGE_SIZE = 24

/**
 * The media library: everything uploaded through `POST /media/upload`.
 *
 * UPLOAD GOES TO THE PART 5 ROUTE, not the Stage 8 one: `/media/upload` is the
 * endpoint that checks magic bytes, re-encodes through sharp to WebP and caps
 * the long edge at 1600px. The older `/admin/media` route stores the bytes
 * as-is, so using it here would put unnormalised files in the same library.
 *
 * DELETION IS SUPER_ADMIN-ONLY AND CAN LEGITIMATELY FAIL: the backend answers
 * 409 `MEDIA_IN_USE` when the image is still a cover, which is a protection,
 * not a bug — so that case gets its own explanatory message instead of a
 * generic failure.
 *
 * `next/image` is NOT used for the thumbnails on purpose: uploads live on the
 * API origin under a path the optimiser would have to be configured for per
 * environment, and a plain `img` with fixed box sizing cannot break when the
 * API host changes. Covers on the public site still use `next/image`.
 */
export default function MediaLibraryView() {
	const { user, handleExpiredSession } = useSession()
	const inputRef = useRef<HTMLInputElement | null>(null)
	const [page, setPage] = useState(1)
	const [data, setData] = useState<Paginated<MediaItem> | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const [altText, setAltText] = useState("")
	const [uploading, setUploading] = useState(false)
	const [busyId, setBusyId] = useState<string | null>(null)
	const [copiedId, setCopiedId] = useState<string | null>(null)

	const canDelete = user.role === "SUPER_ADMIN"

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			setData(await listMediaLibrary(page, PAGE_SIZE))
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "دریافت کتابخانهٔ رسانه انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [handleExpiredSession, page])

	useEffect(() => {
		void load()
	}, [load])

	async function handleFile(file: File) {
		const problem = describeFileProblem(file)

		if (problem) {
			setError(problem)
			return
		}

		setUploading(true)
		setError(null)
		setNotice(null)

		try {
			const uploaded = await uploadMediaFromDevice(file, altText)
			setAltText("")
			setNotice(`تصویر آپلود شد (شناسه: ${uploaded.id}).`)

			if (page === 1) {
				await load()
			} else {
				setPage(1)
			}
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "آپلود تصویر انجام نشد."))
		} finally {
			setUploading(false)

			if (inputRef.current) {
				// Allows re-selecting the same file after a failure.
				inputRef.current.value = ""
			}
		}
	}

	async function handleDelete(item: MediaItem) {
		if (!window.confirm("این تصویر از سرور حذف شود؟ این کار بازگشت‌پذیر نیست.")) {
			return
		}

		setBusyId(item.id)
		setError(null)
		setNotice(null)

		try {
			await deleteMediaAsset(item.id)
			setNotice("تصویر حذف شد.")
			await load()
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(
				errorCode(caught) === "MEDIA_IN_USE"
					? "این تصویر هنوز تصویر شاخص یک خبر است؛ ابتدا آن خبر را به تصویر دیگری تغییر دهید."
					: errorMessage(caught, "حذف تصویر انجام نشد."),
			)
		} finally {
			setBusyId(null)
		}
	}

	async function copyUrl(item: MediaItem) {
		try {
			await navigator.clipboard.writeText(item.url)
			setCopiedId(item.id)
			window.setTimeout(() => setCopiedId(null), 2000)
		} catch {
			setError("کپی نشانی در این مرورگر ممکن نشد؛ نشانی را دستی انتخاب کنید.")
		}
	}

	const items = data?.items ?? []
	const pagination = data?.pagination

	return (
		<section>
			<h1 className="text-xl font-extrabold tracking-headline text-ink">کتابخانهٔ رسانه</h1>
			<p className="mt-1 max-w-2xl text-sm leading-7 text-muted-dark">
				تصاویر آپلودشده روی سرور. هر تصویر هنگام آپلود به فرمت WebP تبدیل و حداکثر
				۱۶۰۰ پیکسل محدود می‌شود.
			</p>

			<div className="mt-5 rounded-md border border-border bg-white p-4">
				<label htmlFor="media-alt" className="block text-sm font-semibold text-ink">
					متن جایگزین (اختیاری)
				</label>
				<input
					id="media-alt"
					type="text"
					value={altText}
					onChange={(event) => setAltText(event.target.value)}
					placeholder="توضیح کوتاه تصویر برای دسترس‌پذیری"
					className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
				/>

				<div className="mt-3 flex flex-wrap items-center gap-3">
					<input
						ref={inputRef}
						id="media-file"
						type="file"
						accept={ACCEPTED_IMAGE_INPUT}
						disabled={uploading}
						onChange={(event) => {
							const file = event.target.files?.[0]

							if (file) {
								void handleFile(file)
							}
						}}
						className="text-sm text-ink file:me-3 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper"
					/>

					<span className="text-xs text-muted-dark">
						حداکثر حجم: {formatPersianNumber(megabytes(maxUploadSizeBytes()))} مگابایت
					</span>

					{uploading ? (
						<span role="status" className="text-xs text-link">
							در حال آپلود…
						</span>
					) : null}
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

			{notice ? (
				<p
					role="status"
					className="mt-5 rounded-md border border-link/30 bg-link/5 px-3 py-2.5 text-sm text-link"
				>
					{notice}
				</p>
			) : null}

			{loading && !data ? (
				<p role="status" className="mt-8 text-sm text-muted-dark">
					در حال دریافت تصاویر…
				</p>
			) : null}

			{!loading && items.length === 0 ? (
				<div className="mt-6">
					<EmptyState
						title="هنوز تصویری آپلود نشده است"
						description="از کادر بالا یک تصویر از دستگاه خود آپلود کنید."
					/>
				</div>
			) : null}

			{items.length > 0 ? (
				<ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<li key={item.id} className="rounded-md border border-border bg-white p-3">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={item.url}
								alt={item.altText ?? ""}
								loading="lazy"
								className="h-40 w-full rounded-md border border-border object-cover"
							/>

							<p className="mt-2 truncate text-xs text-muted-dark" dir="ltr">
								{item.url}
							</p>

							<p className="mt-1 text-xs text-muted-dark">
								{item.width && item.height
									? `${formatPersianNumber(item.width)}×${formatPersianNumber(item.height)} پیکسل · `
									: ""}
								{item.sizeBytes
									? `${formatPersianNumber(megabytes(item.sizeBytes))} مگابایت · `
									: ""}
								{formatJalaliDateTime(item.createdAt)}
							</p>

							<div className="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => void copyUrl(item)}
									className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
								>
									{copiedId === item.id ? "کپی شد" : "کپی نشانی"}
								</button>

								{canDelete ? (
									<button
										type="button"
										disabled={busyId === item.id}
										onClick={() => void handleDelete(item)}
										className="rounded-md border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/5 disabled:opacity-60"
									>
										{busyId === item.id ? "در حال حذف…" : "حذف"}
									</button>
								) : null}
							</div>
						</li>
					))}
				</ul>
			) : null}

			{!canDelete ? (
				<p className="mt-4 text-xs leading-6 text-muted-dark">
					حذف تصویر فقط از عهدهٔ مدیر ارشد برمی‌آید.
				</p>
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
