"use client"

import Image from "next/image"
import { useRef, useState } from "react"

import { errorMessage, isUnauthorized, SESSION_EXPIRED_MESSAGE } from "@/lib/errors"
import {
	ACCEPTED_IMAGE_MIME_TYPES,
	describeFileProblem,
	listRecentMedia,
	maxUploadSizeBytes,
	megabytes,
	uploadMedia,
} from "@/lib/media"
import type { MediaItem } from "@/types/media"

/**
 * What the form needs to know about the chosen cover.
 *
 * It is narrower than `MediaItem` because an existing article only carries
 * `coverImageId` plus the public `coverImage` projection (url/alt/size) — the
 * mime type and byte size of an already-attached image are never returned.
 */
export interface CoverSelection {
	id: string
	url: string
	altText: string | null
	width: number | null
	height: number | null
}

/**
 * Cover image chooser — an honest implementation of the backend's TWO-PHASE
 * media flow.
 *
 * Phase 1 (here): `POST /admin/media` stores the file and returns a media row.
 * Phase 2 (the form's save button): the article is written with
 * `coverImageId`. Until that save succeeds the image is uploaded but attached
 * to nothing, and this component says exactly that rather than showing a green
 * "done". If the save then fails, `NewsForm` repeats the warning with the
 * orphaned ID, because the backend provides no way to undo phase 1 from here
 * (`DELETE /admin/media/:id` is Super-Admin-only).
 *
 * The file rules below mirror the backend's real validation — JPEG/PNG/WebP
 * verified by byte signature, capped at `MAX_UPLOAD_SIZE_BYTES` — so an editor
 * is told before a pointless upload. `accept` on the input alone would be
 * theatre: it only filters the OS file dialog and is trivially bypassed.
 */
export default function CoverImagePicker({
	value,
	disabled,
	onChange,
}: {
	value: CoverSelection | null
	disabled: boolean
	/** `uploadedNow` is true only for a fresh, not-yet-attached upload. */
	onChange: (cover: CoverSelection | null, uploadedNow: boolean) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [file, setFile] = useState<File | null>(null)
	const [altText, setAltText] = useState("")
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [problem, setProblem] = useState<string | null>(null)
	const [gallery, setGallery] = useState<MediaItem[] | null>(null)
	const [galleryOpen, setGalleryOpen] = useState(false)

	const limit = maxUploadSizeBytes()

	function reportFailure(error: unknown, fallback: string) {
		setProblem(
			isUnauthorized(error) ? SESSION_EXPIRED_MESSAGE : errorMessage(error, fallback),
		)
	}

	function pickFile(selected: File | null) {
		setMessage(null)
		setProblem(selected ? describeFileProblem(selected) : null)
		setFile(selected)
	}

	async function handleUpload() {
		if (!file || busy) {
			return
		}

		const localProblem = describeFileProblem(file)

		if (localProblem) {
			setProblem(localProblem)
			return
		}

		setBusy(true)
		setProblem(null)
		setMessage(null)

		try {
			const media = await uploadMedia(file, altText)

			onChange(
				{
					id: media.id,
					url: media.url,
					altText: media.altText,
					width: media.width,
					height: media.height,
				},
				true,
			)

			setFile(null)
			setAltText("")

			if (inputRef.current) {
				inputRef.current.value = ""
			}

			// Deliberately not "ذخیره شد": phase 2 has not happened yet.
			setMessage(
				"تصویر آپلود شد، اما تا زمانی که خبر را ذخیره نکنید به آن متصل نمی‌شود.",
			)
		} catch (error) {
			reportFailure(error, "آپلود تصویر انجام نشد.")
		} finally {
			setBusy(false)
		}
	}

	async function toggleGallery() {
		if (galleryOpen) {
			setGalleryOpen(false)
			return
		}

		setGalleryOpen(true)

		if (gallery || busy) {
			return
		}

		setBusy(true)
		setProblem(null)

		try {
			const recent = await listRecentMedia()
			setGallery(recent.items)
		} catch (error) {
			reportFailure(error, "فهرست تصاویر بارگذاری نشد.")
			setGalleryOpen(false)
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="space-y-4 rounded-md border border-border p-4">
			<div>
				<p className="text-sm font-semibold text-ink">تصویر شاخص</p>
				<p className="mt-1 text-xs leading-6 text-muted-dark">
					فقط JPEG، PNG یا WebP تا {megabytes(limit)} مگابایت. نوع فایل روی سرور از روی محتوای فایل بررسی می‌شود، نه پسوند آن.
				</p>
			</div>

			{value ? (
				<div className="flex flex-wrap items-start gap-4">
					<Image
						src={value.url}
						alt={value.altText ?? ""}
						width={value.width ?? 320}
						height={value.height ?? 200}
						className="h-28 w-44 rounded-md border border-border object-cover"
					/>
					<div className="space-y-2 text-xs text-muted-dark">
						<p>
							متن جایگزین: {value.altText?.trim() ? value.altText : "ثبت نشده"}
						</p>
						<p dir="ltr" className="break-all text-[11px]">
							{value.id}
						</p>
						<button
							type="button"
							disabled={disabled || busy}
							onClick={() => onChange(null, false)}
							className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
						>
							حذف تصویر شاخص
						</button>
					</div>
				</div>
			) : (
				<p className="text-xs text-muted-dark">تصویری انتخاب نشده است.</p>
			)}

			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<label htmlFor="cover-file" className="block text-xs font-medium text-ink">
						انتخاب فایل تازه
					</label>
					<input
						id="cover-file"
						ref={inputRef}
						type="file"
						accept={ACCEPTED_IMAGE_MIME_TYPES.join(",")}
						disabled={disabled || busy}
						onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
						className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-xs text-ink file:me-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:text-ink disabled:opacity-60"
					/>
				</div>

				<div>
					<label htmlFor="cover-alt" className="block text-xs font-medium text-ink">
						متن جایگزین تصویر (اختیاری)
					</label>
					<input
						id="cover-alt"
						type="text"
						maxLength={500}
						value={altText}
						disabled={disabled || busy}
						onChange={(event) => setAltText(event.target.value)}
						placeholder="توضیح کوتاه برای خواننده‌های صفحه‌خوان"
						className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					disabled={disabled || busy || !file}
					onClick={() => void handleUpload()}
					className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{busy ? "در حال آپلود…" : "آپلود تصویر"}
				</button>

				<button
					type="button"
					disabled={disabled || busy}
					onClick={() => void toggleGallery()}
					className="rounded-md border border-border px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
				>
					{galleryOpen ? "بستن تصاویر اخیر" : "انتخاب از تصاویر اخیر"}
				</button>
			</div>

			{problem ? (
				<p role="alert" className="text-xs leading-6 text-accent">
					{problem}
				</p>
			) : null}

			{message ? (
				<p role="status" className="text-xs leading-6 text-link">
					{message}
				</p>
			) : null}

			{galleryOpen ? (
				<div>
					{gallery && gallery.length > 0 ? (
						<ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
							{gallery.map((item) => (
								<li key={item.id}>
									<button
										type="button"
										disabled={disabled || busy}
										onClick={() =>
											onChange(
												{
													id: item.id,
													url: item.url,
													altText: item.altText,
													width: item.width,
													height: item.height,
												},
												false,
											)
										}
										className={`block w-full overflow-hidden rounded-md border transition-colors ${
											value?.id === item.id
												? "border-accent"
												: "border-border hover:border-border-strong"
										}`}
									>
										<Image
											src={item.url}
											alt={item.altText ?? ""}
											width={item.width ?? 240}
											height={item.height ?? 150}
											className="h-20 w-full object-cover"
										/>
									</button>
								</li>
							))}
						</ul>
					) : (
						<p className="text-xs text-muted-dark">
							{gallery ? "هنوز تصویری آپلود نشده است." : "در حال بارگذاری…"}
						</p>
					)}
				</div>
			) : null}
		</div>
	)
}
