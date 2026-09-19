/**
 * Site-visitor session shapes (Stage 10 Part 2, Google sign-in).
 *
 * This mirrors the backend's `siteUserResponseSchema` field by field. It is a
 * DIFFERENT account than `types/user.ts` `AdminUser`: visitors live in the
 * `regular_users` table, sign in with Google, and hold a separate cookie
 * (`rk_user`). A visitor can never reach the admin panel and an admin session
 * can never post a comment — the two guards are disjoint on the server.
 */

/** Enforced by the backend's `usernameSchema`; mirrored to validate early. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const DISPLAY_NAME_MAX_LENGTH = 50

export type SiteRole = "USER" | "ADMIN" | "SUPER_ADMIN"

export interface Session {
	id: string
	email: string
	/**
	 * `null` until onboarding completes. The backend column is nullable exactly
	 * for this window, so the UI must treat null as "not chosen yet" and never as
	 * an empty string.
	 */
	username: string | null
	displayName: string
	/** Google's picture URL, or null. */
	avatarUrl: string | null
	role: SiteRole
	/** ISO-8601 timestamp of the one-time username write, or null. */
	usernameSetAt: string | null
}

/**
 * True when the visitor is signed in but still has no username.
 *
 * `username` is the authoritative signal, not `usernameSetAt`: the username is
 * what every comment is attributed to, and it is written once, together with
 * the timestamp.
 */
export function needsOnboarding(session: Session | null): boolean {
	return session !== null && session.username === null
}
