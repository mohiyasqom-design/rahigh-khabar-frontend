"use client"

import { useCallback, useEffect, useState } from "react"

import AdminPagination from "@/components/admin/AdminPagination"
import { useSession } from "@/components/admin/session"
import EmptyState from "@/components/EmptyState"
import {
	listAdminUsers,
	type AdminUserKind,
	type AdminUserRow,
} from "@/lib/admin-resources"
import { errorMessage, isForbidden, isUnauthorized } from "@/lib/errors"
import { formatJalaliDateTime } from "@/lib/format"
import type { Paginated } from "@/types/api"
import { ROLE_LABELS, type Role } from "@/types/user"

const PAGE_SIZE = 20

/** Staff roles have Persian labels; a site visitor's role is always "USER". */
function roleLabel(role: string): string {
	if (role in ROLE_LABELS) {
		return ROLE_LABELS[role as Role]
	}

	return role === "USER" ? "کاربر سایت" : role
}

/**
 * The user list (`GET /admin/users`), SUPER_ADMIN only.
 *
 * TWO SEPARATE TABLES, NOT ONE: staff accounts (`users`) and site visitors
 * (`regular_users`) are different records with different login methods, so the
 * backend takes a `kind` parameter instead of merging them. The tab here maps
 * one-to-one onto that parameter rather than filtering a merged list.
 *
 * READ-ONLY BY DESIGN: the backend exposes no create/update/delete route for
 * users in this stage, so this screen shows no buttons that would 404. Staff
 * accounts are still provisioned through the seeding script.
 */
export default function UsersView() {
	const { handleExpiredSession } = useSession()
	const [kind, setKind] = useState<AdminUserKind>("staff")
	const [page, setPage] = useState(1)
	const [data, setData] = useState<Paginated<AdminUserRow> | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			setData(await listAdminUsers(kind, page, PAGE_SIZE))
		} catch (caught) {
			if (isUnauthorized(caught)) {
				handleExpiredSession()
				return
			}

			setError(
				isForbidden(caught)
					? "دسترسی به فهرست کاربران فقط برای مدیر ارشد ممکن است."
					: errorMessage(caught, "دریافت فهرست کاربران انجام نشد."),
			)
		} finally {
			setLoading(false)
		}
	}, [handleExpiredSession, kind, page])

	useEffect(() => {
		void load()
	}, [load])

	const items = data?.items ?? []
	const pagination = data?.pagination

	return (
		<section>
			<h1 className="text-xl font-extrabold tracking-headline text-ink">کاربران</h1>
			<p className="mt-1 text-sm leading-7 text-muted-dark">
				حساب‌های تحریریه و کاربران عادی سایت دو جدول جداگانه هستند و جداگانه نمایش
				داده می‌شوند.
			</p>

			<div className="mt-4 flex gap-2">
				{(["staff", "site"] as AdminUserKind[]).map((value) => (
					<button
						key={value}
						type="button"
						onClick={() => {
							setKind(value)
							setPage(1)
						}}
						className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
							kind === value
								? "border-accent bg-accent/10 text-accent"
								: "border-border text-ink hover:border-border-strong"
						}`}
					>
						{value === "staff" ? "تحریریه" : "کاربران سایت"}
					</button>
				))}
			</div>

			{error ? (
				<p
					role="alert"
					className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent"
				>
					{error}
				</p>
			) : null}

			{loading && !data ? (
				<p role="status" className="mt-8 text-sm text-muted-dark">
					در حال دریافت کاربران…
				</p>
			) : null}

			{!loading && !error && items.length === 0 ? (
				<div className="mt-6">
					<EmptyState title="کاربری یافت نشد" />
				</div>
			) : null}

			{items.length > 0 ? (
				<div className="mt-5 overflow-x-auto rounded-md border border-border bg-white">
					<table className="w-full min-w-[640px] text-start text-sm">
						<thead className="bg-paper text-xs text-muted-dark">
							<tr>
								<th scope="col" className="px-3 py-2 text-start font-medium">نام</th>
								<th scope="col" className="px-3 py-2 text-start font-medium">ایمیل / نام کاربری</th>
								<th scope="col" className="px-3 py-2 text-start font-medium">نقش</th>
								<th scope="col" className="px-3 py-2 text-start font-medium">تاریخ عضویت</th>
							</tr>
						</thead>
						<tbody>
							{items.map((row) => (
								<tr key={row.id} className="border-t border-border">
									<td className="px-3 py-2.5 text-ink">{row.displayName}</td>
									<td className="px-3 py-2.5 text-muted-dark" dir="ltr">
										{row.email ?? row.username ?? "—"}
									</td>
									<td className="px-3 py-2.5 text-muted-dark">{roleLabel(row.role)}</td>
									<td className="px-3 py-2.5 text-muted-dark">
										{formatJalaliDateTime(row.createdAt)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}

			<p className="mt-4 text-xs leading-6 text-muted-dark">
				این صفحه فقط خواندنی است؛ سرور در این مرحله مسیری برای ساخت، ویرایش یا حذف
				کاربر ارائه نمی‌دهد.
			</p>

			{pagination && pagination.totalPages > 1 ? (
				<AdminPagination
					page={pagination.page}
					totalPages={pagination.totalPages}
					total={pagination.total}
					busy={loading}
					onChange={setPage}
				/>
			) : null}
		</section>
	)
}
