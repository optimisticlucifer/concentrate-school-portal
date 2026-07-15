import type { AssignmentState } from '@concentrate/shared';

const DUE_SOON_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function deriveState(input: {
  submitted: boolean;
  graded: boolean;
  dueAt: Date;
  submittedAt: Date | null;
  now: Date;
}): AssignmentState {
  const { submitted, graded, dueAt, submittedAt, now } = input;
  if (graded) return 'graded';
  if (submitted)
    return submittedAt !== null && submittedAt.getTime() > dueAt.getTime()
      ? 'late'
      : 'submitted';
  if (now.getTime() > dueAt.getTime()) return 'missing';
  if (dueAt.getTime() - now.getTime() <= DUE_SOON_MS) return 'due_soon';
  return 'not_started';
}
