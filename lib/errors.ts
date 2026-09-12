/**
 * Turning a failed request into something an editor can read.
 *
 * RULE: the backend already answers in Persian and its messages are precise
 * ("انتقال از DRAFT به PUBLISHED مجاز نیست…", "یک یا چند دسته‌بندی وجود
 * ندارند."). So the real message is shown whenever there is one, and the
 * fallback text here is only used when the failure produced no message at all
 * (network error, misconfigured base URL, unexpected body shape).
 *
 * Nothing in this file invents an error the backend did not report.
 */
import { ApiError } from "@/lib/api"

/** The two error envelopes the backend can produce (see utils/http-schemas.ts). */
type BackendError = { code?: unknown; message?: unknown; error?: unknown }

function payloadOf(error: unknown): BackendError | null {
	if (!(error instanceof ApiError) || typeof error.payload !== "object" || error.payload === null) {
		return null
	}

	return error.payload as BackendError
}

/** The backend's machine-readable code, e.g. `INVALID_STATUS_TRANSITION`. */
export function errorCode(error: unknown): string | null {
	const code = payloadOf(error)?.code
	return typeof code === "string" ? code : null
}

/** HTTP status of a failed backend call, or null for a client-side failure. */
export function errorStatus(error: unknown): number | null {
	return error instanceof ApiError && error.status > 0 ? error.status : null
}

/** True when the session is missing, expired, or the account was deactivated. */
export function isUnauthorized(error: unknown): boolean {
	return errorStatus(error) === 401
}

/** True when the account is authenticated but not allowed to do this. */
export function isForbidden(error: unknown): boolean {
	return errorStatus(error) === 403
}

/**
 * A Persian sentence for the user: the backend's own message when it sent one,
 * otherwise the caller's fallback.
 */
export function errorMessage(error: unknown, fallback: string): string {
	const payload = payloadOf(error)

	if (payload) {
		if (typeof payload.message === "string" && payload.message.trim()) {
			return payload.message.trim()
		}

		// Legacy parser/infrastructure envelope: { "error": "..." }.
		if (typeof payload.error === "string" && payload.error.trim()) {
			return payload.error.trim()
		}
	}

	if (error instanceof ApiError && error.status === 0) {
		// Configuration problem raised by lib/api.ts before any request was sent.
		return "پیکربندی نشانی سرویس درست نیست؛ با مدیر فنی تماس بگیرید."
	}

	if (error instanceof TypeError) {
		// fetch() rejects with a TypeError when the network or CORS blocks it.
		return "ارتباط با سرور برقرار نشد؛ اتصال شبکه را بررسی کنید و دوباره تلاش کنید."
	}

	return fallback
}

/** Persian text for a session that is gone, used in more than one place. */
export const SESSION_EXPIRED_MESSAGE =
	"نشست شما پایان یافته است. برای ادامه دوباره وارد شوید."
