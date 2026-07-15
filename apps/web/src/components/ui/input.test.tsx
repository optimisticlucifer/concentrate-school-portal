import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input, Textarea } from './input';

describe('Input / Textarea', () => {
  it('accepts typed input', async () => {
    render(<Input aria-label="field" />);
    await userEvent.type(screen.getByLabelText('field'), 'hello');
    expect(screen.getByLabelText('field')).toHaveValue('hello');
  });

  it('renders a textarea', async () => {
    render(<Textarea aria-label="notes" />);
    await userEvent.type(screen.getByLabelText('notes'), 'note');
    expect(screen.getByLabelText('notes')).toHaveValue('note');
  });
});
