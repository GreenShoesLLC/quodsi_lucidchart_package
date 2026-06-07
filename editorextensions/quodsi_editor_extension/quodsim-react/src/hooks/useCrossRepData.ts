import { useState, useEffect, useCallback, useRef } from "react";
import { EnvelopeMessageType } from "@quodsi/lucid-shared";
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
  getCrossRepBatchData: (documentId: string, scenarioId: string, dataTypes: string[]) => void;
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
  getCrossRepBatchData,
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

  // Fetch summary data (all 3 types in one batch request)
  const fetchSummaryData = useCallback(() => {
    if (!documentId || !scenarioId) return;

    console.log("[useCrossRepData] Fetching summary data (batch)...");
    setSummaryLoading(true);

    getCrossRepBatchData(documentId, scenarioId, ["scenario", "activity", "resource"]);
  }, [documentId, scenarioId, getCrossRepBatchData]);

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

      // Handle batch result (summary view)
      if (message.type === EnvelopeMessageType.CROSS_REP_BATCH_DATA_RESULT) {
        console.log(
          "[useCrossRepData] Received batch cross-rep data:",
          message.data
        );

        if (viewType === "summary") {
          const { results } = message.data;
          setSummaryData({
            scenario: results?.scenario?.data?.[0] || null,
            activities: results?.activity?.data || [],
            resources: results?.resource?.data || [],
          });
          setSummaryLoading(false);
        }
      }

      // Handle single-type result (detailed view)
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
        if (
          message.data?.relatedTo === EnvelopeMessageType.CROSS_REP_BATCH_DATA_REQUEST
        ) {
          console.error("[useCrossRepData] Batch error:", message.data);
          if (viewType === "summary") {
            setSummaryLoading(false);
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
