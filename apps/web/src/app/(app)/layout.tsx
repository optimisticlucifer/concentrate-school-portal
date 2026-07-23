'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { UserDTO } from '@concentrate/shared';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';
import { ChatWidget } from '@/components/chat-widget';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserDTO | null>(null);

  useEffect(() => {
    api
      .get<UserDTO>('/auth/me')
      .then((u) => {
        // Role-gate the section: a student cannot sit on /admin or /teacher.
        const section = pathname.split('/')[1];
        if (section && section !== u.role) {
          router.replace(`/${u.role}`);
          return;
        }
        setUser(u);
      })
      .catch(() => router.push('/login'));
  }, [router, pathname]);

  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      <ChatWidget />
    </div>
  );
}
