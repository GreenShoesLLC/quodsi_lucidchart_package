import { useState, useCallback, useRef, useEffect } from "react";
import { EnvelopeMessageType, SimulationRunInfo } from "@quodsi/lucid-shared";
import { useSimulationRunSender } from "../messaging/senders/simulationRunSender";
import { SelectedScenario } from "../utils/scenarioDataMerge";
import { SCENARIO_COLORS } from "../components/charts";

interface AvailableScenario {
  id: string;
  name: string;
  outputSchemaVersion?: string | null;
}

interface UseComparisonDataReturn {
  selectedScenarios: SelectedScenario[];
  availableScenarios: AvailableScenario[];
  addScenario: (scenarioId: string) => void;
  removeScenario: (scenarioId: string) => void;
  getDataForType: (dataType: string) => Map<string, any[]>;
  isLoading: boolean;
  fetchDataType: (dataType: string) => void;
  fetchDataTypes: (dataTypes: string[]) => void;
  availableScenariosLoading: boolean;
}

export function useComparisonData(
  documentId: string,
  initialScenarioId: string,
  initialScenarioName?: string
): UseComparisonDataReturn {
  const { getCrossRepData, getCrossRepBatchData, listSimulationRuns } = useSimulationRunSender();

  const [selectedScenarios, setSelectedScenarios] = useState<SelectedScenario[]>([
    {
      id: initialScenarioId,
      name: initialScenarioName || initialScenarioId,
      color: SCENARIO_COLORS[0],
      outputSchemaVersion: undefined,
    },
  ]);
  const [availableScenarios, setAvailableScenarios] = useState<AvailableScenario[]>([]);
  const [availableScenariosLoading, setAvailableScenariosLoading] = useState(true);

  // Data cache: scenarioId -> dataType -> data[]
  const cacheRef = useRef(new Map<string, Map<string, any[]>>());
  const pendingRef = useRef(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);
  const nextColorRef = useRef(1); // 0 is used by initial scenario

  // Fetch available scenarios on mount
  useEffect(() => {
    if (documentId) {
      listSimulationRuns(documentId);
    }
  }, [documentId, listSimulationRuns]);

  // Listen for responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Handle simulation runs list (for available scenarios)
      if (message.type === EnvelopeMessageType.SIMULATION_RUNS_LIST_RESULT) {
        const runs: SimulationRunInfo[] =
          message.data?.scenarios || message.data?.simulationRuns || [];
        const withResults = runs
          .filter((r) => r.hasResults)
          .map((r) => ({ id: r.id, name: r.name, outputSchemaVersion: r.outputSchemaVersion }));
        setAvailableScenarios(withResults);
        setAvailableScenariosLoading(false);

        // Update initial scenario name and outputSchemaVersion once we have the run list
        const initialRun = runs.find((r) => r.id === initialScenarioId);
        if (initialRun) {
          setSelectedScenarios((prev) =>
            prev.map((s) =>
              s.id === initialScenarioId
                ? {
                    ...s,
                    name: s.name === initialScenarioId ? initialRun.name : s.name,
                    outputSchemaVersion: initialRun.outputSchemaVersion,
                  }
                : s
            )
          );
        }
      }

      // Handle single-type cross-rep data responses
      if (message.type === EnvelopeMessageType.CROSS_REP_DATA_RESULT) {
        const { dataType, scenarioId, success, data } = message.data;
        if (!scenarioId) return;

        const pendingKey = `${scenarioId}__${dataType}`;
        pendingRef.current.delete(pendingKey);

        if (success) {
          if (!cacheRef.current.has(scenarioId)) {
            cacheRef.current.set(scenarioId, new Map());
          }
          cacheRef.current.get(scenarioId)!.set(dataType, data || []);
        }

        if (pendingRef.current.size === 0) {
          setIsLoading(false);
        }
      }

      // Handle batch cross-rep data responses
      if (message.type === EnvelopeMessageType.CROSS_REP_BATCH_DATA_RESULT) {
        const { results, scenarioId } = message.data;
        if (!scenarioId || !results) return;

        for (const [dataType, typeResult] of Object.entries(results) as [string, any][]) {
          const pendingKey = `${scenarioId}__${dataType}`;
          pendingRef.current.delete(pendingKey);

          if (typeResult.success) {
            if (!cacheRef.current.has(scenarioId)) {
              cacheRef.current.set(scenarioId, new Map());
            }
            cacheRef.current.get(scenarioId)!.set(dataType, typeResult.data || []);
          }
        }

        if (pendingRef.current.size === 0) {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [initialScenarioId]);

  const addScenario = useCallback(
    (scenarioId: string) => {
      const available = availableScenarios.find((s) => s.id === scenarioId);
      if (!available) return;
      const colorIndex = nextColorRef.current % SCENARIO_COLORS.length;
      nextColorRef.current++;
      setSelectedScenarios((prev) => [
        ...prev,
        {
          id: scenarioId,
          name: available.name,
          color: SCENARIO_COLORS[colorIndex],
          outputSchemaVersion: available.outputSchemaVersion,
        },
      ]);
    },
    [availableScenarios]
  );

  const removeScenario = useCallback((scenarioId: string) => {
    setSelectedScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
  }, []);

  const fetchDataType = useCallback(
    (dataType: string) => {
      let anyFetched = false;
      for (const scenario of selectedScenarios) {
        if (cacheRef.current.get(scenario.id)?.has(dataType)) continue;
        const pendingKey = `${scenario.id}__${dataType}`;
        if (pendingRef.current.has(pendingKey)) continue;
        pendingRef.current.add(pendingKey);
        getCrossRepData(documentId, scenario.id, dataType as any);
        anyFetched = true;
      }
      if (anyFetched) {
        setIsLoading(true);
      }
    },
    [documentId, selectedScenarios, getCrossRepData]
  );

  const fetchDataTypes = useCallback(
    (dataTypes: string[]) => {
      let anyFetched = false;
      for (const scenario of selectedScenarios) {
        // Find which types are not yet cached for this scenario
        const needed = dataTypes.filter((dt) => {
          if (cacheRef.current.get(scenario.id)?.has(dt)) return false;
          const pendingKey = `${scenario.id}__${dt}`;
          if (pendingRef.current.has(pendingKey)) return false;
          return true;
        });

        if (needed.length === 0) continue;

        // Mark all as pending
        for (const dt of needed) {
          pendingRef.current.add(`${scenario.id}__${dt}`);
        }

        // One batch call per scenario
        getCrossRepBatchData(documentId, scenario.id, needed);
        anyFetched = true;
      }
      if (anyFetched) {
        setIsLoading(true);
      }
    },
    [documentId, selectedScenarios, getCrossRepBatchData]
  );

  const getDataForType = useCallback(
    (dataType: string): Map<string, any[]> => {
      const result = new Map<string, any[]>();
      for (const scenario of selectedScenarios) {
        const data = cacheRef.current.get(scenario.id)?.get(dataType);
        if (data) {
          result.set(scenario.id, data);
        }
      }
      return result;
    },
    [selectedScenarios]
  );

  return {
    selectedScenarios,
    availableScenarios,
    addScenario,
    removeScenario,
    getDataForType,
    isLoading,
    fetchDataType,
    fetchDataTypes,
    availableScenariosLoading,
  };
}
