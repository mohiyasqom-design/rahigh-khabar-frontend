import { Amiri_Quran, Vazirmatn } from "next/font/google"

/**
 * Site-wide font: Vazirmatn.
 *
 * Loaded through `next/font/google`, which downloads the font files at BUILD
 * time and serves them from this app's own origin. There is deliberately no
 * runtime <link> tag to the Google Fonts CDN in the rendered <head>.
 *
 * WEIGHTS: Vazirmatn is published as a variable font covering the full
 * wght 100–900 axis, so every weight the mockup uses (400, 500, 600, 700, 800)
 * is available without enumerating static weights — and enumerating them would
 * in fact be rejected for a variable family. If a weight is ever missing, the
 * browser synthesises the nearest axis value instead of failing.
 *
 * FALLBACKS: `fallback` keeps Persian text readable (and roughly the same
 * metrics) if the webfont request fails, and `display: "swap"` avoids invisible
 * text while it loads.
 *
 * OFFLINE BUILDS: `next/font/google` needs network access during `next build`.
 * If a build environment blocks it, download the woff2 files into app/fonts/
 * and swap this module to `next/font/local` — the exported `.variable`
 * contracts stay identical, so nothing else changes.
 */
export const vazirmatn = Vazirmatn({
	subsets: ["arabic", "latin"],
	display: "swap",
	variable: "--font-vazirmatn",
	fallback: ["system-ui", "Tahoma", "Arial", "sans-serif"],
})

/**
 * Amiri Quran — used ONLY for the Quranic verse banner (components/VerseBanner).
 *
 * The signed-off mockup pulls this face from the Google Fonts CDN with a
 * <link> tag; it is self-hosted here through `next/font/google` for the same
 * reason Vazirmatn is: no third-party request at runtime, no layout shift, no
 * dependency on a CDN being reachable from Iran.
 *
 * Amiri Quran ships a single static weight (400) and only the Arabic subset —
 * it is a Quranic-script face with full harakat, which is exactly what the
 * verse needs and why it is not reused anywhere else in the UI. Both values
 * must be stated explicitly, since there is no variable axis to infer.
 */
export const amiriQuran = Amiri_Quran({
	subsets: ["arabic"],
	weight: "400",
	display: "swap",
	variable: "--font-amiri-quran",
	fallback: ["Amiri", "Scheherazade New", "serif"],
})
