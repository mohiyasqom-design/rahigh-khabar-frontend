"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useState } from "react"

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
 * from /public. Its intrinsic size is 1175×745; it is rendered at a 44px (52px
 * from `sm`) height with automatic width, exactly as in the mockup, and marked
 * `priority` because it is above the fold on every page.
 */

const LOGO_INTRINSIC_WIDTH = 1175
const LOGO_INTRINSIC_HEIGHT = 745

export default function HeaderBar({ categories }: { categories: Category[] }) {
	const pathname = usePathname()
	const menuId = useId()
	const searchId = useId()
	const searchNoteId = useId()

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

	const links = [
		{ href: "/", label: "صفحه اصلی" },
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
				<div className="flex h-header items-center gap-2">
					<div className="flex flex-1 items-center justify-start">
						{hasNavigation ? (
							<>
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
								<nav
									aria-label="دسته‌بندی‌ها"
									className="hidden items-center gap-1 lg:flex"
								>
									{links.map((link) => (
										<Link
											key={link.href}
											href={link.href}
											aria-current={isCurrent(link.href) ? "page" : undefined}
											className={`border-b-2 px-4 py-2 text-[15px] font-medium transition-colors ${
												isCurrent(link.href)
													? "border-accent text-paper"
													: "border-transparent text-white/80 hover:border-accent hover:text-paper"
											}`}
										>
											{link.label}
										</Link>
									))}
								</nav>
							</>
						) : null}
					</div>

					<Link
						href="/"
						aria-label="رحیق خبر، صفحه اصلی"
						className="shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
					>
						<Image
							src="/logo-rahigh-khabar.png"
							alt="رحیق خبر"
							width={LOGO_INTRINSIC_WIDTH}
							height={LOGO_INTRINSIC_HEIGHT}
							priority
							sizes="120px"
							className="h-11 w-auto object-contain sm:h-[52px]"
						/>
					</Link>

					<div className="flex flex-1 items-center justify-end">
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
					</div>
				</div>

				{searchOpen ? (
					<div id={searchId} className="border-t border-white/10 py-4">
						{/* HONEST UI: the backend exposes no search endpoint in this
						    stage — GET /news accepts only page, pageSize and
						    categorySlug, and rejects anything else. So the field is
						    disabled and says so, rather than pretending to search or
						    showing invented results. */}
						<input
							type="search"
							disabled
							placeholder="جست‌وجو در اخبار"
							aria-describedby={searchNoteId}
							className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-paper placeholder:text-white/40 disabled:cursor-not-allowed"
						/>
						<p id={searchNoteId} className="mt-2 text-xs leading-6 text-white/50">
							جست‌وجو هنوز فعال نشده است؛ سرویس جست‌وجو در این مرحله از
							بک‌اند وجود ندارد. تا آن زمان می‌توانید از فهرست
							دسته‌بندی‌ها استفاده کنید.
						</p>
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
