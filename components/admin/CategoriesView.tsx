"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"

import { useSession } from "@/components/admin/session"
import EmptyState from "@/components/EmptyState"
import {
	CATEGORY_FIELD_LIMITS,
	CATEGORY_SLUG_PATTERN,
	createCategory,
	deleteCategory,
	updateCategory,
	type CategoryWriteInput,
} from "@/lib/admin-resources"
import { getAdminCategories } from "@/lib/categories"
import { errorCode, errorMessage, isForbidden, isUnauthorized } from "@/lib/errors"
import type { Category } from "@/types/category"

interface Draft {
	name: string
	slug: string
	description: string
	order: string
}

const EMPTY: Draft = { name: "", slug: "", description: "", order: "" }

function draftOf(category: Category): Draft {
	return {
		name: category.name,
		slug: category.slug,
		description: category.description ?? "",
		order: String(category.order),
	}
}

/**
 * Category management (`GET/POST /admin/categories`, `PATCH|DELETE /:id`).
 *
 * WHY THIS SCREEN EXISTS NOW: until Part 5 the article form told editors that
 * categories could only be created "through the API", because no UI existed.
 * The routes are there, so the panel exposes them instead of asking a human to
 * curl the server.
 *
 * TWO BACKEND RULES ARE SURFACED HONESTLY:
 *   - the slug pattern is validated here with the SAME regex the backend uses,
 *     so a bad slug is caught before the round trip;
 *   - deleting a category that still has articles fails with a conflict. That
 *     is a safety rule, not a bug, so it gets its own message.
 */
export default function CategoriesView() {
	const { user, handleExpiredSession } = useSession()
	const [categories, setCategories] = useState<Category[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const [draft, setDraft] = useState<Draft>(EMPTY)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [busyId, setBusyId] = useState<string | null>(null)

	const canManage = user.role === "SUPER_ADMIN"

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			setCategories(await getAdminCategories())
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(errorMessage(caught, "دریافت دسته‌بندی‌ها انجام نشد."))
		} finally {
			setLoading(false)
		}
	}, [handleExpiredSession])

	useEffect(() => {
		void load()
	}, [load])

	function startEdit(category: Category) {
		setEditingId(category.id)
		setDraft(draftOf(category))
		setNotice(null)
		setError(null)
	}

	function cancelEdit() {
		setEditingId(null)
		setDraft(EMPTY)
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (saving) {
			return
		}

		const name = draft.name.trim()
		const slug = draft.slug.trim()
		const description = draft.description.trim()
		const order = draft.order.trim()

		if (!name) {
			setError("نام دسته‌بندی الزامی است.")
			return
		}

		if (!CATEGORY_SLUG_PATTERN.test(slug)) {
			setError("نامک فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیرهٔ میانی باشد.")
			return
		}

		const payload: CategoryWriteInput = {
			name,
			slug,
			description: description === "" ? null : description,
		}

		if (order !== "") {
			const parsed = Number(order)

			if (!Number.isFinite(parsed) || parsed < 0 || parsed > CATEGORY_FIELD_LIMITS.orderMax) {
				setError("ترتیب باید یک عدد مثبت و معتبر باشد.")
				return
			}

			payload.order = Math.trunc(parsed)
		}

		setSaving(true)
		setError(null)
		setNotice(null)

		try {
			if (editingId) {
				await updateCategory(editingId, payload)
				setNotice("دسته‌بندی به‌روز شد.")
			} else {
				await createCategory(payload)
				setNotice("دسته‌بندی تازه ساخته شد.")
			}

			cancelEdit()
			await load()
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			const code = errorCode(caught)

			setError(
				isForbidden(caught)
					? "ساخت و ویرایش دسته‌بندی فقط برای مدیر ارشد مجاز است."
					: code === "CATEGORY_SLUG_TAKEN" || code === "DUPLICATE_SLUG"
						? "این نامک قبلاً برای دسته‌بندی دیگری ثبت شده است."
						: errorMessage(caught, "ذخیرهٔ دسته‌بندی انجام نشد."),
			)
		} finally {
			setSaving(false)
		}
	}

	async function remove(category: Category) {
		if (!window.confirm(`دسته‌بندی «${category.name}» حذف شود؟`)) {
			return
		}

		setBusyId(category.id)
		setError(null)
		setNotice(null)

		try {
			await deleteCategory(category.id)
			setNotice("دسته‌بندی حذف شد.")
			await load()
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(
				errorMessage(
					caught,
					"حذف دسته‌بندی انجام نشد؛ اگر خبری به این دسته متصل باشد، سرور حذف را رد می‌کند.",
				),
			)
		} finally {
			setBusyId(null)
		}
	}

	const fieldClass =
		"mt-2 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
	const labelClass = "block text-sm font-semibold text-ink"

	return (
		<section>
			<h1 className="text-xl font-extrabold tracking-headline text-ink">دسته‌بندی‌ها</h1>
			<p className="mt-1 text-sm leading-7 text-muted-dark">
				ترتیب همین فهرست، ترتیب نمایش منوی سایت است.
			</p>

			{error ? (
				<p
					role="alert"
					className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent"
				>
					{error}
				</p>
			) : null}

			{notice ? (
				<p
					role="status"
					className="mt-5 rounded-md border border-link/30 bg-link/5 px-3 py-2.5 text-sm text-link"
				>
					{notice}
				</p>
			) : null}

			{canManage ? (
				<form
					onSubmit={submit}
					noValidate
					className="mt-5 grid gap-4 rounded-md border border-border bg-white p-4 md:grid-cols-2"
				>
					<div>
						<label htmlFor="category-name" className={labelClass}>
							نام <span className="text-accent">*</span>
						</label>
						<input
							id="category-name"
							type="text"
							maxLength={CATEGORY_FIELD_LIMITS.name}
							value={draft.name}
							onChange={(event) => setDraft({ ...draft, name: event.target.value })}
							className={fieldClass}
						/>
					</div>

					<div>
						<label htmlFor="category-slug" className={labelClass}>
							نامک <span className="text-accent">*</span>
						</label>
						<input
							id="category-slug"
							type="text"
							dir="ltr"
							maxLength={CATEGORY_FIELD_LIMITS.slug}
							value={draft.slug}
							onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
							className={`${fieldClass} text-start`}
						/>
					</div>

					<div className="md:col-span-2">
						<label htmlFor="category-description" className={labelClass}>
							توضیح (اختیاری)
						</label>
						<textarea
							id="category-description"
							rows={2}
							maxLength={CATEGORY_FIELD_LIMITS.description}
							value={draft.description}
							onChange={(event) => setDraft({ ...draft, description: event.target.value })}
							className={fieldClass}
						/>
					</div>

					<div>
						<label htmlFor="category-order" className={labelClass}>
							ترتیب (اختیاری)
						</label>
						<input
							id="category-order"
							type="number"
							min={0}
							max={CATEGORY_FIELD_LIMITS.orderMax}
							value={draft.order}
							onChange={(event) => setDraft({ ...draft, order: event.target.value })}
							className={fieldClass}
						/>
					</div>

					<div className="flex items-end gap-3">
						<button
							type="submit"
							disabled={saving}
							className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
						>
							{saving ? "در حال ذخیره…" : editingId ? "ذخیرهٔ تغییرات" : "افزودن دسته‌بندی"}
						</button>

						{editingId ? (
							<button
								type="button"
								onClick={cancelEdit}
								className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
							>
								انصراف
							</button>
						) : null}
					</div>
				</form>
			) : (
				<p className="mt-5 rounded-md border border-border bg-white px-3 py-2.5 text-sm leading-7 text-muted-dark">
					ساخت، ویرایش و حذف دسته‌بندی فقط برای مدیر ارشد ممکن است؛ فهرست زیر فقط جهت
					اطلاع نمایش داده می‌شود.
				</p>
			)}

			{loading ? (
				<p role="status" className="mt-8 text-sm text-muted-dark">
					در حال دریافت دسته‌بندی‌ها…
				</p>
			) : null}

			{!loading && categories.length === 0 ? (
				<div className="mt-6">
					<EmptyState
						title="دسته‌بندی‌ای ثبت نشده است"
						description="تا زمانی که دسته‌بندی وجود نداشته باشد، ثبت خبر ممکن نیست."
					/>
				</div>
			) : null}

			{categories.length > 0 ? (
				<ul className="mt-5 space-y-2">
					{categories.map((category) => (
						<li
							key={category.id}
							className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white px-4 py-3"
						>
							<div className="min-w-0">
								<p className="text-sm font-semibold text-ink">
									{category.name}
									<span className="ms-2 text-xs font-normal text-muted-dark" dir="ltr">
										/{category.slug}
									</span>
								</p>
								{category.description ? (
									<p className="mt-1 text-xs leading-6 text-muted-dark">{category.description}</p>
								) : null}
							</div>

							{canManage ? (
								<div className="flex shrink-0 gap-2">
									<button
										type="button"
										onClick={() => startEdit(category)}
										className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
									>
										ویرایش
									</button>
									<button
										type="button"
										disabled={busyId === category.id}
										onClick={() => void remove(category)}
										className="rounded-md border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/5 disabled:opacity-60"
									>
										{busyId === category.id ? "در حال حذف…" : "حذف"}
									</button>
								</div>
							) : null}
						</li>
					))}
				</ul>
			) : null}
		</section>
	)
}
