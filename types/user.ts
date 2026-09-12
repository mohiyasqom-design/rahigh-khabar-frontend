/**
 * The authenticated admin, exactly as the backend exposes it.
 *
 * Source of truth: `toPublicUser()` in the backend's users module, which is the
 * shape returned by `POST /auth/login` and `GET /auth/me`. It is deliberately
 * narrow — `passwordHash`, `isActive`, `createdAt` and `updatedAt` exist in the
 * database but never cross the wire, so they are not typed here.
 */

/** The only two roles in the system; there is no public/reader role. */
export type Role = "ADMIN" | "SUPER_ADMIN"

export interface AdminUser {
	id: string
	email: string
	displayName: string
	role: Role
}

/** Persian labels for the role badge in the admin chrome. */
export const ROLE_LABELS: Record<Role, string> = {
	ADMIN: "مدیر",
	SUPER_ADMIN: "مدیر ارشد",
}
