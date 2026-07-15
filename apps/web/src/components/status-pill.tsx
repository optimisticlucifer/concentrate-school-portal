import {
  AlertCircle,
  Award,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import type { AssignmentState } from '@concentrate/shared';
import { cn } from '@/lib/utils';

const MAP: Record<
  AssignmentState,
  { label: string; className: string; Icon: typeof Circle }
> = {
  not_started: {
    label: 'Not started',
    className: 'bg-canvas text-ink-muted border-hairline',
    Icon: Circle,
  },
  due_soon: {
    label: 'Due soon',
    className: 'bg-warning-subtle text-warning border-warning/20',
    Icon: Clock,
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-accent-subtle text-accent border-accent/20',
    Icon: CheckCircle2,
  },
  graded: {
    label: 'Graded',
    className: 'bg-primary-subtle text-success border-success/20',
    Icon: Award,
  },
  late: {
    label: 'Late',
    className: 'bg-danger-subtle text-danger border-danger/20',
    Icon: AlertCircle,
  },
  missing: {
    label: 'Missing',
    className: 'bg-danger-subtle text-danger border-danger/20',
    Icon: AlertCircle,
  },
};

export function StatusPill({
  state,
}: {
  state: AssignmentState;
}): React.ReactElement {
  const { label, className, Icon } = MAP[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
