/**
 * Client for the public search API (`GET /search`, `GET /search/suggest`).
 *
 * ALWAYS UNCACHED. The backend answers search with `Cache-Control: no-store`
 * and `X-Robots-Tag: noindex`, and results depend on a query string that
 * changes with every keystroke, so `publicCache` (60s revalidate) is
 * deliberately NOT used here — caching would only serve stale answers for
 * queries nobody repeated.
 *
 * EVERY CALL TAKES AN AbortSignal. The results page and the header field both
 * fire on typing, so an in-flight request must be cancellable; otherwise a
 * slow response for "قرآ" could land after the response for "قرآن" and
 * overwrite it with older results.
 */
import { apiFetch } from "@/lib/api"
import {
	SEARCH_MAX_LENGTH,
	SEARCH_MIN_LENGTH,
	SEARCH_PAGE_SIZE,
	type SearchMode,
	type SearchResponse,
	type SearchSuggestion,
} from "@/types/search"

/** True when the term is long enough for the backend to accept it. */
export function isSearchable(term: string): boolean {
	const trimmed = term.trim()
	return trimmed.length >= SEARCH_MIN_LENGTH && trimmed.length <= SEARCH_MAX_LENGTH
}

/** Trims and clamps a term to the backend's accepted length. */
export function normaliseTerm(term: string): string {
	return term.trim().slice(0, SEARCH_MAX_LENGTH)
}

export interface SearchOptions {
	page?: number
	pageSize?: number
	categoryId?: string
	mode?: SearchMode
	signal?: AbortSignal
}

/**
 * Runs a search.
 *
 * The query schema is `.strict()`, so optional parameters are omitted rather
 * than sent empty — `categoryId=` would fail validation with a 400.
 */
export function searchNews(
	term: string,
	options: SearchOptions = {},
): Promise<SearchResponse> {
	const params = new URLSearchParams({
		q: normaliseTerm(term),
		page: String(options.page ?? 1),
		pageSize: String(options.pageSize ?? SEARCH_PAGE_SIZE),
	})

	if (options.categoryId) {
		params.set("categoryId", options.categoryId)
	}

	if (options.mode && options.mode !== "auto") {
		params.set("mode", options.mode)
	}

	return apiFetch<SearchResponse>(`search?${params.toString()}`, {
		cache: "no-store",
		...(options.signal ? { signal: options.signal } : {}),
	})
}

/** Title/slug suggestions for the header dropdown. */
export async function suggestNews(
	term: string,
	signal?: AbortSignal,
): Promise<SearchSuggestion[]> {
	const params = new URLSearchParams({ q: normaliseTerm(term) })

	const response = await apiFetch<{ items: SearchSuggestion[] }>(
		`search/suggest?${params.toString()}`,
		{ cache: "no-store", ...(signal ? { signal } : {}) },
	)

	return response.items
}

/** The canonical in-app path for a search, used by every link and redirect. */
export function searchPath(term: string, page = 1): string {
	const params = new URLSearchParams({ q: normaliseTerm(term) })

	if (page > 1) {
		params.set("page", String(page))
	}

	return `/search?${params.toString()}`
}
