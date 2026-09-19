/**
 * Stage 10 Part 5 — direct device uploads.
 *
 * WHY A SECOND UPLOAD PATH EXISTS (and why `lib/media.ts` was not changed):
 * Stage 8's `uploadMedia()` posts to `POST /admin/media`, which stores the
 * bytes exactly as received. Part 5 added `POST /media/upload`, which checks
 * the real magic bytes, strips metadata, re-encodes through sharp and caps the
 * long edge — that is the route the panel must use for new uploads. The old
 * one is kept untouched so the existing cover picker keeps working.
 *
 * `Content-Type` is never set by hand: the browser must generate the multipart
 * boundary itself, and `apiFetch` only adds `Accept`.
 */
import { apiFetch } from "@/lib/api"
import { adminFetch } from "@/lib/admin-api"
import type { MediaItem } from "@/types/media"

/** Builds the multipart body shared by both upload routes. */
function uploadForm(file: File, altText: string): FormData {
	const form = new FormData()
	form.append("file", file)

	// The backend accepts at most one non-file field and turns an empty string
	// into null anyway, so a blank value is omitted entirely.
	const trimmed = altText.trim()
	if (trimmed) {
		form.append("altText", trimmed)
	}

	return form
}

/**
 * `POST /media/upload` — staff upload straight from the device.
 *
 * Returns the stored record, whose `id` is what a news write accepts as
 * `coverImageId` and whose `url` is what the editor inserts as an image.
 */
export function uploadMediaFromDevice(file: File, altText = ""): Promise<MediaItem> {
	return adminFetch<MediaItem>("media/upload", {
		method: "POST",
		body: uploadForm(file, altText),
	})
}

/**
 * `POST /users/me/avatar` — a SITE VISITOR replacing their picture.
 *
 * Goes through `apiFetch`, not `adminFetch`: this route is guarded by the
 * visitor cookie (`rk_user`), not the staff one, and sending it as an admin
 * call would simply 401 for every normal reader.
 */
export async function uploadAvatar(file: File): Promise<string> {
	const response = await apiFetch<{ avatarUrl: string }>("users/me/avatar", {
		method: "POST",
		cache: "no-store",
		body: uploadForm(file, ""),
	})

	return response.avatarUrl
}
