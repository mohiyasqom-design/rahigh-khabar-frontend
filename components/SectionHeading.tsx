import Link from "next/link"

/**
 * Section heading with the mockup's coloured marker bar and optional
 * "مشاهده همه" action.
 *
 * The marker colour is meaningful, not decorative variety: `accent` (maroon)
 * marks a category section, `link` (blue-grey) marks a secondary list. `none`
 * is for plain section titles.
 */
export default function SectionHeading({
	title,
	marker = "none",
	size = "md",
	action,
}: {
	title: string
	marker?: "accent" | "link" | "none"
	size?: "sm" | "md"
	action?: { href: string; label: string }
}) {
	return (
		<div className="mb-4 flex items-center justify-between gap-4">
			<div className="flex items-center gap-2">
				{marker === "none" ? null : (
					<span
						className={`h-5 w-1 shrink-0 ${
							marker === "accent" ? "bg-accent" : "bg-link"
						}`}
						aria-hidden="true"
					/>
				)}
				<h2
					className={`font-extrabold tracking-headline ${
						size === "sm" ? "text-base" : "text-lg"
					}`}
				>
					{title}
				</h2>
			</div>

			{action ? (
				<Link
					href={action.href}
					className="shrink-0 text-sm font-medium text-link hover:underline"
				>
					{action.label}
				</Link>
			) : null}
		</div>
	)
}
