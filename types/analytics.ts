/**
 * Stage 10 Part 4 — response types for the analytics endpoints.
 *
 * These mirror the backend services exactly, including the places where a
 * number is intentionally `null` ("we cannot know this") rather than 0.
 */

export type OverviewRangeKey = 'today' | 'yesterday' | 'week' | 'month';
export type SeriesRangeKey = '7d' | '30d' | '3m' | '1y';
export type NewsRangeKey = '24h' | '7d' | '30d' | 'all';
export type BucketUnit = 'hour' | 'day' | 'month';

export type TrafficSourceKey =
  | 'DIRECT'
  | 'SEARCH_ENGINE'
  | 'SOCIAL'
  | 'INTERNAL_NEWS'
  | 'INTERNAL_HOME'
  | 'INTERNAL_OTHER'
  | 'EXTERNAL_LINK';

export type SharePlatformInput = 'telegram' | 'twitter' | 'whatsapp' | 'copy-link' | 'other';

export type Metric = { value: number; previous: number; changePercent: number | null };

export type VisitorMetric = Metric & {
  total: null;
  totalReason: 'NOT_COMPARABLE_DAILY_HASH';
  note: string;
};

export type CountCard = {
  total: number;
  inRange: number;
  previousRange: number;
  changePercent: number | null;
};

export type TopNewsItem = {
  rank: number;
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
};

export type CategoryPerformance = {
  categoryId: string;
  name: string;
  views: number;
  sharePercent: number;
  basis: 'CATEGORIZED_VIEWS';
};

export type ViewsSeriesPoint = { bucket: string; views: number; visitors: number };

export type ViewsSeries = {
  range: { key: SeriesRangeKey; from: string; to: string; unit: BucketUnit };
  totalViews: number;
  points: ViewsSeriesPoint[];
};

export type SiteOverview = {
  range: { key: OverviewRangeKey; from: string; to: string; unit: BucketUnit };
  generatedAt: string;
  cards: {
    views: Metric;
    visitors: VisitorMetric;
    news: CountCard;
    published: CountCard;
    drafts: { total: number };
    users: CountCard;
    comments: CountCard;
    likes: CountCard;
  };
  topNews: TopNewsItem[];
  categories: { totalCategorizedViews: number; items: CategoryPerformance[] };
  contentStatus: {
    publishedInRange: number;
    publishedPreviousRange: number;
    publishedChangePercent: number | null;
    pendingReview: number;
    drafts: number;
    scheduled: number;
    /** Hard delete: there is no trash to count. */
    deleted: null;
    deletedReason: 'HARD_DELETE_NOT_TRACKED';
  };
  userActivity: {
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersInRange: number;
    newUsersPreviousRange: number;
    growthPercent: number | null;
    activeUsers: number;
    activeUsersWindowDays: number;
    newComments: number;
    topContributor: {
      userId: string;
      displayName: string;
      likes: number;
      comments: number;
      total: number;
    } | null;
  };
};

export type TopNewsPage = {
  range: { key: OverviewRangeKey; from: string; to: string };
  items: TopNewsItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ServiceCheck = {
  status: 'up' | 'down';
  latencyMs: number;
  detail: string | null;
};

export type SystemStatus = {
  checkedAt: string;
  overall: 'ok' | 'degraded';
  services: {
    backend: ServiceCheck;
    database: ServiceCheck;
    storage: ServiceCheck;
    api: ServiceCheck;
  };
  uptimeSeconds: number;
  backup: { configured: boolean; lastAt: string | null; note: string };
  errorLog: { implemented: false; note: string; entries: [] };
};

export type ScoreComponentKey = 'views' | 'engagement' | 'readingTime' | 'shares' | 'relativeRank';

export type ScoreComponent = {
  component: ScoreComponentKey;
  weight: number;
  value: number;
  average: number | null;
  normalised: number;
  weighted: number;
};

export type NewsAnalytics = {
  news: {
    id: string;
    title: string;
    slug: string;
    status: string;
    publishedAt: string | null;
    createdAt: string;
    categories: Array<{ id: string; name: string }>;
  };
  range: { key: NewsRangeKey; from: string; to: string; unit: BucketUnit };
  generatedAt: string;
  cards: {
    views: number;
    uniqueVisitors: { value: number; basis: 'DAILY_ROTATING_HASH'; note: string };
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    averageReadingSeconds: number | null;
    engagementRatePercent: number | null;
  };
  series: { totalViews: number; points: ViewsSeriesPoint[] };
  launch: {
    publishedAt: string | null;
    note: string | null;
    checkpoints: Array<{ hours: number; views: number | null; elapsed: boolean }>;
  };
  trafficSources: {
    totalViews: number;
    items: Array<{
      source: TrafficSourceKey;
      label: string;
      views: number;
      sharePercent: number;
    }>;
    notification: { implemented: false; views: 0; note: string };
  };
  behavior: {
    readingSessions: number;
    averageReadingSeconds: number | null;
    averageScrollDepthPercent: number | null;
    bounceRatePercent: number | null;
    bounce: {
      basis: 'READING_SESSIONS_OVER_VIEWS';
      shortSessions: number;
      views: number;
      maxSeconds: number;
      note: string;
    };
  };
  comparison: {
    sampleSize: number;
    requestedSampleSize: number;
    windowDays: number;
    note: string | null;
    averages: {
      views: number;
      engagementRatePercent: number;
      readingSeconds: number;
      shares: number;
    } | null;
    diff: {
      viewsPercent: number | null;
      engagementPercent: number | null;
      readingTimePercent: number | null;
    } | null;
    rank: number | null;
    rankOutOf: number;
  };
  performance: {
    score: number | null;
    band: 'good' | 'average' | 'weak' | null;
    message: string;
    reason: 'NO_VIEWS' | 'NO_COMPARISON_DATA' | null;
    components: ScoreComponent[];
    weights: Record<ScoreComponentKey, number>;
  };
};
