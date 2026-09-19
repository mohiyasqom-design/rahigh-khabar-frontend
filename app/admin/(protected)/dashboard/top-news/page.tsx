import type { Metadata } from 'next';
import { Suspense } from 'react';
import TopNewsView from '@/components/admin/analytics/TopNewsView';

export const metadata: Metadata = {
  title: 'پربازدیدترین اخبار',
};

/**
 * Stage 10 Part 4 — /admin/dashboard/top-news
 *
 * `TopNewsView` reads the `range` query parameter, so it is wrapped in a
 * Suspense boundary as `useSearchParams` requires.
 */
export default function AdminTopNewsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">در حال دریافت فهرست…</p>}>
      <TopNewsView />
    </Suspense>
  );
}
