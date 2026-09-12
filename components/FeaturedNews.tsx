import Image from "next/image"
import Link from "next/link"

import NewsTime from "@/components/NewsTime"
import type { NewsListItem } from "@/types/news"

/**
 * The homepage hero: full-bleed cover with the headline over a dark gradient.
 *
 * HEADING LEVEL: this renders the page's single <h1>, exactly as in the
 * mockup — on a news front page the top story *is* the page heading. It is
 * therefore homepage-only; every other placement uses `NewsCard`.
 *
 * "FEATURED" IS NOT AN EDITORIAL PICK: the backend has no featured/pinned flag,
 * so this is simply the newest published article from `GET /news`, which the
 * backend already returns first (ordered by publishedAt desc, nulls last).
 */
export default function FeaturedNews({ news }: { news: NewsListItem }) {
	const category = news.categories[0]

	return (
		<Link
			href={`/news/${news.slug}`}
			className="group relative block aspect-[16/9] overflow-hidden rounded-md bg-border"
		>
			{news.coverImage ? (
				<Image
					src={news.coverImage.url}
					alt={news.coverImage.altText ?? ""}
					fill
					priority
					sizes="(max-width: 1024px) 100vw, 760px"
					className="object-cover transition-transform duration-500 group-hover:scale-105"
				/>
			) : null}

			<div
				className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
				aria-hidden="true"
			/>

			<div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
				{category ? (
					<span className="inline-block rounded-sm bg-accent px-2.5 py-1 text-[11px] font-bold text-paper">
						{category.name}
					</span>
				) : null}

				<h1 className="mt-3 text-xl font-extrabold leading-[1.35] tracking-headline text-paper sm:text-2xl md:text-[32px]">
					{news.title}
				</h1>

				<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
					<span>{news.author.displayName}</span>
					{news.publishedAt ? <NewsTime value={news.publishedAt} /> : null}
				</div>
			</div>
		</Link>
	)
}
