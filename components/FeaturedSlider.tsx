"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react"

import NewsTime from "@/components/NewsTime"
import type { NewsListItem } from "@/types/news"

const AUTO_ADVANCE_MS = 6000
const SWIPE_THRESHOLD_PX = 50

export default function FeaturedSlider({ items }: { items: NewsListItem[] }) {
	const count = items.length
	const [index, setIndex] = useState(0)
	const [hovered, setHovered] = useState(false)
	const [focused, setFocused] = useState(false)
	const [touching, setTouching] = useState(false)
	const [hidden, setHidden] = useState(false)
	const [reducedMotion, setReducedMotion] = useState(false)
	const [dragPx, setDragPx] = useState(0)
	const touchStart = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null)
	const trackRef = useRef<HTMLDivElement | null>(null)

	const interactive = count > 1

	const goTo = useCallback(
		(next: number) => {
			if (count === 0) return
			setIndex(((next % count) + count) % count)
		},
		[count],
	)

	useEffect(() => {
		if (index >= count && count > 0) setIndex(0)
	}, [count, index])

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)")
		const update = () => setReducedMotion(media.matches)
		update()
		media.addEventListener("change", update)

		const onVisibility = () => setHidden(document.visibilityState === "hidden")
		onVisibility()
		document.addEventListener("visibilitychange", onVisibility)

		return () => {
			media.removeEventListener("change", update)
			document.removeEventListener("visibilitychange", onVisibility)
		}
	}, [])

	const paused = hovered || focused || touching || hidden || reducedMotion

	useEffect(() => {
		if (!interactive || paused) return

		const timer = window.setTimeout(() => goTo(index + 1), AUTO_ADVANCE_MS)
		return () => window.clearTimeout(timer)
	}, [goTo, index, interactive, paused])

	if (count === 0) return null

	const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
		const touch = event.touches[0]
		if (!touch) return
		touchStart.current = { x: touch.clientX, y: touch.clientY, horizontal: null }
		setTouching(true)
	}

	const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
		const start = touchStart.current
		const touch = event.touches[0]
		if (!start || !touch) return

		const dx = touch.clientX - start.x
		const dy = touch.clientY - start.y

		if (start.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
			start.horizontal = Math.abs(dx) > Math.abs(dy)
		}

		if (start.horizontal) {
			const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0)
			setDragPx(atEdge ? dx / 3 : dx)
		}
	}

	const onTouchEnd = () => {
		const start = touchStart.current
		const width = trackRef.current?.clientWidth ?? 0
		const threshold = Math.min(SWIPE_THRESHOLD_PX, width / 4 || SWIPE_THRESHOLD_PX)

		if (start?.horizontal && Math.abs(dragPx) > threshold) {
			goTo(dragPx < 0 ? index + 1 : index - 1)
		}

		touchStart.current = null
		setDragPx(0)
		setTouching(false)
	}

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (!interactive) return
		if (event.key === "ArrowRight") {
			event.preventDefault()
			goTo(index + 1)
		} else if (event.key === "ArrowLeft") {
			event.preventDefault()
			goTo(index - 1)
		}
	}

	const dragging = dragPx !== 0
	const trackStyle = {
		transform: `translate3d(calc($\{-index * 100\}% + $\{dragPx}px), 0, 0)`,
	}

	return (
		<section
			aria-roledescription="carousel"
			aria-label="اخبار اصلی"
			className="relative -mx-4 -mt-8 mb-10 overflow-hidden bg-ink sm:-mt-10 min-[1213px]:left-1/2 min-[1213px]:mx-0 min-[1213px]:w-screen min-[1213px]:-translate-x-1/2"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onFocus={() => setFocused(true)}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
			}}
			onKeyDown={onKeyDown}
		>
			<div
				ref={trackRef}
				dir="ltr"
				className={`flex will-change-transform $\{dragging || reducedMotion ? "" : "transition-transform duration-700 ease-out"}`}
				style={{ ...trackStyle, touchAction: "pan-y" }}
				onTouchStart={interactive ? onTouchStart : undefined}
				onTouchMove={interactive ? onTouchMove : undefined}
				onTouchEnd={interactive ? onTouchEnd : undefined}
				onTouchCancel={interactive ? onTouchEnd : undefined}
			>
				{items.map((news, slideIndex) => {
					const active = slideIndex === index
					const upcoming = slideIndex === (index + 1) % count

					return (
						<Slide
							key={news.slug}
							news={news}
							active={active}
							priority={slideIndex === 0}
							eager={active || upcoming}
							position={slideIndex + 1}
							total={count}
						/>
					)
				})}
			</div>

			{interactive ? (
				<div
					dir="ltr"
					className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5"
				>
					{items.map((news, dotIndex) => {
						const active = dotIndex === index

						return (
							<button
								key={news.slug}
								type="button"
								onClick={() => goTo(dotIndex)}
								aria-label={`نمایش خبر $\{(dotIndex + 1).toLocaleString("fa-IR")} از $\{count.toLocaleString("fa-IR")}`}
								aria-current={active ? "true" : undefined}
								className="group flex h-6 w-12 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
							>
								<span
									className={`block h-[3px] w-full rounded-full transition-[opacity,background-color] duration-300 $\{active ? "bg-white opacity-100" : "bg-white opacity-40 group-hover:opacity-70"}`}
								/>
							</button>
						)
					})}
				</div>
			) : null}
		</section>
	)
}

function Slide({
	news,
	active,
	priority,
	eager,
	position,
	total,
}: {
	news: NewsListItem
	active: boolean
	priority: boolean
	eager: boolean
	position: number
	total: number
}) {
	const [broken, setBroken] = useState(false)
	const category = news.categories[0]
	const showImage = Boolean(news.coverImage) && !broken

	return (
		<div
			dir="rtl"
			role="group"
			aria-roledescription="slide"
			aria-label={`$\{position.toLocaleString("fa-IR")} از $\{total.toLocaleString("fa-IR")}`}
			aria-hidden={active ? undefined : true}
			inert={active ? undefined : true}
			className="relative w-full shrink-0"
		>
			<Link
				href={`/news/$\{news.slug}`}
				className="group relative block aspect-[16/9] overflow-hidden bg-ink lg:aspect-[2/1] lg:max-h-[640px]"
			>
				{showImage && news.coverImage ? (
					<Image
						src={news.coverImage.url}
						alt={news.coverImage.altText ?? ""}
						fill
						sizes="100vw"
						{...(priority
							? { priority: true }
							: { loading: (eager ? "eager" : "lazy") as "eager" | "lazy" })}
						onError={() => setBroken(true)}
						className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
					/>
				) : (
					<SlidePlaceholder />
				)}

				<div
					className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
					aria-hidden="true"
				/>

				<div className="absolute inset-x-0 bottom-0">
					<div className="mx-auto max-w-shell px-4 pb-9 sm:pb-11 lg:pb-14">
						{category ? (
							<span className="inline-block rounded-sm bg-accent px-2.5 py-1 text-[11px] font-bold text-on-accent">
								{category.name}
							</span>
						) : null}

						<h2 className="mt-3 line-clamp-3 max-w-4xl text-lg font-extrabold leading-[1.5] tracking-headline text-paper sm:text-2xl md:text-[32px]">
							{news.title}
						</h2>

						<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
							<span>{news.author.displayName}</span>
							{news.publishedAt ? <NewsTime value={news.publishedAt} /> : null}
						</div>
					</div>
				</div>
			</Link>
		</div>
	)
}

function SlidePlaceholder() {
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink via-ink to-black">
			<Image
				src="/logo-rahigh-khabar-gold.png"
				alt=""
				width={1175}
				height={745}
				sizes="220px"
				className="h-24 w-auto object-contain opacity-30 sm:h-32"
			/>
		</div>
	)
}
