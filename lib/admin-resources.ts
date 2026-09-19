/**
 * Admin-panel clients for the resources the rewritten panel manages:
 * comments, users, categories, the media library and push notifications.
 *
 * Everything here goes through `adminFetch` / `adminJson` (lib/admin-api), so
 * the staff cookie is sent and the response is never cached. Public clients
 * such as `lib/categories` are NOT reused for these screens: their reads are
 * revalidated for 60s, which would show an admin a list they just changed.
 */
import { adminFetch, adminJson, adminQuery } from "@/lib/admin-api"
import type { Paginated } from "@/types/api"
import type { Category } from "@/types/category"
import type { MediaItem } from "@/types/media"
import type {
	PushBroadcastInput,
	PushDeliveryReport,
	PushStatus,
} from "@/types/push"

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

/** A row of `GET /admin/comments`, flattened for the moderation table. */
export interface AdminComment {
	id: string
	body: string
	createdAt: string
	isDeleted: boolean
	authorName: string
	newsTitle: string
	newsSlug: string
}

/**
 * Lists comments for moderation.
 *
 * `includeDeleted` defaults to false so the table shows what readers actually
 * see; moderators can switch it on to audit removals.
 */
export function listAdminComments(
	page = 1,
	pageSize = 20,
	includeDeleted = false,
): Promise<Paginated<AdminComment>> {
	return adminFetch<Paginated<AdminComment>>(
		// `includeDeleted` is a boolean in this API, but the backend query schema
		// is `z.enum(['true','false'])` on a strict object: it parses the raw
		// query string, where every value is text. Passing the boolean through
		// `adminQuery` (which accepts `string | number | undefined`) was both a
		// type error and semantically wrong, so it is serialised explicitly here.
		`admin/comments${adminQuery({
			page,
			pageSize,
			includeDeleted: includeDeleted ? "true" : "false",
		})}`,
	)
}

/** Soft-deletes a comment (`DELETE /admin/comments/:id`). */
export function deleteAdminComment(id: string): Promise<void> {
	return adminJson<void>(`admin/comments/${id}`, "DELETE")
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

/** Staff accounts and site visitors live in two tables; `kind` picks one. */
export type AdminUserKind = "staff" | "site"

/** A row of `GET /admin/users` — never contains a password hash or Google id. */
export interface AdminUserRow {
	id: string
	displayName: string
	email: string | null
	role: string
	createdAt: string
	kind: string
	username: string | null
}

/** `GET /admin/users?kind=` — SUPER_ADMIN only, read-only in this stage. */
export function listAdminUsers(
	kind: AdminUserKind = "site",
	page = 1,
	pageSize = 20,
): Promise<Paginated<AdminUserRow>> {
	return adminFetch<Paginated<AdminUserRow>>(
		`admin/users${adminQuery({ kind, page, pageSize })}`,
	)
}

/* -------------------------------------------------------------------------- */
/* Push notifications                                                         */
/* -------------------------------------------------------------------------- */

/** `GET /push/status` — whether VAPID is configured and how many devices. */
export function getPushStatus(): Promise<PushStatus> {
	return adminFetch<PushStatus>("push/status")
}

/**
 * `POST /push/broadcast`.
 *
 * The backend schema is `.strict()` with OPTIONAL (not nullable) `url` and
 * `categoryId`, so empty values are dropped here instead of being sent as
 * empty strings, which would be rejected with a 400.
 */
export function broadcastPush(input: PushBroadcastInput): Promise<PushDeliveryReport> {
	const payload: PushBroadcastInput = {
		title: input.title.trim(),
		body: input.body.trim(),
	}

	const url = input.url?.trim()
	if (url) {
		payload.url = url
	}

	if (input.categoryId) {
		payload.categoryId = input.categoryId
	}

	return adminJson<PushDeliveryReport>("push/broadcast", "POST", payload)
}

/* -------------------------------------------------------------------------- */
/* Media library                                                              */
/* -------------------------------------------------------------------------- */

/**
 * `GET /media` — the Part 5 library endpoint.
 *
 * Not to be confused with the Stage 8 `GET /admin/media` used by the cover
 * picker: this one is the paginated library that backs the media page.
 */
export function listMediaLibrary(page = 1, pageSize = 24): Promise<Paginated<MediaItem>> {
	return adminFetch<Paginated<MediaItem>>(`media${adminQuery({ page, pageSize })}`)
}

/**
 * `DELETE /media/:id` — SUPER_ADMIN only.
 *
 * Returns 409 `MEDIA_IN_USE` when the image is a news cover; the UI surfaces
 * that as a specific message rather than a generic failure.
 */
export function deleteMediaAsset(id: string): Promise<void> {
	return adminJson<void>(`media/${id}`, "DELETE")
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

/** Writable fields of a category. */
export interface CategoryWriteInput {
	name: string
	slug: string
	description?: string | null
	order?: number
}

/** Limits mirrored from the backend category schema, used by the form. */
export const CATEGORY_FIELD_LIMITS = {
	name: 120,
	slug: 200,
	description: 2000,
	orderMax: 10_000,
} as const

/** Lowercase latin/digits/dashes — the same rule the backend enforces. */
export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** `POST /admin/categories`. */
export function createCategory(input: CategoryWriteInput): Promise<Category> {
	return adminJson<Category>("admin/categories", "POST", input)
}

/** `PATCH /admin/categories/:id` — only the changed fields are sent. */
export function updateCategory(
	id: string,
	input: Partial<CategoryWriteInput>,
): Promise<Category> {
	return adminJson<Category>(`admin/categories/${id}`, "PATCH", input)
}

/** `DELETE /admin/categories/:id`. */
export function deleteCategory(id: string): Promise<void> {
	return adminJson<void>(`admin/categories/${id}`, "DELETE")
}
