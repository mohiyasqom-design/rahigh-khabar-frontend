import type { Metadata } from "next"

import CategoryListing, { buildCategoryMetadata } from "./_category-page"

/** Page 1 of a category — the canonical URL. Pages 2+ live under ./page/[page]. */
// Must be a literal — Next.js statically parses this export and cannot resolve an imported identifier. Keep in sync with REVALIDATE_SECONDS in lib/cache.ts.
export const revalidate = 60

type CategoryPageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({
	params,
}: CategoryPageProps): Promise<Metadata> {
	const { slug } = await params
	return buildCategoryMetadata(slug, 1)
}

export default async function CategoryPage({ params }: CategoryPageProps) {
	const { slug } = await params
	return <CategoryListing slug={slug} page={1} />
}
