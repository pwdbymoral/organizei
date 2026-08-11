'use client';

import type { ReactNode } from 'react';
import { ListFilter } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';

export function ResponsiveFilters({ active, children }: { active: boolean; children: ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(active);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            <ListFilter aria-hidden="true" />
            Filtrar{active ? ' (ativo)' : ''}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtrar transações</DrawerTitle>
            <DrawerDescription>Encontre rapidamente o que você procura.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-card rounded-xl border">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="w-full justify-start px-4">
          <ListFilter aria-hidden="true" />
          Buscar ou filtrar{active ? ' (ativo)' : ''}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
