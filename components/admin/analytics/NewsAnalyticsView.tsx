'use client';

/**
 * Stage 10 Part 4 — Dashboard 2: one article.
 *
 * A single request returns every section, so the range tabs re-fetch once and
 * all panels stay consistent with each other.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TrafficSourcesChart, ViewsLineChart } from './charts';
import {
  ComparisonPanel,
  InlineNote,
  LaunchMomentPanel,
  Panel,
  RangeTabs,
  ScorePanel,
  StatCard,
  StateMessage,
} from './panels';
import {
  AnalyticsError,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  getNewsAnalytics,
  NEWS_RANGE_LABELS,
  NEWS_STATUS_LABELS,
  NOT_ENOUGH_DATA,
} from '@/lib/analytics';
import type { NewsAnalytics, NewsRangeKey } from '@/types/analytics';

function messageOf(error: unknown): string {
  if (error instanceof AnalyticsError) return error.message;
  return 'دریافت آمار این خبر با خطا مواجه شد.';
}

export default function NewsAnalyticsView({ newsId }: { newsId: string }) {
  const [range, setRange] = useState<NewsRangeKey>('all');
  const [data, setData] = useState<NewsAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getNewsAnalytics(newsId, range)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(messageOf(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [newsId, range]);

  if (error !== null) {
    return (
      <div className="space-y-4">
        <StateMessage tone="error">{error}</StateMessage>
        <Link href="/admin/dashboard" className="text-sm text-link hover:underline">
          بازگشت به داشبورد آماری
        </Link>
      </div>
    );
  }

  if (data === null) {
    return <StateMessage>{loading ? 'در حال دریافت آمار خبر…' : NOT_ENOUGH_DATA}</StateMessage>;
  }

  const { cards, behavior, trafficSources } = data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-headline text-ink">{data.news.title}</h1>
          <p className="mt-1 text-xs text-ink-soft">
            {NEWS_STATUS_LABELS[data.news.status] ?? data.news.status}
            {' — '}
            {data.news.publishedAt === null
              ? 'منتشر نشده'
              : `انتشار: ${formatDateTime(data.news.publishedAt)}`}
            {data.news.categories.length > 0
              ? ` — ${data.news.categories.map((category) => category.name).join('، ')}`
              : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href={`/news/${data.news.slug}`} target="_blank" className="text-link hover:underline">
              مشاهدهٔ خبر
            </Link>
            <Link href={`/admin/news/${data.news.id}/edit`} className="text-link hover:underline">
              ویرایش خبر
            </Link>
            <Link href="/admin/dashboard" className="text-link hover:underline">
              داشبورد آماری
            </Link>
          </div>
        </div>
        <RangeTabs value={range} labels={NEWS_RANGE_LABELS} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="بازدید" value={formatNumber(cards.views)} />
        <StatCard
          label="بازدیدکنندهٔ یکتا"
          value={formatNumber(cards.uniqueVisitors.value)}
          hint={cards.uniqueVisitors.note}
        />
        <StatCard label="لایک" value={formatNumber(cards.likes)} />
        <StatCard label="دیدگاه" value={formatNumber(cards.comments)} />
        <StatCard label="اشتراک‌گذاری" value={formatNumber(cards.shares)} />
        <StatCard label="ذخیره" value={formatNumber(cards.saves)} />
        <StatCard
          label="میانگین زمان مطالعه"
          value={formatDuration(cards.averageReadingSeconds)}
        />
        <StatCard
          label="نرخ تعامل"
          value={formatPercent(cards.engagementRatePercent)}
          hint="(لایک + دیدگاه + اشتراک) ÷ بازدید"
        />
      </div>

      <Panel title="روند بازدید" description={`بازهٔ ${NEWS_RANGE_LABELS[range]}`}>
        <ViewsLineChart points={data.series.points} unit={data.range.unit} />
        <InlineNote>جمع بازدید در این بازه: {formatNumber(data.series.totalViews)}</InlineNote>
      </Panel>

      <Panel title="لحطهٔ انتشار" description="بازدید تجمیعی از لحطهٔ انتشار خبر">
        <LaunchMomentPanel launch={data.launch} />
      </Panel>

      <Panel title="منابع ورودی" description="منبع بازدیدهای این خبر در بازهٔ انتخاب‌شده">
        <TrafficSourcesChart items={trafficSources.items} />
        <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[360px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-soft">
                <th className="py-2 text-start font-normal">منبع</th>
                <th className="py-2 text-start font-normal">بازدید</th>
                <th className="py-2 text-start font-normal">سهم</th>
              </tr>
            </thead>
            <tbody>
              {trafficSources.items.map((item) => (
                <tr key={item.source} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-ink">{item.label}</td>
                  <td className="py-2 text-ink">{formatNumber(item.views)}</td>
                  <td className="py-2 text-ink-soft">{formatPercent(item.sharePercent)}</td>
                </tr>
              ))}
              <tr className="border-b border-border/60 last:border-0">
                <td className="py-2 text-ink-soft">اعلان (Notification)</td>
                <td className="py-2 text-ink-soft">{formatNumber(trafficSources.notification.views)}</td>
                <td className="py-2 text-ink-soft">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        <InlineNote>{trafficSources.notification.note}</InlineNote>
      </Panel>

      <Panel title="رفتار کاربران" description="براساس نشست‌های مطالعهٔ ثبت‌شده">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="میانگین زمان در صفحه"
            value={formatDuration(behavior.averageReadingSeconds)}
            hint={`${formatNumber(behavior.readingSessions)} نشست مطالعه`}
          />
          <StatCard
            label="میانگین عمق اسکرول"
            value={formatPercent(behavior.averageScrollDepthPercent)}
          />
          <StatCard
            label="نرخ پرش (Bounce)"
            value={formatPercent(behavior.bounceRatePercent)}
            hint={`نشست‌های کمتر از ${formatNumber(behavior.bounce.maxSeconds)} ثانیه`}
          />
        </div>
        <InlineNote>{behavior.bounce.note}</InlineNote>
      </Panel>

      <Panel title="مقایسه با اخبار مشابه" description="همان دسته‌بندی، ۳۰ روز گذشته">
        <ComparisonPanel comparison={data.comparison} />
      </Panel>

      <Panel title="امتیاز عملکرد" description="امتیاز وزن‌دار ۰ تا ۱۰۰ براساس پنج معیار">
        <ScorePanel performance={data.performance} />
      </Panel>

      <InlineNote>زمان محاسبه: {formatDateTime(data.generatedAt)}</InlineNote>
    </div>
  );
}
