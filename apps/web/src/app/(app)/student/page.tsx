'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StudentAssignment, StudentDashboard } from '@/lib/types';
import { StatusPill } from '@/components/status-pill';
import { ThoughtOfDay } from '@/components/thought-of-day';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function AssignmentRow({
  a,
  onSubmitted,
}: {
  a: StudentAssignment;
  onSubmitted: () => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(a.content ?? '');
  const [busy, setBusy] = useState(false);
  const canSubmit = a.state !== 'graded';

  async function submit(): Promise<void> {
    setBusy(true);
    try {
      await api.post(`/student/assignments/${a.id}/submit`, { content });
      setOpen(false);
      onSubmitted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink">{a.title}</p>
          <p className="text-sm text-ink-muted">
            {a.className} · due {formatDue(a.dueAt)}
          </p>
        </div>
        <StatusPill state={a.state} />
      </div>

      {a.score !== null && (
        <div className="mt-3 rounded-md bg-primary-subtle px-3 py-2 text-sm">
          <span className="font-medium text-success">Score: {a.score}</span>
          {a.feedback && <p className="mt-1 text-ink-muted">{a.feedback}</p>}
        </div>
      )}

      {canSubmit && (
        <div className="mt-3">
          {open ? (
            <div className="space-y-2">
              <Textarea
                rows={3}
                value={content}
                aria-label={`Submission for ${a.title}`}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your submission…"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={submit} disabled={busy || !content.trim()}>
                  {busy ? 'Submitting…' : 'Submit'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              {a.content ? 'Edit submission' : 'Submit work'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentPage(): React.ReactElement {
  const [data, setData] = useState<StudentDashboard | null>(null);

  const load = useCallback(() => {
    api.get<StudentDashboard>('/student/dashboard').then(setData);
  }, []);
  useEffect(load, [load]);

  if (!data) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Your work</h1>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Average</p>
          <p className="text-2xl font-semibold text-primary">
            {data.average ?? '—'}
          </p>
        </div>
      </div>

      <ThoughtOfDay role="student" />

      {data.assignments.length === 0 ? (
        <div className="card px-5 py-10 text-center">
          <p className="font-medium text-ink">Nothing due right now</p>
          <p className="mt-1 text-sm text-ink-muted">
            New assignments from your teachers will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.assignments.map((a) => (
            <AssignmentRow key={a.id} a={a} onSubmitted={load} />
          ))}
        </div>
      )}
    </div>
  );
}
