// src/components/SimulationStatusMonitor.tsx
import React from "react";
import { PageStatus } from "@quodsi/shared";

interface Props {
  status: PageStatus | null;
  isChecking: boolean;
  error: string | null;
}

export const SimulationStatusMonitor: React.FC<Props> = ({
  status,
  isChecking,
  error,
}) => {
  if (error) {
    return <div className="text-red-500 p-2 rounded bg-red-50">{error}</div>;
  }

  return (
    <div className="p-2 border rounded bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">Simulation Status:</span>
        {isChecking ? (
          <span className="text-blue-500">Checking...</span>
        ) : (
          <span className="text-green-500">Up to date</span>
        )}
      </div>

      {status && (
        <div className="space-y-1 text-sm">
          <div>Container: {status.hasContainer ? "✓" : "✗"}</div>
          <div>Scenarios: {status.scenarios.length}</div>
          <div>Updated: {new Date(status.statusDateTime).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
};
