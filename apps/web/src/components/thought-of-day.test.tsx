import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThoughtOfDay } from './thought-of-day';

describe('ThoughtOfDay', () => {
  it('renders the label and a non-empty thought', () => {
    render(<ThoughtOfDay role="student" />);
    expect(screen.getByText('Thought for today')).toBeInTheDocument();

    const paragraphs = screen.getByText('Thought for today').parentElement!
      .querySelectorAll('p');
    const thought = paragraphs[1];
    expect(thought.textContent?.trim().length).toBeGreaterThan(0);
  });
});
