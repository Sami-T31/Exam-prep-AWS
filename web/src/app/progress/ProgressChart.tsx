'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface StrengthPoint {
  subject: string;
  fullSubject: string;
  accuracy: number;
  coverage: number;
  practiceDepth: number;
  attempts: number;
}

interface ProgressChartProps {
  data: StrengthPoint[];
}

interface RadarTooltipProps {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number;
    payload?: StrengthPoint;
  }>;
}

interface PolarTickProps {
  x?: number | string;
  y?: number | string;
  index?: number;
  textAnchor?: string;
  payload?: {
    value: string;
  };
}

const ACCURACY_COLOR = '#c49a6c';
const COVERAGE_COLOR = '#7f9d69';
const PRACTICE_DEPTH_COLOR = '#6c8aa6';
const RADAR_AXIS_TEXT_STYLE = {
  fill: 'var(--foreground)',
  fillOpacity: 0.78,
  fontSize: 11,
  fontWeight: 600,
} as const;

function formatPercentValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function LegendKey({
  label,
  color,
  description,
}: {
  label: string;
  color: string;
  description: string;
}) {
  return (
    <div className="group/metric relative">
      <div
        tabIndex={0}
        className="inline-flex cursor-help items-center gap-2 rounded-full border border-[var(--border-color)]/85 bg-[color-mix(in_srgb,var(--surface-color)_95%,white)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] shadow-[0_10px_18px_color-mix(in_srgb,var(--accent-color)_8%,transparent)] outline-none transition hover:border-[color-mix(in_srgb,var(--accent-color)_50%,var(--border-color))] focus-visible:border-[color-mix(in_srgb,var(--accent-color)_60%,var(--border-color))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-color)_30%,transparent)]"
        aria-label={`${label}: ${description}`}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span>{label}</span>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.45rem)] z-30 w-64 -translate-x-1/2 translate-y-1 rounded-xl border border-[color-mix(in_srgb,var(--accent-color)_24%,var(--border-color))] bg-[color-mix(in_srgb,var(--surface-color)_97%,white)] px-3 py-2 text-left text-[11px] font-medium leading-5 text-[var(--foreground)]/80 opacity-0 shadow-[0_16px_28px_color-mix(in_srgb,var(--accent-color)_15%,transparent)] backdrop-blur-sm transition duration-150 group-hover/metric:translate-y-0 group-hover/metric:opacity-100 group-focus-within/metric:translate-y-0 group-focus-within/metric:opacity-100">
        <p className="font-semibold text-[var(--foreground)]">{label}</p>
        <p>{description}</p>
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[8.25rem] rounded-[1.15rem] border border-[var(--border-color)]/82 bg-[color-mix(in_srgb,var(--surface-color)_94%,white)] px-3 py-2 shadow-[0_12px_24px_color-mix(in_srgb,var(--accent-color)_7%,transparent)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground)]/48">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function RadarChartTooltip({ active, payload }: RadarTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[1.15rem] border border-[color-mix(in_srgb,var(--accent-color)_18%,var(--border-color))] bg-[color-mix(in_srgb,var(--surface-color)_96%,white)] px-4 py-3 shadow-[0_18px_34px_color-mix(in_srgb,var(--accent-color)_16%,transparent)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--foreground)]/52">
        {point.fullSubject}
      </p>
      <p className="mt-1 text-sm text-[var(--foreground)]/66">
        {point.attempts} attempt{point.attempts === 1 ? '' : 's'} recorded
      </p>
      <div className="mt-3 grid gap-2">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)]/80 bg-[var(--surface-muted)]/44 px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-[var(--foreground)]/74">
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {formatPercentValue(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarAxisTick({
  x,
  y,
  index = 0,
  textAnchor,
  payload,
}: PolarTickProps) {
  const resolvedX = Number(x ?? 0);
  const resolvedY = Number(y ?? 0);
  const verticalOffset =
    index === 0 ? -14 : index === 3 || index === 4 ? 12 : 0;

  return (
    <text
      x={resolvedX}
      y={resolvedY + verticalOffset}
      textAnchor={textAnchor}
      className="recharts-text"
    >
      <tspan style={RADAR_AXIS_TEXT_STYLE}>
        {payload?.value}
      </tspan>
    </text>
  );
}

export default function ProgressChart({ data }: ProgressChartProps) {
  const strongest = data.reduce<StrengthPoint | null>(
    (current, point) =>
      !current || point.accuracy > current.accuracy ? point : current,
    null,
  );
  const weakest = data.reduce<StrengthPoint | null>(
    (current, point) =>
      !current || point.accuracy < current.accuracy ? point : current,
    null,
  );
  const widestCoverage = data.reduce<StrengthPoint | null>(
    (current, point) =>
      !current || point.coverage > current.coverage ? point : current,
    null,
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.9rem] border border-[color-mix(in_srgb,var(--accent-color)_18%,var(--border-color))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-color)_98%,white),color-mix(in_srgb,var(--surface-muted)_48%,var(--surface-color)))] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_18px_34px_color-mix(in_srgb,var(--accent-color)_8%,transparent)]">
      <div className="pointer-events-none absolute inset-x-14 top-4 h-20 rounded-full bg-[radial-gradient(circle,rgba(196,154,108,0.18),transparent_70%)] blur-2xl" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-color)]/72 px-5 pb-4 pt-4">
        <div className="flex flex-wrap gap-2.5">
          <LegendKey
            label="Accuracy"
            color={ACCURACY_COLOR}
            description="Percent correct per subject based on recorded attempts: correct answers divided by total attempts."
          />
          <LegendKey
            label="Coverage"
            color={COVERAGE_COLOR}
            description="How much of each subject has been practiced: attempted questions divided by the available question bank."
          />
          <LegendKey
            label="Practice Depth"
            color={PRACTICE_DEPTH_COLOR}
            description="Relative practice volume normalized to 0-100, where your most-practiced subject sets the benchmark."
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2.5">
          <SummaryPill
            label="Strongest"
            value={
              strongest
                ? `${strongest.subject} ${formatPercentValue(strongest.accuracy)}`
                : 'No data yet'
            }
          />
          <SummaryPill
            label="Needs Focus"
            value={
              weakest
                ? `${weakest.subject} ${formatPercentValue(weakest.accuracy)}`
                : 'No data yet'
            }
          />
          <SummaryPill
            label="Best Coverage"
            value={
              widestCoverage
                ? `${widestCoverage.subject} ${formatPercentValue(widestCoverage.coverage)}`
                : 'No data yet'
            }
          />
        </div>
      </div>

      <div className="relative z-10 flex-1 px-4 pb-4 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="52%"
            outerRadius="72%"
            data={data}
            margin={{ left: 12, right: 12, top: 12, bottom: 8 }}
          >
            <PolarGrid stroke="var(--border-color)" strokeOpacity={0.45} />
            <PolarAngleAxis
              dataKey="subject"
              tick={<RadarAxisTick />}
              tickLine={false}
              axisLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tickCount={5}
              axisLine={false}
              tick={{
                fill: 'var(--foreground)',
                fillOpacity: 0.56,
                fontSize: 10,
                fontWeight: 500,
              }}
            />
            <Tooltip content={<RadarChartTooltip />} />
            <Radar
              isAnimationActive={false}
              dataKey="accuracy"
              name="Accuracy"
              stroke={ACCURACY_COLOR}
              strokeWidth={2.5}
              strokeLinejoin="round"
              fill={ACCURACY_COLOR}
              fillOpacity={0.16}
            />
            <Radar
              isAnimationActive={false}
              dataKey="coverage"
              name="Coverage"
              stroke={COVERAGE_COLOR}
              strokeWidth={2.3}
              strokeLinejoin="round"
              fill={COVERAGE_COLOR}
              fillOpacity={0.12}
            />
            <Radar
              isAnimationActive={false}
              dataKey="practiceDepth"
              name="Practice Depth"
              stroke={PRACTICE_DEPTH_COLOR}
              strokeWidth={2.3}
              strokeLinejoin="round"
              fill={PRACTICE_DEPTH_COLOR}
              fillOpacity={0.12}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
