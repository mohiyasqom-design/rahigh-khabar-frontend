import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Route-group shell for the whole admin panel.
 *
 * NOINDEX FOR EVERYTHING UNDER `/admin`: this metadata is inherited by the
 * login page, the dashboard and the editor, so no admin URL can be indexed —
 * including the login form, which would otherwise be a crawlable target. This
 * is the only SEO work the panel needs; there are no titles to optimise, no
 * canonicals and no structured data back here.
 *
 * NEVER CACHED: `force-dynamic` stops Next.js from statically prerendering or
 * caching any admin segment. Stage 7's public pages keep their 60-second ISR
 * untouched (see `lib/cache.ts`), but drafts and editor state must never be
 * served from a cache, and no `revalidate` is exported anywhere under this
 * folder.
 *
 * NOTE ON CHROME: the public `Header`/`Footer` live in `app/(site)/layout.tsx`
 * and are deliberately NOT in the root layout, so nothing here inherits them.
 * The panel brings its own `AdminNav`.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
	title: {
		default: "پنل مدیریت",
		template: "%s | پنل مدیریت رحیق خبر",
	},
	robots: {
		index: false,
		follow: false,
		nocache: true,
		googleBot: { index: false, follow: false },
	},
}

export default function AdminLayout({ children }: { children: ReactNode }) {
	return <div className="flex flex-1 flex-col bg-paper">{children}</div>
}
