import { toast } from 'sonner';

export const showDemoMessage = (message = 'This action is disabled.') => {
  toast.info('Demo mode', {
    description: message,
  });
};
