/**
 * Public search shapes, copied from the backend's `search.schema.ts`.
 *
 * A SEARCH RESULT IS NOT A NEWS ITEM. The search response has its own schema
 * with `additionalProperties: false`: it carries `id`, a flat `coverImageUrl`
 * string (not the `coverImage` object the news feed returns), and categories
 * reduced to `{ id, name, slug }` with no `description`/`order`. Reusing
 * `NewsListItem` here would claim fields the endpoint never sends, so the
 * shape is typed separately.
 */

/** Category as it appears inside a search or feed item (narrowed). */
export interface SearchResultCategory {
	id: string
	name: string
	slug: string
}

/** One row of `GET /search` and of `GET /me/feed` — both use this schema. */
export interface SearchResultItem {
	id: string
	title: string
	slug: string
	lead: string
	publishedAt: string | null
	coverImageUrl: string | null
	categories: SearchResultCategory[]
}

/**
 * `GET /search?q=&page=&pageSize=&categoryId=&mode=`.
 *
 * `mode` reports which engine actually answered (`keyword` or `semantic`), and
 * `degraded` is true when semantic search was asked for but unavailable
 * (missing `OPENAI_API_KEY`, no pgvector, provider error). The UI shows that
 * as a notice instead of silently pretending the results are semantic.
 */
export interface SearchResponse {
	items: SearchResultItem[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
	mode: string
	degraded: boolean
}

/** One suggestion from `GET /search/suggest?q=` — title and slug only. */
export interface SearchSuggestion {
	title: string
	slug: string
}

/** The search modes the backend accepts; `auto` lets the server decide. */
export type SearchMode = "auto" | "keyword" | "semantic"

/** Backend bound: `q` must be 2–120 characters after trimming. */
export const SEARCH_MIN_LENGTH = 2
export const SEARCH_MAX_LENGTH = 120

/** Page size used by the results page. */
export const SEARCH_PAGE_SIZE = 12

/**
 * Debounce before a keystroke becomes a request.
 *
 * `GET /search` is rate limited to 60 requests per minute per IP and each call
 * runs a full-text (and possibly embedding) query, so firing on every
 * keystroke would both exhaust the budget and waste the server's time on
 * prefixes nobody searched for. 350 ms is long enough to swallow normal typing
 * and short enough to feel immediate.
 */
export const SEARCH_DEBOUNCE_MS = 350
