/**
 * The Quranic verse banner that opens every page, above the black header bar.
 *
 * Its height equals the logo row of the header bar (72px, `h-header` from sm),
 * and it carries no citation line, so the two bands read as one rhythm.
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
		<div className="flex h-[72px] items-center justify-center border-b border-border bg-paper px-4 text-center sm:h-header">
			<p
				lang="ar"
				className="font-quran text-2xl leading-normal text-accent-strong md:text-3xl"
			>
				﴿ يُسْقَوْنَ مِنْ رَحِيقٍ مَخْتُومٍ ﴾
			</p>
		</div>
	)
}