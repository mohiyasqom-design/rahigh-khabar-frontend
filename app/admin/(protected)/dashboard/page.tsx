import type { Metadata } from 'next';
import SiteAnalyticsView from '@/components/admin/analytics/SiteAnalyticsView';

export const metadata: Metadata = {
  title: 'داشبورد آماری',
};

/**
 * Stage 10 Part 4 — /admin/dashboard
 *
 * Sits inside the existing `(protected)` group, so the admin session gate and
 * the admin navigation from the layout already apply here.
 */
export default function AdminAnalyticsDashboardPage() {
  return <SiteAnalyticsView />;
}
