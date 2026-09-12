/**
 * Route-level skeleton.
 *
 * Pages are statically generated and revalidated in the background, so this is
 * mostly seen on the very first request for an uncached path. It mirrors the
 * homepage's hero + side-list shape so the layout does not jump when the real
 * content arrives.
 */
export default function Loading() {
	return (
		<div className="animate-pulse" aria-hidden="true">
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="aspect-[16/9] rounded-md bg-border lg:col-span-2" />
				<div className="flex flex-col gap-4">
					{[0, 1, 2, 3, 4].map((row) => (
						<div key={row} className="h-10 rounded-md bg-border" />
					))}
				</div>
			</div>
			<div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
				<div className="aspect-[16/10] rounded-md bg-border" />
				<div className="aspect-[16/10] rounded-md bg-border" />
			</div>
			<span className="sr-only">در حال بارگذاری…</span>
		</div>
	)
}
