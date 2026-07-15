import type { Kysely } from 'kysely';
import type { Role } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { config } from '../config.js';
import { listClassesForTeacher } from './classes.js';
import { countPendingForTeacher } from './submissions.js';
import { listStudentAssignments, studentAverage } from './student.js';
import { listUsers } from './users.js';

export async function buildContext(
  db: Kysely<Database>,
  userId: string,
  role: Role
): Promise<string> {
  if (role === 'student') {
    const [assignments, avg] = await Promise.all([
      listStudentAssignments(db, userId),
      studentAverage(db, userId),
    ]);
    const lines = assignments.map(
      (a) =>
        `- "${a.title}" (${a.className}) due ${a.dueAt} — status ${a.state}` +
        (a.score !== null ? `, score ${a.score}` : '')
    );
    return `Role: student. Average grade: ${avg ?? 'none'}.\nAssignments:\n${lines.join('\n') || '(none)'}`;
  }
  if (role === 'teacher') {
    const [classes, pending] = await Promise.all([
      listClassesForTeacher(db, userId),
      countPendingForTeacher(db, userId),
    ]);
    const lines = classes.map(
      (c) => `- ${c.name}: ${c.studentCount} students`
    );
    return `Role: teacher. Submissions awaiting grading: ${pending}.\nClasses:\n${lines.join('\n') || '(none)'}`;
  }
  const users = await listUsers(db);
  const counts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});
  return `Role: admin. User counts: ${JSON.stringify(counts)}.`;
}

export async function chat(
  db: Kysely<Database>,
  userId: string,
  role: Role,
  message: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ reply: string }> {
  if (config.anthropic.apiKey === '')
    return { reply: 'The assistant is not configured on this deployment.' };

  const context = await buildContext(db, userId, role);
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 512,
      system: `You are the assistant for a school portal. Answer only from the context about the current user. If the answer is not in the context, say you don't have that information. Be concise and encouraging.\n\nContext:\n${context}`,
      messages: [{ role: 'user', content: message }],
    }),
  });
  if (!res.ok) throw new Error('assistant request failed');
  const data = (await res.json()) as { content: { text: string }[] };
  return { reply: data.content.map((c) => c.text).join('') };
}
