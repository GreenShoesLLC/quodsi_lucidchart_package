import { useState, useEffect, useCallback, useRef } from "react";
import { EnvelopeMessageType } from "@quodsi/shared";
import { CrossRepDataType } from "../features/editors/analysis/crossRepTableConfigs";

export interface SummaryData {
  scenario: any | null;
  activities: any[];
  resources: any[];
}

interface UseCrossRepDataParams {
  documentId: string;
  scenarioId: string;
  viewType: "summary" | "detailed";
  dataType: CrossRepDataType;
  getCrossRepData: (documentId: string, scenarioId: string, dataType: CrossRepDataType) => void;
}

interface UseCrossRepDataResult {
  data: any[];
  loading: boolean;
  error: string | null;
  summaryData: SummaryData;
  summaryLoading: boolean;
  fetchSummaryData: () => void;
  fetchDetailedData: () => void;
}

export function useCrossRepData({
  documentId,
  scenarioId,
  viewType,
  dataType,
  getCrossRepData,
}: UseCrossRepDataParams): UseCrossRepDataResult {
  // Detailed view state
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summary view state
  const [summaryData, setSummaryData] = useState<SummaryData>({
    scenario: null,
    activities: [],
    resources: [],
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryDataReceived = useRef({
    scenario: false,
    activity: false,
    resource: false,
  });

  // Fetch summary data (all 3 types in parallel)
  const fetchSummaryData = useCallback(() => {
    if (!documentId || !scenarioId) return;

    console.log("[useCrossRepData] Fetching summary data...");
    setSummaryLoading(true);
    summaryDataReceived.current = {
      scenario: false,
      activity: false,
      resource: false,
    };

    getCrossRepData(documentId, scenarioId, "scenario");
    getCrossRepData(documentId, scenarioId, "activity");
    getCrossRepData(documentId, scenarioId, "resource");
  }, [documentId, scenarioId, getCrossRepData]);

  // Fetch detailed data (single type)
  const fetchDetailedData = useCallback(() => {
    if (!documentId || !scenarioId) {
      setError("Missing documentId or scenarioId");
      return;
    }

    setLoading(true);
    setError(null);
    setData([]);

    console.log(
      `[useCrossRepData] Fetching ${dataType} data for scenario ${scenarioId}`
    );

    getCrossRepData(documentId, scenarioId, dataType);
  }, [documentId, scenarioId, dataType, getCrossRepData]);

  // Listen for data responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === EnvelopeMessageType.CROSS_REP_DATA_RESULT) {
        console.log(
          "[useCrossRepData] Received cross-rep data:",
          message.data
        );

        const {
          dataType: receivedType,
          success,
          data: receivedData,
        } = message.data;

        // Handle summary view data
        if (viewType === "summary") {
          if (success) {
            if (receivedType === "scenario") {
              summaryDataReceived.current.scenario = true;
              setSummaryData((prev) => ({
                ...prev,
                scenario: receivedData?.[0] || null,
              }));
            } else if (receivedType === "activity") {
              summaryDataReceived.current.activity = true;
              setSummaryData((prev) => ({
                ...prev,
                activities: receivedData || [],
              }));
            } else if (receivedType === "resource") {
              summaryDataReceived.current.resource = true;
              setSummaryData((prev) => ({
                ...prev,
                resources: receivedData || [],
              }));
            }

            if (
              summaryDataReceived.current.scenario &&
              summaryDataReceived.current.activity &&
              summaryDataReceived.current.resource
            ) {
              setSummaryLoading(false);
            }
          }
        }

        // Handle detailed view data
        if (viewType === "detailed" && receivedType === dataType) {
          if (success) {
            setData(receivedData || []);
            setLoading(false);
          } else {
            setError(message.data.error || "Failed to fetch data");
            setLoading(false);
          }
        }
      }

      // Handle error response
      if (message.type === EnvelopeMessageType.ERROR) {
        if (
          message.data?.relatedTo === EnvelopeMessageType.CROSS_REP_DATA_REQUEST
        ) {
          console.error("[useCrossRepData] Error:", message.data);
          if (viewType === "detailed" && message.data?.dataType === dataType) {
            setError(message.data.message || "An error occurred");
            setLoading(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [viewType, dataType]);

  return {
    data,
    loading,
    error,
    summaryData,
    summaryLoading,
    fetchSummaryData,
    fetchDetailedData,
  };
}
