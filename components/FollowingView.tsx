"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import EmptyState from "@/components/EmptyState"
import { googleLoginUrl } from "@/lib/auth"
import { errorMessage, isUnauthorized } from "@/lib/errors"
import { formatJalaliDate } from "@/lib/format"
import {
	getFollowedFeed,
	listFollowedCategories,
	setCategoryFollow,
	type FeedItem,
	type FollowedCategory,
} from "@/lib/follows"
import type { Pagination as PaginationMeta } from "@/types/api"

/**
 * Stage 10 Part 5 — the reader's followed categories and their personal feed.
 *
 * CLIENT-SIDE FOR THE SAME REASON AS `AuthMenu`: the visitor cookie is scoped
 * to the API origin, so a Server Component has no credentials to forward, and
 * both endpoints answer `no-store`. Two requests run in parallel because
 * neither depends on the other.
 *
 * A 401 IS A SIGN-IN INVITATION, not an error screen — the page is reachable
 * from a shared link, so an anonymous visitor landing here must be told what
 * to do rather than shown a failure.
 *
 * UNFOLLOWING FROM HERE re-fetches the feed, because removing a category
 * changes which articles the feed contains; keeping the old list would show
 * articles from a category the reader just dropped.
 */
const PAGE_SIZE = 12

export default function FollowingView() {
	const [categories, setCategories] = useState<FollowedCategory[]>([])
	const [items, setItems] = useState<FeedItem[]>([])
	const [pagination, setPagination] = useState<PaginationMeta | null>(null)
	const [page, setPage] = useState(1)
	const [loading, setLoading] = useState(true)
	const [signedOut, setSignedOut] = useState(false)
	const [busyCategory, setBusyCategory] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async (targetPage: number) => {
		setLoading(true)
		setError(null)

		try {
			const [followed, feed] = await Promise.all([
				listFollowedCategories(),
				getFollowedFeed(targetPage, PAGE_SIZE),
			])

			setCategories(followed)
			setItems(feed.items)
			setPagination(feed.pagination)
			setSignedOut(false)
		} catch (caught) {
			if (isUnauthorized(caught)) {
				setSignedOut(true)
			} else {
				setError(errorMessage(caught, "دریافت دنبال‌شده‌ها انجام نشد."))
			}
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load(page)
	}, [load, page])

	async function unfollow(category: FollowedCategory) {
		setBusyCategory(category.id)
		setError(null)

		try {
			await setCategoryFollow(category.id, false)
			setPage(1)
			await load(1)
		} catch (caught) {
			if (isUnauthorized(caught)) {
				setSignedOut(true)
			} else {
				setError(errorMessage(caught, "لغو دنبال‌کردن انجام نشد."))
			}
		} finally {
			setBusyCategory(null)
		}
	}

	if (signedOut) {
		const loginUrl = googleLoginUrl()

		return (
			<EmptyState
				title="برای دیدن دنبال‌شده‌ها وارد شوید"
				description="دسته‌بندی‌های دنبال‌شده و فهرست اختصاصی اخبار به حساب کاربری شما وابسته است."
				action={
					loginUrl ? (
						<a
							href={loginUrl}
							className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
						>
							ورود با گوگل
						</a>
					) : undefined
				}
			/>
		)
	}

	return (
		<section>
			<h1 className="font-headline text-3xl font-extrabold tracking-headline text-ink">
				دنبال‌شده‌های من
			</h1>

			<p className="mt-2 text-sm leading-7 text-muted-dark">
				اخبار دسته‌بندی‌هایی که دنبال می‌کنید، در همین صفحه جمع می‌شود.
			</p>

			{error ? (
				<p
					role="alert"
					className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm leading-7 text-accent"
				>
					{error}
				</p>
			) : null}

			<div className="mt-6">
				<h2 className="text-sm font-semibold text-ink">دسته‌بندی‌ها</h2>

				{loading && categories.length === 0 ? (
					<p className="mt-2 text-sm text-muted-dark">در حال بارگذاری…</p>
				) : categories.length === 0 ? (
					<p className="mt-2 text-sm text-muted-dark">
						هنوز هیچ دسته‌بندی‌ای را دنبال نمی‌کنید. از صفحهٔ هر دسته‌بندی می‌توانید آن را دنبال کنید.
					</p>
				) : (
					<ul className="mt-3 flex flex-wrap gap-2">
						{categories.map((category) => (
							<li
								key={category.id}
								className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-xs"
							>
								<Link
									href={`/category/${category.slug}`}
									className="font-medium text-ink transition-colors hover:text-accent"
								>
									{category.name}
								</Link>

								<button
									type="button"
									onClick={() => void unfollow(category)}
									disabled={busyCategory === category.id}
									className="text-accent transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
									aria-label={`لغو دنبال‌کردن ${category.name}`}
								>
									{busyCategory === category.id ? "…" : "لغو"}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="mt-10">
				<h2 className="text-sm font-semibold text-ink">آخرین اخبار دنبال‌شده‌ها</h2>

				{loading ? (
					<p role="status" className="mt-3 text-sm text-muted-dark">
						در حال بارگذاری…
					</p>
				) : items.length === 0 ? (
					<div className="mt-4">
						<EmptyState
							title="هنوز خبری برای نمایش نیست"
							description="پس از انتشار خبر تازه در دسته‌بندی‌های دنبال‌شده، همین‌جا دیده می‌شود."
						/>
					</div>
				) : (
					<ul className="mt-4 divide-y divide-border border-y border-border">
						{items.map((item) => (
							<li key={item.id} className="py-5">
								<article className="flex gap-4">
									{item.coverImageUrl ? (
										<Link
											href={`/news/${item.slug}`}
											className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-md sm:block"
										>
											<Image
												src={item.coverImageUrl}
												alt=""
												fill
												sizes="144px"
												className="object-cover"
											/>
										</Link>
									) : null}

									<div className="min-w-0">
										<h3 className="font-headline text-lg font-bold leading-8 text-ink">
											<Link
												href={`/news/${item.slug}`}
												className="transition-colors hover:text-accent"
											>
												{item.title}
											</Link>
										</h3>

										<p className="mt-1 line-clamp-2 text-sm leading-7 text-muted-dark">
											{item.lead}
										</p>

										<p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
											{item.categories.map((category) => (
												<Link
													key={category.id}
													href={`/category/${category.slug}`}
													className="transition-colors hover:text-accent"
												>
													{category.name}
												</Link>
											))}

											{item.publishedAt ? (
												<span>{formatJalaliDate(item.publishedAt)}</span>
											) : null}
										</p>
									</div>
								</article>
							</li>
						))}
					</ul>
				)}

				{pagination && pagination.totalPages > 1 ? (
					<div className="mt-8 flex flex-wrap items-center justify-center gap-2">
						<button
							type="button"
							disabled={loading || pagination.page <= 1}
							onClick={() => setPage((current) => Math.max(1, current - 1))}
							className="rounded-md border border-border px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
						>
							صفحهٔ قبل
						</button>

						<span className="text-xs text-muted-dark">
							صفحهٔ {pagination.page} از {pagination.totalPages}
						</span>

						<button
							type="button"
							disabled={loading || pagination.page >= pagination.totalPages}
							onClick={() => setPage((current) => current + 1)}
							className="rounded-md border border-border px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
						>
							صفحهٔ بعد
						</button>
					</div>
				) : null}
			</div>
		</section>
	)
}
