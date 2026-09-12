import type { Category } from "./category"
import type { NewsCoverImage } from "./media"

/**
 * One item of `GET /news` (the public, published-only feed).
 *
 * Taken field-by-field from the backend's `publicProperties` response schema.
 *
 * TWO THINGS TO NOTE, because they shape the whole frontend:
 *
 * 1. There is no `id`. The public list and detail schemas do not expose it, so
 *    `slug` is the only public identifier — and `GET /news/:slug` is the only
 *    detail route. Every link and every React key therefore uses `slug`.
 * 2. There is no `source`, no view/read counter and no "featured" flag in the
 *    schema (or in the Prisma model), so nothing in the UI may claim a news
 *    source, a "most read" ranking or an editorial pick.
 */
export interface NewsListItem {
	title: string
	slug: string
	/** Optional short teaser; nullable in the database. */
	summary: string | null
	/** Required opening paragraph — always present. */
	lead: string
	/** ISO-8601 string, or null for published rows without a date set. */
	publishedAt: string | null
	author: { displayName: string }
	coverImage: NewsCoverImage | null
	categories: Category[]
}

/**
 * `GET /news/:slug` — the list shape plus the article body and SEO overrides.
 *
 * `body` is stored as plain `String @db.Text` and is returned exactly as the
 * editor typed it: the backend declares no markup format and performs no HTML
 * sanitisation. It is therefore rendered as TEXT, never with
 * `dangerouslySetInnerHTML` (see `app/news/[slug]/page.tsx`).
 *
 * `updatedAt` is intentionally absent: the service selects it, but the Fastify
 * response schema is `additionalProperties: false` and does not list it, so it
 * is stripped before it reaches the wire.
 */
export interface NewsDetail extends NewsListItem {
	body: string
	seoTitle: string | null
	metaDescription: string | null
}

/* -------------------------------------------------------------------------- */
/* Stage 8 — admin (authenticated) shapes                                      */
/* -------------------------------------------------------------------------- */

/**
 * The workflow states, copied from the Prisma `NewsStatus` enum and the
 * backend's `newsStatusSchema`. The order here is the order of the enum, not a
 * workflow order — the real transition table lives in `lib/news-status.ts`.
 */
export type NewsStatus =
	| "DRAFT"
	| "IN_REVIEW"
	| "PUBLISHED"
	| "ARCHIVED"
	| "REJECTED"

/**
 * One item of the admin endpoints (`GET/POST /admin/news`, `GET|PATCH
 * /admin/news/:id`, `POST /admin/news/:id/status`).
 *
 * Taken from `adminNewsResponseSchema`: the public detail properties plus
 * `id`, `authorId`, `coverImageId`, `status`, `createdAt` and `updatedAt`.
 *
 * TWO DIFFERENCES FROM THE PUBLIC SHAPE THAT MATTER:
 *
 * 1. `id` exists here. The public API exposes only `slug`; every admin route
 *    is keyed by `id`, which is why the editor route is `/admin/news/[id]/edit`
 *    and not `[slug]`.
 * 2. The admin list returns the FULL record, `body` included — the service uses
 *    `include`, not a narrowed `select`, for admin reads.
 *
 * `author` is still only `{ displayName }`: even an admin response never
 * carries another user's email.
 */
export interface AdminNewsItem {
	id: string
	title: string
	slug: string
	summary: string | null
	lead: string
	body: string
	status: NewsStatus
	/** Set on FIRST publication only, and preserved across archive/re-publish. */
	publishedAt: string | null
	authorId: string
	author: { displayName: string }
	coverImageId: string | null
	coverImage: NewsCoverImage | null
	categories: Category[]
	seoTitle: string | null
	metaDescription: string | null
	createdAt: string
	updatedAt: string
}

/**
 * The body accepted by `POST /admin/news`, mirroring `createNewsSchema`.
 *
 * The schema is `.strict()`, so anything not listed here — `status`,
 * `authorId`, `publishedAt`, a stray typo — is rejected with 400 rather than
 * ignored. Status is never part of a write: a new article is always created as
 * `DRAFT` and only `POST /admin/news/:id/status` can move it.
 *
 * The nullable optionals (`summary`, `coverImageId`, `seoTitle`,
 * `metaDescription`) accept `null` to CLEAR the stored value; the required
 * fields do not accept null.
 */
export interface NewsWriteInput {
	/** 1–300 characters after trimming. */
	title: string
	/** Latin slug: `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–200 characters, unique. */
	slug: string
	/** Up to 2000 characters, or null to clear. */
	summary?: string | null
	/** 1–5000 characters. */
	lead: string
	/** 1–500000 characters. */
	body: string
	/** 1–50 existing, non-duplicated category IDs. */
	categoryIds: string[]
	/** An existing media ID (uploaded first), or null for no cover. */
	coverImageId?: string | null
	/** Up to 200 characters, or null to clear. */
	seoTitle?: string | null
	/** Up to 500 characters, or null to clear. */
	metaDescription?: string | null
}

/**
 * The body accepted by `PATCH /admin/news/:id` (`updateNewsSchema`): the same
 * fields, all optional, but at least one must be present or the backend
 * answers 400.
 */
export type NewsUpdateInput = Partial<NewsWriteInput>

/** Backend-enforced field limits, mirrored so the form can warn before a 400. */
export const NEWS_FIELD_LIMITS = {
	title: 300,
	slug: 200,
	summary: 2000,
	lead: 5000,
	body: 500_000,
	seoTitle: 200,
	metaDescription: 500,
	categories: 50,
} as const

/** The slug pattern enforced by the backend's `slugSchema`. */
export const NEWS_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
