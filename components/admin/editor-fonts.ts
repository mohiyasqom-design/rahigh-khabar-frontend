/**
 * Group 1 — the typography choices the news-body editor offers.
 *
 * KEEP IN SYNC WITH THE BACKEND: `src/utils/sanitizer.ts` allow-lists exactly
 * these font values and pixel sizes; anything else is stripped on save. Adding
 * an option here without adding it there would make it silently disappear.
 *
 * WHY `var(--font-*)` AND NOT A FAMILY NAME: Vazirmatn is served by next/font
 * under a generated family name, so a literal `font-family: Vazirmatn` would
 * not match the loaded face. Each token is a CSS custom property defined once
 * in app/globals.css (`--font-vazirmatn` by next/font, `--font-shabnam` and
 * `--font-peyda` next to their self-hosted @font-face rules), which resolves
 * correctly in the editor AND on the published article.
 */
export interface EditorFontOption {
	label: string
	value: string
	hint: string
}

export const EDITOR_FONTS: readonly EditorFontOption[] = [
	{ label: "وزیرمتن", value: "var(--font-vazirmatn)", hint: "متن پیش‌فرض بدنه" },
	{ label: "شبنم", value: "var(--font-shabnam)", hint: "پاراگراف‌های طولانی" },
	{ label: "پیدا", value: "var(--font-peyda)", hint: "تیترهای داخل متن" },
] as const

/** Fixed sizes only (no free input), in px. */
export const EDITOR_FONT_SIZES: readonly number[] = [14, 16, 18, 20, 24, 28, 32] as const

/**
 * Link targets the editor accepts: absolute http(s) or mailto only. Mirrors
 * `isAllowedLinkHref` on the server, which is the real guard — this check just
 * gives the editor an immediate Persian error instead of a silently dropped link.
 */
export function isSafeLinkUrl(raw: string): boolean {
	const value = raw.trim()

	if (!/^(https?:\/\/|mailto:)/i.test(value)) {
		return false
	}

	try {
		const url = new URL(value)
		return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:"
	} catch {
		return false
	}
}
