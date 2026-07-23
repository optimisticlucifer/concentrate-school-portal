'use client';
import { useCallback, useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Trash2 } from 'lucide-react';
import type { Role, UserDTO } from '@concentrate/shared';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';

interface Group {
  id: string;
  name: string;
  teachers: { id: string; name: string }[];
}

function UsersTab(): React.ReactElement {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [form, setForm] = useState({
    email: '',
    name: '',
    role: 'student' as Role,
    password: '',
  });

  const toast = useToast();

  const load = useCallback(() => {
    api.get<UserDTO[]>('/admin/users').then(setUsers);
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await api.post('/admin/users', form);
      toast(`Added ${form.name}`);
      setForm({ email: '', name: '', role: 'student', password: '' });
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not add user', 'error');
    }
  }
  async function toggleSuspend(u: UserDTO): Promise<void> {
    const next = !u.suspended;
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, suspended: next } : x))
    );
    try {
      await api.patch(`/admin/users/${u.id}/suspension`, { suspended: next });
      toast(next ? `Suspended ${u.name}` : `Reinstated ${u.name}`);
    } catch {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, suspended: u.suspended } : x))
      );
      toast('Action failed', 'error');
    }
  }
  async function remove(id: string): Promise<void> {
    const snapshot = users;
    const gone = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    try {
      await api.del(`/admin/users/${id}`);
      toast(`Removed ${gone?.name ?? 'user'}`);
    } catch {
      setUsers(snapshot);
      toast('Delete failed', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="card grid gap-2 px-4 py-3 sm:grid-cols-5">
        <Input
          placeholder="Name"
          aria-label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <select
          value={form.role}
          aria-label="Role"
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          className="h-9 rounded-md border border-hairline bg-surface px-3 text-sm"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <Input
          type="password"
          placeholder="Password (8+)"
          aria-label="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <Button type="submit">Add user</Button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink">{u.name}</p>
                  <p className="text-xs text-ink-muted">{u.email}</p>
                </td>
                <td className="px-4 py-2.5 capitalize text-ink-muted">{u.role}</td>
                <td className="px-4 py-2.5">
                  {u.suspended ? (
                    <span className="text-danger">Suspended</span>
                  ) : (
                    <span className="text-success">Active</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSuspend(u)}
                    >
                      {u.suspended ? 'Unsuspend' : 'Suspend'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${u.name}`}
                    onClick={() => remove(u.id)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupsTab(): React.ReactElement {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<UserDTO[]>([]);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const toast = useToast();

  const load = useCallback(() => {
    api.get<Group[]>('/admin/groups').then(setGroups);
    api
      .get<UserDTO[]>('/admin/users')
      .then((all) => setTeachers(all.filter((u) => u.role === 'teacher')));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/admin/groups', { name, teacherIds: picked });
      toast(`Created ${name}`);
      setName('');
      setPicked([]);
      load();
    } catch {
      toast('Could not create group', 'error');
    }
  }
  async function remove(id: string): Promise<void> {
    const snapshot = groups;
    const gone = groups.find((g) => g.id === id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    try {
      await api.del(`/admin/groups/${id}`);
      toast(`Deleted ${gone?.name ?? 'group'}`);
    } catch {
      setGroups(snapshot);
      toast('Delete failed', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="card space-y-3 px-4 py-3">
        <Input
          placeholder="Group name"
          aria-label="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {teachers.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-1.5 rounded-md border border-hairline px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={picked.includes(t.id)}
                onChange={(e) =>
                  setPicked((p) =>
                    e.target.checked
                      ? [...p, t.id]
                      : p.filter((x) => x !== t.id)
                  )
                }
              />
              {t.name}
            </label>
          ))}
          {teachers.length === 0 && (
            <p className="text-sm text-ink-muted">Create a teacher first.</p>
          )}
        </div>
        <Button type="submit" disabled={!name.trim()}>
          Create group
        </Button>
      </form>

      {groups.map((g) => (
        <div key={g.id} className="card flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium text-ink">{g.name}</p>
            <p className="text-xs text-ink-muted">
              {g.teachers.map((t) => t.name).join(', ') || 'No members'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${g.name}`}
            onClick={() => remove(g.id)}
          >
            <Trash2 className="h-4 w-4 text-danger" aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Administration</h1>
      <Tabs.Root defaultValue="users">
        <Tabs.List className="flex gap-1 border-b border-hairline">
          <Tabs.Trigger
            value="users"
            className="px-4 py-2 text-sm text-ink-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-ink"
          >
            People
          </Tabs.Trigger>
          <Tabs.Trigger
            value="groups"
            className="px-4 py-2 text-sm text-ink-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-ink"
          >
            Teacher groups
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="users" className="pt-5">
          <UsersTab />
        </Tabs.Content>
        <Tabs.Content value="groups" className="pt-5">
          <GroupsTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
