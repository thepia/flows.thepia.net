import { describe, expect, it } from 'vitest';

describe('Basic Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have proper environment setup', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('should support modern JavaScript features', () => {
    const testArray = [1, 2, 3];
    const doubled = testArray.map((x) => x * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });
});
