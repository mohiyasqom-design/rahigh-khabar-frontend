import type { Metadata } from "next"

import EmptyState from "@/components/EmptyState"
import FeaturedNews from "@/components/FeaturedNews"
import NewsCard from "@/components/NewsCard"
import { CompactNewsRow, RankedNewsRow } from "@/components/NewsRows"
import SectionHeading from "@/components/SectionHeading"
import { getCategoriesForNav } from "@/lib/categories"
import { getNewsPage } from "@/lib/news"
import { buildHomeMetadata } from "@/lib/seo"

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

export default async function HomePage() {
	const [feed, categories] = await Promise.all([
		getNewsPage({ page: 1, pageSize: HOME_FEED_SIZE }),
		getCategoriesForNav(),
	])

	const featured = feed.items[0]

	if (!featured) {
		return (
			<EmptyState
				title="هنوز خبری منتشر نشده است"
				description="به‌محض انتشار نخستین خبر، این صفحه به‌صورت خودکار به‌روز می‌شود."
			/>
		)
	}

	const sidebar = feed.items.slice(1, 1 + SIDEBAR_COUNT)
	const rail = feed.items.slice(1 + SIDEBAR_COUNT, 1 + SIDEBAR_COUNT + RAIL_COUNT)

	const spotlightCategory = categories[0]
	const spotlightFeed = spotlightCategory
		? await getNewsPage({
				categorySlug: spotlightCategory.slug,
				pageSize: SPOTLIGHT_FETCH_SIZE,
			})
		: null

	const alreadyShown = new Set(feed.items.map((item) => item.slug))
	const spotlightItems = (spotlightFeed?.items ?? []).filter(
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
