'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface FormDialogProps {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FormDialog({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
}: FormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface FormSubmitButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
}

export function FormSubmitButton({
  loading = false,
  children,
  type = 'submit',
  variant = 'default',
  disabled = false,
}: FormSubmitButtonProps) {
  return (
    <Button type={type} variant={variant} disabled={disabled || loading}>
      {loading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  );
}