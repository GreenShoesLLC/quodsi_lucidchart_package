import React from "react";
import { Loader2 } from "lucide-react";

export interface TableColumn<T = any> {
  key: string;
  label: string;
  format?: (value: any, row: T) => string | number;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

function DataTable<T = any>({
  data,
  columns,
  loading = false,
  error = null,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-600">Loading data...</span>
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

  // Data table
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, colIndex) => (
              <th
                key={column.key}
                className={`px-2 py-1 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-tight whitespace-nowrap ${
                  colIndex === 0
                    ? "sticky left-0 z-10 bg-gray-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                    : ""
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="group hover:bg-gray-50">
              {columns.map((column, colIndex) => {
                const value = (row as any)[column.key];
                const displayValue = column.format
                  ? column.format(value, row)
                  : value;

                return (
                  <td
                    key={column.key}
                    className={`px-2 py-1 text-[11px] text-gray-900 whitespace-nowrap ${
                      colIndex === 0
                        ? "sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)] font-medium"
                        : ""
                    }`}
                  >
                    {displayValue ?? "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
