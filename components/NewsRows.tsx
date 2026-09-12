import Link from "next/link"

import NewsTime from "@/components/NewsTime"
import { formatPersianNumber } from "@/lib/format"
import type { NewsListItem } from "@/types/news"

/**
 * The two text-only list rows from the mockup.
 *
 * `RankedNewsRow` is the numbered sidebar row. IMPORTANT: the number is the
 * item's position in the list, nothing more. The mockup labelled that list
 * "پربازدیدترین‌ها", but the backend stores no view counter and exposes no
 * popularity ordering, so a real ranking is impossible — the homepage uses the
 * newest published articles instead and labels the section honestly.
 */
export function RankedNewsRow({
	news,
	rank,
}: {
	news: NewsListItem
	rank: number
}) {
	return (
		<Link
			href={`/news/${news.slug}`}
			className="group flex gap-3 border-b border-border py-3 last:border-b-0"
		>
			<span
				className="w-6 shrink-0 text-xl font-extrabold tracking-headline text-border-strong"
				aria-hidden="true"
			>
				{formatPersianNumber(rank)}
			</span>
			<h3 className="line-clamp-2 text-sm font-semibold leading-[1.5] transition-colors group-hover:text-accent">
				{news.title}
			</h3>
		</Link>
	)
}

/** Headline + date row, used under the homepage category grid. */
export function CompactNewsRow({ news }: { news: NewsListItem }) {
	return (
		<Link
			href={`/news/${news.slug}`}
			className="group flex items-center justify-between gap-4 border-t border-border py-3 last:border-b"
		>
			<h3 className="text-[15px] font-medium leading-[1.6] transition-colors group-hover:text-accent">
				{news.title}
			</h3>
			{news.publishedAt ? (
				<NewsTime
					value={news.publishedAt}
					className="shrink-0 text-xs text-muted"
				/>
			) : null}
		</Link>
	)
}
