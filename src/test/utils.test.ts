import { describe, it, expect } from 'vitest';
import { formatSuccessRate } from '@/utils/kpiCalculations';

describe('Utility Functions', () => {
  describe('formatSuccessRate', () => {
    it('should format success rate as percentage', () => {
      expect(formatSuccessRate(75)).toBe('75%');
      expect(formatSuccessRate(0)).toBe('0%');
      expect(formatSuccessRate(100)).toBe('100%');
    });

    it('should handle decimal values', () => {
      expect(formatSuccessRate(33.33)).toBe('33%');
      expect(formatSuccessRate(66.66)).toBe('67%');
    });
  });
});

