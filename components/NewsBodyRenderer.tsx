/**
 * Renders a rich-text article body.
 *
 * WHY `dangerouslySetInnerHTML` IS ACCEPTABLE HERE: since Stage 10 the backend
 * runs every `body` through `sanitizeNewsBody` (`src/utils/sanitizer.ts`) on
 * write. That allow-list keeps a fixed set of tags, permits only `https:` and
 * `mailto:` URLs, drops every event handler, restricts `<iframe>` to an
 * anchored host list, and rewrites `<a>` with `rel="noopener noreferrer
 * nofollow"`. The stored string therefore cannot carry script.
 *
 * NO `server-only`: this component is rendered inside the article page, which
 * also mounts client components. Importing `server-only` made the whole module
 * graph fail to compile. It contains no server-side logic of its own anyway.
 *
 * STYLING WITHOUT @tailwindcss/typography: `prose-*` utilities need that
 * plugin, and `tailwind.config.ts` ships `plugins: []`. Every `prose-*` class
 * was therefore inert — the body rendered completely unstyled. The rules now
 * live in `app/globals.css` under `.news-body`, so no dependency is added and
 * the RTL spacing is explicit.
 */
export default function NewsBodyRenderer({ html }: { html: string }) {
	return (
		<div
			className="news-body mt-8 text-[17px] leading-[2] text-ink"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
