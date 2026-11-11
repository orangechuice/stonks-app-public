import { describe, it, expect } from 'vitest';
import { getColorShade, formatCurrency, formatNumber, formatPercent, formatCompactNumber } from './colorUtils';

describe('getColorShade gradient rules', () => {
  it('returns pure electric gold / yellow at 0% change', () => {
    const shade0 = getColorShade(0);
    expect(shade0.isPositive).toBe(true);
    expect(shade0.textColor).toBe('#FFFFFF');
    // At hue 52, red and green are high, blue is low
    expect(shade0.bgColor).toMatch(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\.35\)/);
    expect(shade0.strokeColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
  });

  it('transitions from yellow to clear green between 0% and +2%', () => {
    const shade0 = getColorShade(0);
    const shade1 = getColorShade(1.0);
    const shade2 = getColorShade(2.0);

    expect(shade1.isPositive).toBe(true);
    expect(shade2.isPositive).toBe(true);
    expect(shade0.strokeColor).not.toBe(shade1.strokeColor);
    expect(shade1.strokeColor).not.toBe(shade2.strokeColor);
  });

  it('transitions from yellow through amber-orange to red between 0% and -2%', () => {
    const shade0 = getColorShade(0);
    const shadeNeg1 = getColorShade(-1.0);
    const shadeNeg2 = getColorShade(-2.0);

    expect(shadeNeg1.isPositive).toBe(false);
    expect(shadeNeg2.isPositive).toBe(false);
    expect(shade0.strokeColor).not.toBe(shadeNeg1.strokeColor);
    expect(shadeNeg1.strokeColor).not.toBe(shadeNeg2.strokeColor);
  });

  it('progressively darkens on positive gains up to +100%', () => {
    const shade2 = getColorShade(2.0);
    const shade10 = getColorShade(10.0);
    const shade50 = getColorShade(50.0);
    const shade100 = getColorShade(100.0);

    expect(shade2.intensity).toBeLessThan(shade10.intensity);
    expect(shade10.intensity).toBeLessThan(shade50.intensity);
    expect(shade50.intensity).toBeLessThan(shade100.intensity);
    expect(shade100.intensity).toBe(1.0);
  });

  it('progressively darkens on negative drops down to -100%', () => {
    const shadeNeg2 = getColorShade(-2.0);
    const shadeNeg10 = getColorShade(-10.0);
    const shadeNeg50 = getColorShade(-50.0);
    const shadeNeg100 = getColorShade(-100.0);

    expect(shadeNeg2.intensity).toBeLessThan(shadeNeg10.intensity);
    expect(shadeNeg10.intensity).toBeLessThan(shadeNeg50.intensity);
    expect(shadeNeg50.intensity).toBeLessThan(shadeNeg100.intensity);
    expect(shadeNeg100.intensity).toBe(1.0);
  });

  it('clamps gains of more than +100% to the exact same maximum dark shade as +100%', () => {
    const shade100 = getColorShade(100.0);
    const shade150 = getColorShade(150.0);
    const shade500 = getColorShade(500.0);

    expect(shade150.bgColor).toBe(shade100.bgColor);
    expect(shade150.strokeColor).toBe(shade100.strokeColor);
    expect(shade150.borderColor).toBe(shade100.borderColor);
    expect(shade150.intensity).toBe(shade100.intensity);

    expect(shade500.bgColor).toBe(shade100.bgColor);
    expect(shade500.strokeColor).toBe(shade100.strokeColor);
  });

  it('clamps drops of more than -100% to the exact same maximum dark shade as -100%', () => {
    const shadeNeg100 = getColorShade(-100.0);
    const shadeNeg150 = getColorShade(-150.0);

    expect(shadeNeg150.bgColor).toBe(shadeNeg100.bgColor);
    expect(shadeNeg150.strokeColor).toBe(shadeNeg100.strokeColor);
    expect(shadeNeg150.borderColor).toBe(shadeNeg100.borderColor);
    expect(shadeNeg150.intensity).toBe(shadeNeg100.intensity);
  });
});

describe('formatting helper utilities', () => {
  it('formats currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats numbers with thousand separators and decimals', () => {
    expect(formatNumber(1234567.89, 2)).toBe('1,234,567.89');
    expect(formatNumber(null)).toBe('--');
  });

  it('formats percent with signs and decimals', () => {
    expect(formatPercent(2.345, 2)).toBe('+2.35%');
    expect(formatPercent(-1.2, 2)).toBe('-1.20%');
    expect(formatPercent(null)).toBe('--%');
  });

  it('formats compact numbers for large volume and market caps', () => {
    expect(formatCompactNumber(3.5e12)).toBe('3.500T');
    expect(formatCompactNumber(15.2e12)).toBe('15.20T');
    expect(formatCompactNumber(250e9)).toBe('250.0B');
    expect(formatCompactNumber(50e9)).toBe('50.00B');
    expect(formatCompactNumber(5e6)).toBe('5.00M');
    expect(formatCompactNumber(5000)).toBe('5.0K');
  });
});
