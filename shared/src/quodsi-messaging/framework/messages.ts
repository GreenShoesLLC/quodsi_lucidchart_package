import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/message-types';
import { QuodsiUserInfo } from '../auth/messages';

/**
 * Sent by the iframe immediately after QReact mounts and MSAL completes a silent login attempt.
 * This is the first application-level message in a session.
 */
export interface ReactAppReadyMessage extends EnvelopeBase {
  type: EnvelopeMessageType.REACT_APP_READY;
  data: {
    /** Which Lucid panel this iframe represents. */
    panel: 'model' | 'auth';
    
    /** Initial auth probe result (true = MSAL already holds a valid account). */
    isAuthenticated: boolean;
    
    /** Basic user snapshot if isAuthenticated is true. */
    user?: QuodsiUserInfo;
  };
}

/**
 * Generic error message that can be sent by any component.
 */
export interface ErrorMessage extends EnvelopeBase {
  type: EnvelopeMessageType.ERROR;
  data: {
    /** Short machine-readable identifier. */
    code: string;
    
    /** Human-readable summary (no PII). */
    message: string;
    
    /** The id of the request that triggered this error (correlation). */
    id?: string;
  };
}

/**
 * Development-only log message for debugging.
 * Emitted only when window.__QUODSI_DEV_LOG = true.
 */
export interface LogMessage extends EnvelopeBase {
  type: EnvelopeMessageType.LOG;
  data: {
    /** Log severity. */
    level: 'debug' | 'info';
    
    /** Log content. */
    text: string;
  };
}

/** Union type of all framework messages */
export type FrameworkMessage = 
  | ReactAppReadyMessage
  | ErrorMessage
  | LogMessage;
