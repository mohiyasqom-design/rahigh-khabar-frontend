import type { ReactNode } from "react"

import AdminGate from "@/components/admin/session"
import AdminNav from "@/components/admin/AdminNav"

/**
 * Everything in the `(protected)` group is wrapped in `AdminGate`, which makes
 * a real `GET /auth/me` call before rendering any of it. The group exists so
 * the login page can live under `/admin` — and therefore inherit the
 * `noindex` metadata — without being wrapped by the gate that would redirect it
 * to itself. Route groups add no URL segment, so the dashboard is still at
 * `/admin`.
 *
 * `AdminNav` is inside the gate on purpose: the chrome shows the signed-in
 * identity, so it cannot render before the session is known.
 */
export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
	return (
		<AdminGate>
			<AdminNav />
			<main className="mx-auto w-full max-w-shell flex-1 px-4 py-8">{children}</main>
		</AdminGate>
	)
}
