import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "./chartColors";

interface SparklineGridProps {
  data: any[];
  groupByKey: string;
  xKey: string;
  yKey?: string;           // single series (existing, backwards compat)
  yKeys?: string[];        // multi-series for comparison
  colors?: string[];       // colors for multi-series
  onItemClick?: (objectId: string) => void;
  sparklineHeight?: number;
  maxItems?: number;
}

/**
 * Groups data by a specified key
 */
function groupByObject(data: any[], key: string): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  data.forEach((row) => {
    const id = row[key];
    if (id === undefined || id === null) return;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(row);
  });
  return groups;
}

/**
 * Small sparkline tooltip
 */
const SparklineTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    if (payload.length === 1) {
      return (
        <div className="bg-white border border-gray-200 rounded px-2 py-1 shadow-sm text-xs">
          <span className="font-medium">{payload[0].value?.toFixed(2)}</span>
        </div>
      );
    }
    return (
      <div className="bg-white border border-gray-200 rounded px-2 py-1 shadow-sm text-xs">
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.value?.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Grid of mini sparkline charts, one per activity/object.
 * Enables quick visual scanning of trends across many items.
 */
const SparklineGrid: React.FC<SparklineGridProps> = ({
  data,
  groupByKey,
  xKey,
  yKey,
  yKeys,
  colors,
  onItemClick,
  sparklineHeight = 50,
  maxItems = 20,
}) => {
  // Derive effective keys and colors: support both single yKey and multi yKeys
  const effectiveYKeys = yKeys || (yKey ? [yKey] : ["value"]);
  const effectiveColors = colors || CHART_COLORS;

  // Group data by object ID
  const groupedData = useMemo(() => {
    return groupByObject(data, groupByKey);
  }, [data, groupByKey]);

  // Get sorted list of object IDs
  const objectIds = useMemo(() => {
    return Array.from(groupedData.keys()).sort();
  }, [groupedData]);

  // Determine if we need to show "more" indicator
  const displayedIds = objectIds.slice(0, maxItems);
  const remainingCount = objectIds.length - maxItems;

  if (objectIds.length === 0) {
    return (
      <div className="text-xs text-gray-500 text-center py-4">
        No data available
      </div>
    );
  }

  return (
    <div className="sparkline-grid flex flex-col gap-1">
      {displayedIds.map((objectId) => {
        const itemData = groupedData.get(objectId) || [];
        // Sort by x key for proper line rendering
        const sortedData = [...itemData].sort((a, b) => {
          const aVal = a[xKey];
          const bVal = b[xKey];
          if (typeof aVal === "number" && typeof bVal === "number") {
            return aVal - bVal;
          }
          return String(aVal).localeCompare(String(bVal));
        });

        return (
          <div
            key={objectId}
            className="sparkline-row flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onItemClick?.(objectId)}
            title={`Click to expand: ${objectId}`}
          >
            <div
              className="sparkline-label text-xs text-gray-700 truncate"
              style={{ width: "120px", minWidth: "120px" }}
              title={objectId}
            >
              {objectId}
            </div>
            <div className="sparkline-chart flex-1" style={{ height: sparklineHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedData}>
                  {effectiveYKeys.map((key, idx) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={effectiveColors[idx % effectiveColors.length]}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                  <Tooltip content={<SparklineTooltip />} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div className="text-xs text-gray-500 text-center py-2 border-t border-gray-100">
          ... and {remainingCount} more items
        </div>
      )}

      <div className="text-xs text-gray-400 text-center pt-1">
        Click any row to expand chart
      </div>
    </div>
  );
};

export default SparklineGrid;
