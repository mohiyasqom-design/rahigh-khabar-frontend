/**
 * Public category reads.
 *
 * CONTRACT NOTE: the backend exposes exactly one public category route,
 * `GET /categories`, which returns the complete array — there is no
 * `GET /categories/:slug`, no pagination and no filter. So `getCategoryBySlug`
 * fetches the full list and matches locally. That is acceptable because the
 * list is small, is shared by the header nav and every category page, and is
 * served from the same 60-second Data Cache entry, so it costs one backend
 * request per minute in total rather than one per page render.
 */
import { adminFetch } from "@/lib/admin-api"
import { apiFetch } from "@/lib/api"
import { publicCache } from "@/lib/cache"
import type { Category } from "@/types/category"

/** All categories, in backend order. Throws if the backend is unreachable. */
export async function getCategories(): Promise<Category[]> {
	return apiFetch<Category[]>("categories", publicCache)
}

/**
 * Same as `getCategories`, but degrades to an empty list instead of throwing.
 *
 * Used only by the site header. The header is rendered by the root layout, so
 * letting a failed nav request bubble up would replace EVERY page — including
 * pages whose own data loaded fine — with an error screen. A nav that is
 * temporarily missing its category links is a much better failure than a dead
 * site, so the error is logged and swallowed here and nowhere else.
 */
export async function getCategoriesForNav(): Promise<Category[]> {
	try {
		return await getCategories()
	} catch (error) {
		console.error("Header navigation: failed to load categories.", error)
		return []
	}
}

/** Resolves a slug against the full list; null when no category matches. */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
	const categories = await getCategories()
	return categories.find((category) => category.slug === slug) ?? null
}

/* -------------------------------------------------------------------------- */
/* Stage 8 — categories for the editor                                         */
/* -------------------------------------------------------------------------- */

/**
 * The category list used by the news editor's multi-select.
 *
 * WHY NOT REUSE `getCategories()` ABOVE: that read is cached for 60 seconds so
 * public pages can be statically regenerated. An editor who has just created a
 * category must see it immediately, and an admin screen must never render from
 * a shared cache entry, so this goes to `GET /admin/categories` with
 * `cache: "no-store"`.
 *
 * The response shape is identical to the public one (a bare array, no
 * pagination) — both routes call the same service.
 */
export function getAdminCategories(): Promise<Category[]> {
	return adminFetch<Category[]>("admin/categories")
}
