'use client';

/**
 * Stage 10 Part 4 — the "مشاهده همه" page behind the top-news table.
 *
 * Paginated server-side (the endpoint returns page/pageSize/total), so the
 * browser never downloads the whole ranking.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Panel, RangeSelect, StateMessage, TopNewsTable } from './panels';
import {
  AnalyticsError,
  formatNumber,
  getTopNews,
  NOT_ENOUGH_DATA,
  OVERVIEW_RANGE_LABELS,
} from '@/lib/analytics';
import type { OverviewRangeKey, TopNewsPage } from '@/types/analytics';

const PAGE_SIZE = 20;

function isRangeKey(value: string | null): value is OverviewRangeKey {
  return value !== null && Object.prototype.hasOwnProperty.call(OVERVIEW_RANGE_LABELS, value);
}

export default function TopNewsView() {
  const searchParams = useSearchParams();
  const initialRange = searchParams.get('range');

  const [range, setRange] = useState<OverviewRangeKey>(
    isRangeKey(initialRange) ? initialRange : 'today',
  );
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TopNewsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getTopNews(range, page, PAGE_SIZE)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof AnalyticsError ? cause.message : 'دریافت فهرست با خطا مواجه شد.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, page]);

  const changeRange = (next: OverviewRangeKey) => {
    setRange(next);
    setPage(1);
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-headline text-ink">پربازدیدترین اخبار</h1>
          <Link href="/admin/dashboard" className="mt-1 inline-block text-sm text-link hover:underline">
            بازگشت به داشبورد آماری
          </Link>
        </div>
        <RangeSelect
          value={range}
          labels={OVERVIEW_RANGE_LABELS}
          onChange={changeRange}
          ariaLabel="بازهٔ زمانی"
        />
      </div>

      {error !== null ? <StateMessage tone="error">{error}</StateMessage> : null}

      <Panel
        title={`بازهٔ ${OVERVIEW_RANGE_LABELS[range]}`}
        description={
          data === null
            ? undefined
            : `${formatNumber(data.total)} خبر دارای بازدید در این بازه`
        }
      >
        {data === null ? (
          <StateMessage>{loading ? 'در حال دریافت فهرست…' : NOT_ENOUGH_DATA}</StateMessage>
        ) : (
          <>
            <TopNewsTable items={data.items} />
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-ink disabled:opacity-40"
              >
                قبلی
              </button>
              <span className="text-xs text-ink-soft">
                صفحهٔ {formatNumber(data.page)} از {formatNumber(totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-ink disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
