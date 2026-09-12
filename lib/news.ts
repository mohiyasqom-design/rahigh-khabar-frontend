/**
 * Public news reads.
 *
 * Every call goes through `apiFetch` from `lib/api.ts` (never a bare `fetch`),
 * so the backend origin stays pinned and the error shape stays uniform.
 *
 * CONTRACT NOTES, verified against `news.public.routes.ts` / `news.schema.ts`:
 *   - `GET /news` accepts ONLY `page`, `pageSize` and `categorySlug`. The query
 *     schema is `.strict()`, so any extra parameter is a 400 — that is why the
 *     query string is built explicitly here instead of forwarding arbitrary
 *     search params from the URL.
 *   - `pageSize` is capped at 100 by the backend and `page` at 100000.
 *   - the endpoint already filters to `status = PUBLISHED` server-side and
 *     orders by `publishedAt` desc (nulls last), so the frontend never filters
 *     or re-sorts.
 *   - `GET /news/:slug` answers 404 `NEWS_NOT_FOUND` both for a slug that does
 *     not exist and for one that exists but is not published. The two cases are
 *     indistinguishable by design, so both surface as "not found".
 *   - there is no search endpoint, so there is no search function here.
 */
import { adminFetch, adminJson, adminQuery } from "@/lib/admin-api"
import { ApiError, apiFetch } from "@/lib/api"
import { publicCache } from "@/lib/cache"
import type { Paginated } from "@/types/api"
import type {
	AdminNewsItem,
	NewsDetail,
	NewsListItem,
	NewsStatus,
	NewsUpdateInput,
	NewsWriteInput,
} from "@/types/news"

/** Backend-enforced bounds, mirrored so callers fail here rather than with a 400. */
const MAX_PAGE_SIZE = 100
const MAX_PAGE = 100_000

/** Items per page on the category listing. */
export const CATEGORY_PAGE_SIZE = 12

export interface NewsQuery {
	page?: number
	pageSize?: number
	categorySlug?: string
}

function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return min
	}

	return Math.min(Math.max(Math.trunc(value), min), max)
}

/**
 * One page of the published news feed, optionally narrowed to a category.
 *
 * @throws ApiError when the backend is unreachable or answers non-2xx. Callers
 * on pages deliberately let this propagate to the route's `error.tsx` instead
 * of rendering an empty page that looks like "no news".
 */
export async function getNewsPage(
	query: NewsQuery = {},
): Promise<Paginated<NewsListItem>> {
	const search = new URLSearchParams({
		page: String(clamp(query.page ?? 1, 1, MAX_PAGE)),
		pageSize: String(clamp(query.pageSize ?? CATEGORY_PAGE_SIZE, 1, MAX_PAGE_SIZE)),
	})

	// Only send the parameter when there is a value: the query schema is strict,
	// and `categorySlug=` (empty) would be rejected.
	if (query.categorySlug) {
		search.set("categorySlug", query.categorySlug)
	}

	return apiFetch<Paginated<NewsListItem>>(`news?${search.toString()}`, publicCache)
}

/** The newest published items, in backend order. */
export async function getLatestNews(limit: number): Promise<NewsListItem[]> {
	const { items } = await getNewsPage({ page: 1, pageSize: limit })
	return items
}

/**
 * A single article, or null when it is missing, unpublished or archived.
 *
 * Only a 404 becomes null. Any other failure (500, network, misconfigured
 * `NEXT_PUBLIC_API_URL`) is re-thrown, so a broken backend renders an error
 * page rather than a misleading "article not found".
 */
export async function getNewsBySlug(slug: string): Promise<NewsDetail | null> {
	try {
		return await apiFetch<NewsDetail>(
			`news/${encodeURIComponent(slug)}`,
			publicCache,
		)
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return null
		}

		throw error
	}
}

/* -------------------------------------------------------------------------- */
/* Stage 9 — SEO timestamps                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The two timestamps the SEO layer needs, from the backend's structured-data
 * endpoint.
 *
 * WHY A SECOND CALL: the public `GET /news/:slug` payload has no `updatedAt`,
 * so an article corrected after publication has no visible modification time.
 * `GET /news/:slug/structured-data` is the only public endpoint that exposes
 * one (`dateModified`), and it exists precisely for SEO, so reading it needs no
 * backend change.
 *
 * ONLY THE DATES ARE USED. That endpoint returns a whole JSON-LD document, but
 * this frontend builds its own from the fields the page actually renders, with
 * its own canonical URLs and its own escaping, rather than forwarding a payload
 * whose `url` and `@id` are built from the BACKEND's `PUBLIC_SITE_URL`.
 *
 * A missing or unpublished article is `null`, exactly like `getNewsBySlug`. Any
 * other failure is also `null`, with a warning: no page should fail to render
 * because one optional timestamp could not be fetched.
 */
export interface NewsSeoDates {
	datePublished: string | null
	dateModified: string
}

export async function getNewsSeoDates(
	slug: string,
): Promise<NewsSeoDates | null> {
	try {
		const data = await apiFetch<{
			datePublished?: string | null
			dateModified?: string
		}>(`news/${encodeURIComponent(slug)}/structured-data`, publicCache)

		// `dateModified` is required by the backend's own schema; if it is missing
		// the response is not what this function is for.
		if (!data.dateModified) {
			return null
		}

		return {
			datePublished: data.datePublished ?? null,
			dateModified: data.dateModified,
		}
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return null
		}

		console.warn(`[seo] could not read structured data for ${slug}`, error)

		return null
	}
}

/* -------------------------------------------------------------------------- */
/* Stage 8 — authenticated news operations                                     */
/* -------------------------------------------------------------------------- */
/*
 * Everything below talks to `/admin/news`, always with a session cookie and
 * always uncached (`adminFetch`). None of it is used by the public pages, and
 * none of the public reads above were changed.
 *
 * CONTRACT NOTES, verified against `news.admin.routes.ts`, `news.schema.ts`
 * and `news.service.ts`:
 *   - the admin list query is `.strict()` and accepts only `page`, `pageSize`,
 *     `status` and `categoryId`; anything else (including `authorId`) is a 400.
 *   - an ADMIN's list is scoped to their own articles by the backend, a
 *     SUPER_ADMIN sees everything. The frontend does no filtering of its own.
 *   - articles are ordered `createdAt` desc, then `id` desc.
 *   - `POST /admin/news` always creates a DRAFT authored by the session user;
 *     `status`, `authorId` and `publishedAt` are rejected in the body.
 *   - `PATCH /admin/news/:id` needs at least one field.
 *   - `POST /admin/news/:id/status` is SUPER_ADMIN-only and rejects an
 *     unlisted transition with 400 `INVALID_STATUS_TRANSITION`.
 */
/** Rows per page in the dashboard (the backend caps `pageSize` at 100). */
export const ADMIN_PAGE_SIZE = 20

export interface AdminNewsQuery {
	page?: number
	pageSize?: number
	/** Omit for "all statuses within what this role may see". */
	status?: NewsStatus
	categoryId?: string
}

/** One page of the admin list. */
export function listAdminNews(
	query: AdminNewsQuery = {},
): Promise<Paginated<AdminNewsItem>> {
	const search = adminQuery({
		page: clamp(query.page ?? 1, 1, MAX_PAGE),
		pageSize: clamp(query.pageSize ?? ADMIN_PAGE_SIZE, 1, MAX_PAGE_SIZE),
		status: query.status,
		categoryId: query.categoryId,
	})

	return adminFetch<Paginated<AdminNewsItem>>(`admin/news${search}`)
}

/**
 * One article by its ID, with every admin-only field.
 *
 * 404 `NEWS_NOT_FOUND` and 403 `FORBIDDEN` are left to the caller: the editor
 * page shows a different message for "no such article" and "not yours".
 */
export function getAdminNews(id: string): Promise<AdminNewsItem> {
	return adminFetch<AdminNewsItem>(`admin/news/${encodeURIComponent(id)}`)
}

/** Creates a DRAFT. The response is the full article, including its new `id`. */
export function createNews(input: NewsWriteInput): Promise<AdminNewsItem> {
	return adminJson<AdminNewsItem>("admin/news", "POST", input)
}

/** Updates content fields. Send only what changed; at least one is required. */
export function updateNews(
	id: string,
	input: NewsUpdateInput,
): Promise<AdminNewsItem> {
	return adminJson<AdminNewsItem>(
		`admin/news/${encodeURIComponent(id)}`,
		"PATCH",
		input,
	)
}

/** Moves an article through the workflow. SUPER_ADMIN only, backend-enforced. */
export function changeNewsStatus(
	id: string,
	status: NewsStatus,
): Promise<AdminNewsItem> {
	return adminJson<AdminNewsItem>(
		`admin/news/${encodeURIComponent(id)}/status`,
		"POST",
		{ status },
	)
}
