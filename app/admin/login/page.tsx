import type { Metadata } from "next"
import Link from "next/link"

import LoginForm from "@/components/admin/LoginForm"

/**
 * The login page sits OUTSIDE the `(protected)` group on purpose: it is the one
 * admin route that must render without a session, so it is not wrapped by
 * `AdminGate` and cannot loop back to itself.
 *
 * It inherits `robots: noindex, nofollow` from `app/admin/layout.tsx`.
 */
export const metadata: Metadata = {
	title: "ورود به پنل",
}

export default function LoginPage() {
	return (
		<div className="mx-auto flex w-full max-w-shell flex-1 items-center justify-center px-4 py-12">
			<div className="w-full max-w-sm">
				<div className="rounded-md border border-border bg-white px-6 py-8">
					<div className="mb-6 text-center">
						<p className="text-xl font-extrabold tracking-headline text-accent">رحیق خبر</p>
						<h1 className="mt-2 text-base font-bold text-ink">ورود به پنل مدیریت</h1>
					</div>

					<LoginForm />
				</div>

				<p className="mt-6 text-center text-xs text-muted-dark">
					<Link href="/" className="transition-colors hover:text-accent">
						بازگشت به سایت
					</Link>
				</p>
			</div>
		</div>
	)
}
