import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Primitive Engine', () => {
  it('why.invalidDate detects invalid Date instances', () => {
    expect(why.invalidDate(new Date('invalid'))).toBe(true);
    expect(why.invalidDate(new Date('2024-01-01'))).toBe(false);
  });

  it('why.whitespace checks for whitespace-only strings', () => {
    expect(why.whitespace('   \t\n  ')).toBe(true);
    expect(why.whitespace('hello')).toBe(false);
  });

  it('why.invisible detects zero-width and invisible Unicode characters', () => {
    expect(why.invisible('hello \u200B world')).toBe(true);
    expect(why.invisible('hello world')).toBe(false);
  });

  it('why.precision calculates floating point decimal digits', () => {
    expect(why.precision(3.14159)).toBe(5);
    expect(why.precision(42)).toBe(0);
  });
});
