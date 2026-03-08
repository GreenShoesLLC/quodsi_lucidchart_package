import { generateUUID } from '../utils/uuidUtils';
import { EnvelopeMessageType, EnvelopMessagePayloads, EnvelopeBase, MessageSource, MessageTarget } from './index';

/**
 * Create a base message envelope with standard fields
 * 
 * @param type Message type
 * @param source Message source
 * @param target Message target
 * @param data Message payload
 * @returns A properly formatted message envelope
 */
export function createBaseMessage<T extends EnvelopeMessageType>(
  type: T,
  source: MessageSource,
  target: MessageTarget,
  data: EnvelopMessagePayloads[T]
): EnvelopeBase & { type: T, data: EnvelopMessagePayloads[T] } {
  return {
    id: generateUUID(),
    type,
    source,
    target,
    version: '1.0',
    data
  };
}

// Framework message builders

/**
 * Create a REACT_APP_READY message
 * 
 * @param panel Panel type (auth or model)
 * @param isAuthenticated Authentication status
 * @param user Optional user info
 * @returns A properly formatted REACT_APP_READY message
 */
export function createReactAppReadyMessage(
  panel: 'auth' | 'model',
  isAuthenticated: boolean,
  user?: EnvelopMessagePayloads[EnvelopeMessageType.REACT_APP_READY]['user']
) {
  return createBaseMessage(
    EnvelopeMessageType.REACT_APP_READY,
    panel === 'auth' ? 'auth-iframe' : 'model-iframe',
    'host',
    { panel, isAuthenticated, user }
  );
}

/**
 * Create an ERROR message
 * 
 * @param source Message source
 * @param code Error code
 * @param message Error message
 * @param id Optional correlation ID
 * @returns A properly formatted ERROR message
 */
export function createErrorMessage(
  source: MessageSource,
  code: string,
  message: string,
  id?: string
) {
  return createBaseMessage(
    EnvelopeMessageType.ERROR,
    source,
    'host',
    { code, message, id }
  );
}

/**
 * Create a LOG message (development only)
 * 
 * @param source Message source
 * @param level Log level
 * @param text Log text
 * @returns A properly formatted LOG message
 */
export function createLogMessage(
  source: MessageSource,
  level: 'debug' | 'info',
  text: string
) {
  return createBaseMessage(
    EnvelopeMessageType.LOG,
    source,
    'host',
    { level, text }
  );
}

// Auth message builders

/**
 * Create an AUTH_LOGIN_SUCCESS message
 * 
 * @param idToken JWT token from authentication
 * @param user User information
 * @param newUser Flag indicating if this is a new user
 * @returns A properly formatted AUTH_LOGIN_SUCCESS message
 */
export function createAuthLoginSuccessMessage(
  idToken: string,
  user: EnvelopMessagePayloads[EnvelopeMessageType.AUTH_LOGIN_SUCCESS]['user'],
  newUser: boolean
) {
  return createBaseMessage(
    EnvelopeMessageType.AUTH_LOGIN_SUCCESS,
    'auth-iframe',
    'host',
    { idToken, user, newUser }
  );
}

/**
 * Create an AUTH_LOGOUT message
 * 
 * @returns A properly formatted AUTH_LOGOUT message
 */
export function createAuthLogoutMessage() {
  return createBaseMessage(
    EnvelopeMessageType.AUTH_LOGOUT,
    'auth-iframe',
    'host',
    {}
  );
}

/**
 * Create an AUTH_STATUS message
 * 
 * @param isAuthenticated Authentication status
 * @param user Optional user info if authenticated
 * @returns A properly formatted AUTH_STATUS message
 */
export function createAuthStatusMessage(
  isAuthenticated: boolean,
  user?: EnvelopMessagePayloads[EnvelopeMessageType.AUTH_STATUS]['user']
) {
  return createBaseMessage(
    EnvelopeMessageType.AUTH_STATUS,
    'host',
    'broadcast',
    { isAuthenticated, user }
  );
}

// Simulation message builders

/**
 * Create a MODEL_RUN_REQUEST message
 * 
 * @param documentId Document ID to simulate
 * @param scenarioName Optional scenario name
 * @param durationDays Optional duration in days
 * @param repetitions Optional number of repetitions
 * @param parameters Additional parameters
 * @returns A properly formatted MODEL_RUN_REQUEST message
 */
export function createModelRunRequestMessage(
  documentId: string,
  scenarioName?: string,
  durationDays?: number,
  repetitions?: number,
  parameters?: Record<string, unknown>
) {
  return createBaseMessage(
    EnvelopeMessageType.MODEL_RUN_REQUEST,
    'model-iframe',
    'host',
    { documentId, scenarioName, durationDays, repetitions, parameters }
  );
}

/**
 * Create a MODEL_RUN_STATUS message
 *
 * @param jobId Job ID
 * @param documentId Document ID
 * @param scenarioId Scenario ID
 * @param scenarioName Scenario name
 * @param status Current status
 * @param progress Progress percentage (0-100)
 * @param lastChecked ISO timestamp of last status check
 * @param queuedAt ISO timestamp when job was queued
 * @param currentStep Optional description of current step
 * @param error Optional error message if status is FAILED
 * @param resultUrl Optional result URL if status is COMPLETED
 * @returns A properly formatted MODEL_RUN_STATUS message
 */
export function createModelRunStatusMessage(
  jobId: string,
  documentId: string,
  scenarioId: string,
  scenarioName: string,
  status: EnvelopMessagePayloads[EnvelopeMessageType.MODEL_RUN_STATUS]['status'],
  progress: number,
  lastChecked: string,
  queuedAt: string,
  currentStep?: string,
  error?: string,
  resultUrl?: string
) {
  return createBaseMessage(
    EnvelopeMessageType.MODEL_RUN_STATUS,
    'host',
    'model-iframe',
    { jobId, documentId, scenarioId, scenarioName, status, progress, lastChecked, queuedAt, currentStep, error, resultUrl }
  );
}

// Add other category builders as needed...
