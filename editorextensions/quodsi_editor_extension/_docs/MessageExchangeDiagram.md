# Quodsi Message Exchange Diagram

This document outlines the message exchanges between the Quodsi LucidChart Extension (host) and the embedded React panels. It documents the flow, purpose, and handling of messages in the system.

## Message Flow Notation

```
MESSAGE_TYPE: [Direction: React → Extension | Extension → React]
  • Summary: [Natural language description of the intent/purpose]
  • Sender: [ClassName.methodName (filePath)]
  • Handler: [ClassName.methodName (filePath)]
  • Payload: [Key fields in the message]
  • Response: [RESPONSE_MESSAGE_TYPE if applicable]
  • Auth Required: [Yes/No - whether authentication is required]
  • Typical Sequence: [When this message typically occurs in a flow]
  • Error Handling: [How errors are handled for this message]
```

## Framework & Lifecycle Messages

### REACT_APP_READY

**REACT_APP_READY: React → Extension**
  • Summary: Signals that the React application has initialized and is ready to receive messages. This is the first message sent when a panel loads.
  • Sender: useReactAppReadyEffect (quodsim-react/src/messaging/effects/reactAppReadyEffects.ts)
  • Handler: MessageRouter.handleReactAppReady (src/core/messaging/MessageRouter.ts)
  • Payload: { panel: string, isAuthenticated: boolean, user?: UserInfo }
  • Response: AUTH_STATUS, SUBSCRIPTION_STATUS
  • Auth Required: No
  • Typical Sequence: First message after panel iframe loads -> Extension marks channel as ready -> Extension responds with current auth status
  • Error Handling: If processing fails, panel remains in uninitialized state; emergency timer ensures it's sent even if normal flow fails

### ERROR

**ERROR: Bidirectional**
  • Summary: Reports an error that occurred in either the host or React application
  • Sender: Various (both Extension and React)
  • Handler: frameworkMapper.mapMessageToAction (quodsim-react/src/messaging/mappers/framework.mapper.ts) or FrameworkHandler.handleMessage (src/core/messaging/handlers/frameworkHandler.ts)
  • Payload: { message: string, details?: any, severity: 'error' | 'warning' | 'info' }
  • Response: None
  • Auth Required: No
  • Typical Sequence: Can occur at any time in response to errors
  • Error Handling: Logged to console but not further processed to avoid infinite error loops

### LOG

**LOG: Bidirectional**
  • Summary: Sends log information for debugging purposes
  • Sender: Various (both Extension and React)
  • Handler: frameworkMapper.mapMessageToAction (quodsim-react/src/messaging/mappers/framework.mapper.ts) or FrameworkHandler.handleMessage (src/core/messaging/handlers/frameworkHandler.ts)
  • Payload: { message: string, level: 'debug' | 'info' | 'warn' | 'error', data?: any }
  • Response: None
  • Auth Required: No
  • Typical Sequence: Can occur at any time for debugging
  • Error Handling: Logged to console; errors in processing are ignored

## Authentication Messages

### AUTH_LOGIN_SUCCESS

**AUTH_LOGIN_SUCCESS: React → Extension**
  • Summary: Notifies the extension that a user has successfully logged in, allowing the extension to update authentication state and synchronize across panels
  • Sender: useAuthSender.sendLoginSuccess (quodsim-react/src/messaging/senders/authSender.ts)
  • Handler: AuthHandler.handleLoginSuccess (src/core/messaging/handlers/authHandler.ts)
  • Payload: { idToken: string, user: UserInfo, newUser: boolean }
  • Response: AUTH_STATUS (broadcast to all panels)
  • Auth Required: No (initiates authentication)
  • Typical Sequence: User completes login in auth panel -> AUTH_LOGIN_SUCCESS -> Extension updates state -> AUTH_STATUS to all panels
  • Error Handling: Multiple fallback mechanisms ensure reliable delivery, including localStorage backup and direct panel access

### AUTH_LOGOUT

**AUTH_LOGOUT: React → Extension**
  • Summary: Signals that the user has logged out, allowing the extension to clear authentication state across all panels
  • Sender: useAuthSender.sendLogout (quodsim-react/src/messaging/senders/authSender.ts)
  • Handler: AuthHandler.handleLogout (src/core/messaging/handlers/authHandler.ts)
  • Payload: {}
  • Response: AUTH_STATUS (with isAuthenticated: false)
  • Auth Required: Yes
  • Typical Sequence: User clicks logout -> AUTH_LOGOUT -> Extension clears state -> AUTH_STATUS to all panels
  • Error Handling: Clears localStorage even if other operations fail, ensuring consistent state

### AUTH_STATUS

**AUTH_STATUS: Extension → React**
  • Summary: Communicates the current authentication state to a panel, allowing it to update its UI accordingly
  • Sender: MessageRouter.sendAuthStatus (src/core/messaging/MessageRouter.ts)
  • Handler: auth.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/auth.mapper.ts)
  • Payload: { isAuthenticated: boolean, userInfo?: UserInfo }
  • Response: None
  • Auth Required: No
  • Typical Sequence: Sent after REACT_APP_READY, after AUTH_LOGIN_SUCCESS, after AUTH_LOGOUT, or in response to REQUEST_AUTH_STATUS
  • Error Handling: Multiple delivery mechanisms ensure reliable reception; React stores state in localStorage for resilience

### AUTH_REQUIRED

**AUTH_REQUIRED: Extension → React**
  • Summary: Informs React app that authentication is required to perform a requested operation
  • Sender: Various handlers (src/core/messaging/handlers/*.ts)
  • Handler: auth.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/auth.mapper.ts)
  • Payload: { requestedOperation: string, redirectAfterAuth?: boolean }
  • Response: None
  • Auth Required: No (triggers authentication flow)
  • Typical Sequence: User attempts action requiring auth -> AUTH_REQUIRED -> React shows login UI
  • Error Handling: React updates UI to show authentication required state

### REQUEST_AUTH_STATUS

**REQUEST_AUTH_STATUS: React → Extension**
  • Summary: Requests the current authentication state from the extension, useful when a panel needs to confirm its state
  • Sender: Various React components
  • Handler: AuthHandler.handleRequestAuthStatus (src/core/messaging/handlers/authHandler.ts)
  • Payload: {}
  • Response: AUTH_STATUS
  • Auth Required: No
  • Typical Sequence: Panel needs auth state confirmation -> REQUEST_AUTH_STATUS -> Extension responds with AUTH_STATUS
  • Error Handling: Uses localStorage as fallback source of auth state if router state is missing

## Selection & Context Messages

### SELECTION_CHANGED

**SELECTION_CHANGED: Extension → React**
  • Summary: Informs the React app that the user has selected an element in LucidChart, allowing it to display the appropriate editor for that element type
  • Sender: SelectionHandler.sendSelectionChangedMessage (src/core/messaging/handlers/selection/SelectionHandler.ts)
  • Handler: selection.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/selection.mapper.ts)
  • Payload: { selectionType: string, selectionState: { pageId: string, selectedIds: string[] }, modelItemData?: object, documentContext: object }
  • Response: None
  • Auth Required: No
  • Typical Sequence: User selects element in LucidChart -> Selection event -> SELECTION_CHANGED -> React updates UI with appropriate editor
  • Error Handling: If modelItemData is missing, React shows empty selection state; handles type inconsistencies by deriving from multiple sources

### MODEL_CONTEXT

**MODEL_CONTEXT: Extension → React**
  • Summary: Provides information about the current document and page context, helping React understand the current environment
  • Sender: DocumentContext.sendContextUpdate (src/core/messaging/handlers/selection/state/DocumentContext.ts)
  • Handler: selection.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/selection.mapper.ts)
  • Payload: { documentId: string, pageId: string, title: string, isQuodsiModel: boolean, metadata?: object }
  • Response: None
  • Auth Required: No
  • Typical Sequence: Page load or page change -> MODEL_CONTEXT -> React updates document context state
  • Error Handling: If context data is incomplete, React uses default values

## Element Operations Messages

### ELEMENT_UPDATE

**ELEMENT_UPDATE: React → Extension**
  • Summary: Requests that the extension update a LucidChart element with modified properties after a user edits and saves changes in the element editor
  • Sender: modelOpsSender.updateElementData (quodsim-react/src/messaging/senders/modelOpsSender.ts)
  • Handler: ElementOpsHandler.handleElementUpdate (src/core/messaging/handlers/elementOpsHandler.ts)
  • Payload: { elementId: string, type: string, data: object }
  • Response: ELEMENT_UPDATE_RESULT
  • Auth Required: Yes
  • Typical Sequence: User edits element and clicks save -> ELEMENT_UPDATE -> Extension updates LucidChart element -> ELEMENT_UPDATE_RESULT
  • Error Handling: Extension catches errors and returns ELEMENT_UPDATE_RESULT with success: false and errorMessage

### ELEMENT_UPDATE_RESULT

**ELEMENT_UPDATE_RESULT: Extension → React**
  • Summary: Provides feedback about the result of an element update operation, allowing the React app to show success or error messages
  • Sender: ElementOpsHandler.handleElementUpdate (src/core/messaging/handlers/elementOpsHandler.ts)
  • Handler: elementOps.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/elementOps.mapper.ts)
  • Payload: { success: boolean, elementId: string, errorMessage?: string }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: After ELEMENT_UPDATE processing -> ELEMENT_UPDATE_RESULT -> React shows success/error message
  • Error Handling: React displays error message if success is false; provides error details to user

### ELEMENT_CONVERT

**ELEMENT_CONVERT: React → Extension**
  • Summary: Requests that the extension convert an element from one type to another (e.g., Activity to Generator)
  • Sender: modelOpsSender.convertElement (quodsim-react/src/messaging/senders/modelOpsSender.ts)
  • Handler: ElementOpsHandler.handleElementConvert (src/core/messaging/handlers/elementOpsHandler.ts)
  • Payload: { elementId: string, newType: string, data?: object }
  • Response: ELEMENT_CONVERT_RESULT
  • Auth Required: Yes
  • Typical Sequence: User selects convert option in UI -> ELEMENT_CONVERT -> Extension converts element -> ELEMENT_CONVERT_RESULT
  • Error Handling: Extension catches errors and returns ELEMENT_CONVERT_RESULT with success: false and errorMessage

### ELEMENT_CONVERT_RESULT

**ELEMENT_CONVERT_RESULT: Extension → React**
  • Summary: Provides feedback about the result of an element conversion operation
  • Sender: ElementOpsHandler.handleElementConvert (src/core/messaging/handlers/elementOpsHandler.ts)
  • Handler: elementOps.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/elementOps.mapper.ts)
  • Payload: { success: boolean, elementId: string, errorMessage?: string }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: After ELEMENT_CONVERT processing -> ELEMENT_CONVERT_RESULT -> React shows success/error message
  • Error Handling: React displays error message if success is false

## Model Operations Messages

### MODEL_VALIDATE

**MODEL_VALIDATE: React → Extension**
  • Summary: Requests validation of the entire model, checking for consistency and completeness
  • Sender: modelOpsSender.validateModel (quodsim-react/src/messaging/senders/modelOpsSender.ts)
  • Handler: ModelOpsHandler.handleModelValidate (src/core/messaging/handlers/modelOpsHandler.ts)
  • Payload: { documentId: string }
  • Response: MODEL_VALIDATION_RESULT
  • Auth Required: Yes
  • Typical Sequence: User clicks validate button -> MODEL_VALIDATE -> Extension validates model -> MODEL_VALIDATION_RESULT
  • Error Handling: Extension catches validation errors and includes them in the result payload

### MODEL_VALIDATION_RESULT

**MODEL_VALIDATION_RESULT: Extension → React**
  • Summary: Returns validation results for the model, including any errors or warnings found
  • Sender: ModelOpsHandler.handleModelValidate (src/core/messaging/handlers/modelOpsHandler.ts)
  • Handler: validation.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/validation.mapper.ts)
  • Payload: { isValid: boolean, messages: ValidationMessage[], errorCount: number, warningCount: number }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: After MODEL_VALIDATE processing -> MODEL_VALIDATION_RESULT -> React displays validation results
  • Error Handling: React displays validation errors and warnings in the UI

### MODEL_CONVERT

**MODEL_CONVERT: React → Extension**
  • Summary: Requests conversion of the current page into a Quodsi model
  • Sender: modelOpsSender.convertPage (quodsim-react/src/messaging/senders/modelOpsSender.ts)
  • Handler: ModelOpsHandler.handleModelConvert (src/core/messaging/handlers/modelOpsHandler.ts)
  • Payload: { documentId?: string, elementId?: string, targetType?: string }
  • Response: MODEL_CONVERSION_RESULT
  • Auth Required: Yes
  • Typical Sequence: User clicks "Convert to Model" button -> MODEL_CONVERT -> Extension converts page -> MODEL_CONVERSION_RESULT
  • Error Handling: Extension catches conversion errors and returns them in the result payload

### MODEL_CONVERSION_RESULT

**MODEL_CONVERSION_RESULT: Extension → React**
  • Summary: Returns the result of a model conversion operation
  • Sender: ModelOpsHandler.handleModelConvert (src/core/messaging/handlers/modelOpsHandler.ts)
  • Handler: modelOps.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/modelOps.mapper.ts)
  • Payload: { success: boolean, documentId: string, errorMessage?: string, warnings?: string[] }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: After MODEL_CONVERT processing -> MODEL_CONVERSION_RESULT -> React shows success/error message
  • Error Handling: React displays error message if success is false, with details if available

### MODEL_REMOVE

**MODEL_REMOVE: React → Extension**
  • Summary: Requests removal of Quodsi model data from the current page
  • Sender: modelOpsSender.removeModel (quodsim-react/src/messaging/senders/modelOpsSender.ts)
  • Handler: ModelOpsHandler.handleModelRemove (src/core/messaging/handlers/modelOpsHandler.ts)
  • Payload: { documentId: string }
  • Response: MODEL_REMOVE_RESULT
  • Auth Required: Yes
  • Typical Sequence: User clicks "Remove Model" button -> MODEL_REMOVE -> Extension removes model data -> MODEL_REMOVE_RESULT
  • Error Handling: Extension catches errors and returns them in the result payload

### MODEL_REMOVE_RESULT

**MODEL_REMOVE_RESULT: Extension → React**
  • Summary: Returns the result of a model removal operation
  • Sender: ModelOpsHandler.handleModelRemove (src/core/messaging/handlers/modelOpsHandler.ts)
  • Handler: modelOps.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/modelOps.mapper.ts)
  • Payload: { success: boolean, documentId: string, errorMessage?: string }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: After MODEL_REMOVE processing -> MODEL_REMOVE_RESULT -> React shows success/error message
  • Error Handling: React displays error message if success is false

### RESULTS_PAGE_CREATE

**RESULTS_PAGE_CREATE: React → Extension**
  • Summary: Requests creation of a dashboard page with simulation results
  • Sender: modelOpsSender.createResultsPage (quodsim-react/src/messaging/senders/modelOpsSender.ts)
  • Handler: ModelOpsHandler.handleResultsPageCreate (src/core/messaging/handlers/modelOpsHandler.ts)
  • Payload: { jobId: string, documentId: string, pageTitle?: string }
  • Response: RESULTS_PAGE_CREATE_RESULT
  • Auth Required: Yes
  • Typical Sequence: User clicks "View Results" for simulation -> RESULTS_PAGE_CREATE -> Extension creates dashboard -> RESULTS_PAGE_CREATE_RESULT
  • Error Handling: Extension catches errors during dashboard creation and returns them in the result payload

### RESULTS_PAGE_CREATE_RESULT

**RESULTS_PAGE_CREATE_RESULT: Extension → React**
  • Summary: Returns the result of a dashboard creation operation
  • Sender: ModelOpsHandler.handleResultsPageCreate (src/core/messaging/handlers/modelOpsHandler.ts)
  • Handler: modelOps.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/modelOps.mapper.ts)
  • Payload: { success: boolean, documentId: string, pageId?: string, errorMessage?: string }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: After RESULTS_PAGE_CREATE processing -> RESULTS_PAGE_CREATE_RESULT -> React shows success/error message
  • Error Handling: React displays error message if success is false, with details if available

## Simulation Messages

### MODEL_RUN_REQUEST

**MODEL_RUN_REQUEST: React → Extension**
  • Summary: Requests the execution of a simulation run for the current model
  • Sender: simulationSender.runSimulation (quodsim-react/src/messaging/senders/simulationSender.ts)
  • Handler: SimulationHandler.handleRunRequest (src/core/messaging/handlers/simulationHandler.ts)
  • Payload: { documentId: string, modelId?: string, priority?: number, options?: object }
  • Response: MODEL_RUN_ACK
  • Auth Required: Yes
  • Typical Sequence: User clicks "Run Simulation" button -> MODEL_RUN_REQUEST -> Extension submits simulation job -> MODEL_RUN_ACK
  • Error Handling: Extension catches submission errors and returns appropriate error messages

### MODEL_RUN_ACK

**MODEL_RUN_ACK: Extension → React**
  • Summary: Acknowledges that a simulation run request has been received and processed
  • Sender: SimulationHandler.handleRunRequest (src/core/messaging/handlers/simulationHandler.ts)
  • Handler: simulation.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/simulation.mapper.ts)
  • Payload: { success: boolean, jobId?: string, documentId: string, errorMessage?: string }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: After MODEL_RUN_REQUEST processing -> MODEL_RUN_ACK -> React updates UI to show simulation in progress
  • Error Handling: React displays error message if success is false, otherwise updates UI to show pending state

### MODEL_RUN_STATUS

**MODEL_RUN_STATUS: Extension → React**
  • Summary: Provides updates on the status of a running simulation
  • Sender: SimulationHandler.checkAndUpdateStatus (src/core/messaging/handlers/simulationHandler.ts)
  • Handler: simulation.mapper.mapMessageToAction (quodsim-react/src/messaging/mappers/simulation.mapper.ts)
  • Payload: { jobId: string, documentId: string, status: 'pending' | 'running' | 'completed' | 'failed', progress?: number, errorMessage?: string, hasResults?: boolean }
  • Response: None
  • Auth Required: Yes
  • Typical Sequence: Periodically after MODEL_RUN_ACK -> MODEL_RUN_STATUS -> React updates progress indicator
  • Error Handling: React shows error state if status is 'failed'; enables "View Results" button when status is 'completed' and hasResults is true

## Common Message Sequences

### Panel Initialization Sequence

1. User opens panel (ContentDockPanel or RightDockPanel)
2. React app loads and initializes
3. React sends REACT_APP_READY to Extension
4. Extension processes REACT_APP_READY, marking channel as ready
5. Extension sends AUTH_STATUS to React
6. Extension sends SUBSCRIPTION_STATUS to React (if authenticated)
7. If content panel, React shows login UI if not authenticated
8. If model panel and authenticated, Extension sends current selection state with SELECTION_CHANGED

### Authentication Sequence

1. User enters credentials in auth panel
2. React authenticates with identity provider
3. React sends AUTH_LOGIN_SUCCESS to Extension
4. Extension updates internal auth state
5. Extension broadcasts AUTH_STATUS to all panels
6. Extension sends SUBSCRIPTION_STATUS to all panels
7. Model panel becomes usable with authenticated features

### Element Editing Sequence

1. User selects element in LucidChart
2. Extension sends SELECTION_CHANGED to React
3. React displays appropriate editor based on element type
4. User edits element properties
5. User clicks Save
6. React sends ELEMENT_UPDATE to Extension
7. Extension updates element data in LucidChart
8. Extension validates model
9. Extension sends ELEMENT_UPDATE_RESULT to React
10. React shows success/error message

### Simulation Sequence

1. User clicks "Run Simulation" button
2. React sends MODEL_RUN_REQUEST to Extension 
3. Extension submits simulation job
4. Extension sends MODEL_RUN_ACK to React
5. React shows simulation in progress UI
6. Extension periodically checks simulation status
7. Extension sends MODEL_RUN_STATUS updates to React
8. React updates progress indicator
9. When simulation completes, MODEL_RUN_STATUS indicates completion
10. React enables "View Results" button
11. User clicks "View Results"
12. React sends RESULTS_PAGE_CREATE to Extension
13. Extension creates dashboard page
14. Extension sends RESULTS_PAGE_CREATE_RESULT to React
