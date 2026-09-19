import type { Metadata } from "next"

import NewsListView from "@/components/admin/NewsListView"

export const metadata: Metadata = {
	title: "پیش‌نویس‌ها",
}

/** Same list, locked to DRAFT so the sidebar entry is a real shortcut. */
export default function AdminDraftsPage() {
	return (
		<NewsListView
			fixedStatus="DRAFT"
			title="پیش‌نویس‌ها"
			description="خبرهایی که هنوز منتشر نشده‌اند و در حال نگارش هستند."
		/>
	)
}
