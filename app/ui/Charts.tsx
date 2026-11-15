export interface CompareGroup {
  label: string;
  first: number;
  second: number;
  unit?: string;
}

export interface ComparisonChartProps {
  title: string;
  firstLabel: string;
  secondLabel: string;
  groups: CompareGroup[];
  summary: string;
}

const W = 360;
const LEFT = 8;
const BAR_MAX = 250;
const GROUP_H = 62;

/**
 * Bars for two iterations side by side, one group per measure; the first is hatched and the second solid, so colour is not the only signal.
 */
export function ComparisonChart({ title, firstLabel, secondLabel, groups, summary }: ComparisonChartProps) {
  const height = groups.length * GROUP_H + 30;
  return (
    <figure class="lg-chart">
      <figcaption class="lg-chart__title">{title}</figcaption>
      <svg class="lg-chart__svg" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${title}. ${summary}`}>
        <defs>
          <pattern id="lg-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" class="lg-chart__hatch-bg" />
            <line x1="0" y1="0" x2="0" y2="6" class="lg-chart__hatch-line" />
          </pattern>
        </defs>
        {groups.map((group, index) => {
          const top = index * GROUP_H;
          const max = Math.max(group.first, group.second, 1);
          const w1 = (group.first / max) * BAR_MAX;
          const w2 = (group.second / max) * BAR_MAX;
          const unit = group.unit ?? '';
          return (
            <g key={group.label} transform={`translate(0 ${top})`}>
              <text x={LEFT} y="13" class="lg-chart__label">
                {group.label}
              </text>
              <rect x={LEFT} y="20" width={Math.max(w1, 2)} height="15" rx="3" class="lg-chart__bar lg-chart__bar--first" />
              <text x={LEFT + w1 + 8} y="32" class="lg-chart__value">
                {group.first}
                {unit}
              </text>
              <rect x={LEFT} y="39" width={Math.max(w2, 2)} height="15" rx="3" class="lg-chart__bar lg-chart__bar--second" />
              <text x={LEFT + w2 + 8} y="51" class="lg-chart__value lg-chart__value--second">
                {group.second}
                {unit}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${LEFT} ${groups.length * GROUP_H + 4})`} class="lg-chart__legend">
          <rect width="14" height="10" rx="2" class="lg-chart__bar lg-chart__bar--first" y="2" />
          <text x="20" y="11" class="lg-chart__key">
            {firstLabel}
          </text>
          <rect x="130" width="14" height="10" rx="2" class="lg-chart__bar lg-chart__bar--second" y="2" />
          <text x="150" y="11" class="lg-chart__key">
            {secondLabel}
          </text>
        </g>
      </svg>
    </figure>
  );
}

export interface DotRow {
  label: string;
  values: number[];
  median: number;
}

export interface DotPlotProps {
  title: string;
  rows: DotRow[];
  max: number;
  unit: string;
  medianLabel: string;
  summary: string;
}

const PLOT_LEFT = 74;
const PLOT_W = 270;
const ROW_H = 64;

/**
 * Dot plot of cycle times, one dot per finished item, one row per iteration, with a median mark on each row.
 */
export function DotPlot({ title, rows, max, unit, medianLabel, summary }: DotPlotProps) {
  const height = rows.length * ROW_H + 40;
  const x = (value: number) => PLOT_LEFT + (Math.min(value, max) / max) * PLOT_W;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  return (
    <figure class="lg-chart">
      <figcaption class="lg-chart__title">{title}</figcaption>
      <svg class="lg-chart__svg" viewBox={`0 0 360 ${height}`} role="img" aria-label={`${title}. ${summary}`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1="4" y2={rows.length * ROW_H + 6} class="lg-chart__grid" />
            <text x={x(tick)} y={rows.length * ROW_H + 24} text-anchor="middle" class="lg-chart__tick">
              {tick}
              {tick === max ? ` ${unit}` : ''}
            </text>
          </g>
        ))}
        {rows.map((row, index) => {
          const base = index * ROW_H + 50;
          const sorted = [...row.values].sort((a, b) => a - b);
          const placed: { cx: number; level: number }[] = [];
          sorted.forEach((value) => {
            const cx = x(value);
            let level = 0;
            while (placed.some((p) => p.level === level && Math.abs(p.cx - cx) < 12)) level += 1;
            placed.push({ cx, level });
          });
          const first = index === 0;
          return (
            <g key={row.label}>
              <text x="4" y={base - 3} class="lg-chart__label">
                {row.label}
              </text>
              <line x1={PLOT_LEFT} x2={PLOT_LEFT + PLOT_W} y1={base + 2} y2={base + 2} class="lg-chart__axis" />
              {placed.map((dot, dotIndex) => (
                <circle
                  key={dotIndex}
                  cx={dot.cx}
                  cy={base - 7 - dot.level * 12}
                  r="5"
                  class={first ? 'lg-chart__dot lg-chart__dot--first' : 'lg-chart__dot lg-chart__dot--second'}
                />
              ))}
              <path d={`M${x(row.median)} ${base - 2} l-5 9 h10 z`} class="lg-chart__median" />
              <title>{`${medianLabel} ${row.median} ${unit}`}</title>
            </g>
          );
        })}
      </svg>
      <p class="lg-chart__note">
        <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
          <path d="M6 0l6 10H0z" class="lg-chart__median" />
        </svg>
        <span>{medianLabel}</span>
      </p>
    </figure>
  );
}
