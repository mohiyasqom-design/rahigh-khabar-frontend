import { getApiBaseUrl } from "@/lib/api"
import { publicCache } from "@/lib/cache"
import { getNewsPage } from "@/lib/news"

/**
 * STAGE 9 — the data the sitemap needs, and nothing else.
 *
 * Two problems are solved here, both caused by what the public API does and
 * does not return:
 *
 *   1. `GET /news` is paginated with a hard `pageSize` ceiling of 100, so
 *      listing every published article means walking pages.
 *   2. The public payloads carry `publishedAt` but NOT `updatedAt`, so an
 *      article corrected after publication would keep its original date in the
 *      sitemap. The backend's own `GET /sitemap.xml` does expose `<lastmod>`
 *      (from `updatedAt`), so it is read and used as the source of truth for
 *      modification times.
 *
 * The backend sitemap is NOT proxied: it is built from the backend's own
 * `PUBLIC_SITE_URL` and spells categories `/categories/<slug>`, while this
 * frontend serves `/category/<slug>`. Only the timestamps are borrowed; every
 * URL in `app/sitemap.ts` is built from this app's own path helpers.
 */

/** The API's maximum accepted page size. Asking for more is a 400. */
const FETCH_PAGE_SIZE = 100

/**
 * Stop after 5,000 articles (50 × 100). A sitemap file may hold 50,000 URLs,
 * so this is not the protocol's limit — it is a bound on how long one build
 * may spend walking a paginated API. If it is ever hit, the sitemap is still
 * valid, just truncated, and `truncated` says so out loud.
 */
const MAX_FETCHED_PAGES = 50

const BACKEND_SITEMAP_PATH = "sitemap.xml"

/** Bound on child sitemaps followed when the backend returns an index. */
const MAX_CHILD_SITEMAPS = 20

export interface PublishedNewsRef {
	slug: string
	publishedAt: string | null
}

export interface PublishedNewsResult {
	items: PublishedNewsRef[]
	/** True when `MAX_FETCHED_PAGES` cut the walk short. */
	truncated: boolean
}

/** Every published article, one paginated read at a time. */
export async function collectPublishedNews(): Promise<PublishedNewsResult> {
	const items: PublishedNewsRef[] = []
	let page = 1

	while (page <= MAX_FETCHED_PAGES) {
		const feed = await getNewsPage({ page, pageSize: FETCH_PAGE_SIZE })

		for (const item of feed.items) {
			items.push({ slug: item.slug, publishedAt: item.publishedAt })
		}

		// Trust the page contents as well as the counter: an empty page ends the
		// walk even if `totalPages` claims otherwise.
		if (feed.items.length === 0 || page >= feed.pagination.totalPages) {
			return { items, truncated: false }
		}

		page += 1
	}

	return { items, truncated: true }
}

export interface BackendLastModified {
	/** Article slug → `<lastmod>`. */
	news: Map<string, Date>
	/** Category slug → `<lastmod>`. */
	categories: Map<string, Date>
}

/** A real `Date`, or `undefined` for null/empty/unparseable input. */
export function toDate(value: string | null | undefined): Date | undefined {
	if (!value) {
		return undefined
	}

	const date = new Date(value)

	return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Resolves a sitemap path onto the BACKEND's origin.
 *
 * Only the path of the input is kept. A `<loc>` inside a sitemap index is an
 * absolute URL built from the backend's `PUBLIC_SITE_URL` — which may well be
 * this frontend's public origin — so following it verbatim could send the
 * request to the wrong server entirely. The trailing slash is normalised for
 * the same reason `absoluteMediaUrl` does it: `//sitemap.xml` is a different
 * URL from `/sitemap.xml`, and whether the configured API base ends in a slash
 * is not this module's business.
 */
function backendSitemapUrl(pathOrUrl: string): string {
	const origin = getApiBaseUrl().replace(/\/+$/, "")
	let path = pathOrUrl

	try {
		path = new URL(pathOrUrl, "https://placeholder.invalid").pathname
	} catch {
		// Not URL-shaped; use it as a plain relative path.
	}

	return `${origin}/${path.replace(/^\/+/, "")}`
}

async function fetchSitemapXml(pathOrUrl: string): Promise<string | null> {
	const url = backendSitemapUrl(pathOrUrl)

	// Deliberately a bare `fetch`, not `apiFetch`: the response is XML, and
	// `apiFetch` is built around JSON envelopes and credentialed requests.
	const response = await fetch(url, {
		headers: { Accept: "application/xml, text/xml" },
		...publicCache,
	})

	if (!response.ok) {
		console.warn(
			`[sitemap] backend ${url} answered ${response.status}; falling back to publishedAt only.`,
		)

		return null
	}

	return response.text()
}

/** The five XML entities the backend escapes with, decoded back. */
function decodeXmlText(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&")
}

interface SitemapEntry {
	loc: string
	lastmod?: string
}

/**
 * Pulls `<loc>` / `<lastmod>` pairs out of a sitemap or a sitemap index.
 *
 * A regex is enough and deliberate: the input is one known generator's output
 * (`seo.format.ts` in the backend), the two tags are all that is needed, and a
 * real XML parser would be a dependency added for a build-time read of a
 * document this project also writes.
 */
function parseSitemapXml(xml: string): {
	entries: SitemapEntry[]
	isIndex: boolean
} {
	const isIndex = /<sitemapindex[\s>]/.test(xml)
	const entries: SitemapEntry[] = []
	const blocks = xml.matchAll(
		/<(?:url|sitemap)\b[^>]*>([\s\S]*?)<\/(?:url|sitemap)>/g,
	)

	for (const block of blocks) {
		const body = block[1]
		const loc = /<loc>([\s\S]*?)<\/loc>/.exec(body)

		if (!loc) {
			continue
		}

		const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(body)

		entries.push({
			loc: decodeXmlText(loc[1].trim()),
			...(lastmod ? { lastmod: decodeXmlText(lastmod[1].trim()) } : {}),
		})
	}

	return { entries, isIndex }
}

/**
 * Reads a `<loc>` as a path and decides what it points at.
 *
 * Only the path matters; the origin is discarded because it is the backend's
 * `PUBLIC_SITE_URL`, which may differ from this frontend's origin.
 */
function classifyLoc(
	loc: string,
): { kind: "news" | "category"; slug: string } | null {
	let pathname: string

	try {
		// The base only matters for relative values; absolute locs ignore it.
		pathname = new URL(loc, "https://placeholder.invalid").pathname
	} catch {
		return null
	}

	const news = /^\/news\/([^/]+)\/?$/.exec(pathname)

	if (news) {
		return { kind: "news", slug: decodeURIComponent(news[1]) }
	}

	// The backend pluralises this path; this frontend does not. Both spellings
	// are accepted so a backend rename does not silently drop every timestamp.
	const category = /^\/categor(?:ies|y)\/([^/]+)\/?$/.exec(pathname)

	if (category) {
		return { kind: "category", slug: decodeURIComponent(category[1]) }
	}

	return null
}

function collectEntries(
	entries: SitemapEntry[],
	into: BackendLastModified,
): void {
	for (const entry of entries) {
		const classified = classifyLoc(entry.loc)
		const lastmod = toDate(entry.lastmod)

		if (!classified || !lastmod) {
			continue
		}

		const target = classified.kind === "news" ? into.news : into.categories
		const existing = target.get(classified.slug)

		// Keep the newest if a slug somehow appears twice.
		if (!existing || lastmod > existing) {
			target.set(classified.slug, lastmod)
		}
	}
}

/**
 * Modification times from the backend's sitemap, keyed by slug.
 *
 * Never throws: a backend that is down, slow or answering something other than
 * XML degrades the sitemap to `publishedAt` timestamps rather than failing the
 * build.
 */
export async function getBackendLastModified(): Promise<BackendLastModified> {
	const result: BackendLastModified = {
		news: new Map<string, Date>(),
		categories: new Map<string, Date>(),
	}

	let xml: string | null

	try {
		xml = await fetchSitemapXml(BACKEND_SITEMAP_PATH)
	} catch (error) {
		console.warn("[sitemap] backend sitemap unreachable", error)

		return result
	}

	if (!xml) {
		return result
	}

	const parsed = parseSitemapXml(xml)

	if (!parsed.isIndex) {
		collectEntries(parsed.entries, result)

		return result
	}

	// A sitemap index: every child has to be read to see any timestamps at all.
	const children = parsed.entries.slice(0, MAX_CHILD_SITEMAPS)

	if (parsed.entries.length > MAX_CHILD_SITEMAPS) {
		console.warn(
			`[sitemap] backend sitemap index lists ${parsed.entries.length} children; only the first ${MAX_CHILD_SITEMAPS} were read.`,
		)
	}

	for (const child of children) {
		try {
			const childXml = await fetchSitemapXml(child.loc)

			if (childXml) {
				collectEntries(parseSitemapXml(childXml).entries, result)
			}
		} catch (error) {
			console.warn(`[sitemap] child sitemap ${child.loc} failed`, error)
		}
	}

	return result
}
