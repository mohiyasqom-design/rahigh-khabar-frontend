import type { Metadata } from "next"
import type { ReactNode } from "react"

import Footer from "@/components/Footer"
import Header from "@/components/Header"
import { buildSiteMetadata } from "@/lib/seo"

/**
 * Chrome for the PUBLIC site only.
 *
 * This is the header/main/footer block that used to live in `app/layout.tsx`,
 * moved verbatim so the admin panel (which must not reuse it) can sit outside
 * it. `(site)` is a route group, so no URL changed and the public pages inside
 * it render exactly the same DOM as in Stage 7.
 *
 * STAGE 9 — the Open Graph and Twitter defaults are attached here rather than
 * in the root layout, for exactly the same reason the chrome is: `/admin`
 * shares the root layout, and a login-gated panel has no business advertising
 * share cards. Individual pages replace these values wholesale, because
 * Next.js replaces `openGraph` rather than merging it field by field — which
 * is why every builder in `lib/seo.ts` returns a complete block.
 */
export const metadata: Metadata = buildSiteMetadata()

export default function SiteLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<Header />
			{/* py matches the mockup's main column (py-8) instead of the wider
			    Stage 6 placeholder spacing, which pushed the hero too far down. */}
			<main className="mx-auto w-full max-w-shell flex-1 px-4 py-8 sm:py-10">
				{children}
			</main>
			<Footer />
		</>
	)
}
