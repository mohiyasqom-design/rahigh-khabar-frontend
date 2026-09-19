import type { Metadata } from "next"

import FollowingView from "@/components/FollowingView"

/**
 * Stage 10 Part 5 — `/profile/following`.
 *
 * NOINDEX: everything on this page belongs to one signed-in visitor
 * (`GET /me/follows` and `GET /me/feed` are cookie-scoped and `no-store`), so
 * there is nothing for a crawler to index here.
 */
export const metadata: Metadata = {
	title: "دنبال‌شده‌های من",
	robots: { index: false, follow: false },
}

export default function FollowingPage() {
	return <FollowingView />
}
