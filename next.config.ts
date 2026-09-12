import type { NextConfig } from "next"

type RemotePatterns = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>

/**
 * Stage 7 adds exactly one thing to the Stage 6 config: the allow-list for
 * remote cover images.
 *
 * WHY IT IS DERIVED, NOT HARDCODED: the backend serves uploads from
 * `${PUBLIC_API_URL}/uploads/<uuid>.<jpg|png|webp>` (see the backend's
 * `LocalMediaStorage.save()`), so the image host is always the API host. The
 * pattern is therefore computed from the same `NEXT_PUBLIC_API_URL` the API
 * client uses — no second place to keep in sync, and no wildcard host.
 *
 * The path is pinned to `/uploads/**`, so the image optimiser can only be
 * pointed at the media directory, not at arbitrary backend routes.
 *
 * CONSEQUENCE TO KNOW: `NEXT_PUBLIC_API_URL` must be present at BUILD time
 * (Railway build variables), not only at runtime. That was already true for any
 * NEXT_PUBLIC_ variable, but now a missing value degrades cover images as well,
 * so the build logs a warning instead of failing silently.
 */
function coverImagePatterns(): RemotePatterns {
	const configured = process.env.NEXT_PUBLIC_API_URL?.trim()

	if (!configured) {
		console.warn(
			"[next.config] NEXT_PUBLIC_API_URL is not set at build time, so next/image will reject backend cover images. Set it in the build environment.",
		)
		return []
	}

	try {
		const api = new URL(configured)

		if (api.protocol !== "http:" && api.protocol !== "https:") {
			console.warn(
				"[next.config] NEXT_PUBLIC_API_URL must be an http(s) URL; cover images are disabled.",
			)
			return []
		}

		return [
			{
				protocol: api.protocol === "https:" ? "https" : "http",
				hostname: api.hostname,
				port: api.port,
				pathname: "/uploads/**",
			},
		]
	} catch {
		console.warn(
			"[next.config] NEXT_PUBLIC_API_URL is not a valid absolute URL; cover images are disabled.",
		)
		return []
	}
}

const nextConfig: NextConfig = {
	reactStrictMode: true,
	images: {
		remotePatterns: coverImagePatterns(),
	},
}

export default nextConfig
