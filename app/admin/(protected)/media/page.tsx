import type { Metadata } from "next"

import MediaLibraryView from "@/components/admin/MediaLibraryView"

export const metadata: Metadata = {
	title: "کتابخانه رسانه",
}

export default function AdminMediaPage() {
	return <MediaLibraryView />
}
