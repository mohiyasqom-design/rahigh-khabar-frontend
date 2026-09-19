/**
 * Category as exposed by the public endpoint.
 *
 * Source of truth: `GET /categories` → `Category[]` (a bare array, with no
 * pagination and no filtering options), response schema
 * `additionalProperties: false` with exactly these five fields.
 *
 * STAGE 10 — `order` is the navigation position. The backend already sorts the
 * array by it, so nothing here re-sorts: the array order IS the menu order.
 *
 * NOTE: the backend has no `GET /categories/:slug` route, so resolving a slug
 * means fetching the whole list and matching in the frontend — see
 * `lib/categories.ts`.
 */
export interface Category {
	id: string
	name: string
	slug: string
	description: string | null
	order: number
}
