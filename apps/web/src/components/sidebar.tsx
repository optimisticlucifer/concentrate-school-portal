'use client';
import { GraduationCap, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserDTO } from '@concentrate/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const ROLE_LABEL: Record<UserDTO['role'], string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
};

export function Sidebar({ user }: { user: UserDTO }): React.ReactElement {
  const router = useRouter();

  async function logout(): Promise<void> {
    await api.post('/auth/logout');
    router.push('/login');
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-surface px-4 py-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <GraduationCap className="h-4 w-4" aria-hidden />
        </span>
        <span className="font-semibold text-ink">Concentrate</span>
      </div>

      <div className="mt-8 flex-1">
        <p className="px-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
          {ROLE_LABEL[user.role]}
        </p>
      </div>

      <div className="border-t border-hairline pt-4">
        <p className="truncate px-2 text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate px-2 text-xs text-ink-muted">{user.email}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
