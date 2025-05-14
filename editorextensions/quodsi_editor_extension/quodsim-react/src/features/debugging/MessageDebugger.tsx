import React, { useState, useEffect } from "react";
import { useMessaging } from "../../messaging/MessageProvider";
import { EnvelopeMessageType } from "@quodsi/shared";
import "./MessageDebugger.css";

// Interface for a message log entry
interface MessageLogEntry {
  id: string;
  type: string;
  direction: "in" | "out";
  timestamp: number;
  data: any;
}

export const MessageDebugger: React.FC = () => {
  // Get state and messaging utilities
  const { app, sendMessage } = useMessaging();

  // Local state for message log
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
  const [selectedMessage, setSelectedMessage] =
    useState<MessageLogEntry | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Outgoing message tracking
  useEffect(() => {
    // We can track outgoing messages through the pendingRequests
    const pendingKeys = Object.keys(app.pendingRequests);
    if (pendingKeys.length > 0) {
      // Check each pending request to see if it's new
      pendingKeys.forEach((key) => {
        const req = app.pendingRequests[key];

        // Check if this request is already in our log
        const existingLog = messageLog.find((entry) => entry.id === key);
        if (!existingLog) {
          // Add to log
          setMessageLog((prev) => [
            ...prev,
            {
              id: key,
              type: req.requestType, // Use requestType instead of type
              direction: "out",
              timestamp: req.timestamp,
              data: { type: req.requestType }, // Use requestType here too
            },
          ]);
        }
      });
    }
  }, [app.pendingRequests, messageLog]);

  // This is a simplistic approach - in a real implementation we would hook into
  // the MessageProvider to track all messages directly

  // Test message sender
  const sendTestMessage = (type: EnvelopeMessageType) => {
    sendMessage(type, { test: true, timestamp: Date.now() });
  };

  // Clear log
  const clearLog = () => {
    setMessageLog([]);
    setSelectedMessage(null);
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={`message-debugger ${expanded ? "expanded" : "collapsed"}`}>
      <div className="debugger-header">
        <h3>Message Debugger</h3>
        <div className="debugger-controls">
          <button onClick={clearLog}>Clear</button>
          <button onClick={toggleExpanded}>
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="test-messages">
            <h4>Send Test Messages</h4>
            <div className="button-group">
              <button onClick={() => sendTestMessage(EnvelopeMessageType.LOG)}>
                LOG
              </button>
              <button
                onClick={() =>
                  sendTestMessage(EnvelopeMessageType.SELECTION_CHANGED)
                }
              >
                SELECTION_CHANGED
              </button>
              <button
                onClick={() =>
                  sendTestMessage(EnvelopeMessageType.MODEL_RUN_REQUEST)
                }
              >
                MODEL_RUN_REQUEST
              </button>
            </div>
          </div>

          <div className="message-log">
            <h4>Message Log ({messageLog.length})</h4>
            {messageLog.length === 0 ? (
              <p className="empty-log">No messages recorded yet.</p>
            ) : (
              <ul>
                {messageLog.map((entry) => (
                  <li
                    key={entry.id}
                    className={`message-entry ${
                      entry.direction === "in" ? "incoming" : "outgoing"
                    }`}
                    onClick={() => setSelectedMessage(entry)}
                  >
                    <span className="time">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="direction">
                      {entry.direction === "in" ? "←" : "→"}
                    </span>
                    <span className="type">{entry.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedMessage && (
            <div className="message-details">
              <h4>Message Details</h4>
              <div className="detail-header">
                <span>
                  Type: <strong>{selectedMessage.type}</strong>
                </span>
                <span>
                  Direction:{" "}
                  <strong>
                    {selectedMessage.direction === "in"
                      ? "Incoming"
                      : "Outgoing"}
                  </strong>
                </span>
                <span>
                  Time:{" "}
                  <strong>
                    {new Date(selectedMessage.timestamp).toLocaleTimeString()}
                  </strong>
                </span>
              </div>
              <pre>{JSON.stringify(selectedMessage.data, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageDebugger;
