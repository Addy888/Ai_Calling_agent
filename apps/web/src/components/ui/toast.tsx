'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900 dark:text-green-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900 dark:text-red-200',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

function ToastComponent({ toast, onRemove }: ToastProps) {
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg',
        styles[toast.type]
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="ml-3 w-0 flex-1">
            {toast.title && (
              <p className="text-sm font-medium">{toast.title}</p>
            )}
            <p className={cn('text-sm', toast.title ? 'mt-1' : '')}>
              {toast.message}
            </p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              className="inline-flex rounded-md bg-transparent text-current hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
              onClick={() => onRemove(toast.id)}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

function emitChange() {
  listeners.forEach((listener) => listener(toasts));
}

function addToast(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substr(2, 9);
  toasts = [...toasts, { ...toast, id }];
  emitChange();
  return id;
}

function removeToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emitChange();
}

export const toast = {
  success: (message: string, options?: Partial<Toast>) =>
    addToast({ type: 'success', message, ...options }),
  error: (message: string, options?: Partial<Toast>) =>
    addToast({ type: 'error', message, ...options }),
  warning: (message: string, options?: Partial<Toast>) =>
    addToast({ type: 'warning', message, ...options }),
  info: (message: string, options?: Partial<Toast>) =>
    addToast({ type: 'info', message, ...options }),
};

export function useToast() {
  return {
    toast: (options: { title?: string; description: string; variant?: 'default' | 'destructive' }) => {
      if (options.variant === 'destructive') {
        return addToast({ type: 'error', title: options.title, message: options.description });
      }
      return addToast({ type: 'success', title: options.title, message: options.description });
    },
  };
}

export function Toaster() {
  const [toastList, setToastList] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToastList);
    return () => {
      const index = listeners.indexOf(setToastList);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {toastList.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </div>
  );
}