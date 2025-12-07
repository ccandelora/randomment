/**
 * Error Handling Utilities
 * 
 * Provides utilities for consistent error handling across the app.
 * Helps prevent unhandled promise rejections and reduces console noise in production.
 */

/**
 * Wraps an async function to ensure errors are caught and logged appropriately
 * Prevents unhandled promise rejections
 * 
 * @param fn - Async function to wrap
 * @param errorMessage - Optional error message to show if function fails
 * @returns Wrapped function that never throws unhandled errors
 */
export function safeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage?: string
): T {
  return ((...args: Parameters<T>) => {
    return fn(...args).catch((error) => {
      if (__DEV__) {
        console.error(errorMessage || 'Async operation failed:', error);
      }
      // Re-throw so caller can handle it
      throw error;
    });
  }) as T;
}

/**
 * Safely logs errors only in development mode
 * 
 * @param message - Error message
 * @param error - Error object
 */
export function logError(message: string, error?: unknown): void {
  if (__DEV__) {
    if (error instanceof Error) {
      console.error(message, error.message, error.stack);
    } else {
      console.error(message, error);
    }
  }
}

/**
 * Extracts a user-friendly error message from an error object
 * 
 * @param error - Error object
 * @param defaultMessage - Default message if error cannot be parsed
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  if (error instanceof Error) {
    // Provide user-friendly messages for common errors
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission denied. Please check your access rights.';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'Resource not found.';
    }
    if (message.includes('server') || message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    
    return error.message || defaultMessage;
  }
  
  return defaultMessage;
}

