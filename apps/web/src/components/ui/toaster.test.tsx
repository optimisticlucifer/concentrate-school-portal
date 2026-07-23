import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './toaster';

function Trigger(): React.ReactElement {
  const toast = useToast();
  return <button onClick={() => toast('Saved!')}>fire</button>;
}

describe('ToastProvider', () => {
  it('shows a toast when useToast is called', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await userEvent.click(screen.getByText('fire'));
    expect(await screen.findByText('Saved!')).toBeInTheDocument();
  });
});
