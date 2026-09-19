'use client';

/**
 * Stage 10 Part 4 — dashboard building blocks.
 *
 * Every panel here renders what the API actually returned. Where the backend
 * says "this cannot be known" (null + a reason) the panel shows that sentence
 * instead of a zero, because a zero reads as a measurement.
 *
 * Layout is mobile-first: cards stack in one column and grow to 2/4 columns on
 * wider screens, and wide tables sit inside a horizontal scroll container.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  formatChange,
  formatDateTime,
  formatDuration,
  formatLatency,
  formatNumber,
  formatPercent,
  formatUptime,
  NEWS_STATUS_LABELS,
  NOT_ENOUGH_DATA,
} from '@/lib/analytics';
import type {
  NewsAnalytics,
  ServiceCheck,
  SiteOverview,
  SystemStatus,
  TopNewsItem,
} from '@/types/analytics';

/* —— shells —— */

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-paper p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {description !== undefined ? (
            <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  change,
  hint,
}: {
  label: string;
  value: string;
  change?: number | null | undefined;
  hint?: string | undefined;
}) {
  const changeLabel = change === undefined ? null : formatChange(change);
  const tone =
    change === undefined || change === null || change === 0
      ? 'text-ink-soft'
      : change > 0
        ? 'text-green-700'
        : 'text-accent';

  return (
    <div className="rounded-lg border border-border bg-paper p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      {changeLabel !== null ? (
        <p className={`mt-1 text-xs ${tone}`}>{changeLabel} نسبت به بازهٔ قبل</p>
      ) : null}
      {hint !== undefined ? <p className="mt-1 text-[11px] leading-4 text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function RangeSelect<T extends string>({
  value,
  labels,
  onChange,
  ariaLabel,
}: {
  value: T;
  labels: Record<T, string>;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="rounded-md border border-border bg-paper px-2 py-1.5 text-sm text-ink"
    >
      {(Object.keys(labels) as T[]).map((key) => (
        <option key={key} value={key}>
          {labels[key]}
        </option>
      ))}
    </select>
  );
}

export function RangeTabs<T extends string>({
  value,
  labels,
  onChange,
}: {
  value: T;
  labels: Record<T, string>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">
      {(Object.keys(labels) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded px-2.5 py-1 text-xs transition-colors ${
            key === value ? 'bg-accent text-white' : 'text-ink-soft hover:bg-muted'
          }`}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}

export function InlineNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[11px] leading-5 text-ink-soft">{children}</p>;
}

export function StateMessage({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        tone === 'error' ? 'border-accent/40 bg-accent/5 text-accent' : 'border-border bg-muted text-ink-soft'
      }`}
    >
      {children}
    </div>
  );
}

/* —— site dashboard panels —— */

export function TopNewsTable({
  items,
  emptyMessage = 'در این بازه بازدیدی ثبت نشده است.',
}: {
  items: TopNewsItem[];
  emptyMessage?: string | undefined;
}) {
  if (items.length === 0) return <StateMessage>{emptyMessage}</StateMessage>;

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-ink-soft">
            <th className="py-2 text-start font-normal">رتبه</th>
            <th className="py-2 text-start font-normal">عنوان</th>
            <th className="py-2 text-start font-normal">بازدید</th>
            <th className="py-2 text-start font-normal">لایک</th>
            <th className="py-2 text-start font-normal">دیدگاه</th>
            <th className="py-2 text-start font-normal">آمار</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/60 last:border-0">
              <td className="py-2 text-ink-soft">{formatNumber(item.rank)}</td>
              <td className="py-2">
                <Link href={`/news/${item.slug}`} className="text-link hover:underline" target="_blank">
                  {item.title}
                </Link>
                <span className="ms-2 text-[11px] text-ink-soft">
                  {NEWS_STATUS_LABELS[item.status] ?? item.status}
                </span>
              </td>
              <td className="py-2 text-ink">{formatNumber(item.views)}</td>
              <td className="py-2 text-ink">{formatNumber(item.likes)}</td>
              <td className="py-2 text-ink">{formatNumber(item.comments)}</td>
              <td className="py-2">
                <Link
                  href={`/admin/news/${item.id}/analytics`}
                  className="text-link hover:underline"
                >
                  جزئیات
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContentStatusPanel({ overview }: { overview: SiteOverview }) {
  const status = overview.contentStatus;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="منتشرشده در این بازه"
        value={formatNumber(status.publishedInRange)}
        change={status.publishedChangePercent}
      />
      <StatCard label="در انتظار بررسی" value={formatNumber(status.pendingReview)} />
      <StatCard label="پیش‌نویس" value={formatNumber(status.drafts)} />
      <StatCard
        label="زمان‌بندی‌شده"
        value={formatNumber(status.scheduled)}
        hint="اخباری که تاریخ انتشار آینده دارند و هنوز منتشر نشده‌اند."
      />
      <div className="col-span-2 lg:col-span-4">
        <InlineNote>
          حذف‌شده: نامشخص — در این پروژه حذف خبر دائمی است و سوابقی نگه داشته نمی‌شود؛ به همین دلیل عدد واقعی این مورد قابل محاسبه نیست.
        </InlineNote>
      </div>
    </div>
  );
}

export function UserActivityPanel({ overview }: { overview: SiteOverview }) {
  const activity = overview.userActivity;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="کاربر تازه امروز" value={formatNumber(activity.newUsersToday)} />
        <StatCard label="کاربر تازه این هفته" value={formatNumber(activity.newUsersThisWeek)} />
        <StatCard
          label="کاربر فعال"
          value={formatNumber(activity.activeUsers)}
          hint={`دارای حداقل یک بازدید، لایک یا دیدگاه در ${formatNumber(
            activity.activeUsersWindowDays,
          )} روز گذشته`}
        />
        <StatCard
          label="رشد کاربران"
          value={
            activity.growthPercent === null ? NOT_ENOUGH_DATA : formatPercent(activity.growthPercent)
          }
          hint="نسبت به بازهٔ قبلی همین طول"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="دیدگاه تازه در این بازه" value={formatNumber(activity.newComments)} />
        <div className="rounded-lg border border-border bg-paper p-3">
          <p className="text-xs text-ink-soft">فعال‌ترین کاربر این بازه</p>
          {activity.topContributor === null ? (
            <p className="mt-1 text-sm text-ink-soft">{NOT_ENOUGH_DATA}</p>
          ) : (
            <>
              <p className="mt-1 text-lg font-bold text-ink">
                {activity.topContributor.displayName}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {formatNumber(activity.topContributor.likes)} لایک و{' '}
                {formatNumber(activity.topContributor.comments)} دیدگاه (جمع{' '}
                {formatNumber(activity.topContributor.total)})
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ check, label }: { check: ServiceCheck; label: string }) {
  const up = check.status === 'up';
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`inline-block h-2.5 w-2.5 rounded-full ${up ? 'bg-green-600' : 'bg-accent'}`}
        />
        <span className="text-sm text-ink">{label}</span>
      </div>
      <span className="text-xs text-ink-soft">
        {up ? formatLatency(check.latencyMs) : (check.detail ?? 'خارج از دسترس')}
      </span>
    </div>
  );
}

export function SystemStatusPanel({ status }: { status: SystemStatus }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StatusDot check={status.services.backend} label="بک‌اند" />
        <StatusDot check={status.services.database} label="دیتابیس" />
        <StatusDot check={status.services.storage} label="فضای ذخیره‌سازی" />
        <StatusDot check={status.services.api} label="API" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="مدت فعالیت سرویس" value={formatUptime(status.uptimeSeconds)} />
        <StatCard
          label="آخرین بکاپ"
          value={status.backup.lastAt === null ? 'نامشخص' : formatDateTime(status.backup.lastAt)}
          hint={status.backup.note}
        />
      </div>
      <div className="rounded-lg border border-border bg-muted p-3">
        <p className="text-xs font-bold text-ink">خطاهای اخیر</p>
        <p className="mt-1 text-xs leading-5 text-ink-soft">{status.errorLog.note}</p>
      </div>
      <InlineNote>آخرین بررسی: {formatDateTime(status.checkedAt)}</InlineNote>
    </div>
  );
}

/* —— per-article panels —— */

export function LaunchMomentPanel({ launch }: { launch: NewsAnalytics['launch'] }) {
  if (launch.publishedAt === null) {
    return <StateMessage>{launch.note ?? NOT_ENOUGH_DATA}</StateMessage>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {launch.checkpoints.map((checkpoint) => (
        <StatCard
          key={checkpoint.hours}
          label={
            checkpoint.hours >= 24
              ? `${formatNumber(checkpoint.hours / 24)} روز نخست`
              : `${formatNumber(checkpoint.hours)} ساعت نخست`
          }
          value={
            checkpoint.views === null
              ? NOT_ENOUGH_DATA
              : `${formatNumber(checkpoint.views)} بازدید`
          }
          hint={checkpoint.elapsed ? undefined : 'این بازه هنوز کامل نشده است.'}
        />
      ))}
    </div>
  );
}

export function ComparisonPanel({ comparison }: { comparison: NewsAnalytics['comparison'] }) {
  if (comparison.averages === null || comparison.diff === null) {
    return <StateMessage>{comparison.note ?? NOT_ENOUGH_DATA}</StateMessage>;
  }

  const rows: Array<{ label: string; value: number | null; average: string }> = [
    {
      label: 'بازدید',
      value: comparison.diff.viewsPercent,
      average: `میانگین ${formatNumber(comparison.averages.views)}`,
    },
    {
      label: 'نرخ تعامل',
      value: comparison.diff.engagementPercent,
      average: `میانگین ${formatPercent(comparison.averages.engagementRatePercent)}`,
    },
    {
      label: 'زمان مطالعه',
      value: comparison.diff.readingTimePercent,
      average: `میانگین ${formatDuration(comparison.averages.readingSeconds)}`,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <StatCard
            key={row.label}
            label={`${row.label} نسبت به مشابه‌ها`}
            value={row.value === null ? NOT_ENOUGH_DATA : (formatChange(row.value) ?? NOT_ENOUGH_DATA)}
            hint={row.average}
          />
        ))}
      </div>
      <p className="text-sm text-ink">
        {comparison.rank === null
          ? NOT_ENOUGH_DATA
          : `رتبه ${formatNumber(comparison.rank)} از ${formatNumber(comparison.rankOutOf)}`}
      </p>
      <InlineNote>
        مقایسه با {formatNumber(comparison.sampleSize)} خبر هم‌دسته در {formatNumber(comparison.windowDays)} روز
        گذشته (درخواست‌شده: {formatNumber(comparison.requestedSampleSize)}).
        {comparison.note === null ? '' : ` ${comparison.note}`}
      </InlineNote>
    </div>
  );
}

const COMPONENT_LABELS: Record<string, string> = {
  views: 'بازدید',
  engagement: 'نرخ تعامل',
  readingTime: 'میانگین زمان مطالعه',
  shares: 'اشتراک‌گذاری',
  relativeRank: 'رتبه نسبت به مشابه‌ها',
};

export function ScorePanel({ performance }: { performance: NewsAnalytics['performance'] }) {
  const tone =
    performance.band === 'good'
      ? 'text-green-700'
      : performance.band === 'average'
        ? 'text-ink'
        : 'text-accent';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <p className={`text-3xl font-bold ${tone}`}>
          {performance.score === null ? NOT_ENOUGH_DATA : formatNumber(performance.score)}
        </p>
        {performance.score === null ? null : <span className="text-sm text-ink-soft">از ۱۰۰</span>}
      </div>
      <p className="text-sm text-ink">{performance.message}</p>

      {performance.components.length === 0 ? (
        <InlineNote>
          {performance.reason === 'NO_VIEWS'
            ? 'هنوز بازدیدی برای این خبر ثبت نشده است، پس امتیاز محاسبه نشد.'
            : 'خبر مشابهی برای مقایسه وجود ندارد، پس امتیاز محاسبه نشد.'}
        </InlineNote>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-soft">
                <th className="py-2 text-start font-normal">معیار</th>
                <th className="py-2 text-start font-normal">وزن</th>
                <th className="py-2 text-start font-normal">مقدار</th>
                <th className="py-2 text-start font-normal">میانگین مشابه‌ها</th>
                <th className="py-2 text-start font-normal">نرمال‌شده</th>
                <th className="py-2 text-start font-normal">سهم از امتیاز</th>
              </tr>
            </thead>
            <tbody>
              {performance.components.map((item) => (
                <tr key={item.component} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-ink">
                    {COMPONENT_LABELS[item.component] ?? item.component}
                  </td>
                  <td className="py-2 text-ink-soft">{formatPercent(item.weight * 100)}</td>
                  <td className="py-2 text-ink">{formatNumber(item.value)}</td>
                  <td className="py-2 text-ink-soft">
                    {item.average === null ? '—' : formatNumber(item.average)}
                  </td>
                  <td className="py-2 text-ink">{formatNumber(item.normalised)}</td>
                  <td className="py-2 text-ink">{formatNumber(item.weighted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InlineNote>
        وزن‌ها در فایل <code>src/config/analytics.config.ts</code> در بک‌اند نگهداری می‌شوند و با تغییر
        همان فایل قابل تنظیم هستند. مقدار میانگین مشابه‌ها روی عدد ۵۰ مینشیند.
      </InlineNote>
    </div>
  );
}
