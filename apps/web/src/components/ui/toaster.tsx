'use client';
import * as Toast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'success' | 'error';
interface Item {
  id: number;
  message: string;
  variant: Variant;
}
type ToastFn = (message: string, variant?: Variant) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

let seq = 0;

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [items, setItems] = useState<Item[]>([]);

  const toast = useCallback<ToastFn>((message, variant = 'success') => {
    seq += 1;
    const id = seq;
    setItems((prev) => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <Toast.Provider swipeDirection="right" duration={2500}>
        {children}
        {items.map((t) => (
          <Toast.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((i) => i.id !== t.id));
            }}
            className={cn(
              'flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
              t.variant === 'error'
                ? 'border-danger/20 bg-danger-subtle text-danger'
                : 'border-success/20 bg-primary-subtle text-success'
            )}
          >
            <Toast.Description>{t.message}</Toast.Description>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
