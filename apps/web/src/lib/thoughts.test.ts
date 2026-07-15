import { describe, expect, it } from 'vitest';
import { thoughtForToday } from './thoughts';

describe('thoughtForToday', () => {
  it('is deterministic for the same date', () => {
    const date = new Date('2026-03-15T12:00:00Z');
    expect(thoughtForToday('student', date)).toBe(thoughtForToday('student', date));
    expect(thoughtForToday('teacher', date)).toBe(thoughtForToday('teacher', date));
  });

  it('teacher and student pools differ', () => {
    const date = new Date('2026-03-15T12:00:00Z');
    expect(thoughtForToday('teacher', date)).not.toBe(thoughtForToday('student', date));
  });

  it('admin uses the student pool', () => {
    const date = new Date('2026-03-15T12:00:00Z');
    expect(thoughtForToday('admin', date)).toBe(thoughtForToday('student', date));
  });
});
