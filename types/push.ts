/**
 * Web Push shapes, copied from the backend's `push.schema.ts`.
 */

/**
 * `GET /push/public-key`.
 *
 * `publicKey` is null whenever `enabled` is false: the backend refuses to
 * expose a half-configured VAPID setup. The UI must check `enabled` before
 * showing any permission prompt, otherwise it would ask for a permission it
 * cannot use.
 */
export interface PushPublicKey {
	publicKey: string | null
	enabled: boolean
}

/** `GET /push/status` — admin only. */
export interface PushStatus {
	enabled: boolean
	subscribers: number
}

/**
 * Body of `POST /push/broadcast`.
 *
 * The schema is `.strict()` and `url`/`categoryId` are `.optional()`, NOT
 * nullable — sending `url: ""` or `categoryId: null` is a 400. Callers must
 * omit the key entirely when it is unused.
 */
export interface PushBroadcastInput {
	title: string
	body: string
	url?: string
	/** When set, only followers of that category are notified. */
	categoryId?: string
}

/** `POST /push/broadcast` response: what actually happened on the wire. */
export interface PushDeliveryReport {
	sent: number
	failed: number
	/** Endpoints the push service reported as gone (404/410) and were deleted. */
	removed: number
}

/** Length bounds enforced by `broadcastSchema`, mirrored for the form. */
export const PUSH_BROADCAST_LIMITS = {
	titleMin: 3,
	titleMax: 100,
	bodyMin: 3,
	bodyMax: 300,
	urlMax: 500,
} as const
