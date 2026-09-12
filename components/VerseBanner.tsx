/**
 * The Quranic verse banner that opens every page, above the black header bar.
 *
 * It sits OUTSIDE the sticky header on purpose, exactly as in the mockup: it
 * scrolls away and does not eat 72px of a phone screen for the whole session.
 *
 * A11Y / TYPOGRAPHY: the verse is Arabic inside a Persian document, so it is
 * marked `lang="ar"` — screen readers switch pronunciation, and the browser
 * picks Arabic shaping. It is rendered with Amiri Quran (`font-quran`), the
 * only place that font is used.
 */
export default function VerseBanner() {
	return (
		<div className="border-b border-border bg-paper px-4 pb-3 pt-5 text-center">
			<p
				lang="ar"
				className="font-quran text-2xl leading-relaxed text-accent md:text-3xl"
			>
				﴿ يُسْقَوْنَ مِنْ رَحِيقٍ مَخْتُومٍ ﴾
			</p>
			<p className="mt-2 text-xs text-muted">سورهٔ مطففین، آیهٔ ۲۵</p>
		</div>
	)
}
