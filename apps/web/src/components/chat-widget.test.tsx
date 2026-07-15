import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post } }));

import { ChatWidget } from './chat-widget';

describe('ChatWidget', () => {
  beforeEach(() => post.mockReset());

  it('opens from the bubble and sends a message', async () => {
    post.mockResolvedValue({ reply: 'You have 2 assignments due.' });
    render(<ChatWidget />);

    await userEvent.click(screen.getByLabelText('Open assistant'));
    await userEvent.type(screen.getByLabelText('Message'), 'what is due?');
    await userEvent.click(screen.getByLabelText('Send message'));

    expect(post).toHaveBeenCalledWith('/chat', { message: 'what is due?' });
    expect(
      await screen.findByText('You have 2 assignments due.')
    ).toBeInTheDocument();
  });

  it('shows a fallback when the request fails', async () => {
    post.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    render(<ChatWidget />);
    await userEvent.click(screen.getByLabelText('Open assistant'));
    await userEvent.type(screen.getByLabelText('Message'), 'hi');
    await userEvent.click(screen.getByLabelText('Send message'));
    expect(
      await screen.findByText(/could not answer/i)
    ).toBeInTheDocument();
  });
});
