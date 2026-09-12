/**
 * Shared response envelopes.
 *
 * Copied from the backend's actual Fastify response schemas
 * (`utils/validation.ts` → `pageResult()` and `news.schema.ts`), not guessed:
 * every paginated public endpoint returns `{ items, pagination }` with exactly
 * these four pagination fields and `additionalProperties: false`.
 */

/** Pagination block returned alongside every paginated list. */
export interface Pagination {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

/** A paginated list response. */
export interface Paginated<TItem> {
	items: TItem[]
	pagination: Pagination
}
