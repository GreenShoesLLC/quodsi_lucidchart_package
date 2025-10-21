import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, XCircle, AlertCircle, Copy, Check, FileText, Trash2 } from "lucide-react";
import { RunState } from "@quodsi/shared";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";

interface ScenarioDownloadInfo {
  zipUrl: string;
  fileSizeBytes: number;
  fileSizeMB: string;
  expiresAt: string;
}

interface Scenario {
  id: string;
  name: string;
  runState: RunState;
  reps: number;
  runClockPeriod: number;
  runClockPeriodUnit: string;
  simulationTimeType: string;
  completedAt?: string;
  hasResults: boolean;
  downloadInfo?: ScenarioDownloadInfo;
}

interface ScenarioCardProps {
  scenario: Scenario;
  documentId: string;
  onDelete?: (scenarioId: string) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, documentId, onDelete }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const modelOpsSender = useModelOpsSender();

  // Update expiry countdown
  useEffect(() => {
    if (!scenario.downloadInfo?.expiresAt) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(scenario.downloadInfo!.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        if (minutes > 0) {
          setTimeRemaining(`Expires in ${minutes} min`);
        } else {
          setTimeRemaining(`Expires in ${seconds} sec`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [scenario.downloadInfo?.expiresAt]);

  // Update relative time for completedAt
  useEffect(() => {
    if (!scenario.completedAt) {
      setRelativeTime("");
      return;
    }

    const updateRelativeTime = () => {
      const now = Date.now();
      const completed = new Date(scenario.completedAt!).getTime();
      const diff = now - completed;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setRelativeTime(`${days} day${days > 1 ? 's' : ''} ago`);
      } else if (hours > 0) {
        setRelativeTime(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else if (minutes > 0) {
        setRelativeTime(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else {
        setRelativeTime("Just now");
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [scenario.completedAt]);

  const handleCopyLink = () => {
    if (!scenario.downloadInfo?.zipUrl) return;

    try {
      // Use old-school execCommand approach for sandboxed iframes
      const textarea = document.createElement('textarea');
      textarea.value = scenario.downloadInfo.zipUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        console.log('[ScenarioCard] Link copied to clipboard using execCommand');

        // Show "Copied!" feedback for 2 seconds
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        console.error('[ScenarioCard] execCommand copy failed');
      }
    } catch (error) {
      console.error('[ScenarioCard] Failed to copy link:', error);
    }
  };

  const handleCreateResultsPage = () => {
    console.log('[ScenarioCard] Create results page requested for scenario:', scenario.id);

    // Validate we have required data
    if (!documentId) {
      console.error('[ScenarioCard] Cannot create results page: missing documentId');
      return;
    }

    if (!scenario.id) {
      console.error('[ScenarioCard] Cannot create results page: missing scenario.id (jobId)');
      return;
    }

    // Generate page title with timestamp
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const pageTitle = `Results - ${scenario.name} - ${dateStr}`;

    console.log('[ScenarioCard] Creating results page:', {
      jobId: scenario.id,
      documentId,
      pageTitle
    });

    // Call the createResultsPage function (scenario.id is the jobId)
    modelOpsSender.createResultsPage(scenario.id, documentId, pageTitle);
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to delete scenario "${scenario.name}"?`)) {
      onDelete(scenario.id);
    }
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (scenario.runState) {
      case RunState.RanSuccessfully:
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          label: "Completed Successfully"
        };
      case RunState.Running:
        return {
          icon: <Clock className="w-4 h-4 animate-pulse" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          label: "Running..."
        };
      case RunState.RanWithErrors:
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          label: "Ran with Errors"
        };
      case RunState.NotRun:
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          label: "Not Run"
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`border ${statusDisplay.borderColor} rounded-lg p-2 ${statusDisplay.bgColor}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className={statusDisplay.color}>
          {statusDisplay.icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{scenario.name}</h3>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-600 space-y-0.5 mb-2">
        <div>
          <span className="font-medium">Reps:</span> {scenario.reps} •{" "}
          <span className="font-medium">Duration:</span> {scenario.runClockPeriod} {scenario.runClockPeriodUnit}
        </div>
        {scenario.completedAt && (
          <div>
            <span className="font-medium">
              {scenario.runState === RunState.Running ? "Started" : "Completed"}:
            </span> {relativeTime}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {scenario.hasResults && scenario.downloadInfo && (
        <div className="border-t border-gray-200 pt-2 space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCreateResultsPage}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              <FileText className="w-3 h-3" />
              Results Page
            </button>
            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy Link
                </>
              )}
            </button>
          </div>
          {timeRemaining && (
            <div className="text-xs text-center text-gray-500">
              {timeRemaining}
            </div>
          )}
        </div>
      )}

      {/* No Results Message */}
      {!scenario.hasResults && scenario.runState === RunState.Running && (
        <div className="border-t border-gray-200 pt-1.5 text-xs text-center text-gray-500">
          Results will be available when simulation completes
        </div>
      )}

      {/* Delete Button (Future - currently disabled) */}
      {onDelete && false && ( // Disabled for now
        <div className="border-t border-gray-200 pt-1.5 mt-1.5">
          <button
            onClick={handleDelete}
            disabled
            className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-400 border border-gray-300 rounded hover:bg-gray-100 transition-colors cursor-not-allowed"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ScenarioCard;
