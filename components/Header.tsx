import { getCategoriesForNav } from "@/lib/categories"

import HeaderBar from "./HeaderBar"
import VerseBanner from "./VerseBanner"

/**
 * Site header: the Quranic verse banner plus the sticky black bar.
 *
 * This is a Server Component whose only job is data: the navigation is built
 * from the real `GET /categories` response, never from a hardcoded list, so
 * adding or renaming a category in the admin panel changes the menu without a
 * deploy. The interactive shell (mobile menu, search panel) lives in
 * `HeaderBar`, which is the single client boundary in the header.
 *
 * FAILURE MODE: `getCategoriesForNav()` degrades to an empty list instead of
 * throwing, because the header is rendered by the root layout — a failed nav
 * request must not replace every page in the site with an error screen. With
 * no categories, the nav and the menu button are simply not rendered.
 */
export default async function Header() {
	const categories = await getCategoriesForNav()

	return (
		<>
			<VerseBanner />
			<HeaderBar categories={categories} />
		</>
	)
}
