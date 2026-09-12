import type { Metadata } from "next"

import DashboardView from "@/components/admin/DashboardView"

export const metadata: Metadata = {
	title: "داشبورد",
}

/**
 * The dashboard page is a thin server shell: the list itself is fetched in the
 * browser AFTER `AdminGate` has confirmed the session, because the auth cookie
 * is host-only to the API origin and is never sent to this server. Fetching
 * articles here would fail — and would leak nothing either way.
 */
export default function AdminDashboardPage() {
	return <DashboardView />
}
