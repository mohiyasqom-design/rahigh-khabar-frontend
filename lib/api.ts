/**
 * Minimal typed client for the Rahigh Khabar backend (Fastify REST API).
 *
 * Scope for Stage 6: the wrapper only. No endpoint paths, no response shapes
 * and no real request are defined here — those belong to Stage 7+, once the
 * backend contract is read rather than guessed.
 *
 * ENV CHOICE: the base URL comes from `NEXT_PUBLIC_API_URL`. It is a public
 * backend URL (not a secret), and Stages 7–8 need calls from Client Components
 * too (search, admin editor), so a single NEXT_PUBLIC_ variable avoids having
 * to duplicate the value later. A server-only variable would have blocked
 * browser-side calls without adding any real protection.
 *
 * FAILURE MODE: nothing is read or validated at import time, so a missing
 * variable never breaks `next dev` or `next build`; it only throws when a
 * request is actually attempted.
 */

/** Name of the env var holding the backend base URL. */
const API_BASE_URL_ENV = "NEXT_PUBLIC_API_URL"

/** Request options, minus `credentials`, which this client always controls. */
export type ApiFetchInit = Omit<RequestInit, "credentials">

/** Thrown for configuration problems and for non-2xx backend responses. */
export class ApiError extends Error {
	readonly status: number
	readonly payload: unknown

	constructor(message: string, status: number, payload: unknown = null) {
		super(message)
		this.name = "ApiError"
		this.status = status
		this.payload = payload
	}
}

/**
 * Returns the configured backend base URL, normalised with a trailing slash so
 * that relative paths resolve predictably.
 *
 * @throws ApiError when the environment variable is missing or not a valid URL.
 */
export function getApiBaseUrl(): string {
	const configured = process.env.NEXT_PUBLIC_API_URL?.trim()

	if (!configured) {
		throw new ApiError(
			`Missing ${API_BASE_URL_ENV}. Set it in .env.local (see .env.example) or in the deployment environment.`,
			0,
		)
	}

	try {
		const base = new URL(configured)
		base.hash = ""
		base.search = ""
		if (!base.pathname.endsWith("/")) {
			base.pathname = `${base.pathname}/`
		}
		return base.toString()
	} catch {
		throw new ApiError(
			`${API_BASE_URL_ENV} is not a valid absolute URL: "${configured}".`,
			0,
		)
	}
}

/**
 * Resolves a path against the configured backend origin.
 *
 * Security: the backend authenticates with a JWT in an httpOnly cookie, so
 * every request is sent with credentials. To make sure those cookies can only
 * ever reach the intended backend, the resolved URL's origin is compared with
 * the configured origin and anything else is rejected — a caller cannot pass an
 * absolute third-party URL through this client.
 */
function resolveApiUrl(path: string): string {
	const base = getApiBaseUrl()
	const target = new URL(path, base)

	if (target.origin !== new URL(base).origin) {
		throw new ApiError(
			`Refusing to send credentialed request to "${target.origin}", which is not the configured ${API_BASE_URL_ENV} origin.`,
			0,
		)
	}

	return target.toString()
}

/** Reads the body as JSON when the backend says so, otherwise as text. */
async function readPayload(response: Response): Promise<unknown> {
	if (response.status === 204 || response.status === 205) {
		return undefined
	}

	const contentType = response.headers.get("content-type") ?? ""

	if (contentType.includes("application/json")) {
		return (await response.json()) as unknown
	}

	const text = await response.text()
	return text.length > 0 ? text : undefined
}

/**
 * Calls the backend and returns the parsed body.
 *
 * @param path Path relative to the configured base URL, e.g. "news" or "/news".
 * @param init Standard fetch options; `credentials` is managed by this client.
 * @throws ApiError on a non-2xx response, carrying the status and parsed body.
 *
 * @example
 * // Stage 7+ usage, once the backend contract is known:
 * // const data = await apiFetch<SomeType>("some/path")
 */
export async function apiFetch<TResponse = unknown>(
	path: string,
	init: ApiFetchInit = {},
): Promise<TResponse> {
	const url = resolveApiUrl(path)
	const headers = new Headers(init.headers)

	if (!headers.has("Accept")) {
		headers.set("Accept", "application/json")
	}

	const response = await fetch(url, {
		...init,
		headers,
		// The JWT lives in an httpOnly cookie, so cookies must travel with the
		// request. resolveApiUrl() has already pinned the target to the backend
		// origin, so this is never a wildcard, any-origin credential send.
		credentials: "include",
	})

	const payload = await readPayload(response)

	if (!response.ok) {
		throw new ApiError(
			`Backend request "${path}" failed with status ${response.status}.`,
			response.status,
			payload,
		)
	}

	return payload as TResponse
}
