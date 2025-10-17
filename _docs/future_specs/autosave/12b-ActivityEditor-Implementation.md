# Implementing Autosave in ActivityEditor

This guide provides detailed instructions for implementing autosave functionality in the ActivityEditor component. The ActivityEditor is more complex than the ConnectorEditor, with multiple numeric fields and nested components (OperationSteps).

## Original ActivityEditor Structure

The ActivityEditor consists of several sections:
1. Basic Settings (name, capacity)
2. Buffer Capacities (input, output)
3. Operation Steps (complex nested components)

The primary fields that are good candidates for autosave are:
- capacity (simple numeric value)
- inputBufferCapacity (simple numeric value)
- outputBufferCapacity (simple numeric value)

## Implementation Steps

### 1. Update to Use the Enhanced BaseEditor

Update the ActivityEditor to work with the enhanced BaseEditor that supports autosave:

```typescript
import React, { useEffect } from "react";
import { Settings, Layout, Plus, Layers } from "lucide-react";
import {
  Activity,
  OperationStep,
  PeriodUnit,
  DistributionType,
  SimulationObjectType,
  createOperationStep,
  ConstantDistribution,
  EditorReferenceData,
  Duration,
  DurationType,
} from "@quodsi/shared";
import BaseEditor from "./BaseEditor";
import { OperationStepEditor } from "./OperationStepEditor";
import { AutosaveField } from "./common/AutosaveField";
import { 
  validateRequired, 
  validateNumeric, 
  validatePositive, 
  validateInteger 
} from "../utils/validation";

// Main Activity Editor Component
interface ActivityEditorProps {
  activity: any;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
  referenceData?: EditorReferenceData;
}

const ActivityEditor: React.FC<ActivityEditorProps> = ({
  activity,
  onSave,
  onCancel,
  referenceData,
}) => {
  // Helper functions
  const bufferToDisplay = (value: number | null | undefined): number =>
    value === null || value === undefined ? 999999 : value;

  const displayToBuffer = (value: number): number =>
    value >= 999999 ? Infinity : value;

  const extractActivityData = (act: any): Activity => {
    const data = act.data || act;
    return {
      id: data.id || "",
      name: data.name || "New Activity",
      type: SimulationObjectType.Activity,
      capacity: data.capacity || 1,
      inputBufferCapacity: bufferToDisplay(data.inputBufferCapacity),
      outputBufferCapacity: bufferToDisplay(data.outputBufferCapacity),
      operationSteps: data.operationSteps || [],
    };
  };

  // Create state
  const [localActivity, setLocalActivity] = React.useState<Activity>(
    extractActivityData(activity)
  );

  // Handlers
  const handleSave = (updatedActivity: Activity) => {
    console.log("ActivityEditor - Before Save:", {
      updatedActivity,
      operationSteps: updatedActivity.operationSteps,
    });

    const activityToSave: Activity = {
      ...updatedActivity,
      type: SimulationObjectType.Activity,
      inputBufferCapacity: displayToBuffer(updatedActivity.inputBufferCapacity),
      outputBufferCapacity: displayToBuffer(
        updatedActivity.outputBufferCapacity
      ),
    };

    console.log("ActivityEditor - After Save Transform:", {
      activityToSave,
      operationSteps: activityToSave.operationSteps,
    });

    onSave(activityToSave);
  };

  const handleOperationStepChange = (
    index: number,
    updatedStep: OperationStep
  ) => {
    setLocalActivity((prev) => ({
      ...prev,
      operationSteps: prev.operationSteps.map((step, i) =>
        i === index ? updatedStep : step
      ),
    }));
  };

  const handleAddOperationStep = () => {
    // Create a new operation step with a default constant distribution
    const newStep = createOperationStep(
      new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1))
    );

    setLocalActivity((prev) => ({
      ...prev,
      operationSteps: [...prev.operationSteps, newStep],
    }));
  };

  const handleOperationStepDelete = React.useCallback(
    (
      index: number,
      localData: Activity,
      handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      ) => void
    ) => {
      const newOperationSteps = localData.operationSteps.filter(
        (_, i) => i !== index
      );
      handleChange({
        target: {
          name: "operationSteps",
          value: newOperationSteps,
        },
      } as any);
    },
    []
  );

  if (!localActivity?.id) {
    return (
      <div className="p-2 text-sm text-red-600">Invalid activity data</div>
    );
  }

  return (
    <BaseEditor
      data={localActivity}
      onSave={handleSave}
      onCancel={onCancel}
      messageType="activitySaved"
    >
      {(localData, handleChange, setAutoSaveFields, setValidators, validationErrors) => {
        // Register autosave fields
        useEffect(() => {
          setAutoSaveFields([
            'capacity',
            'inputBufferCapacity',
            'outputBufferCapacity'
          ]);
        }, [setAutoSaveFields]);
        
        // Register field validators
        useEffect(() => {
          setValidators([
            {
              field: 'name',
              validate: (value) => validateRequired(value, 'Name')
            },
            {
              field: 'capacity',
              validate: (value) => {
                const requiredError = validateRequired(value, 'Capacity');
                if (requiredError) return requiredError;
                
                const numericError = validateNumeric(value, 'Capacity');
                if (numericError) return numericError;
                
                const positiveError = validatePositive(value, 'Capacity');
                if (positiveError) return positiveError;
                
                const integerError = validateInteger(value, 'Capacity');
                if (integerError) return integerError;
                
                return null;
              }
            },
            {
              field: 'inputBufferCapacity',
              validate: (value) => {
                const numericError = validateNumeric(value, 'Input Buffer Capacity');
                if (numericError) return numericError;
                
                const integerError = validateInteger(value, 'Input Buffer Capacity');
                if (integerError) return integerError;
                
                return null;
              }
            },
            {
              field: 'outputBufferCapacity',
              validate: (value) => {
                const numericError = validateNumeric(value, 'Output Buffer Capacity');
                if (numericError) return numericError;
                
                const integerError = validateInteger(value, 'Output Buffer Capacity');
                if (integerError) return integerError;
                
                return null;
              }
            }
          ]);
        }, [setValidators]);
        
        // Helper function to get validation error for a field
        const getFieldError = (fieldName: string) => {
          const error = validationErrors.find(e => e.fieldName === fieldName);
          return error ? error.message : undefined;
        };
        
        return (
          <div className="space-y-4 p-2">
            {/* Basic Info Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 mb-1">
                <Settings className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">
                  Basic Settings
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <AutosaveField
                    label="Name"
                    name="name"
                    value={localData.name}
                    onChange={handleChange}
                    error={getFieldError('name')}
                    isAutosave={false} // Name requires manual save
                  />
                </div>
                <div>
                  <AutosaveField
                    label="Capacity"
                    name="capacity"
                    value={localData.capacity}
                    onChange={handleChange}
                    type="number"
                    min="1"
                    error={getFieldError('capacity')}
                    isAutosave={true}
                  />
                </div>
              </div>
            </div>

            {/* Buffer Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 mb-1">
                <Layout className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">
                  Buffer Capacities
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <AutosaveField
                    label="Input"
                    name="inputBufferCapacity"
                    value={
                      localData.inputBufferCapacity === Infinity
                        ? 999999
                        : localData.inputBufferCapacity
                    }
                    onChange={handleChange}
                    type="number"
                    min="0"
                    max="999999"
                    error={getFieldError('inputBufferCapacity')}
                    isAutosave={true}
                  />
                </div>
                <div>
                  <AutosaveField
                    label="Output"
                    name="outputBufferCapacity"
                    value={
                      localData.outputBufferCapacity === Infinity
                        ? 999999
                        : localData.outputBufferCapacity
                    }
                    onChange={handleChange}
                    type="number"
                    min="0"
                    max="999999"
                    error={getFieldError('outputBufferCapacity')}
                    isAutosave={true}
                  />
                </div>
              </div>
            </div>

            {/* Operation Steps Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">
                    Operation Steps
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddOperationStep}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Step
                </button>
              </div>
              <div className="space-y-2">
                {localData.operationSteps.map((step, index) => (
                  <OperationStepEditor
                    key={index}
                    step={step}
                    index={index}
                    onChange={(updatedStep) =>
                      handleOperationStepChange(index, updatedStep)
                    }
                    onDelete={() =>
                      handleOperationStepDelete(index, localData, handleChange)
                    }
                    resourceRequirements={referenceData?.resourceRequirements}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </BaseEditor>
  );
};

export default React.memo(ActivityEditor);
```

### 2. Update OperationStepEditor Component

Since Operation Steps are complex nested components, they require special handling for autosave. Update the OperationStepEditor component to support autosave:

```typescript
// src/components/OperationStepEditor.tsx (partial update)

import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { 
  OperationStep, 
  PeriodUnit, 
  DistributionType, 
  ResourceRequirement
} from '@quodsi/shared';
import { AutosaveField } from './common/AutosaveField';
import { validateNumeric, validatePositive } from '../utils/validation';

interface OperationStepEditorProps {
  step: OperationStep;
  index: number;
  onChange: (step: OperationStep) => void;
  onDelete: () => void;
  resourceRequirements?: ResourceRequirement[];
  enableAutosave?: boolean; // Add this prop to control autosave
}

export const OperationStepEditor: React.FC<OperationStepEditorProps> = ({
  step,
  index,
  onChange,
  onDelete,
  resourceRequirements = [],
  enableAutosave = true // Default to true for existing steps
}) => {
  // Existing state and handlers...
  
  // Register this step for autosave in parent component
  useEffect(() => {
    if (enableAutosave) {
      // This is a simplified approach - you'll need a more robust communication method
      // Option 1: Use custom events
      const event = new CustomEvent('registerOperationStepAutosave', {
        detail: { index, fields: ['duration.value', 'resourceQuantity'] }
      });
      document.dispatchEvent(event);
      
      // Option 2: Pass dedicated callbacks from ActivityEditor
      // if (registerForAutosave) {
      //   registerForAutosave(`operationSteps[${index}].duration.value`);
      //   registerForAutosave(`operationSteps[${index}].resourceQuantity`);
      // }
    }
  }, [enableAutosave, index]);
  
  // Handle value change with autosave signaling
  const handleValueChange = (fieldName: string, value: any) => {
    const updatedStep = { ...step };
    
    // Update the appropriate field
    if (fieldName === 'duration.value') {
      updatedStep.duration.value = value;
    } else if (fieldName === 'resourceQuantity') {
      updatedStep.resourceQuantity = value;
    } // ... handle other fields
    
    // Notify parent
    onChange(updatedStep);
    
    // Signal that this change should be autosaved
    if (enableAutosave) {
      const event = new CustomEvent('operationStepChanged', {
        detail: { index, fieldName, autoSave: true }
      });
      document.dispatchEvent(event);
    }
  };
  
  return (
    <div className="operation-step border p-2 rounded">
      {/* Step header with delete button */}
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">Step {index + 1}</h4>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Duration fields */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="col-span-2">
          <AutosaveField
            label="Duration"
            name={`operationSteps[${index}].duration.value`}
            value={step.duration.value}
            onChange={(e) => handleValueChange('duration.value', parseFloat(e.target.value))}
            type="number"
            min="0"
            step="0.1"
            isAutosave={enableAutosave}
            error={null} // Connect to validation system
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Unit</label>
          <select
            className="w-full px-2 py-1 text-sm border rounded"
            value={step.duration.unit}
            onChange={(e) => {
              const updatedStep = { ...step };
              updatedStep.duration.unit = e.target.value as PeriodUnit;
              onChange(updatedStep);
            }}
          >
            {Object.keys(PeriodUnit).map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Other fields as needed */}
    </div>
  );
};
```

### 3. Handle OperationStep Changes in ActivityEditor

Update the ActivityEditor to handle autosave signals from OperationSteps:

```typescript
// Inside ActivityEditor component

// Add event listeners for operation step autosave signals
useEffect(() => {
  const handleStepAutosave = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { index, fieldName, autoSave } = customEvent.detail;
    
    if (autoSave) {
      // Trigger autosave for the entire activity
      // This is a simplified approach - you might want to debounce this
      setTimeout(() => handleSave(localData), 800);
    }
  };
  
  document.addEventListener('operationStepChanged', handleStepAutosave);
  
  return () => {
    document.removeEventListener('operationStepChanged', handleStepAutosave);
  };
}, [localData, handleSave]);
```

## Field Selection Rationale

Here's the rationale for which fields should use autosave in the ActivityEditor:

### Fields to Autosave

1. **capacity**: 
   - Simple numeric value
   - Frequently adjusted when tuning the model
   - Has straightforward validation

2. **inputBufferCapacity**:
   - Simple numeric value
   - Often adjusted to optimize flow
   - Has straightforward validation

3. **outputBufferCapacity**:
   - Simple numeric value 
   - Often adjusted to optimize flow
   - Has straightforward validation

4. **Operation Step - duration.value**:
   - Frequently tuned numeric value
   - Simple validation

5. **Operation Step - resourceQuantity**:
   - Frequently adjusted numeric value
   - Simple validation

### Fields Not to Autosave

1. **name**:
   - Critical identifier
   - Rarely changed after initial setup
   - Changes might affect references elsewhere

2. **Operation Step - duration.unit**:
   - Categorical value
   - Changes dramatically affect the model (e.g., seconds vs. hours)
   - Rarely changed after initial setup

3. **Operation Step - distribution type**:
   - Fundamental change to behavior
   - Complex validation requirements
   - Rarely changed after setup

## Validation Implementation

The validation rules for ActivityEditor are more complex than ConnectorEditor:

1. **name**: Required field
2. **capacity**: Required, numeric, positive, integer
3. **inputBufferCapacity**: Numeric, integer
4. **outputBufferCapacity**: Numeric, integer
5. **Operation Steps**: Each step has its own validation requirements

## Testing Recommendations

When testing the ActivityEditor implementation, focus on:

1. **Field Autosave**: 
   - Verify capacity, inputBufferCapacity, and outputBufferCapacity autosave correctly
   - Check that name still requires manual save

2. **Nested Components**:
   - Test that changes to operation step duration values trigger autosave
   - Verify resource quantity changes autosave correctly

3. **Complex Validation**:
   - Test all validation rules for each field
   - Verify operation steps with invalid values block autosave

4. **Mixed Changes**:
   - Test making changes to both autosave and manual-save fields
   - Ensure manual save button appears when needed

5. **Performance**:
   - Test with many operation steps to ensure performance remains good

## Special Considerations

### Operation Step Identification

Since operation steps are dynamic components, their field names need to include their index:
- `operationSteps[0].duration.value`
- `operationSteps[1].duration.value` 

This ensures they're properly tracked for validation and autosave.

### Deep Property Access

When validating nested properties, use a path pattern for access:

```typescript
const validateNestedValue = (obj: any, path: string, validator: (value: any) => string | null): string | null => {
  const pathParts = path.split('.');
  let current = obj;
  
  // Traverse the path
  for (const part of pathParts) {
    if (current === undefined || current === null) return null;
    current = current[part];
  }
  
  return validator(current);
};
```

### Adding/Removing Operation Steps

When adding or removing operation steps, ensure the autosave registrations are updated:

```typescript
// After adding a step
useEffect(() => {
  // Re-register all autosave fields when steps change
  const fieldsToAutosave = [
    'capacity',
    'inputBufferCapacity',
    'outputBufferCapacity',
    // Include all operation step fields
    ...localData.operationSteps.flatMap((_, index) => [
      `operationSteps[${index}].duration.value`,
      `operationSteps[${index}].resourceQuantity`
    ])
  ];
  
  setAutoSaveFields(fieldsToAutosave);
}, [localData.operationSteps.length, setAutoSaveFields]);
```

## Conclusion

Implementing autosave in the ActivityEditor is more complex due to its nested components and multiple sections. By following this guide, you can provide a smooth autosave experience for frequently adjusted numeric fields while maintaining appropriate manual save requirements for more significant changes.
