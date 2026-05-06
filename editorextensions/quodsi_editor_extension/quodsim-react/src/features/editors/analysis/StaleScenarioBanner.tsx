import React from "react";
import { AlertTriangle } from "lucide-react";

interface StaleScenarioBannerProps {
  hiddenCount: number;
}

/**
 * Banner shown above the analysis dashboard when one or more scenarios
 * have been excluded due to incompatible output_schema_version. The
 * scenarios themselves render as StaleScenarioRow rows below the banner.
 */
export const StaleScenarioBanner: React.FC<StaleScenarioBannerProps> = ({
  hiddenCount,
}) => {
  if (hiddenCount === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      <span>
        {hiddenCount} {hiddenCount === 1 ? "scenario" : "scenarios"} hidden — re-run required
      </span>
    </div>
  );
};
