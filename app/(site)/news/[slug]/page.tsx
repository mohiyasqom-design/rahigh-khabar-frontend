import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import NewsCard from "@/components/NewsCard"
import SectionHeading from "@/components/SectionHeading"
import { formatJalaliDateTime, toParagraphs } from "@/lib/format"
import { getNewsBySlug, getNewsPage, getNewsSeoDates } from "@/lib/news"
import {
	buildNewsArticleJsonLd,
	buildNewsMetadata,
	buildNotFoundMetadata,
	jsonLdScriptContent,
} from "@/lib/seo"

/**
 * News detail page.
 *
 * NOT FOUND: `GET /news/:slug` answers 404 both for a slug that does not exist
 * and for one that exists but is not published (draft, in review, rejected,
 * archived). The backend makes them indistinguishable on purpose — an
 * unpublished article must not be discoverable — so both render the same 404.
 *
 * BODY IS TEXT, NOT MARKUP: `body` is a plain `String @db.Text` with no
 * declared format and no server-side sanitisation. It is split into paragraphs
 * on blank lines and rendered as text; `dangerouslySetInnerHTML` is never used
 * for it, because trusting that column would be a stored-XSS hole the moment
 * any editor account is compromised. It IS used for the JSON-LD block below —
 * the only way to fill a `<script>` tag in React — on a string that
 * `jsonLdScriptContent` has escaped so that it cannot contain a tag at all.
 *
 * NO SOURCE ATTRIBUTION: the mockup shows "منبع: …" under the headline. There
 * is no source field anywhere in the News model, so the byline shows the real
 * author name and publication time instead of an invented source.
 *
 * TWO CALLS, ONE REQUEST: `generateMetadata` and the page body both call
 * `getNewsBySlug`. Both go through the same fetch Data Cache entry, so the
 * backend is hit once per render, not twice. The same is true of the new
 * `getNewsSeoDates` call.
 *
 * STAGE 9 — this page emits full article metadata (canonical, Open Graph with
 * the real cover image, Twitter card) plus `NewsArticle` JSON-LD. The
 * modification time comes from `GET /news/:slug/structured-data`, the only
 * public endpoint that exposes `updatedAt`. That call is allowed to fail: the
 * page then keeps its publication date and omits `dateModified` rather than
 * inventing one.
 */
// Must be a literal — Next.js statically parses this export and cannot resolve an imported identifier. Keep in sync with REVALIDATE_SECONDS in lib/cache.ts.
export const revalidate = 60

const RELATED_COUNT = 3

type NewsPageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({
	params,
}: NewsPageProps): Promise<Metadata> {
	const { slug } = await params
	// A backend failure must not break metadata generation; the page render below
	// surfaces the real error through the route's error boundary.
	const [news, seoDates] = await Promise.all([
		getNewsBySlug(slug).catch(() => null),
		getNewsSeoDates(slug).catch(() => null),
	])

	if (!news) {
		return buildNotFoundMetadata("خبر پیدا نشد")
	}

	// `lib/seo.ts` owns the description fallback chain, the share images and the
	// rule that `seoTitle` skips the root layout's title template.
	return buildNewsMetadata(news, seoDates)
}

export default async function NewsDetailPage({ params }: NewsPageProps) {
	const { slug } = await params
	const [news, seoDates] = await Promise.all([
		getNewsBySlug(slug),
		// The SEO endpoint is a nice-to-have: losing it costs one timestamp in the
		// structured data, not the page.
		getNewsSeoDates(slug).catch(() => null),
	])

	if (!news) {
		notFound()
	}

	const paragraphs = toParagraphs(news.body)
	const publishedLabel = formatJalaliDateTime(news.publishedAt)
	const publishedAt = news.publishedAt
	const primaryCategory = news.categories[0]

	const related = primaryCategory
		? (
				await getNewsPage({
					categorySlug: primaryCategory.slug,
					pageSize: RELATED_COUNT + 1,
				})
			).items
				.filter((item) => item.slug !== news.slug)
				.slice(0, RELATED_COUNT)
		: []

	const jsonLd = jsonLdScriptContent(buildNewsArticleJsonLd(news, seoDates))

	return (
		<>
			{/* The payload is escaped by `jsonLdScriptContent`, so it cannot close
			    this tag or open another one. See the note at the top of the file. */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: jsonLd }}
			/>

			<article className="mx-auto w-full max-w-3xl">
				{primaryCategory ? (
					<nav aria-label="مسیر" className="mb-4 text-xs text-muted">
						<Link href="/" className="hover:text-accent">
							صفحه اصلی
						</Link>
						<span className="px-2" aria-hidden="true">
							/
						</span>
						<Link
							href={`/category/${primaryCategory.slug}`}
							className="hover:text-accent"
						>
							{primaryCategory.name}
						</Link>
					</nav>
				) : null}

				<h1 className="text-2xl font-extrabold leading-[1.45] tracking-headline sm:text-[32px]">
					{news.title}
				</h1>

				<p className="mt-4 text-lg leading-[1.9] text-muted-dark">{news.lead}</p>

				<div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3 text-xs text-muted">
					<span>{news.author.displayName}</span>
					{publishedAt && publishedLabel ? (
						<time dateTime={publishedAt}>{publishedLabel}</time>
					) : null}
				</div>

				{news.coverImage ? (
					<figure className="relative mt-6 aspect-[16/9] overflow-hidden rounded-md bg-border">
						<Image
							src={news.coverImage.url}
							alt={news.coverImage.altText ?? ""}
							fill
							priority
							sizes="(max-width: 768px) 100vw, 768px"
							className="object-cover"
						/>
					</figure>
				) : null}

				<div className="mt-8 flex flex-col gap-5 text-[17px] leading-[2] text-ink">
					{paragraphs.map((paragraph, index) => (
						<p key={index} className="whitespace-pre-line">
							{paragraph}
						</p>
					))}
				</div>

				{news.categories.length > 0 ? (
					<div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
						{news.categories.map((category) => (
							<Link
								key={category.slug}
								href={`/category/${category.slug}`}
								className="rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-dark transition-colors hover:border-accent hover:text-accent"
							>
								{category.name}
							</Link>
						))}
					</div>
				) : null}
			</article>

			{related.length > 0 && primaryCategory ? (
				<section className="mx-auto mt-12 w-full max-w-3xl">
					<SectionHeading
						title="اخبار مرتبط"
						marker="accent"
						action={{
							href: `/category/${primaryCategory.slug}`,
							label: "مشاهده همه",
						}}
					/>
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
						{related.map((item) => (
							<NewsCard
								key={item.slug}
								news={item}
								variant="rail"
								sizes="(max-width: 640px) 100vw, 240px"
							/>
						))}
					</div>
				</section>
			) : null}
		</>
	)
}
