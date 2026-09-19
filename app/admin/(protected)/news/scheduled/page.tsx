import type { Metadata } from "next"

import ScheduledNewsView from "@/components/admin/ScheduledNewsView"

export const metadata: Metadata = {
	title: "اخبار زمان‌بندی‌شده",
}

export default function AdminScheduledNewsPage() {
	return <ScheduledNewsView />
}
