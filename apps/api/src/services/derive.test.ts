import { describe, expect, it } from 'vitest';
import { deriveState } from './derive.js';

const base = {
  submitted: false,
  graded: false,
  dueAt: new Date('2026-01-10T00:00:00Z'),
  submittedAt: null,
  now: new Date('2026-01-05T00:00:00Z'),
};

describe('deriveState', () => {
  it('is graded when graded, regardless of dates', () => {
    expect(deriveState({ ...base, submitted: true, graded: true })).toBe(
      'graded'
    );
  });

  it('is submitted when handed in on time', () => {
    expect(
      deriveState({
        ...base,
        submitted: true,
        submittedAt: new Date('2026-01-09T00:00:00Z'),
      })
    ).toBe('submitted');
  });

  it('is late when submitted after the due date', () => {
    expect(
      deriveState({
        ...base,
        submitted: true,
        submittedAt: new Date('2026-01-11T00:00:00Z'),
      })
    ).toBe('late');
  });

  it('is missing when past due with no submission', () => {
    expect(
      deriveState({ ...base, now: new Date('2026-01-11T00:00:00Z') })
    ).toBe('missing');
  });

  it('is due_soon within three days of the deadline', () => {
    expect(
      deriveState({ ...base, now: new Date('2026-01-08T00:00:00Z') })
    ).toBe('due_soon');
  });

  it('is not_started when far from the deadline', () => {
    expect(deriveState(base)).toBe('not_started');
  });
});
