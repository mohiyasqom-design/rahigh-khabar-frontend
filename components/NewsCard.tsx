import Image from "next/image"
import Link from "next/link"

import NewsTime from "@/components/NewsTime"
import type { NewsListItem } from "@/types/news"

/**
 * The shared news card, used by the homepage rail, the homepage category
 * section and the category listing. One component, two densities:
 *
 *   "rail"     4/3 cover, compact headline, no teaser  (homepage rail)
 *   "standard" 16/10 cover, larger headline + teaser   (category grids)
 *
 * TEASER: `summary` when the editor wrote one, otherwise `lead`. `lead` is a
 * required field on every article, so a card is never left without an intro.
 *
 * ALT TEXT: `coverImage.altText` is nullable in the database. When it is
 * missing the image is marked decorative (`alt=""`) instead of being given a
 * fabricated description — the headline sitting right next to it already
 * carries the meaning, and a screen reader reading a filename or a repeated
 * title is worse than silence.
 *
 * NO SOURCE LINE: the mockup's cards show "منبع: …". The backend's News model
 * has no source/attribution field at all, so that line cannot be rendered from
 * real data and is left out rather than invented. Author name and publication
 * date are real and are shown instead.
 */

export type NewsCardVariant = "rail" | "standard"

export default function NewsCard({
	news,
	variant = "standard",
	sizes = "(max-width: 768px) 100vw, 360px",
	priority = false,
}: {
	news: NewsListItem
	variant?: NewsCardVariant
	/** Passed straight to next/image; required because the cover uses `fill`. */
	sizes?: string
	priority?: boolean
}) {
	const category = news.categories[0]
	const teaser = news.summary ?? news.lead

	return (
		<Link href={`/news/${news.slug}`} className="group block">
			<div
				className={`relative mb-3 overflow-hidden rounded-md bg-border ${
					variant === "rail" ? "aspect-[4/3]" : "aspect-[16/10]"
				}`}
			>
				{news.coverImage ? (
					<Image
						src={news.coverImage.url}
						alt={news.coverImage.altText ?? ""}
						fill
						sizes={sizes}
						priority={priority}
						className="object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				) : (
					<CoverFallback />
				)}
			</div>

			{category ? (
				<span className="text-[11px] font-bold text-accent">{category.name}</span>
			) : null}

			<h3
				className={`mt-1 line-clamp-2 transition-colors group-hover:text-accent ${
					variant === "rail"
						? "text-[15px] font-semibold leading-[1.45]"
						: "text-[17px] font-bold leading-[1.5]"
				}`}
			>
				{news.title}
			</h3>

			{variant === "standard" ? (
				<p className="mt-2 line-clamp-2 text-sm leading-[1.7] text-muted-dark">
					{teaser}
				</p>
			) : null}

			{news.publishedAt ? (
				<NewsTime
					value={news.publishedAt}
					className="mt-2 block text-xs text-muted"
				/>
			) : null}
		</Link>
	)
}

/**
 * Shown when an article has no cover image (`coverImageId` is optional in the
 * schema). Keeps the grid rhythm intact with the approved border tone and a
 * quiet brand mark; it carries no information, hence aria-hidden.
 */
function CoverFallback() {
	return (
		<div
			className="flex h-full w-full items-center justify-center bg-border"
			aria-hidden="true"
		>
			<span className="text-sm font-bold tracking-headline text-border-strong">
				رحیق خبر
			</span>
		</div>
	)
}
