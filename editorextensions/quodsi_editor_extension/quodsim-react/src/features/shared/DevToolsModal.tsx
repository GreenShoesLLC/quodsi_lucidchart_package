import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, KeyRound } from "lucide-react";
import { useMessaging } from "../../messaging/MessageContext";
import {
  EnvelopeMessageType,
  SwimLaneScanResult,
  SwimLaneScanItem,
  SwimLaneScanLane,
  SwimLaneScanLaneBlock,
} from "@quodsi/shared";

interface DevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatBB(bb: { x: number; y: number; w: number; h: number }): string {
  return `{x: ${Math.round(bb.x)}, y: ${Math.round(bb.y)}, w: ${Math.round(bb.w)}, h: ${Math.round(bb.h)}}`;
}

function formatBlockLine(block: SwimLaneScanLaneBlock): string {
  const quodsi = block.hasQuodsiData ? ` [${block.quodsiType}]` : "";
  return `- "${block.text || "(no text)"}" (${block.className}) [id: ${block.id}]${quodsi}`;
}

function formatScanResult(result: SwimLaneScanResult): string {
  if (result.swimlanes.length === 0 && result.nonSwimLaneBlocks.length === 0) {
    return "No swimlanes found on this page.";
  }

  const lines: string[] = [];

  for (const sl of result.swimlanes) {
    lines.push(
      `Swimlane: "${sl.className}" (id: ${sl.blockId})`
    );
    lines.push(
      `  Orientation: ${sl.isVertical ? "Vertical" : "Horizontal"} | Magnetized: ${sl.isMagnetized}`
    );
    lines.push(`  Bounding Box: ${formatBB(sl.boundingBox)}`);
    lines.push("");

    if (sl.lanes.length === 0) {
      lines.push("  (no lanes)");
    }

    for (const lane of sl.lanes) {
      lines.push(
        `  Lane ${lane.index}: "${lane.title || "(untitled)"}" (size: ${lane.size})`
      );
      lines.push(`    Bounds: ${formatBB(lane.boundingBox)}`);
      lines.push("    Contained Blocks:");
      if (lane.containedBlocks.length === 0) {
        lines.push("      (none)");
      } else {
        for (const block of lane.containedBlocks) {
          lines.push(`      ${formatBlockLine(block)}`);
        }
      }
      lines.push("");
    }
  }

  if (result.nonSwimLaneBlocks.length > 0) {
    lines.push("--- Non-swimlane blocks on page ---");
    for (const block of result.nonSwimLaneBlocks) {
      lines.push(`  ${formatBlockLine(block)}`);
    }
  }

  lines.push("");
  lines.push(`Total blocks on page: ${result.totalBlockCount}`);

  return lines.join("\n");
}

export const DevToolsModal: React.FC<DevToolsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { sendMessage } = useMessaging();
  const [scanning, setScanning] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [authTesting, setAuthTesting] = useState(false);
  const [authResultText, setAuthResultText] = useState<string | null>(null);

  const handleScan = useCallback(() => {
    setScanning(true);
    setResultText(null);
    sendMessage(EnvelopeMessageType.DEVTOOLS_SWIMLANE_SCAN_REQUEST);
  }, [sendMessage]);

  const handleTestKindeAuth = useCallback(() => {
    setAuthTesting(true);
    setAuthResultText(null);
    sendMessage(EnvelopeMessageType.DEVTOOLS_KINDE_AUTH_REQUEST);
  }, [sendMessage]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: MessageEvent) => {
      try {
        const msg = event.data;
        if (msg?.type === EnvelopeMessageType.DEVTOOLS_SWIMLANE_SCAN_RESULT) {
          const result = msg.data as SwimLaneScanResult;
          setResultText(formatScanResult(result));
          setScanning(false);
        }
        if (msg?.type === EnvelopeMessageType.DEVTOOLS_KINDE_AUTH_RESULT) {
          const result = msg.data;
          if (result.success && result.rawToken) {
            try {
              // Decode JWT in browser where atob is available
              const parts = result.rawToken.split('.');
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const claims = JSON.parse(atob(base64));

              const lines: string[] = [];
              lines.push("Kinde Auth SUCCESS");
              lines.push("");
              lines.push("Key Claims:");
              lines.push(`  sub:      ${claims.sub || "(missing)"}`);
              lines.push(`  email:    ${claims.email || "(missing)"}`);
              lines.push(`  name:     ${claims.name || claims.given_name || "(missing)"}`);
              lines.push(`  org_code: ${claims.org_code || "(missing)"}`);
              lines.push("");
              lines.push("All Claims:");
              lines.push(JSON.stringify(claims, null, 2));
              setAuthResultText(lines.join("\n"));
            } catch (decodeErr) {
              setAuthResultText(`Kinde Auth SUCCESS (token received but decode failed)\n\nRaw token length: ${result.rawToken.length}`);
            }
          } else {
            setAuthResultText(`Kinde Auth FAILED\n\nError: ${result.error}`);
          }
          setAuthTesting(false);
        }
      } catch {
        // Ignore non-matching messages
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScanning(false);
      setResultText(null);
      setAuthTesting(false);
      setAuthResultText(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-4 w-[32rem] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Developer Tools
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded transition-colors"
          >
            {scanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {scanning ? "Scanning..." : "Scan Swimlanes"}
          </button>
          <button
            onClick={handleTestKindeAuth}
            disabled={authTesting}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded transition-colors"
          >
            {authTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <KeyRound className="w-3.5 h-3.5" />
            )}
            {authTesting ? "Authenticating..." : "Test Kinde Auth"}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-auto">
          {authResultText !== null ? (
            <pre className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap font-mono">
              {authResultText}
            </pre>
          ) : resultText !== null ? (
            <pre className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap font-mono">
              {resultText}
            </pre>
          ) : (
            !scanning && !authTesting && (
              <div className="text-xs text-gray-500 text-center py-6">
                Use the buttons above to test developer features
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
