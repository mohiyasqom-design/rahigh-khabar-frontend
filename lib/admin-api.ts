/**
 * Transport for AUTHENTICATED (admin) calls.
 *
 * This is a thin extension of `lib/api.ts`, not a second client: every request
 * still goes through `apiFetch`, so the backend origin stays pinned, cookies
 * still travel with `credentials: "include"`, and failures still arrive as the
 * same `ApiError` carrying the backend's `{ code, message }` payload.
 *
 * WHAT IT ADDS, AND WHY:
 *
 * 1. `cache: "no-store"` on every call. Stage 7 reads pass `publicCache`
 *    (`next: { revalidate: 60 }`) so public pages can be statically
 *    regenerated. Admin data is the exact opposite: it is per-session,
 *    changes the moment an editor saves, and includes unpublished drafts.
 *    Serving a cached copy of it would be both wrong and a data leak, so the
 *    caching assumption of Stage 7 is deliberately NOT reused here.
 *
 * 2. A JSON helper. The backend rejects a POST/PATCH without
 *    `Content-Type: application/json` with 415 `JSON_REQUIRED`, so the header
 *    is set in one place instead of being repeated at every call site.
 *
 * WHERE THESE CALLS RUN: in the browser, always. The session cookie is
 * httpOnly AND host-only to the API origin (`__Host-rk_auth` in production),
 * so it is never attached to requests made to the Next.js server — a Server
 * Component simply cannot read or forward it. See `components/admin/session.tsx`.
 */
import { apiFetch, type ApiFetchInit } from "@/lib/api"

/** Admin responses are never cached — see the note above. */
const freshOnly: ApiFetchInit = { cache: "no-store" }

/** `apiFetch`, forced fresh. */
export function adminFetch<TResponse = unknown>(
	path: string,
	init: ApiFetchInit = {},
): Promise<TResponse> {
	return apiFetch<TResponse>(path, { ...init, ...freshOnly })
}

/** `adminFetch` with a JSON body and the content type the backend requires. */
export function adminJson<TResponse = unknown>(
	path: string,
	method: "POST" | "PATCH" | "PUT" | "DELETE",
	payload?: unknown,
): Promise<TResponse> {
	if (payload === undefined) {
		return adminFetch<TResponse>(path, { method })
	}

	return adminFetch<TResponse>(path, {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	})
}

/**
 * Builds a query string from defined values only.
 *
 * The admin query schemas are `.strict()`, so an empty or unexpected parameter
 * is a 400 rather than a no-op — `status=` would fail the enum check.
 */
export function adminQuery(
	params: Record<string, string | number | undefined>,
): string {
	const search = new URLSearchParams()

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") {
			search.set(key, String(value))
		}
	}

	const query = search.toString()
	return query ? `?${query}` : ""
}
