import type { Metadata } from "next"
import type { ReactNode } from "react"

import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/seo"

import { amiriQuran, vazirmatn } from "./fonts"
import "./globals.css"

/**
 * Site-wide defaults only.
 *
 * The news and category pages override `title` and `description` through their
 * own `generateMetadata()`, using the real `seoTitle` / `metaDescription`
 * fields the backend returns. `app/admin/layout.tsx` sets `noindex, nofollow`
 * — an admin panel appearing in a search index is a security problem, not a
 * deferred SEO optimisation.
 *
 * STAGE 9 — `metadataBase` belongs HERE, in the root layout, because it is the
 * one metadata field that is genuinely global: Next.js resolves every relative
 * URL in every page's metadata against it, including the admin pages. The Open
 * Graph and Twitter defaults deliberately do NOT live here — they describe the
 * public site only, so they are set in `app/(site)/layout.tsx`, which the
 * admin panel does not sit inside.
 *
 * Reading the origin here also means a production build with no
 * `NEXT_PUBLIC_SITE_URL` fails immediately, instead of shipping canonical tags
 * that point at localhost.
 */
export const metadata: Metadata = {
	metadataBase: new URL(getSiteUrl()),
	// The same constants the rest of the SEO layer uses, so the site name and
	// description cannot drift between the document head and the share cards.
	title: {
		default: SITE_NAME,
		template: `%s | ${SITE_NAME}`,
	},
	description: SITE_DESCRIPTION,
}

/**
 * STAGE 8 CHANGE — why this file is now only the document shell.
 *
 * Until Stage 7 this layout also rendered the public `<Header />`, the centred
 * `<main>` column and `<Footer />`. The admin panel must not be wrapped in the
 * public site chrome, and a Server Component layout cannot know which route it
 * is rendering, so the chrome moved down one level into
 * `app/(site)/layout.tsx`, which wraps exactly the public pages.
 *
 * `(site)` is a route group: it does not appear in any URL, so `/`,
 * `/news/[slug]` and `/category/[slug]` are unchanged, and the markup they end
 * up inside is byte-for-byte what it was before. What is left here is what is
 * genuinely global: `<html lang="fa" dir="rtl">`, the fonts, the base body
 * classes and the site-wide metadata.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="fa"
			dir="rtl"
			className={`${vazirmatn.variable} ${amiriQuran.variable}`}
		>
			<body className="flex min-h-dvh flex-col font-sans">{children}</body>
		</html>
	)
}
