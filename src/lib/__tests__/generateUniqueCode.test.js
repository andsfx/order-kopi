import { describe, it, expect } from 'vitest';
import { generateUniqueCode } from '../generateUniqueCode';

describe('generateUniqueCode', () => {
  it('generates 4-digit code', () => {
    const code = generateUniqueCode('ORD-20260506-001');
    expect(code).toMatch(/^[1-9][0-9]{3}$/);
    expect(parseInt(code)).toBeGreaterThanOrEqual(1000);
    expect(parseInt(code)).toBeLessThanOrEqual(9999);
  });

  it('generates consistent code for same order ID', () => {
    const orderId = 'ORD-20260506-001';
    const code1 = generateUniqueCode(orderId);
    const code2 = generateUniqueCode(orderId);
    expect(code1).toBe(code2);
  });

  it('generates different codes for different order IDs', () => {
    const code1 = generateUniqueCode('ORD-20260506-001');
    const code2 = generateUniqueCode('ORD-20260506-002');
    expect(code1).not.toBe(code2);
  });

  it('handles order IDs with different formats', () => {
    const testCases = [
      'ORD-20260506-001',
      'ORD-20260506-999',
      'ORD-20260507-001',
      'ORDER-123456789',
      'ORD-1234',
    ];

    testCases.forEach(orderId => {
      const code = generateUniqueCode(orderId);
      expect(code).toMatch(/^[1-9][0-9]{3}$/);
      expect(parseInt(code)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(code)).toBeLessThanOrEqual(9999);
    });
  });

  it('generates codes in valid range for sequential order IDs', () => {
    const codes = new Set();
    
    // Generate 100 sequential order IDs
    for (let i = 1; i <= 100; i++) {
      const orderId = `ORD-20260506-${String(i).padStart(3, '0')}`;
      const code = generateUniqueCode(orderId);
      
      // Verify format
      expect(code).toMatch(/^[1-9][0-9]{3}$/);
      
      // Verify range
      const numCode = parseInt(code);
      expect(numCode).toBeGreaterThanOrEqual(1000);
      expect(numCode).toBeLessThanOrEqual(9999);
      
      // Track unique codes
      codes.add(code);
    }
    
    // Verify we got different codes (at least 90% unique)
    expect(codes.size).toBeGreaterThan(90);
  });

  it('handles edge cases', () => {
    // Empty numeric part
    const code1 = generateUniqueCode('ORD-ABC-XYZ');
    expect(parseInt(code1)).toBe(1000);
    
    // Very large numbers
    const code2 = generateUniqueCode('ORD-99999999999999');
    expect(code2).toMatch(/^[1-9][0-9]{3}$/);
    
    // Single digit
    const code3 = generateUniqueCode('ORD-1');
    expect(code3).toMatch(/^[1-9][0-9]{3}$/);
  });
});
