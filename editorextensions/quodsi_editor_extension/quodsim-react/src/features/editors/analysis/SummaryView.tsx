import React from "react";
import { CrossRepDataType } from "./crossRepTableConfigs";
import { formatNumber, formatPercent } from "./analysisFormatters";
import { SummaryData } from "../../../hooks/useCrossRepData";

interface SummaryViewProps {
  summaryData: SummaryData;
  summaryLoading: boolean;
  scenarioId: string;
  onDrillDown: (dataType: CrossRepDataType, filterValue?: string) => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({
  summaryData,
  summaryLoading,
  scenarioId,
  onDrillDown,
}) => {
  const { scenario, activities, resources } = summaryData;

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-xs text-gray-500">Loading summary...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-gray-50 rounded p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-gray-600">Scenario Name</span>
          <span className="text-gray-800 truncate ml-2">
            {scenario?.scenario_name || scenarioId}
          </span>
        </div>
      </div>

      {/* System Performance */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">
            System Performance
          </h4>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total Throughput</span>
            <span className="font-medium">
              {formatNumber(scenario?.total_throughput_mean, 0)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total Cost</span>
            <span className="font-medium">
              {formatNumber(scenario?.total_cost_mean, 2)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Avg Cycle Time</span>
            <span className="font-medium">
              {formatNumber(scenario?.avg_cycle_time_mean, 2)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Avg Time in System</span>
            <span className="font-medium">
              {formatNumber(scenario?.avg_time_in_system_mean, 2)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Avg # in System</span>
            <span className="font-medium">
              {formatNumber(scenario?.avg_entities_in_system_mean, 2)}
            </span>
          </div>
        </div>
      </div>

      {/* Activities Summary */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">
            Activities Summary
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Name</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-600">Util</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-600">Cycle</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-600">Cost</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-center text-gray-500">
                    No activities
                  </td>
                </tr>
              ) : (
                activities.map((activity, idx) => (
                  <tr
                    key={activity.activity_id || idx}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onDrillDown("activity", activity.activity_name)}
                    title="Click to view details"
                  >
                    <td
                      className="px-2 py-1.5 truncate max-w-[100px] text-blue-600 hover:text-blue-800"
                      title={activity.activity_name}
                    >
                      {activity.activity_name}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatPercent(activity.capacity_utilization_mean)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatNumber(activity.cycle_time_mean, 1)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatNumber(activity.total_cost_mean, 2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resources Summary */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">
            Resource Summary
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">Name</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-600">Util</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-600">Cost</th>
              </tr>
            </thead>
            <tbody>
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-center text-gray-500">
                    No resources
                  </td>
                </tr>
              ) : (
                resources.map((resource, idx) => (
                  <tr
                    key={resource.resource_id || idx}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onDrillDown("resource", resource.resource_name)}
                    title="Click to view details"
                  >
                    <td
                      className="px-2 py-1.5 truncate max-w-[120px] text-blue-600 hover:text-blue-800"
                      title={resource.resource_name}
                    >
                      {resource.resource_name}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatPercent(resource.capacity_utilization_mean)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatNumber(resource.total_cost_mean, 2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;
