# 🚀 Routing Configuration - Quick Start Implementation

## Step-by-Step Implementation Guide

### ✅ What's Already Done

The following components have been created and are ready to use:

1. ✅ **RoutingConfigurationPanel.tsx** - Main UI component
2. ✅ **routingConfigUtils.ts** - Helper functions
3. ✅ **ActivityEditor.tsx** - Updated with integration

### 🔧 What You Need To Do

Follow these steps to complete the integration:

---

## Step 1: Update Your Component That Renders ActivityEditor

**Location**: Find where you currently render `<ActivityEditor />`

**Current code** (example):
```typescript
<ActivityEditor
  activity={selectedActivity}
  onSave={handleSave}
  onCancel={handleCancel}
  referenceData={referenceData}
  states={states}
  onStatesChange={handleStatesChange}
/>
```

**New code** - Add outgoingConnectors prop:
```typescript
import { getOutgoingConnectorsForActivity } from './features/editors/routingConfigUtils';

// Get all connectors for the model (you likely already have this)
const allConnectors = /* your source for all connectors */;

// Filter to get only outgoing connectors for this activity
const outgoingConnectors = getOutgoingConnectorsForActivity(
  selectedActivity.id,
  allConnectors
);

<ActivityEditor
  activity={selectedActivity}
  onSave={handleSave}
  onCancel={handleCancel}
  referenceData={referenceData}
  states={states}
  onStatesChange={handleStatesChange}
  outgoingConnectors={outgoingConnectors}  // ← ADD THIS LINE
/>
```

---

## Step 2: Ensure Correct Connector Type

The component uses the `Connector` type from `@quodsi/shared`. Just pass your Connector objects directly:

```typescript
import { Connector } from '@quodsi/shared';

// Your connectors should already be of type Connector
const outgoingConnectors: Connector[] = allConnectors
  .filter(c => c.sourceId === activity.id);
```

**Key Connector properties used:**
- `id`, `name`, `sourceId`, `targetId` - Basic identification
- `probability` - For probability-based routing  
- `stateCondition?: StateCondition` - For state-based routing
- `entityTemplateUniqueId?: string` - For entity template routing

**Note**: The component works directly with the `Connector` class from the shared library, so no data transformation is needed!

---

## Step 3: Verify Message Handler (Backend)

**Check your extension's message handler** supports connector updates.

**Required**: Handle `ELEMENT_UPDATE` messages for `type='Connector'`

```typescript
// In your extension backend:
case EnvelopeMessageType.ELEMENT_UPDATE:
  if (payload.type === 'Connector') {
    // Update the connector in LucidChart
    const connector = payload.data;
    updateLucidChartElement(payload.elementId, connector);
  }
  break;
```

**If you don't have this**, add it to your message handler.

---

## Step 4: Test Basic Functionality

### Test Probability Routing

1. Open an Activity with outgoing connectors
2. Go to "Routing Configuration" tab (🔀 icon)
3. Select "Probability" routing type
4. Edit probability values
5. Verify:
   - ✓ Values save automatically
   - ✓ Warning appears if sum ≠ 1.0
   - ✓ Changes persist after closing/reopening

### Test State Condition Routing

1. Ensure you have Entity states defined (States tab)
2. Select "State Condition" routing type
3. For each connector:
   - Select a state
   - Select a comparison operator
   - Enter a value
4. Verify:
   - ✓ State dropdown shows entity states
   - ✓ Comparison operators match state type
   - ✓ Value input matches state type
   - ✓ Condition summary displays correctly

### Test Entity Template Routing

1. Ensure you have multiple entity types defined
2. Select "Entity Template" routing type
3. For each connector, select an entity template
4. Verify:
   - ✓ Dropdown shows all entity templates
   - ✓ Selection saves
   - ✓ Changes persist

---

## Step 5: Optional Enhancements

### Add Helper Buttons (Optional)

You can add these utility buttons to make probability editing easier:

```typescript
import { 
  normalizeProbabilities, 
  distributeEvenProbabilities 
} from './features/editors/routingConfigUtils';

// Add buttons near the connector list:
<button onClick={() => {
  const normalized = normalizeProbabilities(outgoingConnectors);
  // Update all connectors with normalized values
}}>
  Normalize Probabilities
</button>

<button onClick={() => {
  const even = distributeEvenProbabilities(outgoingConnectors);
  // Update all connectors with equal values
}}>
  Distribute Evenly
</button>
```

### Update EditorReferenceData (Optional but Recommended)

**File**: `shared/src/types/EditorReferenceData.ts`

```typescript
import { Connector } from "./elements/Connector";

export interface EditorReferenceData {
    entities?: Array<{ id: string, name: string }>;
    resources?: Array<{ id: string, name: string }>;
    activities?: Array<{ id: string, name: string }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];  // ← ADD THIS
}
```

Then update your data provider to include connectors in referenceData.

---

## 🎯 Quick Verification Checklist

Use this to verify everything is working:

- [ ] ActivityEditor renders without errors
- [ ] Routing Configuration tab appears
- [ ] ConnectType selector works
- [ ] **Probability Routing**:
  - [ ] Connectors display
  - [ ] Can edit probability values
  - [ ] Sum validation warning appears when ≠ 1.0
  - [ ] Changes save and persist
- [ ] **State Condition Routing**:
  - [ ] Entity states appear in dropdown
  - [ ] Comparison operators are correct for state type
  - [ ] Value input type matches state type
  - [ ] Condition summary displays
  - [ ] Changes save and persist
- [ ] **Entity Template Routing**:
  - [ ] Entity templates appear in dropdown
  - [ ] Can select templates
  - [ ] Changes save and persist
- [ ] Switching between routing types works
- [ ] No connectors warning appears when appropriate
- [ ] No states warning appears when appropriate

---

## 🐛 Troubleshooting

### Problem: Connectors don't appear

**Solution**: Check these in order:

1. Verify `outgoingConnectors` prop is being passed
2. Check filter: `connectors.filter(c => c.sourceId === activity.id)`
3. Console log the connectors array to verify it has data
4. Ensure connector IDs are correct

**Debug code**:
```typescript
console.log('Activity ID:', activity.id);
console.log('All Connectors:', allConnectors);
console.log('Outgoing Connectors:', outgoingConnectors);
```

---

### Problem: Changes don't save

**Solution**: Check message handler

1. Open browser/dev console
2. Watch for `ELEMENT_UPDATE` messages
3. Verify message contains correct connector data
4. Check backend receives and processes the message

**Debug code**:
```typescript
// In RoutingConfigurationPanel, add console.log:
const handleConnectorChange = (connectorId: string, updates: Partial<ConnectorData>) => {
  console.log('Updating connector:', connectorId, updates);
  updateElementData(connectorId, 'Connector', updatedConnector);
};
```

---

### Problem: State dropdown is empty

**Solution**: Check entity states

1. Go to States tab in ActivityEditor
2. Create at least one ENTITY state
3. Return to Routing Configuration tab
4. Dropdown should now show states

**Verify in code**:
```typescript
const entityStates = states.getByComponentType(ComponentType.ENTITY);
console.log('Entity States:', entityStates);
```

---

## 📞 Need Help?

1. **Check the guides**:
   - `ROUTING_CONFIGURATION_GUIDE.md` - Comprehensive guide
   - `ROUTING_SUMMARY.md` - Architecture overview
   - This file - Quick start

2. **Review the code**:
   - `RoutingConfigurationPanel.tsx` - Main component
   - `routingConfigUtils.ts` - Helper functions
   - `ActivityEditor.tsx` - Integration example

3. **Common issues**:
   - Missing connectors → Check prop passing
   - Not saving → Check message handler
   - Empty dropdowns → Check state/entity definitions

---

## ✨ You're Done!

If all checklist items are complete, you're ready to use the enhanced routing configuration!

**Next steps**:
- Train users on the new interface
- Document any custom integrations
- Consider implementing optional enhancements

**Enjoy the improved routing configuration!** 🎉
