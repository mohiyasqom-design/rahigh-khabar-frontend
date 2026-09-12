"use client"

import { useEffect, useState } from "react"

import { formatJalaliDate, formatRelativeTime } from "@/lib/format"

/**
 * A publication timestamp that is honest under ISR.
 *
 * The problem: the mockup shows relative labels («۴۵ دقیقه پیش»), but these
 * pages are statically generated and can be served from cache. A relative label
 * computed during pre-render would keep claiming «۴۵ دقیقه پیش» for as long as
 * that HTML is reused — badly wrong on a news site.
 *
 * The fix: render the ABSOLUTE Jalali date on the server (stable, cacheable and
 * identical on the client's first paint, so there is no hydration mismatch),
 * then upgrade to a relative label in the browser, where "now" is real. Items
 * older than a week keep the absolute date, and it is always available as the
 * `title` tooltip.
 *
 * This is the only client component used by the cards; everything around it
 * stays a Server Component.
 */
export default function NewsTime({
	value,
	className,
}: {
	/** ISO-8601 `publishedAt` from the API. */
	value: string
	className?: string
}) {
	const absolute = formatJalaliDate(value)
	const [label, setLabel] = useState<string | null>(absolute)

	useEffect(() => {
		const update = () => {
			setLabel(formatRelativeTime(value, Date.now()) ?? formatJalaliDate(value))
		}

		update()
		// Keeps "۳ دقیقه پیش" from freezing on a long-lived tab.
		const timer = window.setInterval(update, 60_000)

		return () => {
			window.clearInterval(timer)
		}
	}, [value])

	if (!absolute) {
		return null
	}

	return (
		<time dateTime={value} title={absolute} className={className}>
			{label ?? absolute}
		</time>
	)
}
