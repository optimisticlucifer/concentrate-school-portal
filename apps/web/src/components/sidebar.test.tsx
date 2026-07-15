import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push, post } = vi.hoisted(() => ({
  push: vi.fn(),
  post: vi.fn().mockResolvedValue({}),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({ api: { post } }));

import { Sidebar } from './sidebar';

const user = {
  id: '1',
  email: 'grace@test.local',
  name: 'Grace Hopper',
  role: 'teacher' as const,
  suspended: false,
};

describe('Sidebar', () => {
  beforeEach(() => {
    push.mockClear();
    post.mockClear();
  });

  it('shows the user and role', () => {
    render(<Sidebar user={user} />);
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
  });

  it('logs out and redirects', async () => {
    render(<Sidebar user={user} />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(post).toHaveBeenCalledWith('/auth/logout');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
  });
});
