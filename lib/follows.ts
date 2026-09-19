/**
 * Category follows and the personal feed.
 *
 * VISITOR ROUTES, NOT ADMIN ROUTES: every endpoint here is guarded by
 * `authenticateSiteUser`, i.e. the `rk_user` cookie set by Google sign-in —
 * not the staff `rk_auth` cookie. A signed-out visitor gets 401, which the UI
 * turns into an invitation to sign in rather than an error.
 *
 * ALWAYS UNCACHED: these responses are per-visitor and the backend marks them
 * `no-store`, so a shared cache entry would leak one reader's follows to
 * another.
 */
import { apiFetch } from "@/lib/api"
import type { Paginated } from "@/types/api"
import type { SearchResultItem } from "@/types/search"

/** A followed category as returned by `GET /me/follows` (narrowed shape). */
export interface FollowedCategory {
	id: string
	name: string
	slug: string
}

/** `GET /me/feed` returns the same item shape as search. */
export type FeedItem = SearchResultItem

const fresh = { cache: "no-store" } as const

/** `GET /categories/:id/follow` — 401 when the visitor is not signed in. */
export async function isFollowingCategory(categoryId: string): Promise<boolean> {
	const response = await apiFetch<{ following: boolean }>(
		`categories/${categoryId}/follow`,
		fresh,
	)

	return response.following
}

/**
 * `POST /categories/:id/follow` with an explicit `{ follow }` flag.
 *
 * The backend takes the desired state rather than toggling, so two rapid
 * clicks cannot leave the UI and the database disagreeing about the result.
 */
export async function setCategoryFollow(
	categoryId: string,
	follow: boolean,
): Promise<boolean> {
	const response = await apiFetch<{ following: boolean }>(
		`categories/${categoryId}/follow`,
		{
			...fresh,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ follow }),
		},
	)

	return response.following
}

/** `GET /me/follows` — every category this visitor follows. */
export async function listFollowedCategories(): Promise<FollowedCategory[]> {
	const response = await apiFetch<{ items: FollowedCategory[] }>("me/follows", fresh)
	return response.items
}

/** `GET /me/feed` — published articles from the followed categories. */
export function getFollowedFeed(page = 1, pageSize = 12): Promise<Paginated<FeedItem>> {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
	})

	return apiFetch<Paginated<FeedItem>>(`me/feed?${params.toString()}`, fresh)
}
