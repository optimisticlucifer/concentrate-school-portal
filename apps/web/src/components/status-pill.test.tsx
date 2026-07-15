import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './status-pill';

describe('StatusPill', () => {
  it('renders a label for each state', () => {
    render(<StatusPill state="graded" />);
    expect(screen.getByText('Graded')).toBeInTheDocument();
  });

  it('shows the missing state', () => {
    render(<StatusPill state="missing" />);
    expect(screen.getByText('Missing')).toBeInTheDocument();
  });
});
