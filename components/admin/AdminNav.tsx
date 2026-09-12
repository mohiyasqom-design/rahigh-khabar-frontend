"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { useSession } from "@/components/admin/session"
import { errorMessage } from "@/lib/errors"
import { ROLE_LABELS } from "@/types/user"

/**
 * The admin panel's own chrome.
 *
 * It deliberately does NOT reuse `components/Header.tsx` / `Footer.tsx`: those
 * carry the public masthead, the Quranic verse banner and the category
 * navigation, none of which belong in a back office — and an editor must be
 * able to tell at a glance which side of the site they are on. Only the design
 * tokens are shared (same fonts, same `accent`, same borders), so the panel
 * still looks like part of رحیق خبر.
 *
 * The signed-in identity (name, email, role) is shown here because every rule
 * in the panel depends on it: an ADMIN sees only their own articles and cannot
 * change any status, a SUPER_ADMIN sees and can do everything.
 */
const LINKS = [
	{ href: "/admin", label: "داشبورد", exact: true },
	{ href: "/admin/news/new", label: "خبر تازه", exact: false },
]

export default function AdminNav() {
	const { user, signOut } = useSession()
	const pathname = usePathname()
	const [signingOut, setSigningOut] = useState(false)
	const [signOutError, setSignOutError] = useState<string | null>(null)

	async function handleSignOut() {
		setSigningOut(true)
		setSignOutError(null)

		try {
			await signOut()
		} catch (error) {
			setSignOutError(errorMessage(error, "خروج از حساب انجام نشد؛ دوباره تلاش کنید."))
			setSigningOut(false)
		}
	}

	return (
		<header className="border-b border-border bg-white">
			<div className="mx-auto flex w-full max-w-shell flex-col gap-3 px-4 py-3 md:h-header md:flex-row md:items-center md:justify-between md:gap-6 md:py-0">
				<div className="flex items-center gap-4">
					<Link href="/admin" className="text-base font-extrabold tracking-headline text-accent">
						رحیق خبر · پنل مدیریت
					</Link>

					<nav aria-label="منوی پنل مدیریت" className="flex items-center gap-1">
						{LINKS.map((link) => {
							const active = link.exact
								? pathname === link.href
								: pathname.startsWith(link.href)

							return (
								<Link
									key={link.href}
									href={link.href}
									aria-current={active ? "page" : undefined}
									className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
										active
											? "bg-accent/10 font-semibold text-accent"
											: "text-ink hover:text-accent"
									}`}
								>
									{link.label}
								</Link>
							)
						})}
					</nav>
				</div>

				<div className="flex items-center justify-between gap-3 md:justify-end">
					<div className="min-w-0 text-xs leading-5">
						<p className="truncate font-semibold text-ink">
							{user.displayName}
							<span className="ms-2 rounded-md border border-border-strong px-1.5 py-0.5 text-[11px] font-medium text-muted-dark">
								{ROLE_LABELS[user.role]}
							</span>
						</p>
						<p className="truncate text-muted-dark" dir="ltr">
							{user.email}
						</p>
					</div>

					<button
						type="button"
						onClick={() => void handleSignOut()}
						disabled={signingOut}
						className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
					>
						{signingOut ? "در حال خروج…" : "خروج"}
					</button>
				</div>
			</div>

			{signOutError ? (
				<p
					role="alert"
					className="mx-auto w-full max-w-shell px-4 pb-3 text-xs text-accent"
				>
					{signOutError}
				</p>
			) : null}
		</header>
	)
}
