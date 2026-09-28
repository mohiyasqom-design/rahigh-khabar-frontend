"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

export interface NavLink {
	href: string
	label: string
}

/**
 * Group 1 — the slim horizontal category row directly under the header bar.
 *
 * Same list, same order and same routes as the menu panel (both come from
 * `HeaderBar`, which builds them from `GET /categories`).
 *
 * SCROLLING: `overflow-x-auto` + the existing `.no-scrollbar` helper, so it
 * swipes on phones and wheel/trackpad-scrolls on desktop without the browser's
 * default scrollbar. Links stay keyboard-reachable (Tab scrolls them in).
 *
 * FEW CATEGORIES: the list is `w-max` with `mx-auto`, so when everything fits
 * it is centred; when it overflows, the auto margins collapse to zero and the
 * row starts at the inline-start edge (the right, under dir="rtl") — no odd
 * empty gap and no unreachable items, which `justify-center` on a scroll
 * container would cause.
 *
 * ACTIVE STATE: the current category gets gold text + a gold underline and
 * `aria-current="page"`, and is scrolled into view on navigation.
 */
export default function CategoryStrip({
	links,
	isCurrent,
}: {
	links: NavLink[]
	isCurrent: (href: string) => boolean
}) {
	const activeRef = useRef<HTMLAnchorElement | null>(null)
	const activeHref = links.find((link) => isCurrent(link.href))?.href ?? null

	useEffect(() => {
		activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })
	}, [activeHref])

	return (
		<nav aria-label="دسته‌بندی‌ها" className="border-t border-white/10 bg-ink">
			<div className="no-scrollbar mx-auto max-w-shell overflow-x-auto px-2">
				<ul className="mx-auto flex h-10 w-max items-stretch gap-1">
					{links.map((link) => {
						const current = link.href === activeHref

						return (
							<li key={link.href} className="flex">
								<Link
									ref={current ? activeRef : undefined}
									href={link.href}
									aria-current={current ? "page" : undefined}
									className={`flex items-center whitespace-nowrap border-b-2 px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
										current
											? "border-accent text-accent"
											: "border-transparent text-white/80 hover:border-accent/60 hover:text-paper"
									}`}
								>
									{link.label}
								</Link>
							</li>
						)
					})}
				</ul>
			</div>
		</nav>
	)
}
