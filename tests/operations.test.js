import { describe, it, expect } from 'vitest';
import { OPERATION_HANDLERS, ALLOWED_OPERATIONS } from '../src/operations.js';

describe('ALLOWED_OPERATIONS includes new ops', () => {
  it('includes change_waveform', () => {
    expect(ALLOWED_OPERATIONS).toContain('change_waveform');
  });
  it('includes adjust_decay', () => {
    expect(ALLOWED_OPERATIONS).toContain('adjust_decay');
  });
  it('includes adjust_lpq', () => {
    expect(ALLOWED_OPERATIONS).toContain('adjust_lpq');
  });
});

describe('change_waveform', () => {
  it('keeps sine at amt=0.0', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 0.0)).toBe(`note("c1").s("sine").decay(0.1)`);
  });
  it('replaces sine with triangle at amt=0.3', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 0.3)).toBe(`note("c1").s("triangle").decay(0.1)`);
  });
  it('replaces sine with sawtooth at amt=0.6', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 0.6)).toBe(`note("c1").s("sawtooth").decay(0.1)`);
  });
  it('replaces sine with square at amt=1.0', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 1.0)).toBe(`note("c1").s("square").decay(0.1)`);
  });
  it('replaces all oscillators in stack() — g flag', () => {
    const code = `stack(note("c1").s("sine").decay(0.1), note("c2").s("sine").decay(0.2))`;
    expect(OPERATION_HANDLERS.change_waveform(code, 1.0))
      .toBe(`stack(note("c1").s("square").decay(0.1), note("c2").s("square").decay(0.2))`);
  });
  it('does not match s("white")', () => {
    const code = `s("white").decay(0.08).hpf(5000)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 1.0)).toBe(`s("white").decay(0.08).hpf(5000)`);
  });
  it('uses floor-based zone mapping — 0.25 maps to triangle not sine', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 0.25)).toBe(`note("c1").s("triangle").decay(0.1)`);
  });
});

describe('adjust_decay', () => {
  it('increases decay when present', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.adjust_decay(code, 0.1)).toBe(`note("c1").s("sine").decay(0.2)`);
  });
  it('appends decay when absent', () => {
    const code = `note("c1").s("sine")`;
    expect(OPERATION_HANDLERS.adjust_decay(code, 0.1)).toBe(`note("c1").s("sine")\n  .decay(0.2)`);
  });
  it('clamps to max 4.0', () => {
    const code = `note("c1").s("sine").decay(3.95)`;
    expect(OPERATION_HANDLERS.adjust_decay(code, 0.1)).toBe(`note("c1").s("sine").decay(4)`);
  });
  it('clamps to min 0.01', () => {
    const code = `note("c1").s("sine").decay(0.02)`;
    expect(OPERATION_HANDLERS.adjust_decay(code, -0.05)).toBe(`note("c1").s("sine").decay(0.01)`);
  });
});

describe('adjust_lpq', () => {
  it('increases lpq when present', () => {
    const code = `note("c1").s("sine").lpq(5)`;
    expect(OPERATION_HANDLERS.adjust_lpq(code, 0.3)).toBe(`note("c1").s("sine").lpq(8)`);
  });
  it('appends lpq when absent', () => {
    const code = `note("c1").s("sine")`;
    expect(OPERATION_HANDLERS.adjust_lpq(code, 0.3)).toBe(`note("c1").s("sine")\n  .lpq(3)`);
  });
  it('clamps to max 40', () => {
    const code = `note("c1").s("sine").lpq(39)`;
    expect(OPERATION_HANDLERS.adjust_lpq(code, 0.5)).toBe(`note("c1").s("sine").lpq(40)`);
  });
  it('clamps to min 0', () => {
    const code = `note("c1").s("sine").lpq(1)`;
    expect(OPERATION_HANDLERS.adjust_lpq(code, -0.5)).toBe(`note("c1").s("sine").lpq(0)`);
  });
});
