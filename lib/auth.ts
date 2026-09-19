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
import { apiFetch, getApiBaseUrl } from "@/lib/api"
import { isUnauthorized } from "@/lib/errors"
import type { Session } from "@/types/auth"
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


/* -------------------------------------------------------------------------- */
/* Stage 10 Part 2 — site visitors (Google sign-in)                            */
/* -------------------------------------------------------------------------- */
/*
 * A SEPARATE ACCOUNT FROM THE ADMIN ONE ABOVE. Visitors live in
 * `regular_users`, authenticate with Google and hold the `rk_user` cookie;
 * admins live in `users` and hold `rk_auth`. The backend guards are disjoint,
 * and so are these helpers.
 *
 * WHAT WAS WRONG BEFORE:
 *   - a `next/headers` `getSession()` read a cookie named `auth` that the
 *     backend never sets, on the Next.js origin, which never receives the API
 *     cookie in the first place. It could only ever return null.
 *   - `updateProfile` posted a `FormData` (with an avatar file) to
 *     `PATCH /users/me`, which accepts JSON only — a guaranteed 415.
 *   - every call used a bare `fetch` against `process.env.NEXT_PUBLIC_API_URL`,
 *     bypassing the origin pinning in `lib/api.ts`, and threw plain `Error`s
 *     that destroyed the status code the UI needs.
 *
 * Everything here now goes through `apiFetch`, so failures arrive as `ApiError`
 * with the backend's own Persian message and its HTTP status.
 */

/** A session answer must never be cached, by the browser or by Next.js. */
const noStore = { cache: "no-store" } as const

/**
 * Absolute URL of the Google sign-in entry point, or null when
 * `NEXT_PUBLIC_API_URL` is missing or invalid.
 *
 * This is a full-page navigation, not a fetch: the OAuth flow ends in a
 * redirect from Google back to the API, which then sets the cookie and sends
 * the browser to the site. Returning null lets the caller say so instead of
 * rendering a button that goes nowhere.
 */
export function googleLoginUrl(): string | null {
	try {
		return new URL("auth/google", getApiBaseUrl()).toString()
	} catch {
		return null
	}
}

/** The signed-in visitor, or null when there is no valid visitor session. */
export async function getVisitorSession(): Promise<Session | null> {
	try {
		return await apiFetch<Session>("users/me", noStore)
	} catch (error) {
		if (isUnauthorized(error)) {
			return null
		}

		// A 500 or a network failure is not "signed out"; let the caller decide.
		throw error
	}
}

/**
 * Advisory availability check for the onboarding form.
 *
 * The unique index is the real gate: two tabs can pass this check and still
 * lose the race, which the backend answers with 409 `USERNAME_TAKEN`.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
	const search = new URLSearchParams({ username })

	const result = await apiFetch<{ username: string; available: boolean }>(
		`users/check-username?${search.toString()}`,
		noStore,
	)

	return result.available
}

/**
 * Updates the visitor profile. Send only what changed; the backend requires at
 * least one field and rejects anything outside `username` / `displayName`.
 *
 * `username` is write-once server-side (409 `USERNAME_ALREADY_SET`).
 */
export function updateVisitorProfile(input: {
	username?: string
	displayName?: string
}): Promise<Session> {
	return apiFetch<Session>("users/me", {
		...noStore,
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	})
}

/** Clears the visitor cookie. Idempotent: 204 even when already anonymous. */
export async function visitorLogout(): Promise<void> {
	await apiFetch<void>("users/logout", { ...noStore, method: "POST" })
}
