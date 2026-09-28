import type { Config } from "tailwindcss"

/**
 * Rahigh Khabar (رحیق خبر) — design system tokens.
 *
 * GROUP 1 — BRAND REFRESH (gold / navy) FOR THE PUBLIC SITE ONLY.
 *   `ink`, `accent`, `accent-strong` and `on-accent` are no longer hex values
 *   but CSS custom properties (RGB channels, see app/globals.css), written as
 *   `rgb(var(--color-x) / <alpha-value>)` so every opacity variant
 *   (bg-accent/10, border-accent/30, hover states...) follows the palette too.
 *     :root          -> public palette: ink #0B1F3A (navy), accent #C9A227 (gold)
 *     .theme-admin   -> the ORIGINAL palette, restored for the admin panel,
 *                       which must not change (set in app/admin/layout.tsx).
 *   CONTRAST (WCAG AA): gold on paper is only ~2.3:1, so gold is never used as
 *   a text colour on light surfaces. `accent-strong` (#8A6A0B, ~4.9:1 on
 *   paper) is the text/hover colour, and `on-accent` (navy, ~6.8:1 on gold)
 *   is the text colour on gold fills. White on navy is ~16:1.
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
 *   h-header      84px     main header row height (sm and up; 72px below it).
 *                          Stage 10 raised it from 72px so the enlarged 64px
 *                          logo keeps breathing room instead of touching the
 *                          border.
 *   h-nav         44px     desktop category row under the logo row
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
					DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
					soft: "#5A6472",
				},
				paper: {
					DEFAULT: "#FAFAF8",
				},
				accent: {
					DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
					strong: "rgb(var(--color-accent-strong) / <alpha-value>)",
				},
				"on-accent": {
					DEFAULT: "rgb(var(--color-on-accent) / <alpha-value>)",
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
				// Group 1: available to the news-body editor only (applied inline
				// on selected text); NOT the site default, which stays Vazirmatn.
				shabnam: ["var(--font-shabnam)"],
				peyda: ["var(--font-peyda)"],
			},
			letterSpacing: {
				headline: "-0.01em",
			},
			maxWidth: {
				shell: "1180px",
			},
			height: {
				header: "84px",
				nav: "44px",
			},
		},
	},
	plugins: [],
}

export default config
