"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

import { isSearchable, searchPath, suggestNews } from "@/lib/search"
import { SEARCH_DEBOUNCE_MS, SEARCH_MAX_LENGTH, type SearchSuggestion } from "@/types/search"

/**
 * Stage 10 Part 5 — the live header search field.
 *
 * REPLACES THE DISABLED PLACEHOLDER of Stage 7: the backend now exposes
 * `GET /search` and `GET /search/suggest`, so the honest thing is a working
 * field rather than a note explaining that search does not exist.
 *
 * DEBOUNCE + ABORT, both required by the contract: `/search/suggest` is rate
 * limited at 120 requests per minute, and a keystroke-per-request field would
 * burn that in seconds. Typing is therefore coalesced over
 * `SEARCH_DEBOUNCE_MS`, and every new request aborts the previous one so a
 * slow answer for "اخ" can never overwrite the answer for "اخبار".
 *
 * SHORT TERMS ARE NEVER SENT. `isSearchable` mirrors the server's 2-character
 * minimum, so a single letter produces no request instead of a guaranteed 400.
 *
 * SUBMIT GOES TO `/search`, which is the full, paginated, shareable result
 * page; the dropdown is only a shortcut to individual articles.
 */
export default function HeaderSearch() {
	const router = useRouter()
	const listId = useId()
	const [term, setTerm] = useState("")
	const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
	const [open, setOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement | null>(null)

	// The field is only mounted when the panel opens, so focusing on mount is
	// what the reader expects after clicking the search icon.
	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	useEffect(() => {
		if (!isSearchable(term)) {
			setSuggestions([])
			setOpen(false)
			return
		}

		const controller = new AbortController()

		const timer = window.setTimeout(async () => {
			try {
				const items = await suggestNews(term, controller.signal)
				setSuggestions(items)
				setOpen(items.length > 0)
			} catch {
				// A failed or aborted suggestion request must stay silent: the
				// reader can still submit the form and get the real result page.
				setSuggestions([])
				setOpen(false)
			}
		}, SEARCH_DEBOUNCE_MS)

		return () => {
			window.clearTimeout(timer)
			controller.abort()
		}
	}, [term])

	return (
		<form
			role="search"
			onSubmit={(event) => {
				event.preventDefault()

				if (!isSearchable(term)) {
					return
				}

				setOpen(false)
				router.push(searchPath(term))
			}}
		>
			<div className="flex gap-2">
				<input
					ref={inputRef}
					type="search"
					value={term}
					onChange={(event) => setTerm(event.target.value)}
					maxLength={SEARCH_MAX_LENGTH}
					placeholder="جست‌وجو در اخبار"
					aria-label="جست‌وجو در اخبار"
					aria-controls={open ? listId : undefined}
					aria-expanded={open}
					className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-paper placeholder:text-white/40"
				/>

				<button
					type="submit"
					disabled={!isSearchable(term)}
					className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					جست‌وجو
				</button>
			</div>

			{open ? (
				<ul
					id={listId}
					className="mt-2 divide-y divide-white/10 overflow-hidden rounded-md border border-white/15 bg-ink"
				>
					{suggestions.map((suggestion) => (
						<li key={suggestion.slug}>
							<Link
								href={`/news/${suggestion.slug}`}
								onClick={() => setOpen(false)}
								className="block px-3 py-2 text-sm leading-7 text-white/80 transition-colors hover:bg-white/5 hover:text-paper"
							>
								{suggestion.title}
							</Link>
						</li>
					))}
				</ul>
			) : null}
		</form>
	)
}
