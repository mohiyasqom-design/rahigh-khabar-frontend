import type { Metadata } from "next"

import UsersView from "@/components/admin/UsersView"

export const metadata: Metadata = {
	title: "کاربران",
}

/**
 * Visible in the sidebar only for SUPER_ADMIN, and `GET /admin/users` also
 * requires that role — an ADMIN who types the URL gets the 403 notice from
 * the view, not a blank page.
 */
export default function AdminUsersPage() {
	return <UsersView />
}
