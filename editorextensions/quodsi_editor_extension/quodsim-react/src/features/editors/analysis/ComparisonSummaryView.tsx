import React from "react";
import { CrossRepDataType } from "./crossRepTableConfigs";
import { formatNumber, formatPercent } from "./analysisFormatters";
import {
  SelectedScenario,
  mergeTableData,
} from "../../../utils/scenarioDataMerge";
import { isOutputSchemaCompatible } from "@quodsi/shared";
import { StaleScenarioBanner } from "./StaleScenarioBanner";
import { StaleScenarioRow } from "./StaleScenarioRow";

interface ComparisonSummaryViewProps {
  selectedScenarios: SelectedScenario[];
  getDataForType: (type: CrossRepDataType) => Map<string, any[]>;
  comparisonLoading: boolean;
  onDrillDown: (dataType: CrossRepDataType, filterValue?: string) => void;
  onRerunScenario?: (scenarioId: string) => void;
  /** True while the run list (which carries outputSchemaVersion) is still
   *  loading. Until then, version is unknown — not yet incompatible. */
  scenarioMetaLoading?: boolean;
}

const ComparisonSummaryView: React.FC<ComparisonSummaryViewProps> = ({
  selectedScenarios,
  getDataForType,
  comparisonLoading,
  onDrillDown,
  onRerunScenario,
  scenarioMetaLoading,
}) => {
  // outputSchemaVersion arrives asynchronously with the run list. Until it
  // loads it is undefined, which isOutputSchemaCompatible treats as
  // incompatible — partitioning now would flash a false stale banner.
  if (scenarioMetaLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-xs text-gray-500">Loading comparison data...</div>
      </div>
    );
  }

  // Compat partition: split scenarios into compatible and incompatible
  const compatible = selectedScenarios.filter((s) =>
    isOutputSchemaCompatible(s.outputSchemaVersion)
  );
  const incompatible = selectedScenarios.filter(
    (s) => !isOutputSchemaCompatible(s.outputSchemaVersion)
  );

  const scenarioDataMap = getDataForType("scenario");
  const activityDataMap = getDataForType("activity");
  const resourceDataMap = getDataForType("resource");

  if (comparisonLoading && scenarioDataMap.size === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-xs text-gray-500">Loading comparison data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stale scenario banner + per-scenario rows (shown above tables) */}
      <StaleScenarioBanner hiddenCount={incompatible.length} />
      {incompatible.map((s) => (
        <StaleScenarioRow
          key={s.id}
          scenarioName={s.name}
          scenarioId={s.id}
          onRerun={onRerunScenario}
        />
      ))}

      {/* System Performance Comparison */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">System Performance</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Metric</th>
                {compatible.map((s) => (
                  <th key={s.id} className="text-right px-2 py-1.5 font-medium text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                      <span className="truncate max-w-[100px] inline-block align-bottom" title={s.name}>{s.name}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: "total_throughput_mean", label: "Total Throughput", decimals: 0 },
                { key: "total_cost_mean", label: "Total Cost", decimals: 2 },
                { key: "avg_cycle_time_mean", label: "Avg Cycle Time", decimals: 2 },
                { key: "avg_time_in_system_mean", label: "Avg Time in System", decimals: 2 },
                { key: "avg_entities_in_system_mean", label: "Avg # in System", decimals: 2 },
              ].map(({ key, label, decimals }) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="px-2 py-1.5 text-gray-600">{label}</td>
                  {compatible.map((s) => {
                    const scenarioData = scenarioDataMap.get(s.id)?.[0];
                    return (
                      <td key={s.id} className="px-2 py-1.5 text-right font-medium">
                        {formatNumber(scenarioData?.[key], decimals)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activities Comparison */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Activities Summary</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Activity</th>
                {[
                  { key: "capacity_utilization_mean", label: "Util", format: formatPercent },
                  { key: "cycle_time_mean", label: "Cycle", format: (v: number | null | undefined) => formatNumber(v, 1) },
                ].map((metric, mIdx) =>
                  compatible.map((s) => (
                    <th
                      key={`${metric.key}_${s.id}`}
                      className={`text-right px-2 py-1.5 font-medium text-gray-600${mIdx > 0 && s === compatible[0] ? " border-l-2 border-gray-300" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        <span className="truncate max-w-[100px] inline-block align-bottom" title={s.name}>
                          {metric.label} ({s.name})
                        </span>
                      </span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const activityMetrics = [
                  { key: "capacity_utilization_mean", format: formatPercent },
                  { key: "cycle_time_mean", format: (v: number | null | undefined) => formatNumber(v, 1) },
                ];
                const merged = mergeTableData(compatible, activityDataMap, "activity_name");
                if (merged.length === 0) {
                  return (
                    <tr><td colSpan={1 + compatible.length * 2} className="px-2 py-3 text-center text-gray-500">No activities</td></tr>
                  );
                }
                return merged.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onDrillDown("activity", row.activity_name)}
                    title="Click to view details"
                  >
                    <td className="px-2 py-1.5 text-blue-600 truncate max-w-[100px]">{row.activity_name}</td>
                    {activityMetrics.map((metric, mIdx) =>
                      compatible.map((s) => (
                        <td
                          key={`${metric.key}_${s.id}`}
                          className={`px-2 py-1.5 text-right${mIdx > 0 && s === compatible[0] ? " border-l-2 border-gray-300" : ""}`}
                        >
                          {metric.format(row[`${metric.key}_${s.name}`])}
                        </td>
                      ))
                    )}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resources Comparison */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Resource Summary</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Resource</th>
                {[
                  { key: "capacity_utilization_mean", label: "Util", format: formatPercent },
                  { key: "total_cost_mean", label: "Cost", format: (v: number | null | undefined) => formatNumber(v, 2) },
                ].map((metric, mIdx) =>
                  compatible.map((s) => (
                    <th
                      key={`${metric.key}_${s.id}`}
                      className={`text-right px-2 py-1.5 font-medium text-gray-600${mIdx > 0 && s === compatible[0] ? " border-l-2 border-gray-300" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        <span className="truncate max-w-[100px] inline-block align-bottom" title={s.name}>
                          {metric.label} ({s.name})
                        </span>
                      </span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const resourceMetrics = [
                  { key: "capacity_utilization_mean", format: formatPercent },
                  { key: "total_cost_mean", format: (v: number | null | undefined) => formatNumber(v, 2) },
                ];
                const merged = mergeTableData(compatible, resourceDataMap, "resource_name");
                if (merged.length === 0) {
                  return (
                    <tr><td colSpan={1 + compatible.length * 2} className="px-2 py-3 text-center text-gray-500">No resources</td></tr>
                  );
                }
                return merged.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onDrillDown("resource", row.resource_name)}
                    title="Click to view details"
                  >
                    <td className="px-2 py-1.5 text-blue-600 truncate max-w-[120px]">{row.resource_name}</td>
                    {resourceMetrics.map((metric, mIdx) =>
                      compatible.map((s) => (
                        <td
                          key={`${metric.key}_${s.id}`}
                          className={`px-2 py-1.5 text-right${mIdx > 0 && s === compatible[0] ? " border-l-2 border-gray-300" : ""}`}
                        >
                          {metric.format(row[`${metric.key}_${s.name}`])}
                        </td>
                      ))
                    )}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparisonSummaryView;
