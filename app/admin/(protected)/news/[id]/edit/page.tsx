import type { Metadata } from "next"

import NewsEditor from "@/components/admin/NewsEditor"

export const metadata: Metadata = {
	title: "ویرایش خبر",
}

/**
 * `params` is awaited here (Next 15 makes it a promise) and the id is handed to
 * the client editor as a plain prop — no `useParams`/`useSearchParams`, so no
 * Suspense boundary is needed and the route stays type-safe.
 */
export default async function EditNewsPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params

	return <NewsEditor newsId={id} />
}
