/**
 * Stage 10 Part 4 — analytics client.
 *
 * Deliberately self-contained: it reads NEXT_PUBLIC_API_URL itself and sends
 * cookies with `credentials: 'include'`, exactly like `lib/api.ts` does, so it
 * can be dropped into the project without touching the existing helpers. If
 * you prefer, `fetchAnalytics` can be swapped for `adminJson` from
 * `lib/admin-api.ts`; the shapes are identical.
 */
import type {
  NewsAnalytics,
  NewsRangeKey,
  OverviewRangeKey,
  SeriesRangeKey,
  SharePlatformInput,
  SiteOverview,
  SystemStatus,
  TopNewsPage,
  ViewsSeries,
  BucketUnit,
} from '@/types/analytics';

export class AnalyticsError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AnalyticsError';
    this.status = status;
  }
}

function apiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base === undefined || base.length === 0) {
    throw new AnalyticsError(0, 'متغیر NEXT_PUBLIC_API_URL تنطیم نشده است.');
  }
  return base.replace(/\/+$/, '');
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${apiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchAnalytics<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new AnalyticsError(0, 'اتصال به سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AnalyticsError(401, 'نشست شما منقضی شده است. دوباره وارد شوید.');
    }
    if (response.status === 403) {
      throw new AnalyticsError(403, 'دسترسی به آمار برای حساب شما مجاز نیست.');
    }
    if (response.status === 404) {
      throw new AnalyticsError(404, 'این خبر پیدا نشد.');
    }
    if (response.status === 429) {
      throw new AnalyticsError(429, 'درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.');
    }
    throw new AnalyticsError(response.status, 'دریافت آمار با خطا مواجه شد.');
  }

  return (await response.json()) as T;
}

export function getSiteOverview(range: OverviewRangeKey): Promise<SiteOverview> {
  return fetchAnalytics<SiteOverview>('/admin/analytics/overview', { range });
}

export function getViewsSeries(range: SeriesRangeKey): Promise<ViewsSeries> {
  return fetchAnalytics<ViewsSeries>('/admin/analytics/views-timeseries', { range });
}

export function getTopNews(
  range: OverviewRangeKey,
  page: number,
  pageSize = 20,
): Promise<TopNewsPage> {
  return fetchAnalytics<TopNewsPage>('/admin/analytics/top-news', { range, page, pageSize });
}

export function getSystemStatus(): Promise<SystemStatus> {
  return fetchAnalytics<SystemStatus>('/admin/analytics/system');
}

export function getNewsAnalytics(newsId: string, range: NewsRangeKey): Promise<NewsAnalytics> {
  return fetchAnalytics<NewsAnalytics>(`/admin/analytics/news/${encodeURIComponent(newsId)}`, {
    range,
  });
}

/* —— event ingest (public endpoints) —— */

type EventBody = Record<string, string | number | undefined>;

/**
 * Fire-and-forget event send. On page leave the browser may kill a fetch, so
 * `sendBeacon` is used there; Blob keeps the content type explicit.
 */
export function sendAnalyticsEvent(path: string, body: EventBody, useBeacon = false): void {
  let url: string;
  try {
    url = buildUrl(path);
  } catch {
    return; // Tracking must never break the page.
  }

  const payload = JSON.stringify(body);

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    // text/plain avoids a CORS preflight that a beacon cannot complete; the
    // backend parses text/plain bodies as JSON for exactly this reason.
    const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
    navigator.sendBeacon(url, blob);
    return;
  }

  void fetch(url, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  }).catch(() => undefined);
}

export function trackView(input: { newsId?: string; path?: string; referrer?: string }): void {
  sendAnalyticsEvent('/analytics/view', input);
}

export function trackReadingSession(input: {
  newsId: string;
  durationSeconds: number;
  scrollDepthPercent: number;
}): void {
  sendAnalyticsEvent('/analytics/reading-session', input, true);
}

export function trackShare(input: { newsId: string; platform: SharePlatformInput }): void {
  sendAnalyticsEvent('/analytics/share', input);
}

/* —— labels —— */

export const OVERVIEW_RANGE_LABELS: Record<OverviewRangeKey, string> = {
  today: 'امروز',
  yesterday: 'دیروز',
  week: 'این هفته',
  month: 'این ماه',
};

export const SERIES_RANGE_LABELS: Record<SeriesRangeKey, string> = {
  '7d': '۷ روز',
  '30d': '۳۰ روز',
  '3m': '۳ ماه',
  '1y': '۱ سال',
};

export const NEWS_RANGE_LABELS: Record<NewsRangeKey, string> = {
  '24h': '۲۴ ساعت',
  '7d': '۷ روز',
  '30d': '۳۰ روز',
  all: 'از انتشار',
};

export const NEWS_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  IN_REVIEW: 'در انتظار بررسی',
  PUBLISHED: 'منتشرشده',
  ARCHIVED: 'بایگانی',
  REJECTED: 'ردشده',
};

export const NOT_ENOUGH_DATA = 'داده کافی نیست';
export const UNKNOWN_VALUE = 'نامشخص';

/* —— formatting —— */

const TIME_ZONE = 'Asia/Tehran';
const numberFormatter = new Intl.NumberFormat('fa-IR');

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return UNKNOWN_VALUE;
  return numberFormatter.format(value);
}

/** Signed percentage for "compared to the previous period" labels. */
export function formatChange(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${numberFormatter.format(Math.abs(Math.round(value * 10) / 10))}٪`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return NOT_ENOUGH_DATA;
  return `${numberFormatter.format(Math.round(value * 10) / 10)}٪`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return NOT_ENOUGH_DATA;
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${numberFormatter.format(rest)} ثانیه`;
  return `${numberFormatter.format(minutes)} دقیقه و ${numberFormatter.format(rest)} ثانیه`;
}

export function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${numberFormatter.format(days)} روز`;
  if (hours >= 1) return `${numberFormatter.format(hours)} ساعت`;
  return `${numberFormatter.format(Math.floor(seconds / 60))} دقیقه`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) return UNKNOWN_VALUE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN_VALUE;
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    timeZone: TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) return UNKNOWN_VALUE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN_VALUE;
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    timeZone: TIME_ZONE,
    dateStyle: 'medium',
  }).format(date);
}

/**
 * Chart axis label for a bucket key produced by the backend:
 * `YYYY-MM`, `YYYY-MM-DD` or `YYYY-MM-DDTHH:00`, always Tehran local time.
 */
export function formatBucketLabel(bucket: string, unit: BucketUnit): string {
  if (unit === 'hour') {
    const hour = bucket.slice(11, 13);
    return `${numberFormatter.format(Number(hour))}:۰۰`;
  }
  // Both remaining formats can be parsed as a Tehran-local wall clock time.
  const iso = unit === 'month' ? `${bucket}-01T00:00:00+03:30` : `${bucket}T00:00:00+03:30`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return bucket;
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    timeZone: TIME_ZONE,
    ...(unit === 'month' ? { year: 'numeric', month: 'long' } : { month: 'short', day: 'numeric' }),
  }).format(date);
}

export function formatLatency(ms: number): string {
  return `${numberFormatter.format(Math.max(0, Math.round(ms)))} میلی‌ثانیه`;
}
