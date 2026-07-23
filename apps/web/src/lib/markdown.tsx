import type { ReactNode } from 'react';

// Minimal markdown for the assistant bubble — no external dependency.
// Handles: **bold**, `code`, bullet lists, headings (rendered as bold lines),
// blank-line paragraphs, and horizontal rules.

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(
        <code key={key++} className="rounded bg-canvas px-1 text-[0.85em]">
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }): React.ReactElement {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flush = (): void => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key++} className="list-disc space-y-0.5 pl-4">
        {bullets.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1] ?? '');
      continue;
    }
    flush();
    const trimmed = line.trim();
    if (trimmed === '' || /^-{3,}$/.test(trimmed)) continue;
    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={key++} className="font-semibold">
          {renderInline(heading[1] ?? '')}
        </p>
      );
      continue;
    }
    blocks.push(<p key={key++}>{renderInline(trimmed)}</p>);
  }
  flush();

  return <div className="space-y-1.5">{blocks}</div>;
}
