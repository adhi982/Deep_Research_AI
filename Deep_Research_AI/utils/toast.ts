import { toast as sonnerToast } from 'sonner-native';

export const toast = {
  success: (message: string, options?: any) => {
    sonnerToast.success(message, options);
  },
  error: (message: string, options?: any) => {
    sonnerToast.error(message, options);
  },
  info: (message: string, options?: any) => {
    sonnerToast.info(message, options);
  },
  warning: (message: string, options?: any) => {
    sonnerToast.warning(message, options);
  }
}; 