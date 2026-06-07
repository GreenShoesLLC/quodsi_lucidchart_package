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
export declare function createBaseMessage<T extends keyof EnvelopMessagePayloads>(type: T, source: MessageSource, target: MessageTarget, data: EnvelopMessagePayloads[T]): EnvelopeBase & {
    type: T;
    data: EnvelopMessagePayloads[T];
};
/**
 * Create a REACT_APP_READY message
 *
 * @param panel Panel type (auth or model)
 * @param isAuthenticated Authentication status
 * @param user Optional user info
 * @returns A properly formatted REACT_APP_READY message
 */
export declare function createReactAppReadyMessage(panel: 'auth' | 'model', isAuthenticated: boolean, user?: EnvelopMessagePayloads[EnvelopeMessageType.REACT_APP_READY]['user']): EnvelopeBase & {
    type: EnvelopeMessageType.REACT_APP_READY;
    data: {
        panel: "model" | "auth";
        isAuthenticated: boolean;
        user?: import("./index").QuodsiUserInfo | undefined;
    };
};
/**
 * Create an ERROR message
 *
 * @param source Message source
 * @param code Error code
 * @param message Error message
 * @param id Optional correlation ID
 * @returns A properly formatted ERROR message
 */
export declare function createErrorMessage(source: MessageSource, code: string, message: string, id?: string): EnvelopeBase & {
    type: EnvelopeMessageType.ERROR;
    data: {
        code: string;
        message: string;
        id?: string | undefined;
    };
};
/**
 * Create a LOG message (development only)
 *
 * @param source Message source
 * @param level Log level
 * @param text Log text
 * @returns A properly formatted LOG message
 */
export declare function createLogMessage(source: MessageSource, level: 'debug' | 'info', text: string): EnvelopeBase & {
    type: EnvelopeMessageType.LOG;
    data: {
        level: "debug" | "info";
        text: string;
    };
};
/**
 * Create an AUTH_LOGIN_SUCCESS message
 *
 * @param idToken JWT token from authentication
 * @param user User information
 * @param newUser Flag indicating if this is a new user
 * @returns A properly formatted AUTH_LOGIN_SUCCESS message
 */
export declare function createAuthLoginSuccessMessage(idToken: string, user: EnvelopMessagePayloads[EnvelopeMessageType.AUTH_LOGIN_SUCCESS]['user'], newUser: boolean): EnvelopeBase & {
    type: EnvelopeMessageType.AUTH_LOGIN_SUCCESS;
    data: {
        idToken: string;
        user: import("./index").QuodsiUserInfo;
        newUser: boolean;
    };
};
/**
 * Create an AUTH_LOGOUT message
 *
 * @returns A properly formatted AUTH_LOGOUT message
 */
export declare function createAuthLogoutMessage(): EnvelopeBase & {
    type: EnvelopeMessageType.AUTH_LOGOUT;
    data: Record<string, never>;
};
/**
 * Create an AUTH_STATUS message
 *
 * @param isAuthenticated Authentication status
 * @param user Optional user info if authenticated
 * @returns A properly formatted AUTH_STATUS message
 */
export declare function createAuthStatusMessage(isAuthenticated: boolean, user?: EnvelopMessagePayloads[EnvelopeMessageType.AUTH_STATUS]['user']): EnvelopeBase & {
    type: EnvelopeMessageType.AUTH_STATUS;
    data: {
        isAuthenticated: boolean;
        user?: import("./index").QuodsiUserInfo | undefined;
        config?: import("./index").ExtensionConfig | undefined;
    };
};
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
export declare function createModelRunRequestMessage(documentId: string, scenarioName?: string, durationDays?: number, repetitions?: number, parameters?: Record<string, unknown>): EnvelopeBase & {
    type: EnvelopeMessageType.MODEL_RUN_REQUEST;
    data: {
        documentId: string;
        scenarioName?: string | undefined;
        durationDays?: number | undefined;
        repetitions?: number | undefined;
        parameters?: Record<string, unknown> | undefined;
        enableAnimation?: boolean | undefined;
    };
};
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
export declare function createModelRunStatusMessage(jobId: string, documentId: string, scenarioId: string, scenarioName: string, status: EnvelopMessagePayloads[EnvelopeMessageType.MODEL_RUN_STATUS]['status'], progress: number, lastChecked: string, queuedAt: string, currentStep?: string, error?: string, resultUrl?: string): EnvelopeBase & {
    type: EnvelopeMessageType.MODEL_RUN_STATUS;
    data: {
        jobId: string;
        /**
         * Create an AUTH_LOGIN_SUCCESS message
         *
         * @param idToken JWT token from authentication
         * @param user User information
         * @param newUser Flag indicating if this is a new user
         * @returns A properly formatted AUTH_LOGIN_SUCCESS message
         */
        documentId: string;
        scenarioId: string;
        scenarioName: string;
        status: import("./index").SimulationStatus;
        progress: number;
        currentStep?: string | undefined;
        lastChecked: string;
        queuedAt: string;
        error?: string | undefined;
        resultUrl?: string | undefined;
    };
};
/**
 * Create an ENTITLEMENTS_STATUS message from the /me/entitlements response.
 * Broadcast to the React panel after login and after any refresh so the UI
 * can gate paid features and show plan/trial badges.
 */
export declare function createEntitlementsStatusMessage(data: EnvelopMessagePayloads[EnvelopeMessageType.ENTITLEMENTS_STATUS]): EnvelopeBase & {
    type: EnvelopeMessageType.ENTITLEMENTS_STATUS;
    data: {
        subjectType: import("./index").EntitlementSubjectType;
        planKey: string;
        planStatus: import("./index").EntitlementPlanStatus;
        trialExpiresAt?: string | undefined;
        features: Record<string, boolean | import("./index").EntitlementMeteredFeature>;
        upgradeAvailable?: boolean | undefined;
    };
};
//# sourceMappingURL=builders.d.ts.map