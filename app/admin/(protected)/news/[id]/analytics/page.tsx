'use client';

/**
 * Stage 10 Part 4 — /admin/news/[id]/analytics
 *
 * Reads the route parameter with `useParams` instead of the `params` prop, so
 * the file compiles the same way on Next 14 (plain object) and Next 15
 * (promise) without any version-specific typing.
 */
import { useParams } from 'next/navigation';
import NewsAnalyticsView from '@/components/admin/analytics/NewsAnalyticsView';

export default function AdminNewsAnalyticsPage() {
  const params = useParams<{ id: string | string[] }>();
  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  if (id === undefined || id.length === 0) {
    return <p className="text-sm text-ink-soft">شناسهٔ خبر در آدرس معتبر نیست.</p>;
  }

  return <NewsAnalyticsView newsId={id} />;
}
