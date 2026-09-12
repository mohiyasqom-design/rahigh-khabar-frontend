/**
 * Media uploads for the news editor.
 *
 * THE BACKEND'S TWO-PHASE FLOW, read from `media.routes.ts`, `media.service.ts`
 * and `news.service.ts` — not guessed:
 *
 *   Phase 1  POST /admin/media   multipart/form-data, exactly one file part
 *            named `file` plus an optional `altText` text part. The backend
 *            sniffs the real image signature, writes the file to disk and
 *            creates the `Media` row, then answers 201 with the record
 *            (including its `id`). If the database insert fails, the file it
 *            just wrote is removed again, so a failed phase 1 leaves nothing
 *            behind.
 *
 *   Phase 2  POST/PATCH /admin/news[/:id] with `coverImageId: <that id>`. The
 *            news write validates that the media row exists (400
 *            `INVALID_COVER_IMAGE` otherwise) and links it.
 *
 * The two phases are separate HTTP requests and the backend offers nothing to
 * join them, so a successful phase 1 followed by a failed phase 2 leaves an
 * ORPHAN media row: uploaded, stored, but attached to no article. The editor UI
 * says so explicitly instead of pretending the save worked — see
 * `components/admin/CoverImagePicker.tsx`. Cleaning such a row up needs
 * `DELETE /admin/media/:id`, which is Super-Admin-only.
 *
 * VALIDATION MIRRORED FROM THE BACKEND (`media.signature.ts`, `media.image.ts`,
 * `env.ts`): only real JPEG, PNG or WebP data is accepted — the byte signature
 * must match, and the reported MIME type must match the detected one — and the
 * body is capped at `MAX_UPLOAD_SIZE_BYTES` (5 MiB unless the deployment
 * changes it). The checks below exist so an editor gets an instant Persian
 * message instead of a 413/415 round-trip; they are convenience, not security.
 * The `accept` attribute on the file input is even weaker — it only filters the
 * OS file dialog — which is why it is not the only check.
 */
import { adminFetch, adminQuery } from "@/lib/admin-api"
import type { Paginated } from "@/types/api"
import type { MediaItem } from "@/types/media"

/** The three formats the backend's signature check accepts. */
export const ACCEPTED_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const

/** Backend default for `MAX_UPLOAD_SIZE_BYTES` (5 MiB). */
const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 5_242_880

/**
 * The upload cap the UI enforces.
 *
 * The real limit lives in the backend's environment, so it is configurable
 * here too (`NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES`). When the two disagree the
 * backend still wins with a 413; this only decides how early the editor is
 * told.
 */
export function maxUploadSizeBytes(): number {
	const configured = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES)

	if (!Number.isFinite(configured) || configured <= 0) {
		return DEFAULT_MAX_UPLOAD_SIZE_BYTES
	}

	return Math.trunc(configured)
}

/** Human-readable megabytes, for the Persian hint under the file input. */
export function megabytes(bytes: number): number {
	return Math.round((bytes / 1_048_576) * 10) / 10
}

/**
 * Local pre-flight for a chosen file: returns a Persian complaint, or null.
 *
 * Mirrors what the backend enforces, so it never rejects something the backend
 * would have accepted.
 */
export function describeFileProblem(file: File): string | null {
	const limit = maxUploadSizeBytes()

	if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_MIME_TYPES)[number])) {
		return "فقط تصویر JPEG، PNG یا WebP پذیرفته می‌شود."
	}

	if (file.size > limit) {
		return `حجم تصویر بیشتر از حد مجاز (${megabytes(limit)} مگابایت) است.`
	}

	if (file.size === 0) {
		return "فایل انتخاب‌شده خالی است."
	}

	return null
}

/**
 * Phase 1: uploads the file and returns the stored media record.
 *
 * The `Content-Type` header is intentionally NOT set: the browser must add it
 * itself so the multipart boundary is correct. `apiFetch` only adds `Accept`,
 * so passing a `FormData` body is enough.
 */
export function uploadMedia(file: File, altText: string): Promise<MediaItem> {
	const form = new FormData()
	form.append("file", file)

	// The backend allows at most ONE non-file field, and an empty `altText`
	// becomes null anyway, so it is omitted when blank.
	const trimmed = altText.trim()
	if (trimmed) {
		form.append("altText", trimmed)
	}

	return adminFetch<MediaItem>("admin/media", { method: "POST", body: form })
}

/** The most recently uploaded media, for reusing an existing image. */
export function listRecentMedia(pageSize = 12): Promise<Paginated<MediaItem>> {
	return adminFetch<Paginated<MediaItem>>(
		`admin/media${adminQuery({ page: 1, pageSize })}`,
	)
}
