import type { Metadata } from "next"

import { getApiBaseUrl } from "@/lib/api"
import { formatPersianNumber, truncate } from "@/lib/format"
import type { NewsSeoDates } from "@/lib/news"
import type { Category } from "@/types/category"
import type { NewsDetail } from "@/types/news"

/**
 * STAGE 9 — the single source of truth for everything a crawler or a social
 * card reads.
 *
 * WHY ONE MODULE: canonical URLs, Open Graph, Twitter cards, JSON-LD, the
 * sitemap and robots.txt all have to agree on the site's origin and on the
 * shape of every path. Spreading that across six route files is how a
 * canonical ends up pointing at one URL while the JSON-LD claims another.
 * Every route imports its metadata from here, and `app/sitemap.ts` builds its
 * URLs with the same `newsPath` / `categoryPath` helpers the pages link with.
 */

/* -------------------------------------------------------------------------- */
/* Site constants                                                             */
/* -------------------------------------------------------------------------- */

export const SITE_NAME = "رحیق خبر"

export const SITE_DESCRIPTION =
	"رحیق خبر — پایگاه خبری فارسی‌زبان با پوشش اخبار سیاسی، ایران، جنگ و درگیری و متفرقه."

/**
 * The homepage title. It is NOT `SITE_NAME`: a `<title>` of just the site name
 * says nothing to someone reading a search result, so the homepage gets a
 * one-line description of what the site is.
 */
export const HOME_TITLE = "رحیق خبر — پایگاه خبری فارسی‌زبان"

/** Open Graph wants `fa_IR`; schema.org and `<html lang>` want `fa-IR`. */
export const SITE_LOCALE = "fa_IR"
export const CONTENT_LANGUAGE = "fa-IR"

/**
 * Length limits. None of these are hard protocol limits — they are the points
 * past which the text is cut off in the places it actually appears:
 *   - 160 characters: where Google truncates a description snippet.
 *   - 100 characters: where a share card clips a title on a narrow phone.
 *   - 110 characters: Google's documented `headline` limit for NewsArticle.
 */
export const META_DESCRIPTION_MAX_LENGTH = 160
export const SHARE_TITLE_MAX_LENGTH = 100
export const JSON_LD_HEADLINE_MAX_LENGTH = 110

/* -------------------------------------------------------------------------- */
/* Origin                                                                     */
/* -------------------------------------------------------------------------- */

const SITE_URL_ENV = "NEXT_PUBLIC_SITE_URL"
const DEV_FALLBACK_SITE_URL = "http://localhost:3000"

/** Thrown for a misconfigured origin, which is a deployment bug, not user input. */
export class SeoConfigError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "SeoConfigError"
	}
}

// Module-level so a build does not print the same warning once per page.
let warnedAboutFallback = false
let warnedAboutPath = false

function normaliseOrigin(raw: string): string {
	let parsed: URL

	try {
		parsed = new URL(raw)
	} catch {
		throw new SeoConfigError(
			`${SITE_URL_ENV} is not a valid absolute URL: "${raw}". Expected something like https://example.com (origin only, no trailing slash).`,
		)
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new SeoConfigError(
			`${SITE_URL_ENV} must use http or https, got "${parsed.protocol}".`,
		)
	}

	// A path, query or fragment here would be silently dropped by `.origin`, so
	// say so instead of producing canonicals nobody asked for.
	if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
		if (!warnedAboutPath) {
			warnedAboutPath = true
			console.warn(
				`[seo] ${SITE_URL_ENV} contains a path, query or fragment ("${raw}"); only the origin ${parsed.origin} is used.`,
			)
		}
	}

	return parsed.origin
}

/**
 * The public origin of THIS frontend.
 *
 * WHY IT THROWS IN PRODUCTION: every canonical, `og:url`, sitemap entry and
 * `Sitemap:` line in robots.txt is an absolute URL. With no configured origin
 * the only options are to guess one or to emit relative values — and a
 * canonical pointing at `http://localhost:3000` is worse than a failed build,
 * because it silently tells Google the real site is a copy of a machine it
 * cannot reach. So a production build without `NEXT_PUBLIC_SITE_URL` fails
 * loudly and immediately.
 *
 * In development it falls back to localhost with a one-time warning, so
 * `next dev` works with no setup.
 */
export function getSiteUrl(): string {
	const raw = process.env[SITE_URL_ENV]?.trim()

	if (raw) {
		return normaliseOrigin(raw)
	}

	if (process.env.NODE_ENV === "production") {
		throw new SeoConfigError(
			`${SITE_URL_ENV} is required for production builds. It is the public origin of this site (e.g. https://example.com) and is used for canonical URLs, Open Graph, the sitemap and robots.txt.`,
		)
	}

	if (!warnedAboutFallback) {
		warnedAboutFallback = true
		console.warn(
			`[seo] ${SITE_URL_ENV} is not set; falling back to ${DEV_FALLBACK_SITE_URL} for development only.`,
		)
	}

	return DEV_FALLBACK_SITE_URL
}

/** Absolute URL on this site. `path` must start with a slash. */
export function absoluteUrl(path: string): string {
	return new URL(path, `${getSiteUrl()}/`).toString()
}

/** The one place that knows what an article URL looks like. */
export function newsPath(slug: string): string {
	return `/news/${encodeURIComponent(slug)}`
}

/**
 * The one place that knows what a category URL looks like, including the
 * `/page/N` form — and that page 1 has no suffix, because `…/page/1`
 * redirects to the bare path.
 */
export function categoryPath(slug: string, page = 1): string {
	const base = `/category/${encodeURIComponent(slug)}`

	return page > 1 ? `${base}/page/${page}` : base
}

/* -------------------------------------------------------------------------- */
/* Share images                                                               */
/* -------------------------------------------------------------------------- */

export interface ShareImage {
	url: string
	width?: number
	height?: number
	alt?: string
}

/**
 * A static 1200×630 card committed under `public/`.
 *
 * WHY NOT `next/og`: generating the card at request time means shipping a
 * Persian font binary to the edge runtime and rendering RTL text in Satori.
 * The site has one brand card with no per-article text, so a pre-rendered PNG
 * is the same output with none of the runtime risk.
 */
const DEFAULT_SHARE_IMAGE_PATH = "/og-default.png"
const DEFAULT_SHARE_IMAGE_WIDTH = 1200
const DEFAULT_SHARE_IMAGE_HEIGHT = 630
const DEFAULT_SHARE_IMAGE_ALT = SITE_NAME

/** The real logo, used for `publisher.logo` in JSON-LD. */
const PUBLISHER_LOGO_PATH = "/logo-rahigh-khabar.png"
const PUBLISHER_LOGO_WIDTH = 1175
const PUBLISHER_LOGO_HEIGHT = 745

export function defaultShareImage(): ShareImage {
	return {
		url: absoluteUrl(DEFAULT_SHARE_IMAGE_PATH),
		width: DEFAULT_SHARE_IMAGE_WIDTH,
		height: DEFAULT_SHARE_IMAGE_HEIGHT,
		alt: DEFAULT_SHARE_IMAGE_ALT,
	}
}

/**
 * Cover images live on the BACKEND origin, not this one, and the API returns
 * them as root-relative paths. Social crawlers do not resolve relative URLs,
 * so they are resolved against the API origin here.
 *
 * The trailing slash is normalised first: whether `getApiBaseUrl()` ends in
 * one is not this module's business, and `//uploads/x.jpg` is a different URL.
 */
function absoluteMediaUrl(url: string): string | null {
	try {
		const origin = getApiBaseUrl().replace(/\/+$/, "")

		return new URL(url, `${origin}/`).toString()
	} catch {
		// A malformed cover URL must not take a page's metadata down with it.
		return null
	}
}

/** The article's own cover as a share image, or `null` when it has none. */
export function coverShareImage(news: NewsDetail): ShareImage | null {
	if (!news.coverImage) {
		return null
	}

	const url = absoluteMediaUrl(news.coverImage.url)

	if (!url) {
		return null
	}

	return {
		url,
		...(news.coverImage.width ? { width: news.coverImage.width } : {}),
		...(news.coverImage.height ? { height: news.coverImage.height } : {}),
		alt: news.coverImage.altText ?? news.title,
	}
}

/* -------------------------------------------------------------------------- */
/* Text                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * First non-empty candidate, trimmed to snippet length.
 *
 * The call sites pass `metaDescription`, then `summary`, then the `lead`: the
 * order of how deliberately each field was written to be a description.
 */
export function metaDescription(
	...candidates: Array<string | null | undefined>
): string {
	for (const candidate of candidates) {
		const text = candidate?.trim()

		if (text) {
			return truncate(text, META_DESCRIPTION_MAX_LENGTH)
		}
	}

	return SITE_DESCRIPTION
}

/** Titles for share cards, where the clipping point is much earlier. */
export function shareTitle(title: string): string {
	return truncate(title.trim(), SHARE_TITLE_MAX_LENGTH)
}

/**
 * " — صفحهٔ ۲" for page 2+, nothing for page 1.
 *
 * Page 2 of a listing MUST NOT share a title with page 1: identical titles
 * across paginated pages are a duplicate-content signal.
 */
export function categoryPageSuffix(page: number): string {
	return page > 1 ? ` — صفحهٔ ${formatPersianNumber(page)}` : ""
}

/* -------------------------------------------------------------------------- */
/* Metadata builders                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The public site's shared Open Graph / Twitter defaults.
 *
 * Used by `app/(site)/layout.tsx` only. Next.js REPLACES `openGraph` rather
 * than merging it field by field, so every builder below returns a COMPLETE
 * block instead of relying on these values being inherited.
 */
export function buildSiteMetadata(): Metadata {
	const image = defaultShareImage()

	return {
		openGraph: {
			type: "website",
			siteName: SITE_NAME,
			locale: SITE_LOCALE,
			url: absoluteUrl("/"),
			title: HOME_TITLE,
			description: SITE_DESCRIPTION,
			images: [image],
		},
		twitter: {
			card: "summary_large_image",
			title: HOME_TITLE,
			description: SITE_DESCRIPTION,
			images: [image.url],
		},
	}
}

/** The homepage: its own title, its own canonical `/`. */
export function buildHomeMetadata(): Metadata {
	const canonical = absoluteUrl("/")
	const image = defaultShareImage()

	return {
		// Absolute: the `%s | رحیق خبر` template would repeat the name here.
		title: { absolute: HOME_TITLE },
		description: SITE_DESCRIPTION,
		alternates: { canonical },
		openGraph: {
			type: "website",
			siteName: SITE_NAME,
			locale: SITE_LOCALE,
			url: canonical,
			title: HOME_TITLE,
			description: SITE_DESCRIPTION,
			images: [image],
		},
		twitter: {
			card: "summary_large_image",
			title: HOME_TITLE,
			description: SITE_DESCRIPTION,
			images: [image.url],
		},
	}
}

/**
 * One article.
 *
 * `article:published_time` prefers the SEO endpoint's value and falls back to
 * the article's own `publishedAt`; `article:modified_time` is emitted only when
 * a real one came back, never faked from "now".
 */
export function buildNewsMetadata(
	news: NewsDetail,
	seoDates: NewsSeoDates | null,
): Metadata {
	const canonical = absoluteUrl(newsPath(news.slug))
	const description = metaDescription(
		news.metaDescription,
		news.summary,
		news.lead,
	)
	const image = coverShareImage(news) ?? defaultShareImage()
	const headline = news.seoTitle ?? news.title
	const publishedTime = seoDates?.datePublished ?? news.publishedAt ?? undefined
	const modifiedTime = seoDates?.dateModified ?? undefined
	const primaryCategory = news.categories[0]

	return {
		// `seoTitle` is an editorial override, so it skips the title template.
		title: news.seoTitle ? { absolute: news.seoTitle } : news.title,
		description,
		alternates: { canonical },
		openGraph: {
			// A fixed shape with `undefined` values, not conditional spreads:
			// Next.js omits undefined fields anyway, and keeping `type` literal in
			// one object literal keeps the discriminated union narrowable.
			type: "article",
			siteName: SITE_NAME,
			locale: SITE_LOCALE,
			url: canonical,
			title: shareTitle(headline),
			description,
			images: [image],
			authors: [news.author.displayName],
			publishedTime,
			modifiedTime,
			section: primaryCategory?.name,
			tags:
				news.categories.length > 0
					? news.categories.map((category) => category.name)
					: undefined,
		},
		twitter: {
			card: "summary_large_image",
			title: shareTitle(headline),
			description,
			images: [image.url],
		},
	}
}

/**
 * A category listing, page 1 or page N.
 *
 * EACH PAGE IS CANONICAL TO ITSELF. Pointing page 2 at page 1 would tell a
 * crawler the two are the same document when they list different articles,
 * which is how the articles on page 2 stop being discovered. `rel=prev/next`
 * is not emitted either: Google announced in 2019 that it no longer uses it,
 * and the pages are already reachable through real links.
 */
export function buildCategoryListingMetadata(
	category: Category,
	page: number,
): Metadata {
	const canonical = absoluteUrl(categoryPath(category.slug, page))
	const title = `${category.name}${categoryPageSuffix(page)}`
	const description = metaDescription(
		category.description,
		`آخرین اخبار دستهٔ «${category.name}» در رحیق خبر.`,
	)
	const image = defaultShareImage()

	return {
		title,
		description,
		alternates: { canonical },
		openGraph: {
			// A listing is not an article: no author, no publication time.
			type: "website",
			siteName: SITE_NAME,
			locale: SITE_LOCALE,
			url: canonical,
			title: shareTitle(`${title} | ${SITE_NAME}`),
			description,
			images: [image],
		},
		twitter: {
			card: "summary_large_image",
			title: shareTitle(`${title} | ${SITE_NAME}`),
			description,
			images: [image.url],
		},
	}
}

/**
 * A "not found" page.
 *
 * `noindex, follow`: the URL itself must not be indexed, but the links on the
 * 404 page (header nav, categories) are still worth following. No canonical is
 * emitted — a canonical on a 404 would nominate a URL that does not exist.
 */
export function buildNotFoundMetadata(title: string): Metadata {
	return {
		title,
		robots: { index: false, follow: true },
	}
}

/* -------------------------------------------------------------------------- */
/* Structured data                                                            */
/* -------------------------------------------------------------------------- */

/**
 * `NewsArticle` JSON-LD for one article.
 *
 * RULES IT FOLLOWS, all of them Google's own:
 *   - `headline` is the REAL headline the page shows, trimmed to 110
 *     characters. Structured data that disagrees with the visible `<h1>` is a
 *     spam signal, so `seoTitle` is deliberately NOT used here even though it
 *     is used for `<title>`.
 *   - `image` is omitted entirely when the article has no cover. An
 *     `ImageObject` pointing at the site logo would claim the logo depicts the
 *     story.
 *   - `datePublished` is omitted when the backend has none, and `dateModified`
 *     only appears when it differs from publication. No timestamp is invented.
 *   - `mainEntityOfPage` repeats the canonical URL, so the JSON-LD and the
 *     `<link rel="canonical">` cannot disagree.
 */
export function buildNewsArticleJsonLd(
	news: NewsDetail,
	seoDates: NewsSeoDates | null,
): Record<string, unknown> {
	const canonical = absoluteUrl(newsPath(news.slug))
	const cover = coverShareImage(news)
	const datePublished = seoDates?.datePublished ?? news.publishedAt ?? undefined
	const dateModified = seoDates?.dateModified ?? undefined

	return {
		"@context": "https://schema.org",
		"@type": "NewsArticle",
		headline: truncate(news.title, JSON_LD_HEADLINE_MAX_LENGTH),
		description: metaDescription(
			news.metaDescription,
			news.summary,
			news.lead,
		),
		inLanguage: CONTENT_LANGUAGE,
		url: canonical,
		mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
		author: { "@type": "Person", name: news.author.displayName },
		publisher: {
			"@type": "Organization",
			name: SITE_NAME,
			logo: {
				"@type": "ImageObject",
				url: absoluteUrl(PUBLISHER_LOGO_PATH),
				width: PUBLISHER_LOGO_WIDTH,
				height: PUBLISHER_LOGO_HEIGHT,
			},
		},
		...(cover ? { image: [cover.url] } : {}),
		...(datePublished ? { datePublished } : {}),
		...(dateModified && dateModified !== datePublished
			? { dateModified }
			: {}),
		...(news.categories.length > 0
			? { articleSection: news.categories.map((category) => category.name) }
			: {}),
	}
}

/**
 * Serialises a value for a `<script type="application/ld+json">` body.
 *
 * THE ESCAPING IS THE POINT. Article titles are editor-supplied text, and a
 * title containing `</script>` would otherwise close the tag and let the rest
 * of the string be parsed as HTML — stored XSS through structured data. JSON
 * allows any character to be written as `\uXXXX`, so `<`, `>` and `&` are
 * encoded that way: the JSON value is unchanged (a parser reads the original
 * characters back) while the HTML tokeniser can no longer find a tag in it.
 *
 * U+2028 and U+2029 are escaped too: both are legal in JSON strings but are
 * line terminators in JavaScript, which breaks any consumer that evaluates the
 * block instead of parsing it.
 */
export function jsonLdScriptContent(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029")
}
