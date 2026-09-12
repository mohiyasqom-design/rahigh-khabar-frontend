/**
 * One single caching policy for every public page, defined in one place.
 *
 * WHY ISR: the public pages are read-only, identical for every visitor and
 * change only when an editor publishes. Static HTML that is re-generated in the
 * background is the cheapest and fastest option, and it keeps the backend from
 * being hit once per reader.
 *
 * WHY 60 SECONDS: it is the upper end of the acceptable range and a reasonable
 * trade-off for a news site — a freshly published article appears within a
 * minute, while a traffic spike on a single story costs the backend one request
 * per minute instead of thousands.
 *
 * WHY BOTH LAYERS: the value is applied twice, on purpose.
 *   - `export const revalidate = REVALIDATE_SECONDS` in each page file controls
 *     the full-route cache (the generated HTML).
 *   - `publicCache` is passed to every backend request so the fetch Data Cache
 *     uses the same window.
 * The second one matters here specifically because the backend answers every
 * public news route with `Cache-Control: no-store`. An explicit
 * `next: { revalidate }` is what tells Next.js to cache the response anyway;
 * without it, Next.js 15 would treat each request as uncacheable and the ISR
 * story would silently fall apart. (This is a deliberate frontend override of a
 * backend header — flagged in the README.)
 */

/** Revalidation window, in seconds, for every public page and API read. */
export const REVALIDATE_SECONDS = 60

/** Fetch options that put a backend read into the shared 60s Data Cache. */
export const publicCache = {
	next: { revalidate: REVALIDATE_SECONDS },
} as const
