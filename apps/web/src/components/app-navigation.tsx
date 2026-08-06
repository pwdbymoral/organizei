'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesCombined, Home, List, Plus } from 'lucide-react';
import { MoreMenu } from './more-menu';

const items = [
  { href: '/app', label: 'Início', Icon: Home },
  { href: '/app/movements', label: 'Movimentações', Icon: List },
  { href: '/app/projection', label: 'Planejamento', Icon: ChartNoAxesCombined },
];

export function AppNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="border-border bg-surface rounded-2xl border p-1 sm:flex sm:items-center sm:justify-between"
    >
      <div className="hidden items-center gap-1 sm:flex">
        {items.map(({ href, label, Icon }) => {
          const active = href === '/app' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-elevated hover:text-text'}`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
      <MoreMenu />
      <Link
        href="/add"
        aria-label="Adicionar movimentação"
        className="bg-primary fixed bottom-20 right-5 z-30 flex size-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] sm:hidden"
      >
        <Plus aria-hidden="true" className="size-6" />
      </Link>
      <div className="border-border bg-surface/95 fixed inset-x-2 bottom-2 z-20 grid grid-cols-4 gap-0.5 rounded-2xl border p-1 shadow-lg backdrop-blur sm:hidden">
        {items.map(({ href, label, Icon }) => {
          const active = href === '/app' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] ${active ? 'bg-primary text-white' : 'text-text-muted'}`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          );
        })}
        <MoreMenu />
      </div>
    </nav>
  );
}
