// src/components/SimulationStatusMonitor.tsx
import React from "react";
import { PageStatus } from "@quodsi/shared";
import { getSimulationState, getStatusClass } from "src/utils/simulationState";

interface Props {
  status: PageStatus | null;
  isPollingSimState: boolean;
  error: string | null;
}

export const SimulationStatusMonitor: React.FC<Props> = ({
  status,
  isPollingSimState,
  error,
}) => {
  if (error) {
    return <div className="text-red-500 p-2 rounded bg-red-50">{error}</div>;
  }

  const { statusText } = getSimulationState(status, isPollingSimState);
  console.log("[SimulationStatusMonitor] Render state:", {
    status,
    isPollingSimState: isPollingSimState,
    statusText,
  });
  return (
    <div className="p-2 border rounded bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">Simulation Status:</span>
        <span className={getStatusClass(statusText)}>{statusText}</span>
      </div>

      {status && (
        <div className="space-y-1 text-sm">
          {/* <div>Container: {status.hasContainer ? "✓" : "✗"}</div> */}
          {/* <div>Scenarios: {status.scenarios.length}</div> */}
          <div>Updated: {new Date(status.statusDateTime).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
};
