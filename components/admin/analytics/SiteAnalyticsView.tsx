'use client';

/**
 * Stage 10 Part 4 — Dashboard 1: the whole site.
 *
 * Three independent requests (overview, time series, system status) so a slow
 * or failing panel never blanks the page: each one shows its own error and the
 * rest of the dashboard keeps working.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CategoryBarChart, ViewsLineChart } from './charts';
import {
  ContentStatusPanel,
  InlineNote,
  Panel,
  RangeSelect,
  RangeTabs,
  StatCard,
  StateMessage,
  SystemStatusPanel,
  TopNewsTable,
  UserActivityPanel,
} from './panels';
import {
  AnalyticsError,
  formatNumber,
  getSiteOverview,
  getSystemStatus,
  getViewsSeries,
  NOT_ENOUGH_DATA,
  OVERVIEW_RANGE_LABELS,
  SERIES_RANGE_LABELS,
} from '@/lib/analytics';
import type {
  OverviewRangeKey,
  SeriesRangeKey,
  SiteOverview,
  SystemStatus,
  ViewsSeries,
} from '@/types/analytics';

function messageOf(error: unknown): string {
  if (error instanceof AnalyticsError) return error.message;
  return 'دریافت آمار با خطا مواجه شد.';
}

export default function SiteAnalyticsView() {
  const [range, setRange] = useState<OverviewRangeKey>('today');
  const [seriesRange, setSeriesRange] = useState<SeriesRangeKey>('30d');

  const [overview, setOverview] = useState<SiteOverview | null>(null);
  const [series, setSeries] = useState<ViewsSeries | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);

  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setOverviewLoading(true);
    setOverviewError(null);
    getSiteOverview(range)
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((error: unknown) => {
        if (active) setOverviewError(messageOf(error));
      })
      .finally(() => {
        if (active) setOverviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  useEffect(() => {
    let active = true;
    setSeriesLoading(true);
    setSeriesError(null);
    getViewsSeries(seriesRange)
      .then((data) => {
        if (active) setSeries(data);
      })
      .catch((error: unknown) => {
        if (active) setSeriesError(messageOf(error));
      })
      .finally(() => {
        if (active) setSeriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [seriesRange]);

  useEffect(() => {
    let active = true;
    getSystemStatus()
      .then((data) => {
        if (active) setSystem(data);
      })
      .catch((error: unknown) => {
        if (active) setSystemError(messageOf(error));
      });
    return () => {
      active = false;
    };
  }, []);

  // The overview panels below need a non-null `SiteOverview`. `overview?.cards`
  // narrows the CARDS but not `overview` itself, so a local const is captured
  // once and checked once; TypeScript then keeps the narrowing inside JSX.
  const loadedOverview = overview;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-headline text-ink">داشبورد آماری</h1>
          <p className="mt-1 text-xs text-ink-soft">
            همهٔ اعداد از دادهٔ واقعی دیتابیس خوانده می‌شوند؛ هر جا محاسبهٔ واقعی ممکن نباشد،
            دقیقاً همان را می‌نویسیم.
          </p>
        </div>
        <RangeSelect
          value={range}
          labels={OVERVIEW_RANGE_LABELS}
          onChange={setRange}
          ariaLabel="بازهٔ زمانی کارت‌ها"
        />
      </div>

      {overviewError !== null ? <StateMessage tone="error">{overviewError}</StateMessage> : null}

      {loadedOverview === null ? (
        <StateMessage>{overviewLoading ? 'در حال دریافت آمار…' : NOT_ENOUGH_DATA}</StateMessage>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="بازدید کل"
              value={formatNumber(loadedOverview.cards.views.value)}
              change={loadedOverview.cards.views.changePercent}
            />
            <StatCard
              label="بازدیدکنندهٔ یکتا"
              value={formatNumber(loadedOverview.cards.visitors.value)}
              change={loadedOverview.cards.visitors.changePercent}
              hint={loadedOverview.cards.visitors.note}
            />
            <StatCard
              label="کل اخبار"
              value={formatNumber(loadedOverview.cards.news.total)}
              hint={`${formatNumber(loadedOverview.cards.news.inRange)} خبر در این بازه ساخته شده`}
            />
            <StatCard
              label="منتشرشده"
              value={formatNumber(loadedOverview.cards.published.total)}
              change={loadedOverview.cards.published.changePercent}
              hint={`${formatNumber(loadedOverview.cards.published.inRange)} مورد در این بازه`}
            />
            <StatCard label="پیش‌نویس" value={formatNumber(loadedOverview.cards.drafts.total)} />
            <StatCard
              label="کاربران سایت"
              value={formatNumber(loadedOverview.cards.users.total)}
              change={loadedOverview.cards.users.changePercent}
              hint={`${formatNumber(loadedOverview.cards.users.inRange)} عضو تازه در این بازه`}
            />
            <StatCard
              label="دیدگاه‌ها"
              value={formatNumber(loadedOverview.cards.comments.total)}
              change={loadedOverview.cards.comments.changePercent}
              hint={`${formatNumber(loadedOverview.cards.comments.inRange)} دیدگاه در این بازه`}
            />
            <StatCard
              label="لایک‌ها"
              value={formatNumber(loadedOverview.cards.likes.total)}
              change={loadedOverview.cards.likes.changePercent}
              hint={`${formatNumber(loadedOverview.cards.likes.inRange)} لایک در این بازه`}
            />
          </div>

          <Panel
            title="روند بازدید"
            description="بازدید و بازدیدکنندهٔ یکتا به وقت تهران"
            action={
              <RangeTabs value={seriesRange} labels={SERIES_RANGE_LABELS} onChange={setSeriesRange} />
            }
          >
            {seriesError !== null ? (
              <StateMessage tone="error">{seriesError}</StateMessage>
            ) : series === null ? (
              <StateMessage>{seriesLoading ? 'در حال دریافت نمودار…' : NOT_ENOUGH_DATA}</StateMessage>
            ) : (
              <>
                <ViewsLineChart points={series.points} unit={series.range.unit} />
                <InlineNote>
                  جمع بازدید در این بازه: {formatNumber(series.totalViews)}
                </InlineNote>
              </>
            )}
          </Panel>

          <Panel
            title="پربازدیدترین اخبار"
            description={`بازهٔ ${OVERVIEW_RANGE_LABELS[range]}`}
            action={
              <Link
                href={`/admin/dashboard/top-news?range=${range}`}
                className="text-sm text-link hover:underline"
              >
                مشاهده همه
              </Link>
            }
          >
            <TopNewsTable items={loadedOverview.topNews} />
          </Panel>

          <Panel
            title="عملکرد دسته‌بندی‌ها"
            description="سهم هر دسته از بازدیدهایی که دسته‌بندی دارند"
          >
            <CategoryBarChart items={loadedOverview.categories.items} />
            <InlineNote>
              پایهٔ درصدها: {formatNumber(loadedOverview.categories.totalCategorizedViews)} بازدید
              روی اخبار دارای دسته‌بندی (بازدید صفحهٔ اصلی و اخبار بی‌دسته در این نمودار نیستند).
            </InlineNote>
          </Panel>

          <Panel title="وضعیت تولید محتوا" description={`بازهٔ ${OVERVIEW_RANGE_LABELS[range]}`}>
            <ContentStatusPanel overview={loadedOverview} />
          </Panel>

          <Panel title="فعالیت کاربران" description={`بازهٔ ${OVERVIEW_RANGE_LABELS[range]}`}>
            <UserActivityPanel overview={loadedOverview} />
          </Panel>
        </>
      )}

      <Panel title="وضعیت سیستم" description="بررسی زندهٔ سرویس‌ها از مسیر سلامت بک‌اند">
        {systemError !== null ? (
          <StateMessage tone="error">{systemError}</StateMessage>
        ) : system === null ? (
          <StateMessage>در حال بررسی وضعیت سیستم…</StateMessage>
        ) : (
          <SystemStatusPanel status={system} />
        )}
      </Panel>
    </div>
  );
}
