import { STATUS_LABELS } from "@/lib/news-status"
import type { NewsStatus } from "@/types/news"

/**
 * The workflow state of one article, in Persian.
 *
 * Colour is a hint, never the message: the label is always spelled out, so the
 * badge stays readable in monochrome and for colour-blind editors.
 */
const TONE: Record<NewsStatus, string> = {
	DRAFT: "border-border bg-paper text-muted-dark",
	IN_REVIEW: "border-link/40 bg-link/10 text-link",
	PUBLISHED: "border-accent/40 bg-accent/10 text-accent",
	ARCHIVED: "border-border-strong bg-white text-muted-dark",
	REJECTED: "border-accent bg-accent text-paper",
}

export default function StatusBadge({ status }: { status: NewsStatus }) {
	return (
		<span
			className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${TONE[status]}`}
		>
			{STATUS_LABELS[status]}
		</span>
	)
}
