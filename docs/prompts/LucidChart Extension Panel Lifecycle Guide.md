# LucidChart Extension Panel Lifecycle Guide

## Extension Panel Lifecycle

### Pre-Icon Click Phase
When a LucidChart document loads, the following occurs:
1. Extension creates a Panel instance (e.g., ModelPanel)
2. Panel remains in a dormant state
3. Only the panel's icon is visible in the LucidChart toolbar
4. No iframe content is loaded
5. No React app initialization occurs

### Post-Icon Click Phase
When the user clicks the panel icon:
1. Panel becomes active
2. Iframe content loads (e.g., index.html)
3. React application initializes
4. React app sends REACT_APP_READY message
5. Panel processes REACT_APP_READY and initializes further interactions

## Quodsi Message Flow by Scenario

### 1. Nothing Selected, Page Not Converted
```sequence
React App -> Extension: REACT_APP_READY
Extension -> React App: SELECTION_CHANGED_PAGE_NO_MODEL
```
- React app shows "Initialize Quodsi Model" button
- Model Tree section is hidden
- Validation section is hidden
- Editor section is hidden

### 2. Nothing Selected, Page Already Converted
```sequence
React App -> Extension: REACT_APP_READY
Extension -> React App: SELECTION_CHANGED_PAGE_WITH_MODEL
```
- React app shows model name
- Model Tree section is visible and expanded
- Validation section is visible
- Editor section is visible with model properties

### 3. Non-Converted Shape Selected
```sequence
React App -> Extension: REACT_APP_READY
Extension -> React App: SELECTION_CHANGED_UNCONVERTED
```
- React app shows conversion options
- Model Tree section is hidden
- Validation section is hidden
- Editor section is hidden
- Shows element type conversion buttons

### 4. Converted Shape Selected
```sequence
React App -> Extension: REACT_APP_READY
Extension -> React App: SELECTION_CHANGED_SIMULATION_OBJECT
```
- React app shows simulation object properties
- Model Tree section is visible
- Validation section is visible
- Editor section shows object-specific properties
- Tree automatically expands to show selected object

### 5. Multiple Items Selected
```sequence
React App -> Extension: REACT_APP_READY
Extension -> React App: SELECTION_CHANGED_MULTIPLE
```
- If page has model:
  - Shows model overview
  - Model Tree visible but no item highlighted
  - Validation section visible
  - Editor section shows model properties
- If page has no model:
  - Shows "Initialize Quodsi Model" state
  - All sections hidden except header

## Important Implementation Notes
1. All selection state handling goes through `ModelPanel.handleSelectionChange()`
2. Selection state is determined by `SelectionManager.determineSelectionState()`
3. React app uses `messageHandlers` to process incoming messages
4. Each message type can trigger different UI section visibility states
5. Tree state (expanded nodes) persists across selection changes

## Message Payloads
Each message type includes specific payload data:
- `PAGE_WITH_MODEL`: Includes model structure, validation state
- `SIMULATION_OBJECT`: Includes object properties, reference data
- `UNCONVERTED`: Includes element type information
- `MULTIPLE`: Includes array of selected items
- All messages include current model structure and expanded nodes state