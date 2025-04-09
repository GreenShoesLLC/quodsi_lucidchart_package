# Implementing Autosave in ConnectorEditor

This guide provides detailed instructions for implementing autosave functionality in the ConnectorEditor component. The ConnectorEditor is an ideal candidate for autosave since it typically contains simple numeric fields that users frequently adjust.

## Original ConnectorEditor.tsx

Here's a reference to the current implementation of ConnectorEditor:

```typescript
import React from "react";
import BaseEditor from "./BaseEditor";
import { Connector, ConnectType, SimulationObjectType } from "@quodsi/shared";

interface Props {
  connector: Connector;
  onSave: (connector: Connector) => void;
  onCancel: () => void;
}

const ConnectorEditor: React.FC<Props> = ({ connector, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={{ ...connector, type: SimulationObjectType.Connector }}
      onSave={onSave}
      onCancel={onCancel}
      messageType="connectorSaved"
    >
      {(localConnector, handleChange) => (
        <div>
          <div className="quodsi-field">
            <label htmlFor="connectType" className="quodsi-label">
              Connect Type
            </label>
            <select
              id="connectType"
              name="connectType"
              className="quodsi-select"
              value={localConnector.connectType}
              onChange={handleChange}
            >
              {Object.keys(ConnectType).map((key) => (
                <option
                  key={key}
                  value={ConnectType[key as keyof typeof ConnectType]}
                >
                  {key}
                </option>
              ))}
            </select>
          </div>

          <div className="quodsi-field">
            <label htmlFor="probability" className="quodsi-label">
              Probability
            </label>
            <input
              type="number"
              id="probability"
              name="probability"
              className="quodsi-input"
              value={localConnector.probability}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="1"
            />
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default ConnectorEditor;
```

## Updated ConnectorEditor.tsx with Autosave

Here's the modified implementation that includes autosave functionality:

```typescript
import React, { useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { Connector, ConnectType, SimulationObjectType } from "@quodsi/shared";
import { AutosaveField } from "./common/AutosaveField";
import { validateNumeric, validateRange } from "../utils/validation";

interface Props {
  connector: Connector;
  onSave: (connector: Connector) => void;
  onCancel: () => void;
}

const ConnectorEditor: React.FC<Props> = ({ connector, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={{ ...connector, type: SimulationObjectType.Connector }}
      onSave={onSave}
      onCancel={onCancel}
      messageType="connectorSaved"
    >
      {(localConnector, handleChange, setAutoSaveFields, setValidators, validationErrors) => {
        // Register autosave fields
        useEffect(() => {
          setAutoSaveFields(['probability']);
        }, [setAutoSaveFields]);
        
        // Register field validators
        useEffect(() => {
          setValidators([
            {
              field: 'probability',
              validate: (value) => {
                const numericError = validateNumeric(value, 'Probability');
                if (numericError) return numericError;
                
                const rangeError = validateRange(value, 0, 1, 'Probability');
                if (rangeError) return rangeError;
                
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
          <div>
            {/* Connect Type - NOT autosaved as it's a significant change */}
            <div className="quodsi-field">
              <label htmlFor="connectType" className="block text-xs text-gray-600 mb-1">
                Connect Type
              </label>
              <select
                id="connectType"
                name="connectType"
                className="w-full px-2 py-1 text-sm border rounded"
                value={localConnector.connectType}
                onChange={handleChange}
              >
                {Object.keys(ConnectType).map((key) => (
                  <option
                    key={key}
                    value={ConnectType[key as keyof typeof ConnectType]}
                  >
                    {key}
                  </option>
                ))}
              </select>
            </div>

            {/* Probability - Autosaved field */}
            <AutosaveField
              label="Probability"
              name="probability"
              value={localConnector.probability}
              onChange={handleChange}
              type="number"
              step="0.01"
              min="0"
              max="1"
              error={getFieldError('probability')}
              isAutosave={true}
            />
          </div>
        );
      }}
    </BaseEditor>
  );
};

export default ConnectorEditor;
```

## Key Changes Explained

1. **Children Render Prop Signature**:
   - Added `setAutoSaveFields`, `setValidators`, and `validationErrors` parameters to receive these functions from BaseEditor

2. **Field Registration**:
   - Added useEffect to register the probability field for autosave
   - Added another useEffect to register validators for the probability field

3. **Validation**:
   - Implemented validation for the probability field
   - Added a helper function to get validation errors

4. **UI Components**:
   - Replaced standard input for probability with the AutosaveField component
   - Added autosave indicator and validation error display

5. **Field Selection**:
   - Only marked the probability field for autosave
   - Left connectType as a manually saved field since it's a significant change

## Implementation Details

### Field Selection Rationale

- **Probability (Autosave)**: This field is an ideal candidate for autosave because:
  - It's a simple numeric value
  - Users often adjust it frequently when tuning the model
  - It has straightforward validation rules
  - Changes don't have dramatic cascading effects

- **Connect Type (Manual Save)**: This field remains manually saved because:
  - It fundamentally changes how the connector behaves
  - It's rarely changed once set
  - Changes might have significant consequences for the model

### Validation Logic

The probability field has two validation rules:
1. It must be a valid number (validateNumeric)
2. It must be between 0 and 1 inclusive (validateRange)

These validations ensure the probability value remains within valid parameters before allowing autosave.

### User Experience Considerations

- The probability field is clearly marked with "(auto-saves)" to indicate its behavior
- Validation errors prevent autosave and clearly explain the issue
- The connectType field behaves as before, requiring manual save

## Testing Notes

When testing the ConnectorEditor implementation, focus on:

1. **Basic Functionality**: 
   - Changing the probability value should trigger autosave after the debounce period
   - The save indicator should appear during the save operation

2. **Validation**:
   - Entering an invalid value (like "abc" or 2.5) should show a validation error
   - Autosave should not trigger for invalid values
   - Fixing the value should clear the error and trigger autosave

3. **Accessibility**:
   - Screen readers should announce save operations and validation errors
   - Keyboard navigation should work properly between fields

4. **Manual Save Fallback**:
   - Changes to connectType should require clicking the Save button
   - Save button should appear for mixed changes (both probability and connectType)

## Additional Considerations

### Rate Field (For Rate-Based Connectors)

If your ConnectorEditor also handles rate-based connections, follow a similar approach:

```typescript
// Inside the validator registration
{
  field: 'rate',
  validate: (value) => {
    const numericError = validateNumeric(value, 'Rate');
    if (numericError) return numericError;
    
    const positiveError = validatePositive(value, 'Rate');
    if (positiveError) return positiveError;
    
    return null;
  }
}

// In the returned JSX
<AutosaveField
  label="Rate"
  name="rate"
  value={localConnector.rate}
  onChange={handleChange}
  type="number"
  step="0.1"
  min="0"
  error={getFieldError('rate')}
  isAutosave={true}
/>
```

### Conditional Fields

If your connector has fields that appear conditionally, ensure they're registered for autosave only when visible:

```typescript
useEffect(() => {
  const fieldsToAutosave = ['probability'];
  
  // Add conditional fields as needed
  if (localConnector.connectType === ConnectType.SomeSpecialType) {
    fieldsToAutosave.push('specialField');
  }
  
  setAutoSaveFields(fieldsToAutosave);
}, [localConnector.connectType, setAutoSaveFields]);
```

## Conclusion

With these changes, the ConnectorEditor component will provide autosave functionality for the probability field, improving the user experience while maintaining data integrity through validation. The implementation balances automatic saving for frequently changed fields with manual save for more significant changes.
