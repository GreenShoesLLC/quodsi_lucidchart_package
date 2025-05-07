/**
 * Debug log entry
 * Used for storing debug logs in a ring buffer
 */
export interface LogEntry {
  timestamp: Date;   // When the log entry was created
  message: string;   // The log message content
}
