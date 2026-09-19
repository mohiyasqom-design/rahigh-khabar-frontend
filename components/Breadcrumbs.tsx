import Link from "next/link"

import {
	buildBreadcrumbJsonLd,
	jsonLdScriptContent,
	type BreadcrumbEntry,
} from "@/lib/seo"

/**
 * STAGE 10 — a breadcrumb trail, rendered twice: once for people and once for
 * crawlers.
 *
 * BOTH COPIES COME FROM THE SAME ARRAY. Structured data that disagrees with the
 * visible trail is a spam signal, so there is no way to update one and forget
 * the other.
 *
 * The separator is a plain "/" and is `aria-hidden`. A chevron would have to be
 * mirrored under `dir="rtl"`, and a screen reader announcing "slash" between
 * every crumb adds nothing that the list structure does not already convey.
 *
 * The current page is a `<span aria-current="page">`, not a link: linking a
 * page to itself is the single most common breadcrumb accessibility defect.
 */
export default function Breadcrumbs({ trail }: { trail: BreadcrumbEntry[] }) {
	// A single crumb is not a trail, it is the page's own title.
	if (trail.length < 2) {
		return null
	}

	const jsonLd = jsonLdScriptContent(buildBreadcrumbJsonLd(trail))

	return (
		<>
			{/* Escaped by `jsonLdScriptContent`, so category names cannot close
			    the tag — same rule as the article JSON-LD. */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: jsonLd }}
			/>

			<nav aria-label="مسیر صفحه" className="mb-4">
				<ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
					{trail.map((crumb, index) => {
						const isLast = index === trail.length - 1

						return (
							<li key={crumb.path} className="flex items-center gap-1.5">
								{isLast ? (
									<span aria-current="page" className="font-semibold text-muted-dark">
										{crumb.name}
									</span>
								) : (
									<Link
										href={crumb.path}
										className="transition-colors hover:text-accent"
									>
										{crumb.name}
									</Link>
								)}

								{isLast ? null : (
									<span aria-hidden="true" className="text-border-strong">
										/
									</span>
								)}
							</li>
						)
					})}
				</ol>
			</nav>
		</>
	)
}
