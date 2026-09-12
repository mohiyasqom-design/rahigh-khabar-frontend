/**
 * Session operations against the real backend auth routes.
 *
 * ENDPOINTS (read from `src/modules/auth/auth.routes.ts`, registered under the
 * `/auth` prefix in `src/app.ts`):
 *
 *   POST /auth/login   { email, password } → 200 with the public user, and a
 *                      `Set-Cookie` carrying the JWT. Requires
 *                      `Content-Type: application/json` (415 otherwise),
 *                      answers 400 `INVALID_INPUT` for a malformed body,
 *                      401 `INVALID_CREDENTIALS` for a wrong pair, and
 *                      429 `TOO_MANY_REQUESTS` once the rate limit is hit.
 *   POST /auth/logout  → 204, idempotent, clears the cookie.
 *   GET  /auth/me      → 200 with the public user, or 401 `UNAUTHORIZED` /
 *                      `TOKEN_EXPIRED`. This is the "who am I" check the admin
 *                      area is gated on.
 *
 * THE COOKIE IS NEVER TOUCHED HERE. It is httpOnly (`__Host-rk_auth` in
 * production, `rk_auth` otherwise) and is set, refreshed and cleared by the
 * backend alone. Nothing in this app reads it, decodes it, copies it into
 * localStorage/sessionStorage, or keeps its own idea of "logged in" beyond the
 * answer to `GET /auth/me`.
 *
 * WHY THE CHECK CANNOT RUN ON THE NEXT.JS SERVER: the cookie is host-only to
 * the API origin, so a browser never sends it to the frontend origin. A Server
 * Component, a `middleware.ts` or a Server Action therefore has nothing to
 * forward, and any "protection" written there would be decoration. The gate is
 * a real backend call made from the browser — see `components/admin/session.tsx`
 * and the note in README.
 */
import { adminFetch, adminJson } from "@/lib/admin-api"
import { isUnauthorized } from "@/lib/errors"
import type { AdminUser } from "@/types/user"

/** Credentials accepted by `POST /auth/login` (`loginSchema`, strict). */
export interface LoginCredentials {
	/** Trimmed and lower-cased by the backend; max 254 characters. */
	email: string
	/** 1–1024 bytes; no other client-side rule is imposed. */
	password: string
}

/**
 * Signs in and returns the authenticated admin.
 *
 * @throws ApiError with the backend's own Persian message — the same one for a
 * wrong email and a wrong password, because the backend deliberately does not
 * distinguish them (`INVALID_CREDENTIALS`, "ایمیل یا رمز عبور نادرست است").
 * The form must not add a distinction the backend refuses to make.
 */
export function login(credentials: LoginCredentials): Promise<AdminUser> {
	return adminJson<AdminUser>("auth/login", "POST", {
		email: credentials.email,
		password: credentials.password,
	})
}

/**
 * Ends the session server-side. Idempotent, and answers 204 with no body.
 *
 * KNOWN LIMIT, stated because it is a real one: the backend clears the cookie
 * but does not maintain a revocation list ("JWT revocation is not implied" in
 * `auth.routes.ts`). A token already copied out of the browser stays valid
 * until it expires (`JWT_EXPIRES_IN`, one hour by default). Logging out does
 * stop this browser — the cookie is gone and the next admin page redirects to
 * the login form — but it is not a global kill switch.
 */
export async function logout(): Promise<void> {
	await adminFetch<void>("auth/logout", { method: "POST" })
}

/**
 * The current admin, or null when there is no valid session.
 *
 * Only a 401 becomes null. Anything else (500, network failure, bad base URL)
 * is re-thrown, so a broken backend is never silently shown as "logged out" —
 * which would send an editor to the login form to enter credentials that would
 * then fail for a completely different reason.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
	try {
		return await adminFetch<AdminUser>("auth/me")
	} catch (error) {
		if (isUnauthorized(error)) {
			return null
		}

		throw error
	}
}
