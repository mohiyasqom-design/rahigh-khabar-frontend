import OnboardingForm from "@/components/OnboardingForm"

export const metadata = {
	title: "تکمیل پروفایل — رحیق خبر",
	robots: { index: false, follow: false },
}

/**
 * Onboarding shell.
 *
 * THE GATE IS INSIDE THE FORM, IN THE BROWSER. The visitor cookie (`rk_user`)
 * is scoped to the API origin, so this Server Component cannot read it and a
 * server-side `redirect()` would either fire for legitimately signed-in users
 * or do nothing at all. `OnboardingForm` performs the credentialed
 * `GET /users/me` itself and redirects when the username is already set — the
 * same pattern the admin area uses in `components/admin/session.tsx`.
 */
export default function OnboardingPage() {
	return (
		<div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
			<div className="mb-8 space-y-2">
				<h1 className="text-2xl font-bold tracking-headline text-ink">
					خوش آمدید!
				</h1>
				<p className="text-sm text-muted-dark">
					برای تکمیل حساب خود، لطفاً یک نام کاربری انتخاب کنید.
				</p>
			</div>

			<OnboardingForm />
		</div>
	)
}
