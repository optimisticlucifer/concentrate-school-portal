'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { TeacherClass, TeacherDashboard } from '@/lib/types';
import { ThoughtOfDay } from '@/components/thought-of-day';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TeacherPage(): React.ReactElement {
  const [data, setData] = useState<TeacherDashboard | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(() => {
    api.get<TeacherDashboard>('/teacher/dashboard').then(setData);
  }, []);
  useEffect(load, [load]);

  async function createClass(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post<TeacherClass>('/teacher/classes', { name });
    setName('');
    load();
  }

  if (!data) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">My classes</h1>
        {data.pending > 0 && (
          <span className="rounded-md bg-warning-subtle px-3 py-1 text-sm font-medium text-warning">
            {data.pending} to grade
          </span>
        )}
      </div>

      <ThoughtOfDay role="teacher" />

      <form onSubmit={createClass} className="flex gap-2">
        <Input
          placeholder="New class name"
          value={name}
          aria-label="New class name"
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={!name.trim()}>
          Create class
        </Button>
      </form>

      {data.classes.length === 0 ? (
        <div className="card px-5 py-10 text-center">
          <p className="font-medium text-ink">No classes yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Create your first class above to add students and assignments.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.classes.map((c) => (
            <Link
              key={c.id}
              href={`/teacher/classes/${c.id}`}
              className="card flex items-center justify-between px-5 py-4 transition-colors hover:bg-primary-subtle"
            >
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {c.studentCount} students
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
