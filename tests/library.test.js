import { describe, it, expect } from 'vitest';
import { expandStyle } from '../src/library/styles.js';
import { ALLOWED_OPERATIONS } from '../src/operations.js';

describe('expandStyle', () => {
  it('returns operations array for techno global target', () => {
    const ops = expandStyle('techno', 'global', 1.0);
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.length).toBeGreaterThan(0);
    ops.forEach(op => {
      expect(typeof op.type).toBe('string');
      expect(typeof op.amount).toBe('number');
    });
  });

  it('returns non-empty ops for techno drums target', () => {
    const ops = expandStyle('techno', 'drums', 1.0);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('returns non-empty ops for techno bass target', () => {
    const ops = expandStyle('techno', 'bass', 1.0);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('returns non-empty ops for techno melody target', () => {
    const ops = expandStyle('techno', 'melody', 1.0);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('falls back to techno when unknown style passed', () => {
    const opsUnknown = expandStyle('unknown_style', 'global', 1.0);
    const opsTechno = expandStyle('techno', 'global', 1.0);
    expect(opsUnknown).toEqual(opsTechno);
  });

  it('falls back to global when target not found in style', () => {
    const opsWithTarget = expandStyle('techno', 'nonexistent_target', 1.0);
    const opsGlobal = expandStyle('techno', 'global', 1.0);
    expect(opsWithTarget).toEqual(opsGlobal);
  });

  it('scales amounts linearly by intensity', () => {
    const opsFull = expandStyle('techno', 'drums', 1.0);
    const opsHalf = expandStyle('techno', 'drums', 0.5);
    expect(opsHalf.length).toBe(opsFull.length);
    opsHalf.forEach((op, i) => {
      expect(op.amount).toBeCloseTo(opsFull[i].amount * 0.5, 5);
    });
  });

  it('uses default intensity 0.5 when not provided', () => {
    const opsDefault = expandStyle('techno', 'bass');
    const opsExplicit = expandStyle('techno', 'bass', 0.5);
    expect(opsDefault).toEqual(opsExplicit);
  });

  it('only returns operation types from ALLOWED_OPERATIONS', () => {
    ['global', 'drums', 'bass', 'melody'].forEach(target => {
      const ops = expandStyle('techno', target, 1.0);
      ops.forEach(op => {
        expect(ALLOWED_OPERATIONS).toContain(op.type);
      });
    });
  });
});
