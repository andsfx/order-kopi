import { describe, it, expect } from 'vitest';
import { generateUniqueCode } from '../generateUniqueCode';

describe('generateUniqueCode', () => {
  it('generates code in range 0-500', () => {
    const code = generateUniqueCode('ORD-20260506-001');
    const num = parseInt(code);
    expect(num).toBeGreaterThanOrEqual(0);
    expect(num).toBeLessThanOrEqual(500);
  });

  it('generates valid numeric string', () => {
    const code = generateUniqueCode('ORD-20260506-001');
    expect(code).toMatch(/^\d+$/);
  });

  it('generates random codes (not deterministic)', () => {
    // Since codes are random, we just verify they're all in range
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      const code = generateUniqueCode('ORD-20260506-001');
      const num = parseInt(code);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(500);
      codes.add(code);
    }
    // Random generation should produce at least a few different codes
    expect(codes.size).toBeGreaterThan(1);
  });

  it('all generated codes are within 0-500 range across many calls', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateUniqueCode(`ORD-${i}`);
      const num = parseInt(code);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(500);
    }
  });

  it('code adds at most Rp 500 to total', () => {
    const finalTotal = 50000;
    for (let i = 0; i < 50; i++) {
      const code = generateUniqueCode(null, finalTotal);
      const amountToPay = finalTotal + parseInt(code);
      expect(amountToPay).toBeLessThanOrEqual(finalTotal + 500);
      expect(amountToPay).toBeGreaterThanOrEqual(finalTotal);
    }
  });
});
