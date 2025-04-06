// utils/loggingLevels.ts
/**
 * Defines logging verbosity levels for consistent logging across components
 */
export enum LoggingLevel {
  NONE = 0,     // No logging (except fatal errors)
  ERROR = 1,    // Only errors
  MINIMAL = 2,  // Errors + minimal info (start/end of operations)
  NORMAL = 3,   // Errors + basic info + important operations
  VERBOSE = 4   // Everything including detailed debug info
}

/**
 * Converts a string or number to a LoggingLevel enum value
 * Useful for reading from config files
 */
export function parseLoggingLevel(level: string | number | undefined): LoggingLevel {
  if (level === undefined) {
    return LoggingLevel.NORMAL; // Default to normal logging
  }
  
  if (typeof level === 'number') {
    // Ensure the number is a valid enum value
    if (level >= LoggingLevel.NONE && level <= LoggingLevel.VERBOSE) {
      return level;
    }
    return LoggingLevel.NORMAL;
  }
  
  // Handle string values
  switch (level.toUpperCase()) {
    case 'NONE': return LoggingLevel.NONE;
    case 'ERROR': return LoggingLevel.ERROR;
    case 'MINIMAL': return LoggingLevel.MINIMAL;
    case 'NORMAL': return LoggingLevel.NORMAL;
    case 'VERBOSE': return LoggingLevel.VERBOSE;
    default: return LoggingLevel.NORMAL;
  }
}