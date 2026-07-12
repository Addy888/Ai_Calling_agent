// Simple compatibility layer for existing toast usage
import { toast as toastImpl } from '@/components/ui/toast';

export function useToast() {
  return {
    toast: (options: { title?: string; description?: string; variant?: 'destructive' }) => {
      if (options.variant === 'destructive') {
        toastImpl.error(options.description || options.title || 'An error occurred');
      } else {
        toastImpl.success(options.description || options.title || 'Success');
      }
    }
  };
}