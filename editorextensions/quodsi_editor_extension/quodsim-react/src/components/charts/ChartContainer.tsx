import React from "react";
import { Loader2 } from "lucide-react";

interface ChartContainerProps {
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  data: any[];
  children: React.ReactNode;
  title?: string;
}

/**
 * Wrapper component for charts that handles loading, error, and empty states
 */
const ChartContainer: React.FC<ChartContainerProps> = ({
  loading = false,
  error = null,
  emptyMessage = "No data available",
  data,
  children,
  title,
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-600">Loading chart...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">
          <strong>Error:</strong> {error}
        </p>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  // Chart container with optional title
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      {title && (
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
      )}
      {children}
    </div>
  );
};

export default ChartContainer;
