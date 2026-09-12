import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import EmptyState from "@/components/EmptyState"
import NewsCard from "@/components/NewsCard"
import Pagination from "@/components/Pagination"
import { getCategoryBySlug } from "@/lib/categories"
import { formatPersianNumber } from "@/lib/format"
import { CATEGORY_PAGE_SIZE, getNewsPage } from "@/lib/news"
import { buildCategoryListingMetadata, buildNotFoundMetadata } from "@/lib/seo"

/**
 * Shared implementation behind both category routes:
 *
 *   /category/[slug]              → page 1  (canonical)
 *   /category/[slug]/page/[page]  → page 2+
 *
 * WHY TWO ROUTES INSTEAD OF ?page=N: reading `searchParams` opts a route into
 * dynamic rendering, which would disable static generation and the 60-second
 * revalidation for every category listing. A path segment stays statically
 * generatable and cacheable per page, and it is also the friendlier URL for
 * sharing and for crawlers. The cost is this small amount of routing plumbing,
 * which is why the actual page lives here and both routes are thin wrappers.
 *
 * NOT FOUND vs EMPTY — two different states, deliberately kept apart:
 *   - unknown slug        → 404 (not-found.tsx)
 *   - page number past the end → 404, so …/page/999 is not a soft 200
 *   - real category, no published articles → 200 with an empty-state panel
 */

/**
 * No `GET /categories/:slug` exists, so the slug is matched against the list.
 *
 * STAGE 9 — the title, description, canonical and Open Graph block now come
 * from `lib/seo.ts`, which also owns the rule that each paginated page is
 * canonical to ITSELF rather than to page 1: pointing page 2 at page 1 would
 * declare two different lists of articles to be the same document.
 */
export async function buildCategoryMetadata(
	slug: string,
	page: number,
): Promise<Metadata> {
	const category = await getCategoryBySlug(slug).catch(() => null)

	if (!category) {
		return buildNotFoundMetadata("دسته‌بندی پیدا نشد")
	}

	return buildCategoryListingMetadata(category, page)
}

export default async function CategoryListing({
	slug,
	page,
}: {
	slug: string
	page: number
}) {
	const category = await getCategoryBySlug(slug)

	if (!category) {
		notFound()
	}

	const feed = await getNewsPage({
		categorySlug: category.slug,
		page,
		pageSize: CATEGORY_PAGE_SIZE,
	})

	// Page 1 of an empty category is a valid, informative page. Page 5 of a
	// two-page category is not.
	if (page > 1 && feed.items.length === 0) {
		notFound()
	}

	const hrefForPage = (target: number) =>
		target <= 1
			? `/category/${category.slug}`
			: `/category/${category.slug}/page/${target}`

	return (
		<>
			<header className="mb-8 border-b border-border pb-6">
				<div className="flex items-center gap-2">
					<span className="h-6 w-1 shrink-0 bg-accent" aria-hidden="true" />
					<h1 className="text-2xl font-extrabold tracking-headline sm:text-[28px]">
						{category.name}
					</h1>
				</div>

				{category.description ? (
					<p className="mt-3 max-w-2xl text-sm leading-7 text-muted-dark">
						{category.description}
					</p>
				) : null}

				{feed.pagination.total > 0 ? (
					<p className="mt-3 text-xs text-muted">
						{formatPersianNumber(feed.pagination.total)} خبر
						{feed.pagination.totalPages > 1
							? ` — صفحهٔ ${formatPersianNumber(feed.pagination.page)} از ${formatPersianNumber(feed.pagination.totalPages)}`
							: ""}
					</p>
				) : null}
			</header>

			{feed.items.length === 0 ? (
				<EmptyState
					title="هنوز خبری در این دسته‌بندی منتشر نشده است"
					description="این دسته‌بندی وجود دارد، اما فعلاً مطلبی برای نمایش در آن نیست."
					action={
						<Link
							href="/"
							className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
						>
							مشاهده آخرین اخبار
						</Link>
					}
				/>
			) : (
				<>
					<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						{feed.items.map((item, index) => (
							<NewsCard
								key={item.slug}
								news={item}
								// Only the first row is above the fold.
								priority={page === 1 && index < 3}
								sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
							/>
						))}
					</div>

					<Pagination
						page={feed.pagination.page}
						totalPages={feed.pagination.totalPages}
						hrefForPage={hrefForPage}
					/>
				</>
			)}
		</>
	)
}
