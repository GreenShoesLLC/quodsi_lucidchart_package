import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  BarChart3,
  Table2,
  LayoutGrid,
  Download,
  Check,
  List,
  X,
} from "lucide-react";
import { SimulationRunDownloadInfo } from "@quodsi/shared";
import { useSimulationRunSender } from "../../../messaging/senders/simulationRunSender";
import DataTable from "../../../components/DataTable";
import {
  ChartContainer,
  TimeseriesChart,
  ComparisonBarChart,
  SparklineGrid,
  ExpandedTimeseriesChart,
} from "../../../components/charts";
import {
  CrossRepDataType,
  getColumnsForDataType,
} from "./crossRepTableConfigs";
import ScenarioPicker from "../../../components/ScenarioPicker";
import { useComparisonData } from "../../../hooks/useComparisonData";
import {
  mergeBarChartData,
  mergeTimeseriesData,
  mergeTableColumns,
  mergeTableData,
  pivotTimeseriesByObject,
  buildShortNameFormatter,
} from "../../../utils/scenarioDataMerge";

interface SimulationRunAnalysisDashboardProps {
  scenarioId: string;
  documentId: string;
  onBackToList?: () => void;
  downloadInfo?: SimulationRunDownloadInfo;
}

import { useCrossRepData } from "../../../hooks/useCrossRepData";
import SummaryView from "./SummaryView";
import ComparisonSummaryView from "./ComparisonSummaryView";
import {
  formatNumber,
  formatPercent,
  getPercentFormatter,
  metricOptions,
} from "./analysisFormatters";

const SimulationRunAnalysisDashboard: React.FC<SimulationRunAnalysisDashboardProps> = ({
  scenarioId,
  documentId,
  onBackToList,
  downloadInfo,
}) => {
  // View type: summary (compact) or detailed (existing tables/charts)
  const [viewType, setViewType] = useState<"summary" | "detailed">("summary");

  // Detailed view state (owned here because comparison fetch effect depends on dataType)
  const [dataType, setDataType] = useState<CrossRepDataType>("activity");
  const [selectedActivity, setSelectedActivity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "chart" | "both">("both");
  const [zipCopied, setZipCopied] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] =
    useState<string>("capacity_utilization_mean");

  // Selected objects for timeseries multi-select overlay
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  const toggleObjectSelection = useCallback((objectId: string) => {
    setSelectedObjects(prev => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedObjects(new Set());
  }, []);

  // Hooks
  const { getCrossRepData } = useSimulationRunSender();

  const {
    data,
    loading,
    error,
    summaryData,
    summaryLoading,
    fetchSummaryData,
    fetchDetailedData,
  } = useCrossRepData({
    documentId,
    scenarioId,
    viewType,
    dataType,
    getCrossRepData,
  });

  const {
    selectedScenarios,
    availableScenarios,
    addScenario,
    removeScenario,
    getDataForType,
    isLoading: comparisonLoading,
    fetchDataType,
    availableScenariosLoading,
  } = useComparisonData(documentId, scenarioId);

  const isComparing = selectedScenarios.length > 1;

  // Handle ZIP download link copy
  const handleCopyZipLink = () => {
    if (!downloadInfo?.zipUrl) return;

    try {
      const textarea = document.createElement("textarea");
      textarea.value = downloadInfo.zipUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (successful) {
        console.log("[SimulationRunAnalysisDashboard] ZIP link copied to clipboard");
        setZipCopied(true);
        setTimeout(() => setZipCopied(false), 2000);
      } else {
        console.error("[SimulationRunAnalysisDashboard] execCommand copy failed");
      }
    } catch (error) {
      console.error(
        "[SimulationRunAnalysisDashboard] Failed to copy ZIP link:",
        error
      );
    }
  };

  // Handle drill-down from Summary to Detailed view
  const handleDrillDown = (type: CrossRepDataType, filterValue?: string) => {
    setDataType(type);
    if (filterValue) {
      setSelectedActivity(filterValue);
    }
    setViewType("detailed");
  };

  // Fetch data based on view type
  useEffect(() => {
    if (viewType === "summary") {
      fetchSummaryData();
    } else {
      fetchDetailedData();
    }
  }, [viewType, fetchSummaryData, fetchDetailedData]);

  // Fetch comparison data when scenarios or data type change
  useEffect(() => {
    if (isComparing) {
      if (viewType === "summary") {
        fetchDataType("scenario");
        fetchDataType("activity");
        fetchDataType("resource");
      } else {
        fetchDataType(dataType);
      }
    }
  }, [isComparing, viewType, dataType, selectedScenarios.map(s => s.id).join(","), fetchDataType]);

  // Get columns for current data type (detailed view)
  const columns = getColumnsForDataType(dataType);

  // Check if data type supports filtering
  const isFilterableType =
    dataType === "activity" ||
    dataType === "entity" ||
    dataType === "resource" ||
    dataType === "activity-entity" ||
    dataType === "activity-contents-timeseries" ||
    dataType === "activity-inbound-queue-timeseries" ||
    dataType === "activity-outbound-queue-timeseries" ||
    dataType === "state-values-timeseries" ||
    dataType === "entity-throughput-timeseries";

  // Compute the filter key for the current data type
  const filterKey = React.useMemo(() => {
    if (dataType === "activity") return "activity_name";
    if (dataType === "entity") return "entity_name";
    if (dataType === "resource") return "resource_name";
    if (dataType === "activity-entity") return "activity_name";
    return "object_id"; // timeseries types
  }, [dataType]);

  // Filter a comparison dataMap by the selected activity/entity/resource
  const filterDataMap = React.useCallback(
    (dataMap: Map<string, any[]>): Map<string, any[]> => {
      if (selectedActivity === "all") return dataMap;
      const filtered = new Map<string, any[]>();
      dataMap.forEach((rows, scenarioId) => {
        filtered.set(scenarioId, rows.filter((row: any) => row[filterKey] === selectedActivity));
      });
      return filtered;
    },
    [selectedActivity, filterKey]
  );

  // Get unique items for filtering based on data type
  const uniqueFilterItems = React.useMemo(() => {
    if (!isFilterableType) return [];

    if (isComparing) {
      // Derive filter items from all scenarios' data
      const dataMap = getDataForType(dataType);
      const allItems = new Set<string>();
      dataMap.forEach((rows) => {
        for (const row of rows) {
          if (row[filterKey]) allItems.add(row[filterKey]);
        }
      });
      return Array.from(allItems).sort();
    }

    if (data.length === 0) return [];
    const items = Array.from(new Set(data.map((item: any) => item[filterKey])))
      .filter(Boolean)
      .sort();
    return items as string[];
  }, [data, dataType, isFilterableType, filterKey, isComparing, getDataForType]);

  // Filter data by selected item
  const filteredData = React.useMemo(() => {
    if (!isFilterableType || selectedActivity === "all") {
      return data;
    }
    return data.filter((item: any) => item[filterKey] === selectedActivity);
  }, [data, selectedActivity, isFilterableType, filterKey]);

  // Short name formatter for timeseries object IDs (e.g., "Model.Model.Arrivals" → "Arrivals")
  const shortNameFormatter = React.useMemo(() => {
    const objectIds = Array.from(new Set(data.map((item: any) => item.object_id).filter(Boolean)));
    return buildShortNameFormatter(objectIds as string[]);
  }, [data]);

  // Comparison table data (merged across scenarios)
  const comparisonTableData = React.useMemo(() => {
    if (!isComparing) return null;

    const rawDataMap = getDataForType(dataType);
    const dataMap = isFilterableType ? filterDataMap(rawDataMap) : rawDataMap;
    const baseColumns = getColumnsForDataType(dataType);

    const nameKey =
      dataType === "activity" ? "activity_name"
        : dataType === "entity" ? "entity_name"
        : dataType === "resource" ? "resource_name"
        : dataType === "activity-entity" ? "activity_name"
        : dataType === "state-summary" ? "state_name"
        : dataType === "scenario" ? "scenario_name"
        : "object_id";

    return {
      columns: mergeTableColumns(selectedScenarios, baseColumns, nameKey),
      data: mergeTableData(selectedScenarios, dataMap, nameKey),
    };
  }, [isComparing, dataType, selectedScenarios, getDataForType, isFilterableType, filterDataMap]);

  // Reset selected activity, metric, and expanded activity when data type changes
  useEffect(() => {
    setSelectedActivity("all");
    setSelectedObjects(new Set());
    // Set default metric for the new data type
    const options = metricOptions[dataType];
    if (options && options.length > 0) {
      setSelectedMetric(options[0].value);
    }
  }, [dataType]);

  // Render chart based on data type (detailed view)
  const renderChart = () => {
    const isTimeseriesType =
      dataType === "activity-contents-timeseries" ||
      dataType === "activity-inbound-queue-timeseries" ||
      dataType === "activity-outbound-queue-timeseries" ||
      dataType === "state-values-timeseries" ||
      dataType === "entity-throughput-timeseries";

    // Timeseries chart - sparkline grid with multi-select overlay
    if (isTimeseriesType) {
      // Build overlay chart when 1+ items are selected
      let overlayChart: React.ReactNode = null;

      if (selectedObjects.size > 0) {
        const selectedIds = Array.from(selectedObjects);
        const pivoted = pivotTimeseriesByObject(
          filteredData, selectedIds, "period_start_clock", "mean", "object_id"
        );
        overlayChart = (
          <div className="border border-gray-200 rounded bg-white p-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-semibold text-gray-700">
                {selectedIds.length === 1 ? shortNameFormatter(selectedIds[0]) : `Comparing ${selectedIds.length} items`}
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
            <TimeseriesChart
              data={pivoted.data}
              xKey="period_start_clock"
              yKeys={pivoted.yKeys}
              colors={pivoted.colors}
              height={200}
              nameFormatter={shortNameFormatter}
            />
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {overlayChart}
          <ChartContainer
            data={filteredData}
            loading={loading}
            error={error}
            emptyMessage={`No ${dataType} data available for this run`}
          >
            <SparklineGrid
              data={filteredData}
              groupByKey="object_id"
              xKey="period_start_clock"
              yKey="mean"
              selectedItems={selectedObjects}
              onItemSelect={toggleObjectSelection}
              labelFormatter={shortNameFormatter}
              sparklineHeight={50}
            />
          </ChartContainer>
        </div>
      );
    }

    // Bar chart for summary types with selectable metric
    if (metricOptions[dataType]) {
      const nameKey =
        dataType === "activity"
          ? "activity_name"
          : dataType === "entity"
          ? "entity_name"
          : dataType === "resource"
          ? "resource_name"
          : dataType === "activity-entity"
          ? "activity_name"
          : dataType === "state-summary"
          ? "state_name"
          : "scenario_name";

      return (
        <ChartContainer
          data={filteredData}
          loading={loading}
          error={error}
          emptyMessage={`No ${dataType} data available for this run`}
        >
          <ComparisonBarChart
            data={filteredData}
            xKey={nameKey}
            yKeys={[selectedMetric]}
            height={300}
            layout="vertical"
            valueFormatter={getPercentFormatter(selectedMetric)}
          />
        </ChartContainer>
      );
    }

    return null;
  };

  // Render comparison chart (multi-scenario overlay)
  const renderComparisonChart = () => {
    const rawDataMap = getDataForType(dataType);
    const dataMap = isFilterableType ? filterDataMap(rawDataMap) : rawDataMap;

    const isTimeseriesType =
      dataType === "activity-contents-timeseries" ||
      dataType === "activity-inbound-queue-timeseries" ||
      dataType === "activity-outbound-queue-timeseries" ||
      dataType === "state-values-timeseries" ||
      dataType === "entity-throughput-timeseries";

    if (isTimeseriesType) {
      const merged = mergeTimeseriesData(selectedScenarios, dataMap, "object_id", "period_start_clock", "mean");

      // Build short name formatter from comparison data object IDs
      const comparisonObjectIds = Array.from(new Set(merged.data.map((d: any) => d.object_id).filter(Boolean))) as string[];
      const comparisonNameFormatter = buildShortNameFormatter(comparisonObjectIds);

      // Build overlay chart when items are selected
      let overlayChart: React.ReactNode = null;

      if (selectedObjects.size > 0) {
        const selectedIds = Array.from(selectedObjects);
        // Pivot: for each time point, create columns like "ShortName (ScenarioName)"
        const overlayYKeys: string[] = [];
        const overlayColors: string[] = [];
        for (let oi = 0; oi < selectedIds.length; oi++) {
          const shortName = comparisonNameFormatter(selectedIds[oi]);
          for (let si = 0; si < selectedScenarios.length; si++) {
            const label = `${shortName} (${selectedScenarios[si].name})`;
            overlayYKeys.push(label);
            overlayColors.push(selectedScenarios[si].color);
          }
        }

        const filteredMerged = merged.data.filter((d: any) => selectedObjects.has(d.object_id));
        const timeMap = new Map<number | string, Record<string, any>>();
        for (const row of filteredMerged) {
          const xVal = row["period_start_clock"];
          if (!timeMap.has(xVal)) {
            const newRow: Record<string, any> = { period_start_clock: xVal };
            for (const k of overlayYKeys) newRow[k] = null;
            timeMap.set(xVal, newRow);
          }
          const target = timeMap.get(xVal)!;
          const shortName = comparisonNameFormatter(row.object_id);
          for (const s of selectedScenarios) {
            const srcKey = `mean_${s.name}`;
            const destKey = `${shortName} (${s.name})`;
            target[destKey] = row[srcKey];
          }
        }
        const overlayData = Array.from(timeMap.values()).sort((a, b) =>
          (a.period_start_clock as number) - (b.period_start_clock as number)
        );

        const headerLabel = selectedIds.length === 1
          ? comparisonNameFormatter(selectedIds[0])
          : `Comparing ${selectedIds.length} items`;

        overlayChart = (
          <div className="border border-gray-200 rounded bg-white p-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-semibold text-gray-700">
                {headerLabel} across {selectedScenarios.length} scenarios
              </span>
              <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                Clear
              </button>
            </div>
            <TimeseriesChart
              data={overlayData}
              xKey="period_start_clock"
              yKeys={overlayYKeys}
              colors={overlayColors}
              height={200}
            />
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {overlayChart}
          <ChartContainer data={merged.data} loading={comparisonLoading} error={null} emptyMessage={`No ${dataType} data available`}>
            <SparklineGrid
              data={merged.data}
              groupByKey="object_id"
              xKey="period_start_clock"
              yKeys={merged.yKeys}
              colors={merged.colors}
              selectedItems={selectedObjects}
              onItemSelect={toggleObjectSelection}
              labelFormatter={comparisonNameFormatter}
              sparklineHeight={50}
            />
          </ChartContainer>
        </div>
      );
    }

    // Bar chart for summary types
    if (metricOptions[dataType]) {
      const nameKey =
        dataType === "activity" ? "activity_name"
          : dataType === "entity" ? "entity_name"
          : dataType === "resource" ? "resource_name"
          : dataType === "activity-entity" ? "activity_name"
          : dataType === "state-summary" ? "state_name"
          : "scenario_name";

      const merged = mergeBarChartData(selectedScenarios, dataMap, nameKey, selectedMetric);
      return (
        <ChartContainer data={merged.data} loading={comparisonLoading} error={null} emptyMessage={`No ${dataType} data available`}>
          <ComparisonBarChart data={merged.data} xKey={nameKey} yKeys={merged.yKeys} colors={merged.colors} height={300} layout="vertical" valueFormatter={getPercentFormatter(selectedMetric)} />
        </ChartContainer>
      );
    }

    return null;
  };

  // Get filter label based on data type
  const getFilterLabel = () => {
    if (dataType === "activity") return "Activities";
    if (dataType === "entity") return "Entities";
    if (dataType === "resource") return "Resources";
    if (dataType === "activity-entity") return "Activities";
    return "Items";
  };

  // Render Detailed View (existing functionality)
  const renderDetailedView = () => {
    return (
      <>
        {/* Consolidated Controls Row */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Data Type Selector with optgroups */}
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value as CrossRepDataType)}
            className="px-2 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="Summaries">
              <option value="scenario">Scenario</option>
              <option value="activity">Activity</option>
              <option value="entity">Entity</option>
              <option value="resource">Resource</option>
              <option value="activity-entity">Activity Entity</option>
              <option value="state-summary">State</option>
            </optgroup>
            <optgroup label="Timeseries">
              <option value="activity-contents-timeseries">
                Activity Contents
              </option>
              <option value="activity-inbound-queue-timeseries">
                Inbound Queue
              </option>
              <option value="activity-outbound-queue-timeseries">
                Outbound Queue
              </option>
              <option value="state-values-timeseries">State Values</option>
              <option value="entity-throughput-timeseries">Entity Throughput</option>
            </optgroup>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-l ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Table view"
            >
              <Table2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === "chart"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Chart view"
            >
              <BarChart3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode("both")}
              className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-r ${
                viewMode === "both"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Both table and chart"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
          </div>

          {/* Metric selector (only for chart view with bar charts) */}
          {(viewMode === "chart" || viewMode === "both") &&
            metricOptions[dataType] && (
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-2 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {metricOptions[dataType].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

          {/* Filter dropdown (for filterable types) */}
          {isFilterableType && uniqueFilterItems.length > 1 && (
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="px-2 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All {getFilterLabel()}</option>
              {uniqueFilterItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}

          {/* Active filter indicator chip */}
          {selectedActivity !== "all" && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              <span className="truncate max-w-[100px]" title={selectedActivity}>
                {selectedActivity}
              </span>
              <button
                onClick={() => setSelectedActivity("all")}
                className="hover:text-blue-900 ml-0.5"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Chart View */}
        {(viewMode === "chart" || viewMode === "both") && (
          <div className="space-y-2">{isComparing ? renderComparisonChart() : renderChart()}</div>
        )}

        {/* Data Table */}
        {(viewMode === "table" || viewMode === "both") && (
          <DataTable
            data={isComparing ? (comparisonTableData?.data || []) : filteredData}
            columns={isComparing ? (comparisonTableData?.columns || columns) : columns}
            loading={isComparing ? comparisonLoading : loading}
            error={isComparing ? null : error}
            emptyMessage={`No ${dataType} data available for this run`}
          />
        )}
      </>
    );
  };

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {onBackToList && (
          <button
            onClick={onBackToList}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Back to run list"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
        <div className="flex items-center gap-1">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-semibold text-gray-800">Analysis</h2>
        </div>
        {downloadInfo && (
          <button
            onClick={handleCopyZipLink}
            title={zipCopied ? "Copied!" : "Copy ZIP URL"}
            className={`ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              zipCopied
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {zipCopied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            {zipCopied ? "Copied" : "ZIP"}
          </button>
        )}
      </div>

      {/* Summary/Detailed Toggle */}
      <div className="flex gap-1 border border-gray-300 rounded w-fit">
        <button
          onClick={() => setViewType("summary")}
          className={`px-3 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-l ${
            viewType === "summary"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <List className="w-3 h-3" />
          Summary
        </button>
        <button
          onClick={() => setViewType("detailed")}
          className={`px-3 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-r ${
            viewType === "detailed"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Table2 className="w-3 h-3" />
          Detailed
        </button>
      </div>

      {/* Scenario Picker */}
      {!availableScenariosLoading && availableScenarios.length > 1 && (
        <ScenarioPicker
          selectedScenarios={selectedScenarios}
          availableScenarios={availableScenarios}
          onAdd={addScenario}
          onRemove={removeScenario}
        />
      )}

      {/* Content based on view type */}
      {viewType === "summary"
        ? (isComparing ? (
          <ComparisonSummaryView
            selectedScenarios={selectedScenarios}
            getDataForType={getDataForType}
            comparisonLoading={comparisonLoading}
            onDrillDown={handleDrillDown}
          />
        ) : (
          <SummaryView
            summaryData={summaryData}
            summaryLoading={summaryLoading}
            scenarioId={scenarioId}
            onDrillDown={handleDrillDown}
          />
        ))
        : renderDetailedView()}
    </div>
  );
};

export default SimulationRunAnalysisDashboard;
