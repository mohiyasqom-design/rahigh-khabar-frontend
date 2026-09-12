/**
 * Cover image as exposed on PUBLIC news payloads.
 *
 * This is deliberately narrower than the admin `/media` resource: the public
 * news response schema only exposes `url`, `altText`, `width` and `height` —
 * not `id`, `mimeType`, `sizeBytes` or `createdAt`. Typing the wider shape here
 * would claim data the public API never sends.
 *
 * `altText` is nullable in the database, so alt text must always be handled as
 * possibly missing (see `components/NewsCard.tsx`).
 */
export interface NewsCoverImage {
	url: string
	altText: string | null
	width: number | null
	height: number | null
}

/* -------------------------------------------------------------------------- */
/* Stage 8 — admin media resource                                              */
/* -------------------------------------------------------------------------- */

/**
 * A media record as returned by `POST /admin/media` and `GET /admin/media`,
 * taken from `mediaResponseSchema`.
 *
 * This is the wider, authenticated shape: unlike `NewsCoverImage` it carries
 * the `id`, which is the only thing a news write accepts (`coverImageId`). A
 * file or a URL is never accepted in place of it — hence the two-step upload
 * flow in `components/admin/CoverImagePicker.tsx`.
 *
 * `url` is an absolute URL on the API origin (`${PUBLIC_API_URL}/uploads/...`),
 * which is exactly the host allow-listed for `next/image` in `next.config.ts`.
 */
export interface MediaItem {
	id: string
	url: string
	altText: string | null
	width: number | null
	height: number | null
	sizeBytes: number | null
	mimeType: string
	createdAt: string
}
