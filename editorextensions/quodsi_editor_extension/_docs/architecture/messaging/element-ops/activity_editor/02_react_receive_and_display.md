# Scenario 2: React Side (Iframe) - Receiving SELECTION_CHANGED → Displaying ActivityEditor

**Context**: Extension has sent a SELECTION_CHANGED message via postMessage. This document describes how React receives the message, updates Redux state, processes the data through hooks, and renders the ActivityEditor component hierarchy.

**Duration**: ~10-20ms

**Key Files**:
- `quodsim-react/src/messaging/MessageProvider.tsx` - Receives postMessage
- `quodsim-react/src/messaging/mappers/selection.mapper.ts` - Processes SELECTION_CHANGED
- `quodsim-react/src/messaging/state/selectionSlice.ts` - Redux reducer
- `quodsim-react/src/messaging/hooks/useModelPanel.ts` - Main data hook
- `quodsim-react/src/features/modelPanel/ModelPanel.tsx` - Top-level panel
- `quodsim-react/src/features/modelPanel/ElementEditor.tsx` - Element editor router
- `quodsim-react/src/features/editors/ActivityEditor.tsx` - Activity-specific editor

---

## Part A: Message Reception & State Update

### 1. Window message listener receives postMessage
**Location**: `MessageProvider.tsx` - useEffect with window event listener

**Context**: MessageProvider component is mounted at app startup and maintains a persistent message listener.

**Setup**:
```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Validate message
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    const envelope = event.data as EnvelopeBase;

    // Route to appropriate mapper
    // ...
  };

  window.addEventListener('message', handleMessage);

  return () => window.removeEventListener('message', handleMessage);
}, []);
```

**When SELECTION_CHANGED arrives**:
- `event.data` contains the envelope from extension
- `event.origin` is validated (should be same origin or trusted)
- Envelope structure validated (has id, type, source, target, version, data)

---

### 2. MessageProvider routes to mapper
**Location**: `MessageProvider.tsx` - inside handleMessage function

**Purpose**: Determine which mapper should process this message type

**Logic**:
```typescript
const handleMessage = (event: MessageEvent) => {
  const envelope = event.data as EnvelopeBase;

  // Check message type
  switch (envelope.type) {
    case EnvelopeMessageType.SELECTION_CHANGED:
      // Route to selection mapper
      const action = selectionMapper.map(envelope);
      if (action) {
        dispatch(action);
      }
      break;

    case EnvelopeMessageType.VALIDATION_RESULT:
      // Route to validation mapper
      // ...
      break;

    // ... other message types
  }
};
```

**For SELECTION_CHANGED**: Routes to `selection.mapper.ts`

---

### 3. selection.mapper.ts processes message
**Location**: `mappers/selection.mapper.ts` - `handleSelectionChanged()` function

**Purpose**: Extract data from message and create Redux action

**Input**: Envelope with SELECTION_CHANGED type
```typescript
{
  type: "SELECTION_CHANGED",
  data: {
    selectedElements: [...],
    documentContext: {...},
    modelItemData: {...},
    referenceData: {...},
    // ... all other fields from extension
  }
}
```

**Processing**:
```typescript
function handleSelectionChanged(msg: EnvelopeBase): MessagingAction | null {
  const data = msg.data;

  // Extract fields
  const elements = data.selectedElements || [];
  const totalElements = data.totalElementCount || 0;
  const diagramElementType = data.diagramElementType;

  // Extract document context
  const documentContext = data.documentContext ? {
    documentId: data.documentContext.documentId,
    pageId: data.documentContext.pageId,
    documentTitle: data.documentContext.title || data.documentContext.documentTitle,
    isQuodsiModel: data.documentContext.isQuodsiModel,
    metadata: data.documentContext.metadata
  } : undefined;

  // Extract reference data
  const referenceData = data.referenceData ? {
    activities: data.referenceData.activities,
    resources: data.referenceData.resources,
    entities: data.referenceData.entities,
    resourceRequirements: data.referenceData.resourceRequirements,
    connectors: data.referenceData.connectors,
    states: data.referenceData.states
  } : undefined;

  // Create action
  return {
    type: 'SELECTION_UPDATE',
    elements,
    totalElements,
    diagramElementType,
    documentContext,
    referenceData
  };
}
```

**Output**: Redux action of type `SELECTION_UPDATE`

**Note**: In v2.0, `outgoingConnectors` is NOT extracted from the message (removed from protocol).

---

### 4. Dispatch to Redux
**Location**: `MessageProvider.tsx` - `dispatch(action)`

**Purpose**: Send action to Redux store

**Code**:
```typescript
if (action) {
  dispatch(action);
}
```

**What happens**:
- Action flows through `rootReducer`
- Each reducer checks if it should handle this action type
- `selectionReducer` handles `SELECTION_UPDATE`

---

### 5. selectionReducer handles SELECTION_UPDATE
**Location**: `state/selectionSlice.ts:52-128` - `selectionReducer()` function

**Purpose**: Update selection state in Redux with new activity data

**Input**:
- Current `state`: Previous selection state
- `action`: SELECTION_UPDATE action from mapper

**Processing**:

#### 5a. Handle document context
```typescript
let documentContext = state.documentContext;

// If we have embedded document context in the action, use it
if (action.documentContext) {
  logger.debug('Using embedded document context from SELECTION_UPDATE action');
  documentContext = {
    ...action.documentContext,
    totalElements: action.totalElements,
  };
}
```

This ensures we always have document context (page info, isQuodsiModel flag).

#### 5b. Update state
```typescript
const updatedState = {
  ...state,
  selectedElements: action.elements,
  diagramElementType: action.diagramElementType || state.diagramElementType,
  documentContext: documentContext ? {
    ...documentContext,
    totalElements: action.totalElements,
    isQuodsiModel: documentContext.isQuodsiModel
  } : undefined,
  referenceData: action.referenceData || state.referenceData,
  lastUpdated: Date.now(),
};
```

**Key points**:
- Replaces `selectedElements` with new activity
- Updates `referenceData` with ALL activities, resources, entities, connectors, states, requirements
- Preserves existing values if action doesn't provide them (`||` operator)
- Sets `lastUpdated` timestamp

#### 5c. Log state changes
```typescript
logger.log('SELECTION_UPDATE - Updated state:', {
  selectedElementsCount: updatedState.selectedElements.length,
  firstElementId: updatedState.selectedElements[0]?.id,
  firstElementType: updatedState.selectedElements[0]?.type,
  hasDocumentContext: !!updatedState.documentContext,
  isQuodsiModel: updatedState.documentContext?.isQuodsiModel,
  documentId: updatedState.documentContext?.documentId,
  documentTitle: updatedState.documentContext?.documentTitle,
  hasReferenceData: !!updatedState.referenceData,
  referenceDataSummary: updatedState.referenceData ? {
    activities: updatedState.referenceData.activities?.length || 0,
    resources: updatedState.referenceData.resources?.length || 0,
    entities: updatedState.referenceData.entities?.length || 0,
    connectors: updatedState.referenceData.connectors?.length || 0,
    states: updatedState.referenceData.states?.length || 0,
    resourceRequirements: updatedState.referenceData.resourceRequirements?.length || 0
  } : 'none'
});
```

**Output**: New Redux state

**Result**: All components using `useMessaging()` or `useSelector()` will re-render with new data.

---

## Part B: Hook Computation

### 6. useModelPanel hook reacts to state change
**Location**: `hooks/useModelPanel.ts:22-370`

**Purpose**: Primary data hook that transforms raw Redux state into UI-friendly format

**Trigger**: React detects `selection` state changed in messaging context, re-executes hook

**Context**:
```typescript
export function useModelPanel() {
  const messagingState = useMessaging();  // Gets entire Redux state
  const {
    selection,      // Just changed!
    validation,
    simulation,
    app: { initialized }
  } = messagingState;

  // ... hook processing
}
```

---

### 7. Transform model item data
**Location**: `useModelPanel.ts:95-134`

**Purpose**: Convert first selected element to ModelItemData format

**Code**:
```typescript
const modelItemData = useMemo(() => {
  if (!selection.selectedElements || selection.selectedElements.length === 0) {
    return null;
  }

  const element = selection.selectedElements[0];
  return transformToModelItemData(element);
}, [selection.selectedElements]);
```

**transformToModelItemData()** (from `mappers/modelItem.mapper.ts`):
- Extracts element shape data
- Parses JSON fields
- Validates structure
- Returns typed `ModelItemData` object

**Output**: Typed activity data ready for UI components

---

### 8. Extract reference data
**Location**: `useModelPanel.ts:235-257`

**Purpose**: Extract reference data from selection state

**Code**:
```typescript
const referenceData = useMemo(() => ({
  activities: selection.referenceData?.activities || [],
  resources: selection.referenceData?.resources || [],
  entities: selection.referenceData?.entities || [],
  resourceRequirements: selection.referenceData?.resourceRequirements || [],
  connectors: selection.referenceData?.connectors || [],
  states: selection.referenceData?.states || []
}), [selection.referenceData]);

logger.debug('Reference data from selection state:', {
  hasReferenceData: !!selection.referenceData,
  activitiesCount: referenceData.activities?.length || 0,
  resourcesCount: referenceData.resources?.length || 0,
  entitiesCount: referenceData.entities?.length || 0,
  resourceRequirementsCount: referenceData.resourceRequirements?.length || 0,
  connectorsCount: referenceData.connectors?.length || 0
});
```

**Why useMemo?**: Prevents recreating object on every render. Only recomputes when `selection.referenceData` changes.

---

### 9. Filter outgoing connectors (v2.0 - NEW)
**Location**: `useModelPanel.ts:259-273`

**Purpose**: React-side filtering of connectors for selected activity

**Code**:
```typescript
// Filter outgoing connectors for the selected activity (React-side filtering)
const outgoingConnectors = useMemo(() => {
  const activityId = modelItemData?.id;
  if (!activityId || !referenceData.connectors) {
    return [];
  }
  return referenceData.connectors.filter(conn => conn.sourceId === activityId);
}, [referenceData.connectors, modelItemData?.id]);

logger.debug('Filtered outgoing connectors:', {
  activityId: modelItemData?.id,
  totalConnectors: referenceData.connectors?.length || 0,
  outgoingCount: outgoingConnectors.length,
  connectors: outgoingConnectors
});
```

**Why this changed in v2.0**:
- **Old way**: Extension filtered and sent `outgoingConnectors` separately
- **New way**: React filters on-demand from `referenceData.connectors`
- **Benefits**: Single source of truth, no stale data, cleaner state

**Example output**:
```typescript
// If activity_abc123 has 2 outgoing connectors:
[
  { id: "conn1", sourceId: "activity_abc123", targetId: "activity_def456", probability: 0.7 },
  { id: "conn2", sourceId: "activity_abc123", targetId: "activity_ghi789", probability: 0.3 }
]
```

---

### 10. Transform validation state
**Location**: `useModelPanel.ts:137-141`

**Purpose**: Convert validation data to UI format

**Code**:
```typescript
const validationState = useMemo(() => {
  return transformToValidationState(validation);
}, [validation]);
```

**transformToValidationState()** extracts errors, warnings, and isValid flag.

---

### 11. Return hook data
**Location**: `useModelPanel.ts:340-376`

**Purpose**: Return complete data package for ModelPanel component

**Output**:
```typescript
return {
  // Model and document data
  modelName: documentContext.documentTitle || '',
  documentId: documentContext.documentId,

  // Element data
  currentElement: modelItemData as ExtendedModelItemData,
  lastElementUpdate: selection.lastUpdated?.toString(),
  diagramElementType: typedDiagramElementType,

  // State data
  validationState,
  simulationStatus: simulationStatusProxy,
  referenceData,
  states: referenceData?.states || [],
  resourceRequirements: referenceData?.resourceRequirements || [],
  outgoingConnectors,  // Filtered list!

  // UI state
  isLoading,
  needsInitialization,

  // Actions
  onElementUpdate,
  onElementTypeChange,
  onValidate,
  onSimulate,
  onRemoveModel,
  onConvertPage,
  onViewResults,

  // ... other actions
};
```

**Why this structure?**: Components receive everything they need without knowing about Redux or messaging internals.

---

## Part C: Component Rendering

### 12. ModelPanel component re-renders
**Location**: `features/modelPanel/ModelPanel.tsx:24-282`

**Trigger**: useModelPanel hook returns new data

**Code**:
```typescript
export function ModelPanel() {
  const {
    currentElement,
    referenceData,
    outgoingConnectors,
    // ... other data from hook
  } = useModelPanel();

  // Determine what to render
  if (!currentElement) {
    return <NoSelectionView />;
  }

  if (currentElement.isUnconverted) {
    return <ConversionPrompt />;
  }

  // For converted elements, show ElementEditor
  return (
    <ElementEditor
      currentElement={currentElement}
      referenceData={referenceData}
      outgoingConnectors={outgoingConnectors}
      onSave={onElementUpdate}
      // ... other props
    />
  );
}
```

**Decision logic**:
- No selection → Show "No selection" message
- Unconverted element → Show conversion prompt
- Converted element → Show ElementEditor

**For Activity**: Renders `ElementEditor` with activity data

---

### 13. ElementEditor receives props
**Location**: `features/modelPanel/ElementEditor.tsx:23-206`

**Purpose**: Route to appropriate editor based on element type

**Props received**:
```typescript
interface ElementEditorProps {
  currentElement: ExtendedModelItemData;  // Activity data
  referenceData: EditorReferenceData;     // All activities, resources, etc.
  outgoingConnectors: any[];              // Filtered connectors
  validationState: ValidationState;
  onSave: (id: string, type: string, data: any, diagramElementType?: string) => void;
  // ... other props
}
```

---

### 14. ElementEditor determines editor type
**Location**: `ElementEditor.tsx:47-124`

**Purpose**: Render appropriate editor component based on `currentElement.metadata.type`

**Logic**:
```typescript
const renderEditor = () => {
  const elementType = currentElement.metadata?.type;

  switch (elementType) {
    case SimulationObjectType.Activity:
      return (
        <ActivityEditor
          activity={currentElement.data as Activity}
          referenceData={referenceData}
          outgoingConnectors={outgoingConnectors}
          onSave={handleSave}
          validationMessages={validationMessages}
          {...otherProps}
        />
      );

    case SimulationObjectType.Resource:
      return <ResourceEditor ... />;

    case SimulationObjectType.Entity:
      return <EntityEditor ... />;

    // ... other types

    default:
      return <div>Unknown element type: {elementType}</div>;
  }
};

return <div className="element-editor">{renderEditor()}</div>;
```

**For Activity type**: Renders `ActivityEditor` component

---

### 15. ActivityEditor mounts/updates
**Location**: `features/editors/ActivityEditor.tsx:42-868`

**Purpose**: Main editor for Activity elements

**Props received**:
```typescript
interface ActivityEditorProps {
  activity: Activity;                    // Activity data
  referenceData: EditorReferenceData;    // All reference data
  outgoingConnectors: any[];             // Filtered connectors for routing
  onSave: (data: Record<string, any>) => void;
  validationMessages: ValidationMessage[];
  // ... other props
}
```

**Initial state setup**:
```typescript
const [formData, setFormData] = useState<FormData>(
  extractActivityData(activity)
);
const [hasChanges, setHasChanges] = useState(false);
const [activeTab, setActiveTab] = useState<string>('details');

// Get element operations state from Redux
const elementOpsState = useElementOpsState();
const isSaving = formData.id ? elementOpsState.isSaving(formData.id) : false;
```

**Key state**:
- `formData`: Local copy of activity data for editing
- `hasChanges`: Flag indicating unsaved changes
- `isSaving`: From Redux, indicates save in progress

---

### 16. extractActivityData() populates formData
**Location**: `ActivityEditor.tsx:114-145`

**Purpose**: Convert Activity object to form-friendly format

**Code**:
```typescript
const extractActivityData = (activity: Activity): FormData => {
  return {
    id: activity.id || '',
    name: activity.name || '',
    description: activity.description || '',
    operationSteps: activity.operationSteps || [],
    financialProperties: activity.financialProperties || {
      cost: 0,
      revenue: 0,
      costType: 'Fixed'
    }
  };
};
```

**Why needed?**: Separates domain model (Activity) from UI model (FormData). Makes it easier to track changes.

---

### 17. ActivityEditor renders UI
**Location**: `ActivityEditor.tsx:620-868`

**Structure**:
```typescript
return (
  <div className="activity-editor">
    {/* Header */}
    <div className="header">
      <h2>{formData.name || 'Untitled Activity'}</h2>
      {hasChanges && <span className="unsaved-indicator">*</span>}
    </div>

    {/* Tabs */}
    <Tabs value={activeTab} onChange={(val) => setActiveTab(val)}>
      <TabList>
        <Tab value="details">Details</Tab>
        <Tab value="operations">Operation Steps</Tab>
        <Tab value="connectors">Connectors</Tab>
        <Tab value="financial">Financial</Tab>
      </TabList>

      {/* Details Tab */}
      <TabPanel value="details">
        <TextField
          label="Name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
        />
        <TextField
          label="Description"
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          multiline
        />
      </TabPanel>

      {/* Operation Steps Tab */}
      <TabPanel value="operations">
        <OperationStepEditor
          operationSteps={formData.operationSteps}
          resources={referenceData.resources}
          onChange={handleOperationStepsChange}
        />
      </TabPanel>

      {/* Connectors Tab */}
      <TabPanel value="connectors">
        <RoutingConfigurationContent
          connectors={outgoingConnectors}  // Uses filtered list!
          onChange={handleConnectorsChange}
        />
      </TabPanel>

      {/* Financial Tab */}
      <TabPanel value="financial">
        <FinancialPropertiesEditor
          properties={formData.financialProperties}
          onChange={handleFinancialChange}
        />
      </TabPanel>
    </Tabs>

    {/* Action Buttons */}
    <div className="actions">
      <Button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
      <Button onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  </div>
);
```

**Key UI elements**:
- **Header**: Shows activity name and unsaved indicator
- **Details tab**: Name and description text fields
- **Operation Steps tab**: Complex editor with duration, resource requirements
- **Connectors tab**: Routing configuration (uses `outgoingConnectors`)
- **Financial tab**: Cost and revenue fields
- **Save button**: Disabled if no changes or currently saving

---

### 18. Sub-components render
**Location**: Various editor components

**OperationStepEditor** (`editors/OperationStepEditor.tsx`):
- Receives `operationSteps` array from formData
- Receives `resources` from referenceData for dropdowns
- Renders list of operation steps
- Each step has:
  - Duration editor (EnhancedDurationEditor)
  - Resource requirements editor
  - Add/remove buttons

**EnhancedDurationEditor** (`editors/EnhancedDurationEditor.tsx`):
- Receives duration object: `{ durationType, duration: Distribution }`
- Renders:
  - Duration type dropdown (Processing, Waiting, Setup, Transport)
  - DistributionParametersEditor for duration value

**DistributionParametersEditor** (`distribution/DistributionParametersEditor.tsx`):
- Receives distribution type and parameters
- Renders appropriate parameter editor:
  - ConstantParameterEditor for Constant distributions
  - UniformParameterEditor for Uniform distributions
  - NormalParameterEditor for Normal distributions
  - etc.

**RoutingConfigurationContent** (`editors/RoutingConfigurationContent.tsx`):
- Receives `outgoingConnectors` (filtered list!)
- If 0 connectors: Shows "No outgoing connections"
- If 1 connector: Locks routing to Probability (100%)
- If 2+ connectors: Shows routing configuration UI
  - Routing type dropdown (Probability, State Condition, Entity Template)
  - Probability sliders/inputs
  - State condition editors
  - Validation messages

---

### 19. User sees fully rendered ActivityEditor
**Location**: Browser DOM

**What user sees**:
- Activity name in header
- 4 tabs to switch between
- All form fields populated with current values
- Dropdowns showing available resources, entities, etc.
- Routing configuration showing outgoing connectors
- Save button (disabled, since no changes yet)
- Cancel button

**State at this point**:
- `formData`: Contains activity data
- `hasChanges`: false (no edits yet)
- `isSaving`: false (not saving)
- Save button: Disabled
- All fields: Show current values from props

**Ready for user interaction**: User can now edit any field, and the flow continues to Scenario 3.

---

## Data Flow Summary

```
postMessage
  ↓
MessageProvider (window event listener)
  ↓
selection.mapper.ts (extract fields)
  ↓
dispatch(SELECTION_UPDATE)
  ↓
selectionReducer (update Redux state)
  ↓
useModelPanel hook (transform & filter)
  ├─> transformToModelItemData
  ├─> extract referenceData
  ├─> filter outgoingConnectors (NEW in v2.0)
  └─> return hook data
  ↓
ModelPanel component
  ↓
ElementEditor (route by type)
  ↓
ActivityEditor (render tabs & fields)
  ├─> OperationStepEditor
  │    └─> EnhancedDurationEditor
  │         └─> DistributionParametersEditor
  │              └─> ConstantParameterEditor (with state buffering!)
  └─> RoutingConfigurationContent
       └─> Uses filtered outgoingConnectors
  ↓
User sees ActivityEditor
```

---

## Performance Considerations

**Typical duration**: 10-20ms

**Performance costs**:
- postMessage deserialization: <1ms
- Redux dispatch & reducer: 1-2ms
- Hook re-execution: 2-5ms
- useMemo computations: 1-2ms
- Connector filtering: <1ms (typically <10 connectors)
- Component re-rendering: 5-10ms
- DOM updates: 2-5ms

**Optimization strategies**:
- useMemo prevents unnecessary recomputation
- Redux only re-renders components that use changed state
- Pure components prevent unnecessary re-renders
- Controlled inputs minimize DOM thrashing

---

## Next Step

User now sees the ActivityEditor with all fields populated. They can start editing values.

**Continue to**: [03_react_editing_locally.md](./03_react_editing_locally.md) to see what happens when user edits values (before saving).
