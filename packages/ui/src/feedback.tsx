import type { ReactNode } from 'react';
import { cn } from './index';

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'positive' | 'warning' | 'neutral' | 'danger';
}) {
  return (
    <span
      className={cn(
        'text-xxs rounded-full px-2 py-0.5 font-medium',
        tone === 'positive' && 'bg-positive/20 text-positive',
        tone === 'warning' && 'bg-warning/20 text-warning',
        tone === 'danger' && 'bg-danger/20 text-danger',
        tone === 'neutral' && 'bg-surface-elevated text-text-muted',
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border-border text-text-muted bg-surface rounded border border-dashed py-8 text-center text-sm">
      {children}
    </div>
  );
}
