'use client';

import type { ReactNode } from 'react';
import { Ellipsis } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { Button } from './ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './ui/popover';

export function MovementActionSurface({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const trigger = (
    <Button type="button" variant="outline" size="sm" aria-label={`Ações para ${title}`}>
      <Ellipsis aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Ações</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 overflow-y-auto px-4 pb-6">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80" aria-label={`Ações para ${title}`}>
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
