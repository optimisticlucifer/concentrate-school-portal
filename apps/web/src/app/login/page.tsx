'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import type { UserDTO } from '@concentrate/shared';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already signed in? Skip the form and go to the dashboard.
  useEffect(() => {
    api
      .get<UserDTO>('/auth/me')
      .then((u) => router.replace(`/${u.role}`))
      .catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await api.post<UserDTO>('/auth/login', { email, password });
      router.push(`/${user.role}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold text-ink">Concentrate</span>
        </div>

        <h1 className="text-xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Sign in to your school portal.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            aria-label="Email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            aria-label="Password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-hairline" />
          or
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <Button variant="outline" className="w-full" asChild>
          <a href="/api/auth/google">Continue with Google</a>
        </Button>

        <div className="mt-8 rounded-lg bg-primary-subtle px-4 py-3 text-xs text-ink-muted">
          <p className="font-medium text-ink">Demo accounts (password123)</p>
          <p className="mt-1">admin@concentrate.test · teacher@concentrate.test · student1@concentrate.test</p>
        </div>
      </div>
    </main>
  );
}
