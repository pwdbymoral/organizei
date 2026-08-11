'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesCombined, Home, List, MoreHorizontal, Plus } from 'lucide-react';

const items = [
  { href: '/app', label: 'Início', Icon: Home },
  { href: '/app/movements', label: 'Transações', Icon: List },
  { href: '/app/projection', label: 'Previsão', Icon: ChartNoAxesCombined },
];

const moreItem = { href: '/app/more', label: 'Configurações', Icon: MoreHorizontal };

export function AppNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="sm:border-border sm:bg-surface sm:flex sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:p-1"
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
      <Link
        href={moreItem.href}
        aria-current={pathname.startsWith(moreItem.href) ? 'page' : undefined}
        className={`hidden items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors sm:flex ${pathname.startsWith(moreItem.href) ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-elevated hover:text-text'}`}
      >
        <moreItem.Icon aria-hidden="true" className="size-4" />
        {moreItem.label}
      </Link>
      <Link
        href="/add"
        aria-label="Nova transação"
        className="bg-primary fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-30 flex size-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] sm:hidden"
      >
        <Plus aria-hidden="true" className="size-6" />
      </Link>
      <div className="border-border bg-surface/95 fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 grid grid-cols-4 gap-0.5 rounded-2xl border p-1 shadow-lg backdrop-blur sm:hidden">
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
        <Link
          href={moreItem.href}
          aria-current={pathname.startsWith(moreItem.href) ? 'page' : undefined}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] ${pathname.startsWith(moreItem.href) ? 'bg-primary text-white' : 'text-text-muted'}`}
        >
          <moreItem.Icon aria-hidden="true" className="size-4" />
          {moreItem.label}
        </Link>
      </div>
    </nav>
  );
}
