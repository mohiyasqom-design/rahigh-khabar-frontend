import type { Metadata } from "next"

import EmptyState from "@/components/EmptyState"
import FeaturedNews from "@/components/FeaturedNews"
import NewsCard from "@/components/NewsCard"
import { CompactNewsRow, RankedNewsRow } from "@/components/NewsRows"
import SectionHeading from "@/components/SectionHeading"
import { getCategoriesForNav } from "@/lib/categories"
import { getNewsPage, type NewsQuery } from "@/lib/news"
import { buildHomeMetadata } from "@/lib/seo"
import type { NewsListItem } from "@/types/news"

/**
 * Homepage.
 *
 * LAYOUT (from the signed-off mockup): hero + side list, then a horizontal
 * rail of recent stories, then one category section.
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

const HOME_FEED_SIZE = 10
const SIDEBAR_COUNT = 5
const RAIL_COUNT = 4
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
	const [feedItems, categories] = await Promise.all([
		loadFeedItems({ page: 1, pageSize: HOME_FEED_SIZE }),
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

	const featured = feedItems[0]

	if (!featured) {
		return (
			<EmptyState
				title="هنوز خبری منتشر نشده است"
				description="به‌محض انتشار نخستین خبر، این صفحه به‌صورت خودکار به‌روز می‌شود."
			/>
		)
	}

	const sidebar = feedItems.slice(1, 1 + SIDEBAR_COUNT)
	const rail = feedItems.slice(1 + SIDEBAR_COUNT, 1 + SIDEBAR_COUNT + RAIL_COUNT)

	const spotlightCategory = categories[0]
	// Same treatment for the category section: a failed read empties that one
	// section instead of failing the page or the build.
	const spotlightFeedItems = spotlightCategory
		? await loadFeedItems({
				categorySlug: spotlightCategory.slug,
				pageSize: SPOTLIGHT_FETCH_SIZE,
			})
		: null

	const alreadyShown = new Set(feedItems.map((item) => item.slug))
	const spotlightItems = (spotlightFeedItems ?? []).filter(
		(item) => !alreadyShown.has(item.slug),
	)
	const spotlightCards = spotlightItems.slice(0, SPOTLIGHT_CARDS)
	const spotlightRows = spotlightItems.slice(
		SPOTLIGHT_CARDS,
		SPOTLIGHT_CARDS + SPOTLIGHT_ROWS,
	)

	return (
		<>
			<section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className={sidebar.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
					<FeaturedNews news={featured} />
				</div>

				{sidebar.length > 0 ? (
					<aside>
						<SectionHeading title="تازه‌ترین خبرها" marker="link" size="sm" />
						<div className="flex flex-col">
							{sidebar.map((item, index) => (
								<RankedNewsRow key={item.slug} news={item} rank={index + 1} />
							))}
						</div>
					</aside>
				) : null}
			</section>

			{rail.length > 0 ? (
				<section className="mb-10">
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
