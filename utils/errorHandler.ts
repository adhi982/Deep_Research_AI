import { Platform } from 'react-native';
import { toast } from 'sonner-native';
import * as Haptics from 'expo-haptics';

// Define error severities
export enum ErrorSeverity {
  LOW = 'low',      // Minor issues that don't affect core functionality
  MEDIUM = 'medium', // Issues that affect some features but app can continue
  HIGH = 'high',    // Critical issues that need immediate attention
  FATAL = 'fatal'   // Issues that crash or completely break the app
}

// Define error categories for better organization
export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

// Error interface for consistent error object structure
export interface AppError {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: Date;
}

class ErrorHandler {
  /**
   * Captures and processes an error
   */
  captureError(
    error: Error | string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): AppError {
    // Create a standardized error object
    const appError: AppError = {
      message: typeof error === 'string' ? error : error.message,
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
      severity,
      category,
      originalError: error instanceof Error ? error : new Error(error as string),
      context: {
        ...context,
        platform: Platform.OS,
        version: Platform.Version,
      },
      timestamp: new Date(),
    };

    // Log the error
    this.logError(appError);

    // For high severity errors, provide haptic feedback on supported platforms
    if ((severity === ErrorSeverity.HIGH || severity === ErrorSeverity.FATAL) && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        .catch(() => {
          // Silently fail if haptics aren't available
        });
    }

    // Report the error to monitoring service
    // this.reportToMonitoringService(appError);

    return appError;
  }

  /**
   * Log error to console with consistent formatting
   */
  private logError(error: AppError): void {
    const prefix = `[${error.category.toUpperCase()}][${error.severity.toUpperCase()}]`;
    
    console.error(
      `${prefix} ${error.message}`,
      {
        code: error.code,
        context: error.context,
        timestamp: error.timestamp.toISOString(),
      },
      error.originalError
    );
  }

  /**
   * Show user-friendly error toast based on severity
   */
  showErrorToast(error: AppError | string, duration: number = 4000): void {
    const message = typeof error === 'string' 
      ? error 
      : error.message || 'An unexpected error occurred';
    
    // Change toast appearance based on severity
    if (typeof error !== 'string' && error.severity === ErrorSeverity.HIGH) {
      toast.error(message, {
        duration: 5000,
      });
    } else if (typeof error !== 'string' && error.severity === ErrorSeverity.FATAL) {
      toast.error(message, {
        duration: 6000,
      });
    } else {
      toast.error(message, {
        duration,
      });
    }
  }

  /**
   * Handle network errors specifically
   */
  handleNetworkError(error: any, context?: Record<string, any>): AppError {
    let message = 'Network request failed';
    let severity = ErrorSeverity.MEDIUM;
    
    // Extract more specific network error information
    if (error.response) {
      // Server responded with an error status code
      const status = error.response.status;
      
      if (status === 401 || status === 403) {
        message = 'Authentication error. Please try logging in again.';
        severity = ErrorSeverity.HIGH;
      } else if (status === 404) {
        message = 'The requested resource was not found.';
      } else if (status >= 500) {
        message = 'Server error. Please try again later.';
        severity = ErrorSeverity.HIGH;
      }
    } else if (error.request) {
      // Request was made but no response received
      message = 'No response from server. Please check your connection.';
    }
    
    return this.captureError(
      new Error(message),
      ErrorCategory.NETWORK,
      severity,
      {
        ...context,
        statusCode: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
      }
    );
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error: any, context?: Record<string, any>): AppError {
    let message = 'Database operation failed';
    const severity = ErrorSeverity.MEDIUM;
    
    // Extract more specific Supabase error information
    if (error && error.message) {
      message = error.message;
    }
    
    return this.captureError(
      new Error(message),
      ErrorCategory.DATABASE,
      severity,
      context
    );
  }
}

// Export a singleton instance
export const errorHandler = new ErrorHandler();

// Export a utility function for global error handling
export function handleGlobalError(error: Error, componentStack: string): void {
  errorHandler.captureError(
    error,
    ErrorCategory.UNKNOWN,
    ErrorSeverity.FATAL,
    { componentStack }
  );
} 