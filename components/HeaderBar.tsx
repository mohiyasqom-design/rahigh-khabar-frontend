"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useState } from "react"

import AuthMenu from "@/components/AuthMenu"
import HeaderSearch from "@/components/HeaderSearch"
import type { Category } from "@/types/category"

/**
 * The sticky header bar: menu / navigation at the start, logo centred, search
 * at the end — the three-part row from the mockup.
 *
 * This is the ONLY client component in the header tree. It needs state for two
 * things: the mobile menu and the search panel. Category data arrives as a
 * plain serialisable prop from the Server Component parent, so no fetching
 * happens in the browser.
 *
 * RTL: the row is pure flexbox, and every spacing utility used here is logical
 * (gap, ms-*, me-*), so the layout mirrors correctly under dir="rtl" without
 * `order-*` hacks. The physical `left/right` utilities are deliberately absent.
 *
 * LOGO: the real calligraphic mark extracted from the signed-off mockup, served
 * from /public. Its intrinsic size is 1175×745; it is rendered with automatic
 * width and marked `priority` because it is above the fold on every page.
 *
 * STAGE 10 — the logo grew from 44/52px to 54/64px (~23%, the ratio asked for)
 * because at the old size the calligraphy was unreadable. `object-contain` and
 * the intrinsic width/height stay, so nothing is stretched, and `h-header` grew
 * 72px → 84px so the taller mark does not crowd the bar's own border.
 *
 * STAGE 10 — WHY THE DESKTOP NAV MOVED TO ITS OWN ROW: the bar is a three-part
 * grid (nav | centred logo | search), which leaves the nav roughly HALF the
 * shell width. Eleven items need ~750px; half of 1148px is ~520px, so inline
 * items would have overflowed horizontally at every desktop width — the exact
 * failure mode the spec rules out. A second full-width row fits all eleven with
 * room to spare and is the standard newspaper header. Below `lg` that row is
 * hidden and the same links live in the hamburger menu, so a 360px phone shows
 * one 72px bar and no horizontal scroll.
 */

const LOGO_INTRINSIC_WIDTH = 1175
const LOGO_INTRINSIC_HEIGHT = 745

export default function HeaderBar({ categories }: { categories: Category[] }) {
	const pathname = usePathname()
	const menuId = useId()
	const searchId = useId()

	const [menuOpen, setMenuOpen] = useState(false)
	const [searchOpen, setSearchOpen] = useState(false)

	// Navigating away should not leave a panel hanging open over the new page.
	useEffect(() => {
		setMenuOpen(false)
		setSearchOpen(false)
	}, [pathname])

	useEffect(() => {
		if (!menuOpen && !searchOpen) {
			return
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false)
				setSearchOpen(false)
			}
		}

		window.addEventListener("keydown", onKeyDown)

		return () => {
			window.removeEventListener("keydown", onKeyDown)
		}
	}, [menuOpen, searchOpen])

	// «خانه» is a link to the homepage, NOT a category: it exists only here and
	// has no row in the database. The rest arrive already sorted by `order`.
	const links = [
		{ href: "/", label: "خانه" },
		...categories.map((category) => ({
			href: `/category/${category.slug}`,
			label: category.name,
		})),
	]

	// With no categories there is nothing a menu could show that the logo link
	// does not already do, so the whole navigation affordance is dropped rather
	// than shipped empty.
	const hasNavigation = categories.length > 0

	const isCurrent = (href: string) =>
		href === "/" ? pathname === "/" : pathname.startsWith(href)

	return (
		<header className="sticky top-0 z-50 border-b border-white/10 bg-ink">
			<div className="mx-auto max-w-shell px-4">
				<div className="flex h-[72px] items-center gap-2 sm:h-header">
					<div className="flex flex-1 items-center justify-start">
						{hasNavigation ? (
							<button
								type="button"
								onClick={() => {
									setMenuOpen((open) => !open)
									setSearchOpen(false)
								}}
								aria-expanded={menuOpen}
								aria-controls={menuId}
								aria-label={menuOpen ? "بستن فهرست" : "نمایش فهرست"}
								className="flex h-9 w-9 items-center justify-center rounded-full text-paper transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper lg:hidden"
							>
								<MenuIcon open={menuOpen} />
							</button>
						) : null}
					</div>

					<Link
						href="/"
						aria-label="رحیق خبر، صف��ه اصلی"
						className="shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
					>
						<Image
							src="/logo-rahigh-khabar.png"
							alt="رحیق خبر"
							width={LOGO_INTRINSIC_WIDTH}
							height={LOGO_INTRINSIC_HEIGHT}
							priority
							sizes="150px"
							className="h-[54px] w-auto object-contain sm:h-[64px]"
						/>
					</Link>

					<div className="flex flex-1 items-center justify-end gap-2">
						<button
							type="button"
							onClick={() => {
								setSearchOpen((open) => !open)
								setMenuOpen(false)
							}}
							aria-expanded={searchOpen}
							aria-controls={searchId}
							aria-label={searchOpen ? "بستن جست‌وجو" : "نمایش جست‌وجو"}
							className="flex h-9 w-9 items-center justify-center rounded-full text-paper transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
						>
							<SearchIcon />
						</button>

						{/* Stage 10 Part 2: the Google sign-in entry point. The OAuth
						    routes existed but nothing in the UI linked to them, so a
						    visitor could never sign in, like, or comment. */}
						<AuthMenu />
					</div>
				</div>

				{/* Desktop category row. `items-stretch` puts the active underline on
				    the row's bottom edge instead of floating under the text. */}
				{hasNavigation ? (
					<nav
						aria-label="دسته‌بندی‌ها"
						className="hidden h-nav items-stretch justify-center gap-1 border-t border-white/10 lg:flex"
					>
						{links.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								aria-current={isCurrent(link.href) ? "page" : undefined}
								className={`flex items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors ${
									isCurrent(link.href)
										? "border-accent text-paper"
										: "border-transparent text-white/80 hover:border-accent hover:text-paper"
								}`}
							>
								{link.label}
							</Link>
						))}
					</nav>
				) : null}

				{searchOpen ? (
					<div id={searchId} className="border-t border-white/10 py-4">
						{/* STAGE 10 PART 5 — the placeholder note that said "search does
						    not exist yet" is gone because the backend now serves
						    GET /search and GET /search/suggest. The field itself lives
						    in its own component so the debounce/abort state is mounted
						    only while the panel is open. */}
						<HeaderSearch />
					</div>
				) : null}

				{hasNavigation && menuOpen ? (
					<nav
						id={menuId}
						aria-label="دسته‌بندی‌ها"
						className="border-t border-white/10 py-2 lg:hidden"
					>
						<ul className="flex flex-col">
							{links.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										aria-current={isCurrent(link.href) ? "page" : undefined}
										className={`block rounded-md px-3 py-2.5 text-[15px] transition-colors ${
											isCurrent(link.href)
												? "bg-white/10 font-semibold text-paper"
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

function SearchIcon() {
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
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</svg>
	)
}
