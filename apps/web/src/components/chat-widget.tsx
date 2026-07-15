'use client';
import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Turn {
  role: 'you' | 'assistant';
  text: string;
}

export function ChatWidget(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setTurns((t) => [...t, { role: 'you', text: message }]);
    setInput('');
    setBusy(true);
    try {
      const { reply } = await api.post<{ reply: string }>('/chat', { message });
      setTurns((t) => [...t, { role: 'assistant', text: reply }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: 'Sorry, I could not answer that right now.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-colors hover:bg-primary-hover"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
      </button>
    );

  return (
    <div className="fixed bottom-6 right-6 flex h-96 w-80 flex-col overflow-hidden rounded-lg border border-hairline bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="text-sm font-semibold text-ink">Assistant</span>
        <button onClick={() => setOpen(false)} aria-label="Close assistant">
          <X className="h-4 w-4 text-ink-muted" aria-hidden />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {turns.length === 0 && (
          <p className="text-sm text-ink-muted">
            Ask about your classes, assignments, or grades.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === 'you' ? 'text-right' : 'text-left'}
          >
            <span
              className={
                t.role === 'you'
                  ? 'inline-block rounded-lg bg-primary px-3 py-1.5 text-sm text-white'
                  : 'inline-block rounded-lg bg-primary-subtle px-3 py-1.5 text-sm text-ink'
              }
            >
              {t.text}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-hairline p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={busy}>
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
