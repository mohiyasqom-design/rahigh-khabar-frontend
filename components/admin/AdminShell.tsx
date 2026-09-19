"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

import { useSession } from "@/components/admin/session"
import { ROLE_LABELS, type Role } from "@/types/user"

/**
 * Stage 10 Part 5 — the chrome of the admin panel.
 *
 * Replaces the old horizontal `AdminNav` with a real sidebar: a fixed column
 * on desktop (lg and up) and a collapsible drawer on mobile, plus the page
 * container every protected screen renders into.
 *
 * WHY IT IS A CLIENT COMPONENT: it reads the confirmed session from
 * `AdminGate` (`useSession`) to show the signed-in identity, to hide the links
 * an ADMIN may not use, and to sign out — none of which a Server Component
 * could do, because the session cookie is host-only to the API origin and is
 * therefore only readable from the browser (see `components/admin/session.tsx`).
 *
 * ACTIVE LINK RULE: a link is active on an exact path match, or when the
 * current path is a child of it (`/admin/news/12/edit` keeps «همه اخبار»
 * highlighted). `/admin` itself is matched exactly, otherwise it would stay
 * active on every page of the panel. Sibling links that share a prefix
 * (`/admin/news` vs `/admin/news/new`) are disambiguated by picking the
 * LONGEST matching href, so only one item is ever highlighted.
 */
interface NavLink {
	href: string
	label: string
	/** When set, the link is only rendered for these roles. */
	roles?: ReadonlyArray<Role>
}

interface NavGroup {
	title: string
	links: ReadonlyArray<NavLink>
}

const NAV_GROUPS: ReadonlyArray<NavGroup> = [
	{
		title: "داشبورد",
		links: [
			{ href: "/admin", label: "خانهٔ پنل" },
			{ href: "/admin/dashboard", label: "داشبورد آماری" },
		],
	},
	{
		title: "اخبار",
		links: [
			{ href: "/admin/news", label: "همهٔ اخبار" },
			{ href: "/admin/news/new", label: "افزودن خبر" },
			{ href: "/admin/news/drafts", label: "پیش‌نویس‌ها" },
			{ href: "/admin/news/scheduled", label: "زمان‌بندی‌شده‌ها" },
		],
	},
	{
		title: "محتوا",
		links: [
			{ href: "/admin/categories", label: "دسته‌بندی‌ها" },
			{ href: "/admin/media", label: "رسانه" },
			{ href: "/admin/comments", label: "دیدگاه‌ها" },
		],
	},
	{
		title: "مدیریت",
		links: [
			// Staff and site accounts are SUPER_ADMIN-only on the backend
			// (`GET /admin/users` answers 403 for an ADMIN), so the link is hidden
			// rather than shown and then failing.
			{ href: "/admin/users", label: "کاربران", roles: ["SUPER_ADMIN"] },
			{ href: "/admin/notifications", label: "اعلان‌ها" },
			{ href: "/admin/settings", label: "تنظیمات" },
		],
	},
]

/** True when `href` is the most specific nav target for `pathname`. */
function matches(href: string, pathname: string): boolean {
	if (href === "/admin") {
		return pathname === "/admin"
	}

	return pathname === href || pathname.startsWith(`${href}/`)
}

function activeHref(pathname: string, hrefs: ReadonlyArray<string>): string | null {
	let best: string | null = null

	for (const href of hrefs) {
		if (matches(href, pathname) && (best === null || href.length > best.length)) {
			best = href
		}
	}

	return best
}

export default function AdminShell({ children }: { children: ReactNode }) {
	const { user, signOut } = useSession()
	const pathname = usePathname() ?? "/admin"
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [signingOut, setSigningOut] = useState(false)

	// The drawer is a mobile overlay: leaving it open across a navigation would
	// cover the page the editor just asked for.
	useEffect(() => {
		setDrawerOpen(false)
	}, [pathname])

	const visibleGroups = NAV_GROUPS.map((group) => ({
		...group,
		links: group.links.filter(
			(link) => link.roles === undefined || link.roles.includes(user.role),
		),
	})).filter((group) => group.links.length > 0)

	const current = activeHref(
		pathname,
		visibleGroups.flatMap((group) => group.links.map((link) => link.href)),
	)

	async function handleSignOut() {
		setSigningOut(true)

		try {
			await signOut()
		} finally {
			setSigningOut(false)
		}
	}

	const nav = (
		<nav aria-label="منوی پنل مدیریت" className="space-y-6">
			{visibleGroups.map((group) => (
				<div key={group.title}>
					<p className="px-3 text-xs font-bold text-muted">{group.title}</p>
					<ul className="mt-2 space-y-1">
						{group.links.map((link) => {
							const isActive = link.href === current

							return (
								<li key={link.href}>
									<Link
										href={link.href}
										aria-current={isActive ? "page" : undefined}
										className={`block rounded-md px-3 py-2 text-sm transition-colors ${
											isActive
												? "bg-accent font-bold text-paper"
												: "text-ink hover:bg-border/60"
										}`}
									>
										{link.label}
									</Link>
								</li>
							)
						})}
					</ul>
				</div>
			))}
		</nav>
	)

	const identity = (
		<div className="rounded-md border border-border bg-paper px-3 py-3">
			<p className="truncate text-sm font-bold text-ink">{user.displayName}</p>
			<p className="mt-1 truncate text-xs text-muted-dark">{user.email}</p>
			<p className="mt-2 inline-block rounded border border-border-strong px-2 py-0.5 text-[11px] text-muted-dark">
				{ROLE_LABELS[user.role]}
			</p>
			<button
				type="button"
				onClick={() => void handleSignOut()}
				disabled={signingOut}
				className="mt-3 w-full rounded-md border border-border-strong px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-border/60 disabled:opacity-60"
			>
				{signingOut ? "در حال خروج…" : "خروج از حساب"}
			</button>
		</div>
	)

	return (
		<div className="min-h-screen bg-paper">
			{/* Mobile top bar: the only place the drawer can be opened. */}
			<div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 lg:hidden">
				<button
					type="button"
					onClick={() => setDrawerOpen((open) => !open)}
					aria-expanded={drawerOpen}
					aria-controls="admin-mobile-nav"
					className="rounded-md border border-border-strong px-3 py-2 text-sm font-semibold text-ink"
				>
					{drawerOpen ? "بستن منو" : "منو"}
				</button>
				<span className="text-sm font-bold tracking-headline text-ink">
					پنل مدیریت رحیق خبر
				</span>
			</div>

			{drawerOpen ? (
				<div
					id="admin-mobile-nav"
					className="border-b border-border bg-white px-4 py-4 lg:hidden"
				>
					{nav}
					<div className="mt-4">{identity}</div>
				</div>
			) : null}

			<div className="mx-auto flex w-full max-w-shell gap-6 px-4 py-6">
				<aside className="hidden w-60 shrink-0 lg:block">
					<div className="sticky top-6 space-y-4">
						<Link
							href="/"
							className="block text-sm font-bold tracking-headline text-accent hover:underline"
						>
							رحیق خبر — مشاهدهٔ سایت
						</Link>
						{nav}
						{identity}
					</div>
				</aside>

				<main className="min-w-0 flex-1">{children}</main>
			</div>
		</div>
	)
}
