import { useState, useCallback, useRef, useEffect } from "react";
import { EnvelopeMessageType, SimulationRunInfo } from "@quodsi/shared";
import { useSimulationRunSender } from "../messaging/senders/simulationRunSender";
import { SelectedScenario } from "../utils/scenarioDataMerge";
import { SCENARIO_COLORS } from "../components/charts";

interface AvailableScenario {
  id: string;
  name: string;
}

interface UseComparisonDataReturn {
  selectedScenarios: SelectedScenario[];
  availableScenarios: AvailableScenario[];
  addScenario: (scenarioId: string) => void;
  removeScenario: (scenarioId: string) => void;
  getDataForType: (dataType: string) => Map<string, any[]>;
  isLoading: boolean;
  fetchDataType: (dataType: string) => void;
  availableScenariosLoading: boolean;
}

export function useComparisonData(
  documentId: string,
  initialScenarioId: string,
  initialScenarioName?: string
): UseComparisonDataReturn {
  const { getCrossRepData, listSimulationRuns } = useSimulationRunSender();

  const [selectedScenarios, setSelectedScenarios] = useState<SelectedScenario[]>([
    {
      id: initialScenarioId,
      name: initialScenarioName || initialScenarioId,
      color: SCENARIO_COLORS[0],
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
          .map((r) => ({ id: r.id, name: r.name }));
        setAvailableScenarios(withResults);
        setAvailableScenariosLoading(false);

        // Update initial scenario name if it was set to the ID
        const initialRun = runs.find((r) => r.id === initialScenarioId);
        if (initialRun) {
          setSelectedScenarios((prev) =>
            prev.map((s) =>
              s.id === initialScenarioId && s.name === initialScenarioId
                ? { ...s, name: initialRun.name }
                : s
            )
          );
        }
      }

      // Handle cross-rep data responses
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
        { id: scenarioId, name: available.name, color: SCENARIO_COLORS[colorIndex] },
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
    availableScenariosLoading,
  };
}
