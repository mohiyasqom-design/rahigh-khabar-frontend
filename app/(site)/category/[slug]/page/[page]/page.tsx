import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { buildNotFoundMetadata } from "@/lib/seo"

import CategoryListing, { buildCategoryMetadata } from "../../_category-page"

/**
 * Pages 2+ of a category listing: /category/[slug]/page/[page].
 *
 * The page number is validated here rather than passed through: a non-numeric,
 * zero-padded or out-of-range segment is a 404, and `/page/1` redirects to the
 * canonical `/category/[slug]` so the same listing never exists at two URLs.
 */
// Must be a literal — Next.js statically parses this export and cannot resolve an imported identifier. Keep in sync with REVALIDATE_SECONDS in lib/cache.ts.
export const revalidate = 60

/** Mirrors the backend's own `page` bound (1–100000). */
const MAX_PAGE = 100_000

type PagedCategoryProps = { params: Promise<{ slug: string; page: string }> }

function parsePageSegment(raw: string): number | null {
	if (!/^[1-9][0-9]{0,5}$/.test(raw)) {
		return null
	}

	const value = Number(raw)

	return value >= 1 && value <= MAX_PAGE ? value : null
}

export async function generateMetadata({
	params,
}: PagedCategoryProps): Promise<Metadata> {
	const { slug, page } = await params
	const parsed = parsePageSegment(page)

	if (parsed === null) {
		return buildNotFoundMetadata("صفحه پیدا نشد")
	}

	return buildCategoryMetadata(slug, parsed)
}

export default async function PagedCategoryPage({
	params,
}: PagedCategoryProps) {
	const { slug, page } = await params
	const parsed = parsePageSegment(page)

	if (parsed === null) {
		notFound()
	}

	if (parsed === 1) {
		redirect(`/category/${slug}`)
	}

	return <CategoryListing slug={slug} page={parsed} />
}
