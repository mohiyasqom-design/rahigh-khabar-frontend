import type { Metadata } from "next"

import NewsListView from "@/components/admin/NewsListView"

export const metadata: Metadata = {
	title: "همه اخبار",
}

/**
 * Thin server shell. The list is fetched in the browser after `AdminGate`
 * confirms the session: the staff cookie is host-only to the API origin and
 * is never sent to this Next.js server, so a server-side fetch would 401.
 */
export default function AdminAllNewsPage() {
	return <NewsListView />
}
