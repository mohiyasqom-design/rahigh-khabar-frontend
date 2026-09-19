import type { ReactNode } from "react"

import AdminGate from "@/components/admin/session"
import AdminShell from "@/components/admin/AdminShell"

/**
 * Everything in the `(protected)` group is wrapped in `AdminGate`, which makes
 * a real `GET /auth/me` call before rendering any of it. The group exists so
 * the login page can live under `/admin` — and inherit its `noindex` metadata
 * — without being wrapped by the gate that would redirect it to itself. Route
 * groups add no URL segment, so the dashboard is still at `/admin`.
 *
 * Stage 10 Part 5 replaced the horizontal `AdminNav` with `AdminShell`, which
 * owns the sidebar, the mobile drawer and the page container. It stays inside
 * the gate because the chrome shows the signed-in identity and role-gated
 * links, so it cannot render before the session is known.
 */
export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
	return (
		<AdminGate>
			<AdminShell>{children}</AdminShell>
		</AdminGate>
	)
}
