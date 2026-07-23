import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders bold and inline code', () => {
    const { container } = render(<Markdown text="Your **average** is `82`." />);
    expect(container.querySelector('strong')?.textContent).toBe('average');
    expect(container.querySelector('code')?.textContent).toBe('82');
  });

  it('groups bullet lines into a list', () => {
    render(<Markdown text={'Due soon:\n- Algebra\n- History'} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Algebra');
  });

  it('renders headings as text and drops horizontal rules', () => {
    const { container } = render(<Markdown text={'# Summary\n---\nAll good.'} />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(container.textContent).not.toContain('---');
  });
});
