"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvelopeMessageType = void 0;
/**
 * Message type constants for the Quodsi postMessage protocol.
 * These constants serve as discriminators for the message payload schemas.
 */
var EnvelopeMessageType;
(function (EnvelopeMessageType) {
    // Framework & Lifecycle
    EnvelopeMessageType["REACT_APP_READY"] = "REACT_APP_READY";
    EnvelopeMessageType["ERROR"] = "ERROR";
    EnvelopeMessageType["LOG"] = "LOG";
    // Authentication
    EnvelopeMessageType["AUTH_LOGIN_SUCCESS"] = "AUTH_LOGIN_SUCCESS";
    EnvelopeMessageType["AUTH_LOGOUT"] = "AUTH_LOGOUT";
    EnvelopeMessageType["AUTH_STATUS"] = "AUTH_STATUS";
    EnvelopeMessageType["AUTH_REQUIRED"] = "AUTH_REQUIRED";
    EnvelopeMessageType["AUTH_ERROR"] = "AUTH_ERROR";
    // Selection & Context
    EnvelopeMessageType["MODEL_CONTEXT"] = "MODEL_CONTEXT";
    EnvelopeMessageType["SELECTION_CHANGED"] = "SELECTION_CHANGED";
    // Simulation Run
    EnvelopeMessageType["MODEL_RUN_REQUEST"] = "MODEL_RUN_REQUEST";
    EnvelopeMessageType["MODEL_RUN_STATUS"] = "MODEL_RUN_STATUS";
    // Model Operations
    EnvelopeMessageType["MODEL_VALIDATE"] = "MODEL_VALIDATE";
    EnvelopeMessageType["MODEL_VALIDATION_RESULT"] = "MODEL_VALIDATION_RESULT";
    EnvelopeMessageType["MODEL_CONVERT"] = "MODEL_CONVERT";
    EnvelopeMessageType["MODEL_CONVERSION_RESULT"] = "MODEL_CONVERSION_RESULT";
    // Conversion Preview
    EnvelopeMessageType["CONVERSION_PREVIEW_REQUEST"] = "CONVERSION_PREVIEW_REQUEST";
    EnvelopeMessageType["CONVERSION_PREVIEW_RESULT"] = "CONVERSION_PREVIEW_RESULT";
    EnvelopeMessageType["CONVERSION_APPLY"] = "CONVERSION_APPLY";
    EnvelopeMessageType["CONVERSION_APPLY_RESULT"] = "CONVERSION_APPLY_RESULT";
    EnvelopeMessageType["MODEL_REMOVE"] = "MODEL_REMOVE";
    EnvelopeMessageType["MODEL_REMOVE_RESULT"] = "MODEL_REMOVE_RESULT";
    EnvelopeMessageType["MODEL_JSON_REQUEST"] = "MODEL_JSON_REQUEST";
    EnvelopeMessageType["MODEL_JSON_RESPONSE"] = "MODEL_JSON_RESPONSE";
    // Element Operations
    EnvelopeMessageType["ELEMENT_SELECT"] = "ELEMENT_SELECT";
    EnvelopeMessageType["ELEMENT_UPDATE"] = "ELEMENT_UPDATE";
    EnvelopeMessageType["ELEMENT_UPDATE_RESULT"] = "ELEMENT_UPDATE_RESULT";
    EnvelopeMessageType["ELEMENT_CONVERT"] = "ELEMENT_CONVERT";
    EnvelopeMessageType["ELEMENT_CONVERT_RESULT"] = "ELEMENT_CONVERT_RESULT";
    EnvelopeMessageType["STATES_UPDATE"] = "STATES_UPDATE";
    EnvelopeMessageType["STATES_UPDATE_RESULT"] = "STATES_UPDATE_RESULT";
    EnvelopeMessageType["RESOURCE_REQUIREMENTS_UPDATE"] = "RESOURCE_REQUIREMENTS_UPDATE";
    EnvelopeMessageType["RESOURCE_REQUIREMENTS_UPDATE_RESULT"] = "RESOURCE_REQUIREMENTS_UPDATE_RESULT";
    EnvelopeMessageType["TIME_PATTERNS_UPDATE"] = "TIME_PATTERNS_UPDATE";
    EnvelopeMessageType["TIME_PATTERNS_UPDATE_RESULT"] = "TIME_PATTERNS_UPDATE_RESULT";
    EnvelopeMessageType["TIME_DISTRIBUTED_CONFIGS_UPDATE"] = "TIME_DISTRIBUTED_CONFIGS_UPDATE";
    EnvelopeMessageType["TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT"] = "TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT";
    // Cloud Storage
    EnvelopeMessageType["STORAGE_CONNECT_REQUEST"] = "STORAGE_CONNECT_REQUEST";
    EnvelopeMessageType["STORAGE_CONNECT_RESULT"] = "STORAGE_CONNECT_RESULT";
    EnvelopeMessageType["STORAGE_DISCONNECT"] = "STORAGE_DISCONNECT";
    EnvelopeMessageType["STORAGE_STATUS"] = "STORAGE_STATUS";
    // Simulation Run Management
    EnvelopeMessageType["SIMULATION_RUNS_LIST_REQUEST"] = "SIMULATION_RUNS_LIST_REQUEST";
    EnvelopeMessageType["SIMULATION_RUNS_LIST_RESULT"] = "SIMULATION_RUNS_LIST_RESULT";
    EnvelopeMessageType["SIMULATION_RUN_DELETE"] = "SIMULATION_RUN_DELETE";
    EnvelopeMessageType["SIMULATION_RUN_DELETE_RESULT"] = "SIMULATION_RUN_DELETE_RESULT";
    EnvelopeMessageType["SIMULATION_RUN_RESIMULATE_REQUEST"] = "SIMULATION_RUN_RESIMULATE_REQUEST";
    EnvelopeMessageType["SIMULATION_RUN_CANCEL_REQUEST"] = "SIMULATION_RUN_CANCEL_REQUEST";
    EnvelopeMessageType["SIMULATION_RUN_CANCEL_RESULT"] = "SIMULATION_RUN_CANCEL_RESULT";
    EnvelopeMessageType["CROSS_REP_DATA_REQUEST"] = "CROSS_REP_DATA_REQUEST";
    EnvelopeMessageType["CROSS_REP_DATA_RESULT"] = "CROSS_REP_DATA_RESULT";
    EnvelopeMessageType["CROSS_REP_BATCH_DATA_REQUEST"] = "CROSS_REP_BATCH_DATA_REQUEST";
    EnvelopeMessageType["CROSS_REP_BATCH_DATA_RESULT"] = "CROSS_REP_BATCH_DATA_RESULT";
    // Sync All (model + scenarios + runs)
    EnvelopeMessageType["SYNC_ALL_REQUEST"] = "SYNC_ALL_REQUEST";
    EnvelopeMessageType["SYNC_ALL_SUCCESS"] = "SYNC_ALL_SUCCESS";
    EnvelopeMessageType["SYNC_ALL_ERROR"] = "SYNC_ALL_ERROR";
    // Modal
    EnvelopeMessageType["OPEN_RESULTS_MODAL"] = "OPEN_RESULTS_MODAL";
    EnvelopeMessageType["OPEN_ANIMATION_MODAL"] = "OPEN_ANIMATION_MODAL";
    // Studio Embed Token Relay
    EnvelopeMessageType["REQUEST_STUDIO_TOKEN"] = "REQUEST_STUDIO_TOKEN";
    EnvelopeMessageType["STUDIO_TOKEN"] = "STUDIO_TOKEN";
    // Embedded scenarios editor (Phase 2)
    EnvelopeMessageType["OPEN_SCENARIOS_MODAL"] = "OPEN_SCENARIOS_MODAL";
    EnvelopeMessageType["REQUEST_STUDIO_CATALOG"] = "REQUEST_STUDIO_CATALOG";
    EnvelopeMessageType["STUDIO_CATALOG"] = "STUDIO_CATALOG";
    // Embedded scenarios editor — run delegation (Phase 3b)
    EnvelopeMessageType["RUN_SCENARIO"] = "RUN_SCENARIO";
    EnvelopeMessageType["RUN_SCENARIO_RESULT"] = "RUN_SCENARIO_RESULT";
    // DevTools
    EnvelopeMessageType["DEVTOOLS_SWIMLANE_SCAN_REQUEST"] = "DEVTOOLS_SWIMLANE_SCAN_REQUEST";
    EnvelopeMessageType["DEVTOOLS_SWIMLANE_SCAN_RESULT"] = "DEVTOOLS_SWIMLANE_SCAN_RESULT";
    EnvelopeMessageType["DEVTOOLS_KINDE_AUTH_REQUEST"] = "DEVTOOLS_KINDE_AUTH_REQUEST";
    EnvelopeMessageType["DEVTOOLS_KINDE_AUTH_RESULT"] = "DEVTOOLS_KINDE_AUTH_RESULT";
    // Swimlane Operations
    EnvelopeMessageType["SWIMLANE_UPDATE"] = "SWIMLANE_UPDATE";
    EnvelopeMessageType["SWIMLANE_UPDATE_RESULT"] = "SWIMLANE_UPDATE_RESULT";
    EnvelopeMessageType["SWIMLANE_CONVERT_LANE"] = "SWIMLANE_CONVERT_LANE";
    EnvelopeMessageType["SWIMLANE_CONVERT_LANE_RESULT"] = "SWIMLANE_CONVERT_LANE_RESULT";
    // Billing & Entitlements (Kinde)
    EnvelopeMessageType["ENTITLEMENTS_STATUS"] = "ENTITLEMENTS_STATUS";
    EnvelopeMessageType["PORTAL_URL_REQUEST"] = "PORTAL_URL_REQUEST";
    EnvelopeMessageType["PORTAL_URL_RESPONSE"] = "PORTAL_URL_RESPONSE";
    // Analytics
    EnvelopeMessageType["ANALYTICS_TRACK"] = "ANALYTICS_TRACK";
})(EnvelopeMessageType = exports.EnvelopeMessageType || (exports.EnvelopeMessageType = {}));
