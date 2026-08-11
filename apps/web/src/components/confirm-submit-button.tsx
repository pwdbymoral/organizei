'use client';

import { useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export function ConfirmSubmitButton({
  children,
  message,
  className,
  title = 'Cancelar transação?',
  confirmLabel = 'Cancelar transação',
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  title?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  return (
    <>
      <button
        type="submit"
        className={className}
        onClick={(event) => {
          event.preventDefault();
          formRef.current = event.currentTarget.form;
          setOpen(true);
        }}
      >
        {children}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
