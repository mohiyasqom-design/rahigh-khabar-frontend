"use client"

import { useSession } from "@/components/admin/session"
import { formatPersianNumber } from "@/lib/format"
import { maxUploadSizeBytes, megabytes } from "@/lib/media"
import { ROLE_LABELS } from "@/types/user"

/**
 * Settings: what this deployment is actually wired to.
 *
 * DELIBERATELY READ-ONLY. There is no settings table and no settings route in
 * the backend; everything here is decided by environment variables at deploy
 * time. A form that pretended to change them would silently do nothing, so
 * this screen shows the effective values and says where to change them.
 */
export default function SettingsView() {
	const { user } = useSession()

	const rows: Array<{ label: string; value: string; note?: string }> = [
		{ label: "نام حساب", value: user.displayName },
		{ label: "ایمیل", value: user.email },
		{ label: "نقش", value: ROLE_LABELS[user.role] },
		{
			label: "نشانی API",
			value: process.env.NEXT_PUBLIC_API_URL ?? "تنظیم نشده",
			note: "NEXT_PUBLIC_API_URL",
		},
		{
			label: "نشانی سایت",
			value: process.env.NEXT_PUBLIC_SITE_URL ?? "تنظیم نشده",
			note: "NEXT_PUBLIC_SITE_URL",
		},
		{
			label: "حداکثر حجم آپلود",
			value: `${formatPersianNumber(megabytes(maxUploadSizeBytes()))} مگابایت`,
			note: "NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES و MAX_UPLOAD_SIZE_BYTES در سرور",
		},
	]

	return (
		<section>
			<h1 className="text-xl font-extrabold tracking-headline text-ink">تنظیمات</h1>
			<p className="mt-1 max-w-2xl text-sm leading-7 text-muted-dark">
				این مقادیر در زمان استقرار از متغیرهای محیطی خوانده می‌شوند و از داخل پنل قابل
				تغییر نیستند؛ برای تغییر، متغیر مربوطه را در سرویس میزبان ویرایش کنید.
			</p>

			<dl className="mt-5 divide-y divide-border rounded-md border border-border bg-white">
				{rows.map((row) => (
					<div key={row.label} className="flex flex-wrap items-baseline gap-2 px-4 py-3">
						<dt className="w-40 shrink-0 text-sm text-muted-dark">{row.label}</dt>
						<dd className="min-w-0 flex-1 text-sm text-ink">
							<span className="break-all">{row.value}</span>
							{row.note ? (
								<span className="ms-2 text-xs text-muted-dark">({row.note})</span>
							) : null}
						</dd>
					</div>
				))}
			</dl>

			<p className="mt-4 text-xs leading-6 text-muted-dark">
				رمز عبور حساب‌های تحریریه از طریق اسکریپت سرور تنظیم می‌شود؛ در این مرحله مسیری برای
				تغییر رمز از داخل پنل وجود ندارد.
			</p>
		</section>
	)
}
