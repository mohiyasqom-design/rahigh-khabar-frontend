import type { Metadata } from "next"

import NewsEditor from "@/components/admin/NewsEditor"

export const metadata: Metadata = {
	title: "خبر تازه",
}

export default function NewNewsPage() {
	return <NewsEditor />
}
