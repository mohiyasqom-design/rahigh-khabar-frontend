/**
 * Category as exposed by the public endpoint.
 *
 * Source of truth: `GET /categories` → `Category[]` (a bare array, with no
 * pagination and no filtering options), response schema
 * `additionalProperties: false` with exactly these four fields.
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
}
