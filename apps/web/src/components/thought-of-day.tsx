import { thoughtForToday } from '@/lib/thoughts';
import type { Role } from '@concentrate/shared';

export function ThoughtOfDay({ role }: { role: Role }): React.ReactElement {
  return (
    <div className="rounded-lg bg-primary-subtle px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-success">
        Thought for today
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink">
        {thoughtForToday(role)}
      </p>
    </div>
  );
}
