/**
 * Message type constants for the Quodsi postMessage protocol.
 * These constants serve as discriminators for the message payload schemas.
 */
export enum EnvelopeMessageType {
  // Framework & Lifecycle
  REACT_APP_READY = "REACT_APP_READY",
  ERROR = "ERROR",
  LOG = "LOG",
  
  // Authentication
  AUTH_LOGOUT = "AUTH_LOGOUT",
  AUTH_STATUS = "AUTH_STATUS",
  AUTH_REQUIRED = "AUTH_REQUIRED",
  AUTH_ERROR = "AUTH_ERROR",
  
  // Selection & Context
  MODEL_CONTEXT = "MODEL_CONTEXT",
  SELECTION_CHANGED = "SELECTION_CHANGED",
  
  // Simulation Run
  MODEL_RUN_REQUEST = "MODEL_RUN_REQUEST",
  MODEL_RUN_STATUS = "MODEL_RUN_STATUS",  // Now includes initial acknowledgment (queuedAt field)
  
  // Model Operations
  MODEL_VALIDATE = "MODEL_VALIDATE",
  MODEL_VALIDATION_RESULT = "MODEL_VALIDATION_RESULT",
  MODEL_CONVERT = "MODEL_CONVERT",
  MODEL_CONVERSION_RESULT = "MODEL_CONVERSION_RESULT",

  MODEL_REMOVE = "MODEL_REMOVE",
  MODEL_REMOVE_RESULT = "MODEL_REMOVE_RESULT",
  MODEL_JSON_REQUEST = "MODEL_JSON_REQUEST",
  MODEL_JSON_RESPONSE = "MODEL_JSON_RESPONSE",

  // Element Operations
  ELEMENT_SELECT = "ELEMENT_SELECT",
  ELEMENT_UPDATE = "ELEMENT_UPDATE",
  ELEMENT_UPDATE_RESULT = "ELEMENT_UPDATE_RESULT",
  ELEMENT_CONVERT = "ELEMENT_CONVERT",
  ELEMENT_CONVERT_RESULT = "ELEMENT_CONVERT_RESULT",
  STATES_UPDATE = "STATES_UPDATE",
  STATES_UPDATE_RESULT = "STATES_UPDATE_RESULT",
  ENTITIES_UPDATE = "ENTITIES_UPDATE",
  ENTITIES_UPDATE_RESULT = "ENTITIES_UPDATE_RESULT",

  // Model-root list operations. Deliberately GENERIC: the patch is forwarded
  // whole and dispatched per key by the handler, so adding a second
  // model-level list (arrivalSchedules) needs no new message type. A per-key
  // message is what let `{ arrivalPatterns }` be silently dropped once before.
  MODEL_ROOT_REQUEST = "MODEL_ROOT_REQUEST",
  MODEL_ROOT_SNAPSHOT = "MODEL_ROOT_SNAPSHOT",
  MODEL_ROOT_UPDATE = "MODEL_ROOT_UPDATE",
  MODEL_ROOT_UPDATE_RESULT = "MODEL_ROOT_UPDATE_RESULT",

  RESOURCE_REQUIREMENTS_UPDATE = "RESOURCE_REQUIREMENTS_UPDATE",
  RESOURCE_REQUIREMENTS_UPDATE_RESULT = "RESOURCE_REQUIREMENTS_UPDATE_RESULT",

  // Modal
  // Sent by a chromeless embed modal's own "Close" button to ask the host to
  // hide the modal (chromeless modals have no native title-bar X).
  CLOSE_MODAL = "CLOSE_MODAL",

  // Studio Embed Token Relay
  REQUEST_STUDIO_TOKEN = "REQUEST_STUDIO_TOKEN",
  STUDIO_TOKEN = "STUDIO_TOKEN",

  // Studio Embed deferred-path relay. The modal opens INSTANTLY in a "pending"
  // state (before the server model id is resolved); the embed view PULLS the
  // resolved studioPath (REQUEST → reply) once its channel is registered — pull,
  // not push, to avoid the channel-registration race that drops pushed messages.
  REQUEST_STUDIO_EMBED_PATH = "REQUEST_STUDIO_EMBED_PATH",
  STUDIO_EMBED_PATH = "STUDIO_EMBED_PATH",

  // Embedded Studio surfaces
  OPEN_STUDIES_MODAL = "OPEN_STUDIES_MODAL",
  OPEN_STATUS_MODAL = "OPEN_STATUS_MODAL",
  OPEN_ADVISOR_MODAL = "OPEN_ADVISOR_MODAL",
  REQUEST_STUDIO_CATALOG = "REQUEST_STUDIO_CATALOG",
  STUDIO_CATALOG = "STUDIO_CATALOG",

  // Arrival Pattern editor -- hosted directly by the extension (not an
  // embedded Studio surface): opens PatternEditorModal, a RoutingModal that
  // loads the packaged extension's own quodsim-react bundle at ?view=pattern
  // so the modal can escape the 300px right-dock panel iframe it used to be
  // trapped in.
  OPEN_PATTERN_MODAL = "OPEN_PATTERN_MODAL",

  // Arrival Schedule editor -- hosted directly by the extension (not an
  // embedded Studio surface), mirroring OPEN_PATTERN_MODAL above: opens a
  // RoutingModal that loads the packaged extension's own quodsim-react
  // bundle at ?view=schedule so the modal can escape the 300px right-dock
  // panel iframe it used to be trapped in.
  OPEN_SCHEDULE_MODAL = "OPEN_SCHEDULE_MODAL",

  // Work Schedule editor (time-varying capacity, spec 2026-08-27) -- the
  // third member of the same family as the two above, and wired the same
  // way: a RoutingModal loading ?view=work-schedule on the 'work-schedule'
  // channel. Its payload carries a WORK-SCHEDULE ID, not a shape id: a work
  // schedule is a model-level record and the shape that FOLLOWS it is edited
  // elsewhere (the Resource/Activity capacity control).
  OPEN_WORK_SCHEDULE_MODAL = "OPEN_WORK_SCHEDULE_MODAL",

  // Settings screen (Complexity Views, Task 11b) -- the fourth member of the
  // same family as the three above, and wired the same way: a RoutingModal
  // loading ?view=settings on the 'settings' channel. Unlike the three
  // above, Settings is GLOBAL: its payload carries no id at all (no shapeId,
  // no scheduleId) -- there is no element context, only an optional
  // modalSize. It hosts quodsi_studio's shared SettingsPanel, which reads
  // and writes the viewer's own view preference directly (localStorage),
  // never the model.
  OPEN_SETTINGS_MODAL = "OPEN_SETTINGS_MODAL",

  // Diagram Mapping (Phase 2B)
  ANALYZE_PAGE = "ANALYZE_PAGE",
  PAGE_ANALYSIS_RESULT = "PAGE_ANALYSIS_RESULT",
  APPLY_SHAPE_CHANGES = "APPLY_SHAPE_CHANGES",
  APPLY_SHAPE_CHANGES_RESULT = "APPLY_SHAPE_CHANGES_RESULT",
  OPEN_DIAGRAM_MAPPING_MODAL = "OPEN_DIAGRAM_MAPPING_MODAL",
  AUTO_CONVERT_PAGE = "AUTO_CONVERT_PAGE",

  // Embedded scenarios editor — run delegation (Phase 3b)
  RUN_SCENARIO = "RUN_SCENARIO",
  RUN_SCENARIO_RESULT = "RUN_SCENARIO_RESULT",

  // Canvas navigation — locate/select a diagram element from the embedded Studio iframe
  LOCATE_ELEMENT = "LOCATE_ELEMENT",

  // DevTools
  DEVTOOLS_SWIMLANE_SCAN_REQUEST = "DEVTOOLS_SWIMLANE_SCAN_REQUEST",
  DEVTOOLS_SWIMLANE_SCAN_RESULT = "DEVTOOLS_SWIMLANE_SCAN_RESULT",
  DEVTOOLS_KINDE_AUTH_REQUEST = "DEVTOOLS_KINDE_AUTH_REQUEST",
  DEVTOOLS_KINDE_AUTH_RESULT = "DEVTOOLS_KINDE_AUTH_RESULT",

  // Swimlane Operations
  SWIMLANE_UPDATE = "SWIMLANE_UPDATE",
  SWIMLANE_UPDATE_RESULT = "SWIMLANE_UPDATE_RESULT",

  // Billing & Entitlements (Kinde)
  ENTITLEMENTS_STATUS = "ENTITLEMENTS_STATUS",
  PORTAL_URL_REQUEST = "PORTAL_URL_REQUEST",
  PORTAL_URL_RESPONSE = "PORTAL_URL_RESPONSE",

  // PlanDetails contact affordance — one-shot "I'm interested in upgrading"
  // ping fired from the mailto/copy-email actions. See upgradeInterestSender.ts
  // (panel) and upgradeInterestHandler.ts (host).
  UPGRADE_INTEREST_PING = "UPGRADE_INTEREST_PING",
  UPGRADE_INTEREST_PING_RESULT = "UPGRADE_INTEREST_PING_RESULT",
}
