"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useState } from "react"

import AuthMenu from "@/components/AuthMenu"
import CategoryStrip, { type NavLink } from "@/components/CategoryStrip"
import HeaderSearch from "@/components/HeaderSearch"
import type { Category } from "@/types/category"

/**
 * The sticky header bar.
 *
 * GROUP 1 CHANGES
 *   1. BRAND: the bar is `bg-ink`, which on the public site now resolves to
 *      navy #0B1F3A (see the CSS variables in app/globals.css), and the logo is
 *      the gold transparent mark. Logo classes/dimensions are unchanged.
 *   2. SEARCH MOVED INTO THE MENU: the search icon at the end of the bar is
 *      gone. The search field now sits at the TOP of the menu panel that the
 *      hamburger opens, on desktop and mobile alike. The field itself is the
 *      same `HeaderSearch` component (same debounce, suggestions, submit and
 *      `/search` routing); only its placement changed. Because search lives in
 *      the menu, the hamburger is now visible at every breakpoint.
 *   3. CATEGORY STRIP: a slim, horizontally scrollable row of categories sits
 *      directly under the logo row (`CategoryStrip`). It replaces the old
 *      desktop-only nav row, so there is one category row on every screen
 *      size, and it lives here — inside the shared public layout — so it
 *      repeats identically on every public page.
 *
 * Still the ONLY client component in the header tree; category data arrives as
 * a serialisable prop from the Server Component parent.
 *
 * RTL: pure flexbox with logical spacing utilities, mirrored by dir="rtl".
 */

const LOGO_INTRINSIC_WIDTH = 1175
const LOGO_INTRINSIC_HEIGHT = 745

export default function HeaderBar({ categories }: { categories: Category[] }) {
	const pathname = usePathname()
	const menuId = useId()

	const [menuOpen, setMenuOpen] = useState(false)

	// Navigating away should not leave the panel hanging open over the new page.
	useEffect(() => {
		setMenuOpen(false)
	}, [pathname])

	useEffect(() => {
		if (!menuOpen) {
			return
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false)
			}
		}

		window.addEventListener("keydown", onKeyDown)

		return () => {
			window.removeEventListener("keydown", onKeyDown)
		}
	}, [menuOpen])

	// «خانه» is a link to the homepage, NOT a category: it exists only here and
	// has no row in the database. The rest arrive already sorted by `order`.
	const links: NavLink[] = [
		{ href: "/", label: "خانه" },
		...categories.map((category) => ({
			href: `/category/${category.slug}`,
			label: category.name,
		})),
	]

	const hasCategories = categories.length > 0

	const isCurrent = (href: string) =>
		href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)

	return (
		<header className="sticky top-0 z-50 border-b border-white/10 bg-ink">
			<div className="mx-auto max-w-shell px-4">
				<div className="flex h-[72px] items-center gap-2 sm:h-header">
					<div className="flex flex-1 items-center justify-start">
						{/* Always rendered: even with no categories the menu still
						    holds the search field. */}
						<button
							type="button"
							onClick={() => setMenuOpen((open) => !open)}
							aria-expanded={menuOpen}
							aria-controls={menuId}
							aria-label={menuOpen ? "بستن فهرست و جست‌وجو" : "نمایش فهرست و جست‌وجو"}
							className="flex h-9 w-9 items-center justify-center rounded-full text-paper transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
						>
							<MenuIcon open={menuOpen} />
						</button>
					</div>

					<Link
						href="/"
						aria-label="رحیق خبر، صفحه اصلی"
						className="shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
					>
						<Image
							src="/logo-rahigh-khabar-gold.png"
							alt="رحیق خبر"
							width={LOGO_INTRINSIC_WIDTH}
							height={LOGO_INTRINSIC_HEIGHT}
							priority
							sizes="150px"
							className="h-[54px] w-auto object-contain sm:h-[64px]"
						/>
					</Link>

					<div className="flex flex-1 items-center justify-end gap-2">
						{/* Stage 10 Part 2: the Google sign-in entry point. */}
						<AuthMenu />
					</div>
				</div>
			</div>

			{/* Group 1 — slim horizontal category strip, on every public page. */}
			{hasCategories ? <CategoryStrip links={links} isCurrent={isCurrent} /> : null}

			{menuOpen ? (
				<div
					id={menuId}
					className="border-t border-white/10 bg-ink"
				>
					<div className="mx-auto max-w-shell px-4 py-4">
						{/* Group 1 — search lives at the top of the menu panel. Not
						    auto-focused, so opening the menu on a phone does not
						    pop the keyboard over the category list. */}
						<HeaderSearch autoFocus={false} />

						{hasCategories ? (
							<nav aria-label="دسته‌بندی‌ها" className="mt-4 border-t border-white/10 pt-2">
								<ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
									{links.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												aria-current={isCurrent(link.href) ? "page" : undefined}
												className={`block rounded-md px-3 py-2.5 text-[15px] transition-colors ${
													isCurrent(link.href)
														? "bg-white/10 font-semibold text-accent"
														: "text-white/80 hover:bg-white/5 hover:text-paper"
												}`}
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</nav>
						) : null}
					</div>
				</div>
			) : null}
		</header>
	)
}

/** Inline SVG keeps the header dependency-free (no icon package added). */
function MenuIcon({ open }: { open: boolean }) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			{open ? (
				<>
					<path d="M6 6 18 18" />
					<path d="M18 6 6 18" />
				</>
			) : (
				<>
					<path d="M4 7h16" />
					<path d="M4 12h16" />
					<path d="M4 17h16" />
				</>
			)}
		</svg>
	)
}
