import type { Metadata } from "next"

import CommentsView from "@/components/admin/CommentsView"

export const metadata: Metadata = {
	title: "دیدگاه‌ها",
}

export default function AdminCommentsPage() {
	return <CommentsView />
}
