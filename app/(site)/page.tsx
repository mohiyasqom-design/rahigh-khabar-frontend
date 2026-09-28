import type { Metadata } from "next"

import EmptyState from "@/components/EmptyState"
import FeaturedSlider from "@/components/FeaturedSlider"
import NewsCard from "@/components/NewsCard"
import { CompactNewsRow, RankedNewsRow } from "@/components/NewsRows"
import SectionHeading from "@/components/SectionHeading"
import ViewTracker from "@/components/ViewTracker"
import { getCategoriesForNav } from "@/lib/categories"
import { getNewsPage, type NewsQuery } from "@/lib/news"
import { buildHomeMetadata } from "@/lib/seo"
import type { NewsListItem } from "@/types/news"

/**
 * Homepage.
 *
 * LAYOUT — GROUP 1: a full-width slider of «اصلی» (featured-tagged) articles,
 * then the "آخرین اخبار" rail side by side with the sidebar, then one category
 * section. The slider replaces the single-story hero; the sidebar and the
 * rail are kept and only re-arranged below it.
 *
 * TAGS (Group 1) drive three spots, each with a fallback so the page never
 * looks broken:
 *   - slider: `GET /news?tag=featured`. None tagged -> the newest published
 *     article, shown as a static hero (one slide = no dots, no timer);
 *   - sidebar: `?tag=trending` titled "پربازدیدترین‌ها". None tagged -> the
 *     next newest articles, honestly titled "تازه‌ترین خبرها" (there is still
 *     no view counter; see below);
 *   - rail: articles tagged «تازه» are pinned first, then the date feed.
 *
 * (Original Stage 7 layout: hero + side list, then a horizontal rail of recent
 * stories, then one category section.)
 *
 * THE ONE HONEST SUBSTITUTION: the mockup's side list is titled
 * "پربازدیدترین‌ها" (most read). The backend has no view counter, no
 * popularity ordering and no endpoint that could produce one — `GET /news` can
 * only sort by publication date. Rather than invent a ranking or leave a dead
 * section, the list shows the next newest articles and is titled
 * "تازه‌ترین خبرها", which is exactly what it contains. The numbers are list
 * positions, not popularity.
 *
 * WHICH CATEGORY IS FEATURED: the first category returned by `GET /categories`.
 * That is a deterministic rule the editors control from the admin panel, not a
 * slug hardcoded in the frontend.
 *
 * NO DUPLICATES: the category section skips any article already shown above it,
 * so a site with only a handful of published items does not repeat the same
 * story three times.
 *
 * DATA COST: three backend reads (news feed, categories, category feed), all
 * sharing the same 60s cache window as every other page.
 *
 * BACKEND UNREACHABLE: every read on this page degrades instead of throwing.
 * Next.js prerenders this route during `next build` to produce ISR's initial
 * static shell, so the feed is fetched while the build runs — and an uncaught
 * fetch failure there aborts the export and fails the whole deployment. See
 * `loadFeedItems` below.
 */
// Must be a literal — Next.js statically parses this export and cannot resolve an imported identifier. Keep in sync with REVALIDATE_SECONDS in lib/cache.ts.
export const revalidate = 60

/**
 * STAGE 9 — static metadata rather than `generateMetadata()`: the homepage's
 * title, description and canonical do not depend on any fetched data, so there
 * is nothing to await.
 */
export const metadata: Metadata = buildHomeMetadata()

const HOME_FEED_SIZE = 16
const SIDEBAR_COUNT = 5
const RAIL_COUNT = 6
/** Group 1: how many «اصلی» (featured) articles the slider shows at most. */
const SLIDER_COUNT = 5
/** Group 1: manually «تازه»-tagged articles pinned at the head of the rail. */
const PINNED_LATEST_COUNT = 3
const SPOTLIGHT_FETCH_SIZE = 12
const SPOTLIGHT_CARDS = 2
const SPOTLIGHT_ROWS = 3

/**
 * One feed read that degrades to `null` instead of throwing.
 *
 * WHY: this route is prerendered at build time — that is how ISR's initial
 * static shell is produced — so a backend that is unreachable for the few
 * seconds the build happens to run (a restart, a network blip, a DNS
 * propagation window) used to reject here and take the whole `next build`
 * down with it. A deploy must never fail for a transient backend outage: the
 * build now ships a data-sparse shell, which the existing 60-second
 * revalidation refills as soon as the backend answers again.
 *
 * `null` MEANS "THE READ FAILED", which is not the same as an empty feed: `[]`
 * means the backend answered and has nothing published. The two render
 * different states below, and neither invents placeholder content.
 *
 * Nothing changes while the backend is reachable: same items, same order, same
 * cache window. It is the trade-off `getCategoriesForNav()` already makes for
 * the header nav, applied to the other read that runs during a build.
 */
async function loadFeedItems(query: NewsQuery): Promise<NewsListItem[] | null> {
	try {
		const { items } = await getNewsPage(query)

		return items
	} catch (error) {
		console.error("[home] could not load the news feed", error)

		return null
	}
}

export default async function HomePage() {
	// Every read degrades to null instead of throwing (see loadFeedItems), so a
	// backend outage during `next build` / ISR never fails the page or the build.
	const [feedItems, featuredItems, trendingItems, pinnedLatestItems, categories] =
		await Promise.all([
			loadFeedItems({ page: 1, pageSize: HOME_FEED_SIZE }),
			loadFeedItems({ page: 1, pageSize: SLIDER_COUNT, tag: "featured" }),
			loadFeedItems({ page: 1, pageSize: SIDEBAR_COUNT + SLIDER_COUNT, tag: "trending" }),
			loadFeedItems({ page: 1, pageSize: PINNED_LATEST_COUNT, tag: "latest" }),
			getCategoriesForNav(),
		])

	// The feed could not be read at all. Deliberately NOT worded as "nothing has
	// been published yet": that would be a claim about the archive when it is
	// really the connection that is down.
	if (feedItems === null) {
		return (
			<EmptyState
				title="نمایش خبرها در این لحظه ممکن نیست"
				description="ارتباط با سرویس خبر برقرار نشد. این صفحه به‌محض برقراری ارتباط، به‌صورت خودکار به‌روز می‌شود."
			/>
		)
	}

	// Group 1 — slider: featured-tagged articles; with none tagged (or the
	// tagged read failing) fall back to the newest published article.
	const featured = featuredItems ?? []
	const newest = feedItems[0]
	const slides: NewsListItem[] = featured.length > 0 ? featured : newest ? [newest] : []

	if (slides.length === 0) {
		return (
			<EmptyState
				title="هنوز خبری منتشر نشده است"
				description="به‌محض انتشار نخستین خبر، این صفحه به‌صورت خودکار به‌روز می‌شود."
			/>
		)
	}

	const shown = new Set(slides.map((item) => item.slug))
	const notShown = (item: NewsListItem) => !shown.has(item.slug)

	// Sidebar: editor-picked «پربازدید» first; otherwise the next newest items.
	const trending = (trendingItems ?? []).filter(notShown).slice(0, SIDEBAR_COUNT)
	const sidebarIsTrending = trending.length > 0
	const sidebar = sidebarIsTrending
		? trending
		: feedItems.filter(notShown).slice(0, SIDEBAR_COUNT)
	sidebar.forEach((item) => shown.add(item.slug))

	// Rail: manually «تازه»-tagged items pinned first, then the date feed.
	const railSource = [...(pinnedLatestItems ?? []), ...feedItems]
	const rail: NewsListItem[] = []
	for (const item of railSource) {
		if (rail.length >= RAIL_COUNT) break
		if (shown.has(item.slug)) continue
		shown.add(item.slug)
		rail.push(item)
	}

	const spotlightCategory = categories[0]
	// Same treatment for the category section: a failed read empties that one
	// section instead of failing the page or the build.
	const spotlightFeedItems = spotlightCategory
		? await loadFeedItems({
				categorySlug: spotlightCategory.slug,
				pageSize: SPOTLIGHT_FETCH_SIZE,
			})
		: null

	const spotlightItems = (spotlightFeedItems ?? []).filter(
		(item) => !shown.has(item.slug),
	)
	const spotlightCards = spotlightItems.slice(0, SPOTLIGHT_CARDS)
	const spotlightRows = spotlightItems.slice(
		SPOTLIGHT_CARDS,
		SPOTLIGHT_CARDS + SPOTLIGHT_ROWS,
	)

	return (
		<>
			{/* The slides use <h2>; the page keeps exactly one <h1>. */}
			<h1 className="sr-only">رحیق خبر — تازه‌ترین اخبار ایران، سیاست و منطقه</h1>
			{/* Group 3: homepage views feed the site-wide dashboard totals. */}
			<ViewTracker />

			{/* Group 1 — full-width slider of «اصلی» articles (static when only one). */}
			<FeaturedSlider items={slides} />

			{rail.length > 0 || sidebar.length > 0 ? (
				<section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
					{rail.length > 0 ? (
						<div className={sidebar.length > 0 ? "min-w-0 lg:col-span-2" : "min-w-0 lg:col-span-3"}>
							{/* The mockup puts a "مشاهده همه" link here. There is no global
							    archive route in this stage, so the link is omitted rather than
							    pointed at a page that does not exist. */}
							<SectionHeading title="آخرین اخبار" />
							<div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
								{rail.map((item) => (
									<div key={item.slug} className="w-[260px] shrink-0">
										<NewsCard news={item} variant="rail" sizes="260px" />
									</div>
								))}
							</div>
						</div>
					) : null}

					{sidebar.length > 0 ? (
						<aside className={rail.length > 0 ? "" : "lg:col-span-3"}>
							<SectionHeading
								title={sidebarIsTrending ? "پربازدیدترین‌ها" : "تازه‌ترین خبرها"}
								marker="link"
								size="sm"
							/>
							<div className="flex flex-col">
								{sidebar.map((item, index) => (
									<RankedNewsRow key={item.slug} news={item} rank={index + 1} />
								))}
							</div>
						</aside>
					) : null}
				</section>
			) : null}

			{spotlightCategory && spotlightCards.length > 0 ? (
				<section>
					<SectionHeading
						title={spotlightCategory.name}
						marker="accent"
						action={{
							href: `/category/${spotlightCategory.slug}`,
							label: "مشاهده همه",
						}}
					/>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{spotlightCards.map((item) => (
							<NewsCard
								key={item.slug}
								news={item}
								sizes="(max-width: 768px) 100vw, 560px"
							/>
						))}
					</div>

					{spotlightRows.length > 0 ? (
						<div className="mt-6 flex flex-col">
							{spotlightRows.map((item) => (
								<CompactNewsRow key={item.slug} news={item} />
							))}
						</div>
					) : null}
				</section>
			) : null}
		</>
	)
}
