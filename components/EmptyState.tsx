import type { ReactNode } from "react"

/**
 * Shared "there is nothing here" panel.
 *
 * Deliberately distinct from a 404: an empty category means the category exists
 * but has no published articles yet, which is a normal state and must not be
 * presented as a broken URL.
 */
export default function EmptyState({
	title,
	description,
	action,
}: {
	title: string
	description?: string
	action?: ReactNode
}) {
	return (
		<div className="mx-auto max-w-md rounded-md border border-border px-6 py-14 text-center">
			<p className="text-lg font-bold tracking-headline text-ink">{title}</p>
			{description ? (
				<p className="mt-3 text-sm leading-7 text-muted-dark">{description}</p>
			) : null}
			{action ? <div className="mt-6">{action}</div> : null}
		</div>
	)
}
