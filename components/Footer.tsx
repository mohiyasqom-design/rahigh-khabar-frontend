import Image from "next/image"
import Link from "next/link"

import { getCategoriesForNav } from "@/lib/categories"

/**
 * Site footer: brand block, real category links, Jalali copyright line.
 *
 * WHAT THE MOCKUP HAS AND THIS DOES NOT, on purpose:
 *   - an "درباره" column (درباره ما / تماس با ما / حریم خصوصی). Those pages do
 *     not exist in this stage, and links to 404s are worse than no links.
 *   - three social-network circles. The mockup's were empty placeholders and
 *     there are no real account URLs to point at.
 * Both come back the moment there is something real behind them.
 *
 * The category links are the same `GET /categories` response the header uses,
 * so it is one shared Data Cache entry, not a second backend request.
 *
 * The year is the Jalali (Solar Hijri) year, formatted with `Intl` in the
 * `fa-IR` locale so the digits are Persian. It is computed during
 * pre-render/revalidation, which is accurate to within the ISR window.
 */
export default async function Footer() {
	const categories = await getCategoriesForNav()

	const jalaliYear = new Intl.DateTimeFormat("fa-IR", {
		timeZone: "Asia/Tehran",
		year: "numeric",
	}).format(new Date())

	return (
		<footer className="mt-12 bg-ink text-white/70 sm:mt-16">
			<div className="mx-auto max-w-shell px-4 py-10 sm:py-12">
				<div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
					<div className="sm:col-span-2">
						<Image
							src="/logo-rahigh-khabar.png"
							alt="رحیق خبر"
							width={1175}
							height={745}
							sizes="100px"
							className="h-11 w-auto object-contain"
						/>
						<p className="mt-4 max-w-md text-sm leading-[1.9]">
							رسانه‌ای مستقل برای پوشش دقیق و به‌روز اخبار سیاسی، ایران و
							تحولات منطقه.
						</p>
					</div>

					{categories.length > 0 ? (
						<nav aria-label="دسته‌بندی‌ها">
							<h2 className="mb-3 text-sm font-semibold text-paper">
								دسته‌بندی‌ها
							</h2>
							<ul className="flex flex-col gap-2 text-sm">
								{categories.map((category) => (
									<li key={category.slug}>
										<Link
											href={`/category/${category.slug}`}
											className="transition-colors hover:text-paper"
										>
											{category.name}
										</Link>
									</li>
								))}
							</ul>
						</nav>
					) : null}
				</div>

				<p className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
					© {jalaliYear} رحیق خبر — تمامی حقوق محفوظ است.
				</p>
			</div>
		</footer>
	)
}
