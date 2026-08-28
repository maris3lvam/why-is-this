import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Property Engine', () => {
  it('why.path resolves nested paths safely without getter execution', () => {
    let called = false;
    const user = {
      profile: {
        address: {
          city: 'New York',
        },
        get secret() {
          called = true;
          return 'leak';
        },
      },
    };

    const res = why.path(user, 'profile.address.city');
    expect(res.exists).toBe(true);
    expect(res.value).toEqual({ kind: 'primitive', value: 'New York' });

    const getterRes = why.path(user, 'profile.secret');
    expect(getterRes.value.kind).toBe('accessor');
    expect(called).toBe(false);
  });

  it('why.has distinguishes { x: undefined } from {}', () => {
    expect(why.has({ x: undefined }, 'x')).toBe(true);
    expect(why.has({}, 'x')).toBe(false);
  });

  it('why.exists and why.missing', () => {
    const data = { a: { b: 1 } };
    expect(why.exists(data, 'a.b')).toBe(true);
    expect(why.exists(data, 'a.c')).toBe(false);
    expect(why.missing(data, 'a.c')).toContain('does not exist');
  });

  it('why.undefined and why.null predicates', () => {
    expect(why.undefined(undefined)).toBe(true);
    expect(why.undefined(null)).toBe(false);
    expect(why.null(null)).toBe(true);
    expect(why.null(undefined)).toBe(false);
  });
});
