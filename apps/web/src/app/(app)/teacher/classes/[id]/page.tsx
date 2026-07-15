'use client';
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Assignment, Person, Submission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

function StudentsTab({ classId }: { classId: string }): React.ReactElement {
  const [enrolled, setEnrolled] = useState<Person[]>([]);
  const [all, setAll] = useState<Person[]>([]);
  const [pick, setPick] = useState('');

  const load = useCallback(() => {
    api.get<Person[]>(`/teacher/classes/${classId}/students`).then(setEnrolled);
    api.get<Person[]>('/teacher/students').then(setAll);
  }, [classId]);
  useEffect(load, [load]);

  async function add(): Promise<void> {
    if (!pick) return;
    await api.post(`/teacher/classes/${classId}/students`, { studentId: pick });
    setPick('');
    load();
  }
  async function remove(id: string): Promise<void> {
    await api.del(`/teacher/classes/${classId}/students/${id}`);
    load();
  }

  const enrolledIds = new Set(enrolled.map((s) => s.id));
  const available = all.filter((s) => !enrolledIds.has(s.id));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={pick}
          aria-label="Choose a student to add"
          onChange={(e) => setPick(e.target.value)}
          className="h-9 flex-1 rounded-md border border-hairline bg-surface px-3 text-sm"
        >
          <option value="">Add a student…</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.email})
            </option>
          ))}
        </select>
        <Button onClick={add} disabled={!pick}>
          Add
        </Button>
      </div>

      {enrolled.length === 0 ? (
        <p className="text-sm text-ink-muted">No students enrolled yet.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {enrolled.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-ink">{s.name}</p>
                <p className="text-xs text-ink-muted">{s.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${s.name}`}
                onClick={() => remove(s.id)}
              >
                <Trash2 className="h-4 w-4 text-danger" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GradePanel({
  classId,
  assignment,
}: {
  classId: string;
  assignment: Assignment;
}): React.ReactElement {
  const [subs, setSubs] = useState<Submission[]>([]);

  const load = useCallback(() => {
    api
      .get<Submission[]>(
        `/teacher/classes/${classId}/assignments/${assignment.id}/submissions`
      )
      .then(setSubs);
  }, [classId, assignment.id]);
  useEffect(load, [load]);

  if (subs.length === 0)
    return <p className="py-2 text-sm text-ink-muted">No submissions yet.</p>;

  return (
    <div className="space-y-2 pt-2">
      {subs.map((s) => (
        <GradeRow key={s.id} sub={s} onGraded={load} />
      ))}
    </div>
  );
}

function GradeRow({
  sub,
  onGraded,
}: {
  sub: Submission;
  onGraded: () => void;
}): React.ReactElement {
  const [score, setScore] = useState(sub.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function grade(): Promise<void> {
    setBusy(true);
    try {
      await api.post(`/teacher/submissions/${sub.id}/grade`, {
        score: Number(score),
        feedback,
      });
      setSaved(true);
      onGraded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-hairline p-3">
      <p className="text-sm font-medium text-ink">{sub.studentName}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
        {sub.content}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <div className="w-20">
          <label className="text-xs text-ink-muted">Score</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={score}
            aria-label={`Score for ${sub.studentName}`}
            onChange={(e) => {
              setScore(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <Textarea
          rows={1}
          value={feedback}
          aria-label={`Feedback for ${sub.studentName}`}
          placeholder="Feedback"
          onChange={(e) => {
            setFeedback(e.target.value);
            setSaved(false);
          }}
        />
        <Button size="sm" onClick={grade} disabled={busy || score === ''}>
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function AssignmentsTab({ classId }: { classId: string }): React.ReactElement {
  const [items, setItems] = useState<Assignment[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<Assignment[]>(`/teacher/classes/${classId}/assignments`)
      .then(setItems);
  }, [classId]);
  useEffect(load, [load]);

  async function create(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!title.trim() || !due) return;
    await api.post(`/teacher/classes/${classId}/assignments`, {
      title,
      description,
      dueAt: new Date(due).toISOString(),
    });
    setTitle('');
    setDescription('');
    setDue('');
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="card space-y-2 px-4 py-3">
        <Input
          placeholder="Assignment title"
          value={title}
          aria-label="Assignment title"
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          rows={2}
          placeholder="Description (optional)"
          value={description}
          aria-label="Assignment description"
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={due}
            aria-label="Due date"
            onChange={(e) => setDue(e.target.value)}
            className="h-9 rounded-md border border-hairline bg-surface px-3 text-sm"
          />
          <Button type="submit" disabled={!title.trim() || !due}>
            Publish
          </Button>
        </div>
      </form>

      {items.map((a) => (
        <div key={a.id} className="card px-4 py-3">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setOpenId(openId === a.id ? null : a.id)}
          >
            <div>
              <p className="font-medium text-ink">{a.title}</p>
              <p className="text-xs text-ink-muted">
                due {new Date(a.dueAt).toLocaleString()}
              </p>
            </div>
            <span className="text-sm text-primary">
              {openId === a.id ? 'Hide' : 'Grade'}
            </span>
          </button>
          {openId === a.id && <GradePanel classId={classId} assignment={a} />}
        </div>
      ))}
    </div>
  );
}

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/teacher"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to classes
      </Link>

      <Tabs.Root defaultValue="students">
        <Tabs.List className="flex gap-1 border-b border-hairline">
          <Tabs.Trigger
            value="students"
            className="px-4 py-2 text-sm text-ink-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-ink"
          >
            Students
          </Tabs.Trigger>
          <Tabs.Trigger
            value="assignments"
            className="px-4 py-2 text-sm text-ink-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-ink"
          >
            Assignments
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="students" className="pt-5">
          <StudentsTab classId={id} />
        </Tabs.Content>
        <Tabs.Content value="assignments" className="pt-5">
          <AssignmentsTab classId={id} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
