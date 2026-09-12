/** Article-shaped skeleton, so the page does not reflow when content lands. */
export default function NewsLoading() {
	return (
		<div className="mx-auto w-full max-w-3xl animate-pulse" aria-hidden="true">
			<div className="h-4 w-40 rounded bg-border" />
			<div className="mt-5 h-8 rounded bg-border" />
			<div className="mt-3 h-8 w-3/4 rounded bg-border" />
			<div className="mt-6 h-4 rounded bg-border" />
			<div className="mt-2 h-4 w-5/6 rounded bg-border" />
			<div className="mt-6 aspect-[16/9] rounded-md bg-border" />
			<div className="mt-8 flex flex-col gap-3">
				{[0, 1, 2, 3, 4, 5].map((line) => (
					<div key={line} className="h-4 rounded bg-border" />
				))}
			</div>
			<span className="sr-only">در حال بارگذاری خبر…</span>
		</div>
	)
}
