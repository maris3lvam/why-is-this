import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Complete Domain API Integration Coverage', () => {
  it('Serialization APIs (json, parse, stringify, serialize, serializable, circularJSON, clone)', () => {
    const obj: Record<string, unknown> = { num: 42n, name: 'test' };
    obj['self'] = obj; // circular

    expect(why.serializable(obj)).toBe(false); // circular not natively serializable
    expect(why.serializable({ a: 1 })).toBe(true);

    const jsonStr = why.json(obj);
    expect(jsonStr).toContain('[Circular]');
    expect(jsonStr).toContain('42n');

    expect(why.stringify(obj)).toBe(jsonStr);
    expect(why.serialize(obj)).toBe(jsonStr);
    expect(why.circularJSON(obj)).toBe(jsonStr);

    const parsed = why.parse<{ a: number }>('{"a": 1}');
    expect(parsed?.a).toBe(1);

    const cloned = why.clone({ x: 10 });
    expect(cloned).toEqual({ x: 10 });
  });

  it('Primitive Diagnostics APIs (invalidDate, whitespace, invisible, precision)', () => {
    expect(why.invalidDate(new Date('invalid'))).toBe(true);
    expect(why.invalidDate(new Date())).toBe(false);

    expect(why.whitespace('   \t\n ')).toBe(true);
    expect(why.whitespace('hello')).toBe(false);

    expect(why.invisible('hello \u200B world')).toBe(true);
    expect(why.invisible('hello world')).toBe(false);

    expect(why.precision(3.14159)).toBe(5);
    expect(why.precision(42)).toBe(0);
  });

  it('Process & Environment APIs (process, env)', () => {
    const proc = why.process();
    expect(proc.pid).toBeGreaterThan(0);
    expect(proc.platform).toBe(process.platform);

    const env = why.env();
    expect(typeof env).toBe('object');
  });

  it('Async & Promise APIs (delay, promise, timeout)', async () => {
    const t0 = performance.now();
    await why.delay(10);
    expect(performance.now() - t0).toBeGreaterThanOrEqual(8);

    const p = Promise.resolve(42);
    const pState = await why.promise(p);
    expect(pState.state).toBe('fulfilled');

    const res = await why.timeout(Promise.resolve('ok'), 100);
    expect(res).toBe('ok');
  });

  it('Reporting API (report)', () => {
    const report = why.report({ a: 1, b: 2 });
    expect(report.summary).toBeDefined();
    expect(typeof report.toMarkdown()).toBe('string');
    expect(typeof report.toJSON()).toBe('string');
    expect(report.toSARIF().version).toBe('2.1.0');
  });

  it('Session & Config APIs (session, configure, config)', () => {
    const initialConfig = why.config();
    expect(initialConfig.limits).toBeDefined();

    why.configure({ maxSessionEvents: 500 });
    expect(why.config().maxSessionEvents).toBe(500);

    const events = why.session();
    expect(Array.isArray(events)).toBe(true);
  });
});
