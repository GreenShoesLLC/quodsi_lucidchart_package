// src/components/auth/AuthError.tsx
import React from 'react';
import { AuthError as AuthErrorType, authErrorHandler, AuthErrorCode } from '../../services/AuthErrorHandler';

interface AuthErrorProps {
  error: string | AuthErrorType;
  onDismiss?: () => void;
  onRetry?: () => void;
  onPasswordReset?: () => void;
}

export const AuthError: React.FC<AuthErrorProps> = ({
  error,
  onDismiss,
  onRetry,
  onPasswordReset,
}) => {
  // Convert string error to AuthErrorType if needed
  const authError: AuthErrorType = typeof error === 'string'
    ? authErrorHandler.createGenericError(error)
    : error;

  // Get the error message to display
  const errorMessage = authError.message;

  // Determine if this is a password-related error
  const isPasswordError = 
    authError.code === AuthErrorCode.TOKEN_INVALID || 
    errorMessage.toLowerCase().includes('password') || 
    errorMessage.toLowerCase().includes('credentials');

  // Determine recovery action
  const recoveryAction = authErrorHandler.getRecoveryAction(authError);
  
  // Show retry button based on recovery action
  const showRetry = onRetry && 
    (recoveryAction === 'retry' || recoveryAction === 'refresh' || recoveryAction === 'sign_in');
  
  // Show password reset based on error type
  const showPasswordReset = onPasswordReset && isPasswordError;

  return (
    <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {/* Error icon */}
          <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">Authentication Error</h3>
          <div className="mt-1 text-sm">
            <p>{errorMessage}</p>
          </div>
          <div className="mt-3 flex space-x-2">
            {onDismiss && (
              <button
                type="button"
                className="py-1 px-3 text-xs font-medium rounded-md bg-red-100 text-red-800 hover:bg-red-200"
                onClick={onDismiss}
              >
                Dismiss
              </button>
            )}
            
            {showRetry && (
              <button
                type="button"
                className="py-1 px-3 text-xs font-medium rounded-md bg-red-100 text-red-800 hover:bg-red-200"
                onClick={onRetry}
              >
                {recoveryAction === 'sign_in' ? 'Sign In' : 'Try Again'}
              </button>
            )}
            
            {showPasswordReset && (
              <button
                type="button"
                className="py-1 px-3 text-xs font-medium rounded-md bg-red-100 text-red-800 hover:bg-red-200"
                onClick={onPasswordReset}
              >
                Reset Password
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};