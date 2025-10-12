# Routing Configuration Panel - Implementation Guide

## Overview

The **RoutingConfigurationPanel** is a new React component that provides an enhanced UI for configuring how entities are routed through outgoing connectors in an Activity. It dynamically displays different configuration options based on the selected `ConnectType`.

## Features

### 1. **Probability-based Routing** (`ConnectType.Probability`)
- Displays all outgoing connectors with editable probability values
- Validates that probabilities sum to 1.0 (shows warning if not)
- Real-time updates via message sender

### 2. **State Condition Routing** (`ConnectType.StateCondition`)
- Allows setting up state-based routing conditions for each connector
- Provides dropdowns for:
  - State selection (from entity states)
  - Comparison operators (==, !=, >, >=, <, <= - based on state type)
  - Value input (type-appropriate: number, text, boolean, category)
- Shows condition summary for each connector
- Warns if no entity states are defined

### 3. **Entity Template Routing** (`ConnectType.EntityTemplate`)
- Dropdown for selecting entity template per connector
- Routes entities based on their template type
- Warns if no entity templates are available

## File Structure

```
quodsim-react/src/features/editors/
â"œâ"€â"€ RoutingConfigurationPanel.tsx    (New component)
â""â"€â"€ ActivityEditor.tsx                (Updated to integrate the panel)
```

## Integration Steps

### Step 1: Update Component Callers

The `ActivityEditor` now requires an `outgoingConnectors` prop. You need to pass this data from the parent component that renders the `ActivityEditor`.

**Example: In your extension panel or editor wrapper:**

```typescript
import { ActivityEditor } from './features/editors/ActivityEditor';
import { useState, useEffect } from 'react';

function YourEditorPanel({ activity, allConnectors, referenceData, states, onStatesChange }) {
  // Filter connectors where sourceId matches the activity id
  const outgoingConnectors = allConnectors.filter(
    connector => connector.sourceId === activity.id
  );

  return (
    <ActivityEditor
      activity={activity}
      onSave={handleSave}
      onCancel={handleCancel}
      referenceData={referenceData}
      states={states}
      onStatesChange={onStatesChange}
      outgoingConnectors={outgoingConnectors}  // Pass filtered connectors
    />
  );
}
```

### Step 2: Use Connector Type from Shared Library

The component uses the `Connector` class from `@quodsi/shared` directly - no need for a separate interface:

```typescript
import { Connector } from '@quodsi/shared';

// The Connector class already has all the necessary properties:
// - id, name, sourceId, targetId (basic identification)
// - probability (for probability routing)
// - stateCondition (for state condition routing)  
// - entityTemplateUniqueId (for entity template routing)
// - operationSteps, and other properties
```

### Step 3: Update EditorReferenceData (Recommended)

For better integration, update the `EditorReferenceData` interface to include connectors:

**File: `shared/src/types/EditorReferenceData.ts`**

```typescript
import { ResourceRequirement } from "./elements/ResourceRequirement";
import { Connector } from "./elements/Connector";  // Add import

export interface EditorReferenceData {
    entities?: Array<{ id: string, name: string }>;
    resources?: Array<{ id: string, name: string }>;
    activities?: Array<{ id: string, name: string }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];  // Add connectors array
}
```

Then update your data provider to include connectors in the reference data.

### Step 4: Message Handling

The `RoutingConfigurationPanel` automatically handles updates via the `useModelOpsSender` hook. Ensure your message handlers support the `ELEMENT_UPDATE` message type for connectors.

**Message flow:**
1. User edits connector property in the panel
2. Panel calls `updateElementData(connectorId, 'Connector', updatedData)`
3. Extension backend receives `ELEMENT_UPDATE` message
4. Backend updates the connector data in LucidChart
5. UI refreshes with updated data

## Component Props Reference

### RoutingConfigurationPanel

| Prop | Type | Description |
|------|------|-------------|
| `activityId` | `string` | ID of the activity being configured |
| `connectType` | `ConnectType` | Current routing type |
| `outgoingConnectors` | `Connector[]` | Array of outgoing connectors |
| `entityStates` | `StateListManager` | Manager for entity state definitions |
| `availableEntities` | `Array<{id, name}>` | List of available entity templates |
| `onConnectorUpdate` | `function` | Callback when connector is updated |

### ActivityEditor (Updated)

New prop added:

| Prop | Type | Description |
|------|------|-------------|
| `outgoingConnectors` | `Connector[]` (optional) | Array of outgoing connectors for this activity |

## Usage Examples

### Example 1: Basic Integration

```typescript
<ActivityEditor
  activity={selectedActivity}
  onSave={handleActivitySave}
  onCancel={handleCancel}
  referenceData={{
    entities: allEntities,
    resources: allResources,
    activities: allActivities,
    resourceRequirements: allRequirements
  }}
  states={statesManager}
  onStatesChange={handleStatesChange}
  outgoingConnectors={connectorsFromActivity}
/>
```

### Example 2: Fetching Outgoing Connectors

```typescript
import { Connector } from '@quodsi/shared';
import { getOutgoingConnectorsForActivity } from './features/editors/routingConfigUtils';

// Simple filtering - no transformation needed!
const outgoingConnectors: Connector[] = getOutgoingConnectorsForActivity(
  activityId,
  allConnectors
);

// Or inline:
const outgoingConnectors = allConnectors.filter(
  connector => connector.sourceId === activityId
);
```

### Example 3: Handling State Condition Updates

The panel automatically creates `StateCondition` instances when the user configures them:

```typescript
// User selects:
// - State: "color"
// - Comparison: "=="
// - Value: "red"

// Panel creates:
new StateCondition("color", StateComparison.EQUAL, "red")

// And updates the connector via:
updateElementData(connectorId, 'Connector', {
  ...connectorData,
  stateCondition: newStateCondition
})
```

## Validation Features

### Probability Validation
- Shows warning if probabilities don't sum to 1.0
- Displays current sum for transparency
- Each probability field enforces min=0, max=1

### State Condition Validation
- Only shows comparison operators valid for selected state type
  - NUMBER states: ==, !=, >, >=, <, <=
  - Other types: ==, !=
- Input field type matches state type:
  - NUMBER: number input
  - BOOLEAN: dropdown (true/false)
  - CATEGORY: dropdown of category values
  - STRING: text input
- Warns if no entity states are defined

### Entity Template Validation
- Warns if no entity templates are available
- Dropdown only shows defined entity templates

## UI Design

### Layout
- **Header**: Shows routing type selector (existing)
- **Body**: Dynamic content based on `ConnectType`
- **Connectors**: Listed in expandable cards
- **Help Text**: Contextual guidance at bottom

### Visual Indicators
- 🔵 **Info**: No connectors available
- 🟡 **Warning**: Validation issues (probabilities, missing states/templates)
- ✅ **Success**: Valid configuration (implicit)

## Testing Considerations

### Test Cases

1. **Probability Routing**
   - Edit probability values
   - Verify sum validation
   - Test save/update flow

2. **State Condition Routing**
   - Select different state types
   - Verify correct comparison operators
   - Test different value types (number, boolean, category, string)
   - Verify condition display

3. **Entity Template Routing**
   - Select entity templates
   - Verify dropdown population
   - Test with no templates available

4. **Edge Cases**
   - No outgoing connectors
   - No entity states defined
   - No entity templates available
   - Switching between routing types
   - Multiple connectors with complex conditions

## Future Enhancements

### Potential Improvements

1. **Batch Probability Distribution**
   - "Distribute evenly" button
   - "Normalize" button to auto-adjust to sum to 1.0

2. **State Condition Templates**
   - Save common conditions as templates
   - Quick apply to multiple connectors

3. **Visual Routing Diagram**
   - Show flowchart of routing logic
   - Visual condition builder

4. **Validation Rules**
   - Ensure at least one connector has valid condition
   - Warn about unreachable connectors
   - Detect duplicate/conflicting conditions

5. **Advanced State Conditions**
   - Multiple conditions per connector (AND/OR logic)
   - Condition groups
   - Expression builder

## Troubleshooting

### Issue: Connectors not showing

**Cause**: `outgoingConnectors` prop not passed or empty

**Solution**: Verify connectors are filtered correctly by `sourceId === activityId`

### Issue: State conditions not saving

**Cause**: Message handler not processing `ELEMENT_UPDATE` for connectors

**Solution**: Check extension backend message handler supports connector updates

### Issue: Entity states not showing in dropdown

**Cause**: States not defined or not properly scoped to ENTITY component type

**Solution**: Verify entity states exist in `states.getByComponentType(ComponentType.ENTITY)`

### Issue: Changes not persisting

**Cause**: `updateElementData` not triggering backend update

**Solution**: Verify message sender is properly configured and backend is receiving messages

## Summary

The RoutingConfigurationPanel provides a comprehensive, type-safe interface for configuring activity routing. It integrates seamlessly with the existing ActivityEditor and leverages the state management and messaging infrastructure already in place.

Key benefits:
- ✅ Type-safe state condition editing
- ✅ Real-time validation
- ✅ Automatic updates via message sender
- ✅ Intuitive UI for all routing types
- ✅ Proper integration with existing state management

For questions or issues, refer to the main Quodsi documentation or contact the development team.
