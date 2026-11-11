import { describe, it, expect } from 'vitest';
import {
  calculateDischargedMass,
  calculateDischargeRate,
  calculatePressureDrop,
  pressDurationMsToSeconds,
  secondsToPressDurationMs,
} from '../calculations/sprayMetrics';

describe('sprayMetrics domain calculation engine', () => {
  describe('calculateDischargedMass', () => {
    it('calculates discharged mass correctly with precision', () => {
      // Example from client HTML: w0 = 185.42g, w1 = 184.22g -> 1.20g
      const result = calculateDischargedMass(185.42, 184.22);
      expect(result).toBe(1.2);
    });

    it('handles 3 decimal precision', () => {
      const result = calculateDischargedMass(120.345, 119.123);
      expect(result).toBe(1.222);
    });

    it('returns negative mass when final weight exceeds initial weight (tare drift)', () => {
      const result = calculateDischargedMass(100.0, 100.5);
      expect(result).toBe(-0.5);
    });

    it('returns undefined when either weight is undefined or null', () => {
      expect(calculateDischargedMass(undefined, 100)).toBeUndefined();
      expect(calculateDischargedMass(100, undefined)).toBeUndefined();
      expect(calculateDischargedMass(null as unknown as number, 100)).toBeUndefined();
    });
  });

  describe('calculateDischargeRate', () => {
    it('calculates discharge rate correctly', () => {
      // Example: mass = 1.20g, duration = 2.05s -> 1.20 / 2.05 = 0.585 g/s
      const result = calculateDischargeRate(1.2, 2.05);
      expect(result).toBe(0.585);
    });

    it('guards against zero or negative duration', () => {
      expect(calculateDischargeRate(1.2, 0)).toBeUndefined();
      expect(calculateDischargeRate(1.2, -1)).toBeUndefined();
    });

    it('returns undefined if mass or duration is missing', () => {
      expect(calculateDischargeRate(undefined, 2.0)).toBeUndefined();
      expect(calculateDischargeRate(1.2, undefined)).toBeUndefined();
    });
  });

  describe('calculatePressureDrop', () => {
    it('calculates pressure drop for Aerosol', () => {
      // Example: initial = 4.5 bar, final = 4.2 bar -> 0.30 bar
      const result = calculatePressureDrop(4.5, 4.2, true);
      expect(result).toBe(0.3);
    });

    it('returns undefined for Non-Aerosol device', () => {
      expect(calculatePressureDrop(4.5, 4.2, false)).toBeUndefined();
    });

    it('returns undefined if either pressure reading is missing', () => {
      expect(calculatePressureDrop(undefined, 4.2, true)).toBeUndefined();
      expect(calculatePressureDrop(4.5, undefined, true)).toBeUndefined();
    });
  });

  describe('unit conversions between milliseconds and seconds', () => {
    it('converts ms to seconds', () => {
      expect(pressDurationMsToSeconds(2000)).toBe(2);
      expect(pressDurationMsToSeconds(2050)).toBe(2.05);
      expect(pressDurationMsToSeconds(0)).toBe(0);
    });

    it('converts seconds to ms', () => {
      expect(secondsToPressDurationMs(2)).toBe(2000);
      expect(secondsToPressDurationMs(2.05)).toBe(2050);
      expect(secondsToPressDurationMs(0)).toBe(0);
    });
  });
});

