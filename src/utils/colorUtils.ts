import { ColorShade } from '../types/stock';

/**
 * Converts HSL color values to RGB integer array [r, g, b].
 * @param h Hue in degrees (0 - 360)
 * @param s Saturation in percentage (0 - 100)
 * @param l Lightness in percentage (0 - 100)
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const normalizedH = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;

  const k = (n: number) => (n + normalizedH / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));

  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
}

/**
 * Computes dramatic logarithmic color shades based on stock percentage change.
 * 
 * Rules:
 * - 0% change: Pure Electric Gold / Yellow (Hue 52°)
 * - ±2% change: Reaches Clearly RED (Hue 0°) or GREEN (Hue 135°), rendered in a bright/lighter shade.
 * - 0% to ±2%: Smooth hue transition (Yellow -> Amber-Orange at 1.3% -> Clear Red at 2.0%) so values like -1.3% vs -2.68% are visually distinct.
 * - ±2% to ±100%: Scales progressively DARKER on a logarithmic scale (log1p) from bright (55% lightness) down to VERY DARK red/green (15% lightness) at ±100%.
 */
export function getColorShade(percentChange: number): ColorShade {
  const isPositive = percentChange >= 0;
  const absVal = Math.abs(percentChange);

  let hue: number;
  let lightness: number;
  let overallIntensity: number;
  const saturation = 95;

  if (absVal <= 2.0) {
    // Phase 1 (0% to ±2%): Smooth shift from Yellow (0%) to Clear Bright Red/Green (±2%)
    const tFast = absVal / 2.0; // 0.0 to 1.0
    if (isPositive) {
      hue = 52 + (135 - 52) * tFast; // 52° (Yellow) -> 135° (Clear Green at +2%)
    } else {
      hue = 52 - 52 * tFast;         // 52° (Yellow) -> 0° (Clear Red at -2%)
    }
    lightness = 50 + 5 * tFast;       // 50% -> 55% (Light, bright, clear shade)
    overallIntensity = 0.25 * tFast;
  } else {
    // Phase 2 (±2% to ±100%): Firm Red/Green darkening logarithmically down to 15% (VERY DARK)
    hue = isPositive ? 135 : 0;       // Firm Clear Green (135°) or Red (0°)

    const k = 0.8;
    const maxLog = Math.log1p(k * 98.0);
    const tDarkLog = Math.min(1.0, Math.log1p(k * (absVal - 2.0)) / maxLog);

    // Lightness drops logarithmically from 55% (bright at 2%) down to 15% (VERY DARK at 100%)
    lightness = 55 - 40 * tDarkLog;
    overallIntensity = 0.25 + 0.75 * tDarkLog;
  }

  const [r, g, b] = hslToRgb(hue, saturation, lightness);

  // Dynamic alpha and glow scaling
  const bgAlpha = (0.35 + 0.60 * overallIntensity).toFixed(2);
  const borderAlpha = (0.45 + 0.50 * overallIntensity).toFixed(2);
  const glowAlpha = (0.20 + 0.65 * overallIntensity).toFixed(2);

  // Outline border color: maintain legibility with a lighter outline for dark pills
  const borderLightness = Math.max(45, lightness + 15 * (1 - overallIntensity));
  const [br, bg, bb] = hslToRgb(hue, saturation, borderLightness);

  // Chart line stroke: keep chart stroke crisp and luminous on dark charts
  const strokeLightness = Math.max(45, lightness + 12 * (1 - overallIntensity));
  const [sr, sg, sb] = hslToRgb(hue, saturation, strokeLightness);

  return {
    bgColor: `rgba(${r}, ${g}, ${b}, ${bgAlpha})`,
    textColor: '#FFFFFF',
    borderColor: `rgba(${br}, ${bg}, ${bb}, ${borderAlpha})`,
    strokeColor: `rgb(${sr}, ${sg}, ${sb})`,
    fillGradientStart: `rgba(${r}, ${g}, ${b}, ${(0.30 + 0.40 * overallIntensity).toFixed(2)})`,
    fillGradientEnd: `rgba(${r}, ${g}, ${b}, 0.0)`,
    glowColor: `rgba(${r}, ${g}, ${b}, ${glowAlpha})`,
    intensity: overallIntensity,
    isPositive,
  };
}

/**
 * Format currency numbers safely (e.g., $325.89 or $7,498.96)
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number with standard thousand separator commas and fixed decimals.
 * e.g., 4379.5 -> "4,379.50", -237523.08 -> "-237,523.08"
 */
export function formatNumber(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '--';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage change with sign prefix and standard thousand separator commas.
 * e.g., 4379.5 -> "+4,379.50%", -237523.08 -> "-237,523.08%"
 */
export function formatPercent(value: number | undefined | null, decimals = 2, includeSign = true): string {
  if (value === undefined || value === null || isNaN(value)) return '--%';
  const formatted = formatNumber(value, decimals);
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

/**
 * Format compact numbers for Market Cap / Volume (e.g. 4.172T, 7.408B, 43.77B)
 */
export function formatCompactNumber(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '--';
  if (value >= 1e12) {
    const val = value / 1e12;
    return val >= 10 ? val.toFixed(2) + 'T' : val.toFixed(3) + 'T';
  }
  if (value >= 1e9) {
    const val = value / 1e9;
    return val >= 100 ? val.toFixed(1) + 'B' : val >= 10 ? val.toFixed(2) + 'B' : val.toFixed(3) + 'B';
  }
  if (value >= 1e6) {
    const val = value / 1e6;
    return val >= 100 ? val.toFixed(1) + 'M' : val.toFixed(2) + 'M';
  }
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toLocaleString('en-US');
}
