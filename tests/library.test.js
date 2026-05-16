import { describe, it, expect } from 'vitest';
import { expandStyle } from '../src/library/styles.js';
import { ALLOWED_OPERATIONS } from '../src/operations.js';

describe('expandStyle', () => {
  it('returns operations array for known style and target', () => {
    const ops = expandStyle('acid', 'bass', 1.0);
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.length).toBeGreaterThan(0);
    ops.forEach(op => {
      expect(typeof op.type).toBe('string');
      expect(typeof op.amount).toBe('number');
    });
  });

  it('falls back to global when target not found in style', () => {
    const opsWithTarget = expandStyle('groove', 'nonexistent_target', 1.0);
    const opsGlobal = expandStyle('groove', 'global', 1.0);
    expect(opsWithTarget).toEqual(opsGlobal);
  });

  it('falls back to minimal style when style not found', () => {
    const opsUnknown = expandStyle('unknown_style', 'global', 1.0);
    const opsMinimal = expandStyle('minimal', 'global', 1.0);
    expect(opsUnknown).toEqual(opsMinimal);
  });

  it('scales amounts linearly by intensity', () => {
    const opsFull = expandStyle('groove', 'drums', 1.0);
    const opsHalf = expandStyle('groove', 'drums', 0.5);
    expect(opsHalf.length).toBe(opsFull.length);
    opsHalf.forEach((op, i) => {
      expect(op.amount).toBeCloseTo(opsFull[i].amount * 0.5, 5);
    });
  });

  it('uses default intensity 0.5 when not provided', () => {
    const opsDefault = expandStyle('acid', 'bass');
    const opsExplicit = expandStyle('acid', 'bass', 0.5);
    expect(opsDefault).toEqual(opsExplicit);
  });

  it('only returns operation types from ALLOWED_OPERATIONS', () => {
    ['acid', 'groove', 'minimal', 'dub', 'breakcore'].forEach(style => {
      const ops = expandStyle(style, 'global', 1.0);
      ops.forEach(op => {
        expect(ALLOWED_OPERATIONS).toContain(op.type);
      });
    });
  });
});
