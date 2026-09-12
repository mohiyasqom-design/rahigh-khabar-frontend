/**
 * The editorial workflow, mirrored from the backend — not invented here.
 *
 * SOURCE OF TRUTH: `src/modules/news/news.policy.ts`.
 *   - `allowedTransitions` below is a character-for-character copy of the
 *     backend's own table.
 *   - `POST /admin/news/:id/status` is registered with
 *     `requireRole('SUPER_ADMIN')`, so NO status change of any kind is
 *     available to a plain ADMIN — not even "submit for review".
 *   - `PATCH /admin/news/:id` is open to both roles, but `newsPolicy.assert()`
 *     limits an ADMIN to their OWN articles and only while the article is in
 *     DRAFT, IN_REVIEW or REJECTED.
 *
 * WHY MIRROR IT AT ALL: so the UI never offers a button the backend would
 * reject. That is a usability decision, nothing more. The backend re-checks
 * every rule on every request, and it is the only thing that actually enforces
 * them; if this file ever drifts, the worst case is a button that returns the
 * backend's real refusal, never an unauthorised change.
 */
import type { AdminNewsItem, NewsStatus } from "@/types/news"
import type { AdminUser } from "@/types/user"

/** Persian labels for every workflow state. */
export const STATUS_LABELS: Record<NewsStatus, string> = {
	DRAFT: "پیش‌نویس",
	IN_REVIEW: "در انتظار بازبینی",
	PUBLISHED: "منتشرشده",
	ARCHIVED: "بایگانی‌شده",
	REJECTED: "ردشده",
}

/** The verb shown on the button that performs each transition. */
export const TRANSITION_LABELS: Record<NewsStatus, string> = {
	DRAFT: "بازگرداندن به پیش‌نویس",
	IN_REVIEW: "ارسال برای بازبینی",
	PUBLISHED: "انتشار",
	ARCHIVED: "بایگانی کردن",
	REJECTED: "رد کردن",
}

/** Every state, in the order used by the dashboard filter. */
export const STATUS_ORDER: NewsStatus[] = [
	"DRAFT",
	"IN_REVIEW",
	"PUBLISHED",
	"ARCHIVED",
	"REJECTED",
]

/**
 * Copied verbatim from `allowedTransitions` in the backend policy.
 * A same-state request is not a transition and is rejected with 400.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<NewsStatus, readonly NewsStatus[]>> = {
	DRAFT: ["IN_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"],
	IN_REVIEW: ["PUBLISHED", "REJECTED", "ARCHIVED"],
	PUBLISHED: ["ARCHIVED"],
	REJECTED: ["DRAFT"],
	ARCHIVED: ["PUBLISHED"],
}

/** Statuses in which an ADMIN may still edit their own article. */
const ADMIN_EDITABLE_STATUSES: readonly NewsStatus[] = [
	"DRAFT",
	"IN_REVIEW",
	"REJECTED",
]

/**
 * Transitions the UI may offer for this user and this article.
 *
 * Empty for every ADMIN, because the status route is Super-Admin-only.
 */
export function availableTransitions(
	user: AdminUser,
	status: NewsStatus,
): readonly NewsStatus[] {
	if (user.role !== "SUPER_ADMIN") {
		return []
	}

	return ALLOWED_TRANSITIONS[status]
}

/** Whether `PATCH /admin/news/:id` would be accepted for this user/article. */
export function canEditNews(user: AdminUser, news: AdminNewsItem): boolean {
	if (user.role === "SUPER_ADMIN") {
		return true
	}

	return news.authorId === user.id && ADMIN_EDITABLE_STATUSES.includes(news.status)
}

/** The Persian reason an ADMIN cannot edit, or null when editing is allowed. */
export function editingBlockedReason(
	user: AdminUser,
	news: AdminNewsItem,
): string | null {
	if (canEditNews(user, news)) {
		return null
	}

	if (news.authorId !== user.id) {
		return "این خبر را کاربر دیگری نوشته است؛ ویرایش آن فقط برای مدیر ارشد ممکن است."
	}

	return `خبر در وضعیت «${STATUS_LABELS[news.status]}» است و در این وضعیت فقط مدیر ارشد می‌تواند آن را ویرایش کند.`
}
