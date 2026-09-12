import type { Config } from "tailwindcss"

/**
 * Rahigh Khabar (رحیق خبر) — design system tokens.
 *
 * COLOR TOKENS (approved palette, taken from the signed-off mockup).
 * Always use these token names instead of raw hex values:
 *
 *   ink            #14181F  page text + the solid black header/footer surfaces
 *   ink-soft       #5A6472  secondary text on light surfaces
 *   paper          #FAFAF8  global page background, and text on dark surfaces
 *   accent         #8B1A2B  dark maroon — brand accent, used sparingly
 *                           (breaking-news bar, rules, logo, small highlights)
 *   link           #3D5A73  blue-grey, inline links
 *   border         #E4E1D8  default hairline borders / dividers
 *   border-strong  #D8D5CC  stronger dividers, scrollbar thumb, image skeletons
 *   muted         #8A8577  muted metadata text (dates, captions, source)
 *   muted-dark    #5A5648  muted but still readable body text
 *
 * Usage examples: bg-paper, text-ink, text-muted, border-border,
 * bg-accent, text-link, border-border-strong.
 *
 * LAYOUT TOKENS
 *   max-w-shell   1180px   the site content column used across the mockup
 *   h-header      72px     main header row height
 *
 * TYPOGRAPHY
 *   font-sans is Vazirmatn, injected as the CSS variable --font-vazirmatn by
 *   `next/font` in app/fonts.ts and bound to <html> in app/layout.tsx. The
 *   listed fallbacks keep Persian text readable if the webfont fails to load.
 *   font-quran is Amiri Quran (--font-amiri-quran), added in Stage 7 for the
 *   Quranic verse banner only.
 *   tracking-headline (-0.01em) reproduces the mockup's `.headline-font`
 *   helper, which is font-weight 800 plus a slight negative tracking;
 *   Tailwind's built-in tracking-tight (-0.025em) is too tight for Persian.
 *
 * RTL NOTE — no RTL plugin is used, on purpose.
 *   The app is rendered with <html dir="rtl">, and Tailwind ≥3.3 already ships
 *   direction-aware logical utilities (ms-*, me-*, ps-*, pe-*, start-*, end-*,
 *   text-start, text-end, border-s, border-e) plus the `rtl:` and `ltr:` variants,
 *   which resolve correctly against that dir attribute. A plugin such as
 *   tailwindcss-rtl would only duplicate that behaviour.
 *   Caveat for every future component: the *physical* utilities (ml-*, mr-*,
 *   pl-*, pr-*, left-*, right-*, text-left, text-right) do NOT flip in RTL, so
 *   use the logical ones unless a value must stay physically fixed.
 */
const config: Config = {
	content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx,mdx}"],
	theme: {
		extend: {
			colors: {
				ink: {
					DEFAULT: "#14181F",
					soft: "#5A6472",
				},
				paper: {
					DEFAULT: "#FAFAF8",
				},
				accent: {
					DEFAULT: "#8B1A2B",
				},
				link: {
					DEFAULT: "#3D5A73",
				},
				border: {
					DEFAULT: "#E4E1D8",
					strong: "#D8D5CC",
				},
				muted: {
					DEFAULT: "#8A8577",
					dark: "#5A5648",
				},
			},
			fontFamily: {
				sans: [
					"var(--font-vazirmatn)",
					"system-ui",
					"Tahoma",
					"Arial",
					"sans-serif",
				],
				quran: ["var(--font-amiri-quran)", "Amiri", "serif"],
			},
			letterSpacing: {
				headline: "-0.01em",
			},
			maxWidth: {
				shell: "1180px",
			},
			height: {
				header: "72px",
			},
		},
	},
	plugins: [],
}

export default config
