'use client';

/**
 * Stage 10 Part 4 — charts.
 *
 * All three use recharts inside a ResponsiveContainer with a fixed height, so
 * they resize with the column instead of overflowing on a phone. Mohammad works
 * from a mobile browser, so nothing here relies on a fixed pixel width; wide
 * tables (not charts) get a horizontal scroll container in `panels.tsx`.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBucketLabel, formatNumber, formatPercent } from '@/lib/analytics';
import type { BucketUnit, CategoryPerformance, ViewsSeriesPoint } from '@/types/analytics';

const ACCENT = '#8B1A2B';
const AXIS_STYLE = { fontSize: 11, fill: '#6B6B6B' } as const;

/** Palette for categorical charts; repeats after 8 entries. */
const PALETTE = [
  '#8B1A2B',
  '#B2554A',
  '#C98B4B',
  '#7A8450',
  '#4F6D7A',
  '#6B5B8A',
  '#A8737F',
  '#5C6B73',
];

export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-ink-soft">
      {message}
    </div>
  );
}

export function ViewsLineChart({
  points,
  unit,
  height = 280,
}: {
  points: ViewsSeriesPoint[];
  unit: BucketUnit;
  height?: number;
}) {
  if (points.length === 0) {
    return <ChartEmptyState message="برای این بازه بازدیدی ثبت نشده است." />;
  }

  const data = points.map((point) => ({
    label: formatBucketLabel(point.bucket, unit),
    بازدید: point.views,
    بازدیدکننده: point.visitors,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E1DA" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            interval="preserveStartEnd"
            minTickGap={16}
            tickMargin={8}
          />
          <YAxis
            tick={AXIS_STYLE}
            width={44}
            allowDecimals={false}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatNumber(value), name]}
            contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ direction: 'rtl', fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="بازدید"
            stroke={ACCENT}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="بازدیدکننده"
            stroke="#4F6D7A"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBarChart({
  items,
  height = 300,
}: {
  items: CategoryPerformance[];
  height?: number;
}) {
  if (items.length === 0) {
    return <ChartEmptyState message="هنوز بازدیدی برای دسته‌بندی‌ها ثبت نشده است." />;
  }

  const data = items.map((item) => ({
    name: item.name,
    سهم: item.sharePercent,
    views: item.views,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E1DA" horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_STYLE}
            domain={[0, 100]}
            tickFormatter={(value: number) => formatPercent(value)}
          />
          <YAxis type="category" dataKey="name" tick={AXIS_STYLE} width={96} />
          <Tooltip
            formatter={(value: number, _name, entry) => [
              `${formatPercent(value)} — ${formatNumber(
                (entry as { payload?: { views?: number } }).payload?.views ?? 0,
              )} بازدید`,
              'سهم از بازدیدها',
            ]}
            contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="سهم" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrafficSourcesChart({
  items,
  height = 280,
}: {
  items: Array<{ label: string; views: number; sharePercent: number }>;
  height?: number;
}) {
  const present = items.filter((item) => item.views > 0);

  if (present.length === 0) {
    return <ChartEmptyState message="منبع ورودی برای این خبر ثبت نشده است." />;
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={present}
            dataKey="views"
            nameKey="label"
            innerRadius="45%"
            outerRadius="75%"
            paddingAngle={2}
          >
            {present.map((entry, index) => (
              <Cell key={entry.label} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${formatNumber(value)} بازدید`, name]}
            contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ direction: 'rtl', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
