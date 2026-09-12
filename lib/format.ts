/**
 * Persian (Jalali) formatting helpers.
 *
 * No date library is added: `Intl` in Node 20+ and every modern browser ships
 * full ICU, and the `fa-IR` locale already defaults to the Solar Hijri
 * (Persian) calendar and Persian-Indic digits. A dependency such as jalaali-js
 * or dayjs-jalali would add weight for nothing.
 *
 * TIME ZONE: every timestamp is rendered in `Asia/Tehran`, not in the viewer's
 * zone. Two reasons — the audience is Iran, and the pages are statically
 * generated, so the "server" zone would otherwise be whatever the deployment
 * host happens to use (usually UTC) and a reader would see a different date
 * than the editor entered.
 */

const TIME_ZONE = "Asia/Tehran"

const jalaliDate = new Intl.DateTimeFormat("fa-IR", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "long",
	day: "numeric",
})

const jalaliDateTime = new Intl.DateTimeFormat("fa-IR", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "long",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
})

const persianNumber = new Intl.NumberFormat("fa-IR", { useGrouping: false })

const relativeTime = new Intl.RelativeTimeFormat("fa", { numeric: "auto" })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Parses an API timestamp, returning null for missing or unparsable values. */
function parseTimestamp(value: string | null | undefined): Date | null {
	if (!value) {
		return null
	}

	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

/** e.g. «۲۱ شهریور ۱۴۰۵» — null when there is no usable date. */
export function formatJalaliDate(value: string | null | undefined): string | null {
	const date = parseTimestamp(value)
	return date ? jalaliDate.format(date) : null
}

/** e.g. «۲۱ شهریور ۱۴۰۵، ۱۴:۳۰» — null when there is no usable date. */
export function formatJalaliDateTime(
	value: string | null | undefined,
): string | null {
	const date = parseTimestamp(value)
	return date ? jalaliDateTime.format(date) : null
}

/**
 * e.g. «۴۵ دقیقه پیش». Returns null for anything older than a week (and for
 * missing dates), so callers fall back to the absolute date.
 *
 * `now` is an explicit argument rather than a hidden `Date.now()` call: this
 * function is only ever used in the browser (see `components/NewsTime.tsx`),
 * because a relative label baked into statically cached HTML would keep
 * claiming «۴۵ دقیقه پیش» long after it stopped being true.
 */
export function formatRelativeTime(
	value: string | null | undefined,
	now: number,
): string | null {
	const date = parseTimestamp(value)

	if (!date) {
		return null
	}

	const difference = date.getTime() - now
	const distance = Math.abs(difference)

	if (distance < MINUTE) {
		return "لحظه‌ای پیش"
	}

	if (distance < HOUR) {
		return relativeTime.format(Math.round(difference / MINUTE), "minute")
	}

	if (distance < DAY) {
		return relativeTime.format(Math.round(difference / HOUR), "hour")
	}

	if (distance < 7 * DAY) {
		return relativeTime.format(Math.round(difference / DAY), "day")
	}

	return null
}

/** Persian-Indic digits for counters, page numbers and list positions. */
export function formatPersianNumber(value: number): string {
	return persianNumber.format(value)
}

/**
 * Splits an article body into paragraphs on blank lines.
 *
 * The backend stores `body` as plain text with no declared markup format and no
 * sanitisation, so the only safe treatment is text. Single newlines inside a
 * paragraph are preserved by CSS (`whitespace-pre-line`) instead of being
 * turned into markup here.
 */
export function toParagraphs(body: string): string[] {
	return body
		.split(/\r?\n[ \t]*\r?\n/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0)
}

/** Trims text to a maximum length for <meta> descriptions, on a word boundary. */
export function truncate(value: string, maxLength: number): string {
	const normalised = value.replace(/\s+/g, " ").trim()

	if (normalised.length <= maxLength) {
		return normalised
	}

	const cut = normalised.slice(0, maxLength)
	const lastSpace = cut.lastIndexOf(" ")

	return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`
}
