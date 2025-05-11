import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'running';

interface StatusIndicatorProps {
  type: StatusType;
  count?: number;
  text?: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Reusable status indicator component that displays a status icon and optional text/count
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  type,
  count,
  text,
  className = '',
  showIcon = true
}) => {
  // Determine style based on type
  const getStatusStyle = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border border-green-200',
          icon: <CheckCircle className="h-3.5 w-3.5" />
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          border: 'border border-yellow-200',
          icon: <AlertTriangle className="h-3.5 w-3.5" />
        };
      case 'error':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border border-red-200',
          icon: <XCircle className="h-3.5 w-3.5" />
        };
      case 'running':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border border-blue-200',
          icon: (
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
          )
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border border-blue-200',
          icon: <AlertCircle className="h-3.5 w-3.5" />
        };
    }
  };

  const style = getStatusStyle();
  const displayText = text || (count !== undefined ? `${count}` : '');

  return (
    <div
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {showIcon && <span className="mr-1.5">{style.icon}</span>}
      {displayText && <span>{displayText}</span>}
    </div>
  );
};
