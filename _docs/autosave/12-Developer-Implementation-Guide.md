# Developer Implementation Guide for Universal Autosave

This document provides step-by-step instructions for implementing autosave functionality across all editor components in the Quodsi LucidChart extension. By following this guide, you'll be able to convert any `*Editor.tsx` component to support autosave for its fields.

## Overview

To implement universal autosave across all editors, we'll need to:

1. Modify the `BaseEditor` component to support autosave
2. Update each editor component to register appropriate fields for autosave
3. Add validation for all autosaved fields
4. Implement visual indicators and accessibility features

This guide assumes you've already read the [Autosave Overview](00-Autosave-Overview.md) and [Technical Implementation](01-Technical-Implementation.md) documents.

## Step 1: Modify BaseEditor.tsx

First, update the `BaseEditor.tsx` component to support autosave functionality:

```typescript
// src/components/BaseEditor.tsx

import React, { useState, useEffect, useCallback } from "react";
import { SimulationObjectType } from "@quodsi/shared";

interface BaseSimulationElement {
  id: string;
  type: SimulationObjectType;
}

interface ValidationError {
  fieldName: string;
  message: string;
}

interface FieldValidator {
  field: string;
  validate: (value: any) => string | null; // Returns error message or null if valid
}

interface BaseEditorProps<T extends BaseSimulationElement> {
  data: T;
  onSave: (data: T) => void;
  onCancel: () => void;
  children: (
    localData: T,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void,
    setAutoSaveFields: React.Dispatch<React.SetStateAction<string[]>>,
    setValidators: React.Dispatch<React.SetStateAction<FieldValidator[]>>,
    validationErrors: ValidationError[]
  ) => React.ReactNode;
  messageType: string;
}

const BaseEditor = <T extends BaseSimulationElement>({
  data,
  onSave,
  onCancel,
  children,
  messageType,
}: BaseEditorProps<T>) => {
  const [localData, setLocalData] = useState<T>(data);
  const [autoSaveFields, setAutoSaveFields] = useState<string[]>([]);
  const [validators, setValidators] = useState<FieldValidator[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [debounceTimers, setDebounceTimers] = useState<{[key: string]: NodeJS.Timeout}>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [currentSavingField, setCurrentSavingField] = useState<string | null>(null);

  useEffect(() => {
    console.log("BaseEditor useEffect - new data:", data);
    setLocalData(data);
    // Clear validation errors when data is reset
    setValidationErrors([]);
  }, [data]);

  // Validate all fields or a specific field
  const validateField = useCallback((fieldName?: string) => {
    let errors: ValidationError[] = [];
    
    // If fieldName is provided, only validate that field
    const validatorsToRun = fieldName 
      ? validators.filter(v => v.field === fieldName)
      : validators;
    
    validatorsToRun.forEach(validator => {
      const value = (localData as any)[validator.field];
      const error = validator.validate(value);
      
      if (error) {
        errors.push({
          fieldName: validator.field,
          message: error
        });
      }
    });
    
    // Update validation errors state, keeping errors for other fields
    if (fieldName) {
      setValidationErrors(prev => [
        ...prev.filter(e => e.fieldName !== fieldName),
        ...errors
      ]);
    } else {
      setValidationErrors(errors);
    }
    
    return errors.length === 0;
  }, [localData, validators]);

  const handleSave = useCallback(() => {
    console.log("BaseEditor handleSave - validating all fields");
    
    // Validate all fields before saving
    if (!validateField()) {
      console.log("BaseEditor handleSave - validation failed:", validationErrors);
      return;
    }
    
    console.log("BaseEditor handleSave - validation passed, saving:", localData);
    setIsSaving(true);
    
    try {
      if (localData.type === SimulationObjectType.Activity) {
        onSave({
          ...localData,
          type: localData.type || data.type,
          operationSteps: (localData as any).operationSteps, // Explicitly pass operationSteps
        });
      } else {
        onSave({
          ...localData,
          type: localData.type || data.type,
        });
      }
      
      // Clear dirty state after successful save
      setIsDirty(false);
      setCurrentSavingField(null);
    } catch (error) {
      console.error("BaseEditor handleSave - error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [data.type, localData, onSave, validateField, validationErrors]);

  const debouncedSave = useCallback((fieldName: string) => {
    // If we already have a timer for this field, clear it
    if (debounceTimers[fieldName]) {
      clearTimeout(debounceTimers[fieldName]);
    }
    
    // Set current saving field for UI updates
    setCurrentSavingField(fieldName);
    
    // Set a new timer
    const newTimer = setTimeout(() => {
      console.log(`BaseEditor auto-saving after change to ${fieldName}`);
      
      // Validate the field first
      if (validateField(fieldName)) {
        handleSave();
      } else {
        console.log(`BaseEditor auto-save cancelled - validation failed for ${fieldName}`);
        setCurrentSavingField(null);
      }
      
      // Remove the timer from our state
      setDebounceTimers(prev => {
        const newState = {...prev};
        delete newState[fieldName];
        return newState;
      });
    }, 800); // 800ms debounce time
    
    // Store the timer
    setDebounceTimers(prev => ({
      ...prev,
      [fieldName]: newTimer
    }));
  }, [debounceTimers, handleSave, validateField]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    setLocalData((prev) => {
      console.log("BaseEditor handleChange:", { prev, name, value });
      return {
        ...prev,
        [name]: value,
      };
    });
    
    setIsDirty(true);
    
    // Validate the field immediately for visual feedback
    setTimeout(() => validateField(name), 0);
    
    // If this field should auto-save, start the debounce timer
    if (autoSaveFields.includes(name)) {
      debouncedSave(name);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  // Clean up any pending timers when component unmounts
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    };
  }, [debounceTimers]);

  // Determine if we need to show the save/cancel buttons
  const showButtons = autoSaveFields.length === 0 || 
    (isDirty && !autoSaveFields.some(field => isDirty)) || 
    validationErrors.length > 0;

  return (
    <form onSubmit={handleSubmit} className="quodsi-form">
      {children(
        localData, 
        handleChange, 
        setAutoSaveFields, 
        setValidators, 
        validationErrors
      )}
      
      {/* Accessibility announcement for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {isSaving && currentSavingField && `Saving changes to ${currentSavingField}...`}
        {validationErrors.length > 0 && 
          `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`
        }
      </div>
      
      {/* Visual save indicator */}
      {isSaving && (
        <div className="quodsi-auto-save-indicator" aria-hidden="true">
          Saving changes...
        </div>
      )}
      
      {/* Validation summary if there are errors */}
      {validationErrors.length > 0 && (
        <div className="quodsi-validation-summary">
          <p>Please correct the following errors:</p>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Show buttons only when needed */}
      {showButtons && (
        <div className="quodsi-button-group">
          <button 
            type="submit" 
            className="quodsi-button quodsi-button-primary"
            disabled={validationErrors.length > 0}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="quodsi-button quodsi-button-secondary"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
};

export default BaseEditor;
```

## Step 2: Add CSS Styles

Next, add the necessary CSS styles for autosave indicators:

```css
/* Add to your existing CSS file */

.quodsi-auto-save-indicator {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: #666;
  margin: 0.5rem 0;
}

.quodsi-auto-save-indicator::before {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border: 2px solid #4f46e5;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.quodsi-validation-summary {
  margin: 1rem 0;
  padding: 0.75rem;
  border-radius: 0.375rem;
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
}

.quodsi-validation-summary p {
  color: #b91c1c;
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.quodsi-validation-summary ul {
  margin: 0;
  padding-left: 1.5rem;
}

.quodsi-validation-summary li {
  color: #ef4444;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.quodsi-input-error {
  border-color: #ef4444 !important;
  background-color: #fef2f2 !important;
}

.quodsi-error-message {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.quodsi-help-text {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## Step 3: Create a Reusable Input Field Component

To simplify implementation, create a reusable input field component that handles autosave indicators and validation:

```typescript
// src/components/common/AutosaveField.tsx

import React from 'react';

interface AutosaveFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  type?: string;
  isAutosave?: boolean;
  error?: string;
  min?: string | number;
  max?: string | number;
  step?: string;
}

export const AutosaveField: React.FC<AutosaveFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  isAutosave = false,
  error,
  min,
  max,
  step,
}) => {
  const inputId = `field-${name}`;
  const errorId = `error-${name}`;
  const helpId = `help-${name}`;
  
  return (
    <div className="quodsi-field">
      <label htmlFor={inputId} className="block text-xs text-gray-600 mb-1">
        {label}
        {isAutosave && (
          <span className="ml-1 text-xs text-blue-500">(auto-saves)</span>
        )}
      </label>
      
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-2 py-1 text-sm border rounded ${error ? 'quodsi-input-error' : ''}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          (error ? errorId : '') + 
          (isAutosave && !error ? helpId : '')
        }
        min={min}
        max={max}
        step={step}
      />
      
      {error ? (
        <div id={errorId} className="quodsi-error-message" role="alert">
          {error}
        </div>
      ) : isAutosave ? (
        <div id={helpId} className="quodsi-help-text">
          Auto-saves when changed
        </div>
      ) : null}
    </div>
  );
};
```

## Step 4: Create Validation Utilities

Create a utilities file for common validation functions:

```typescript
// src/utils/validation.ts

export const validateRequired = (value: any, fieldName: string): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateNumeric = (value: any, fieldName: string): string | null => {
  if (isNaN(Number(value))) {
    return `${fieldName} must be a number`;
  }
  return null;
};

export const validateRange = (
  value: any, 
  min: number, 
  max: number, 
  fieldName: string
): string | null => {
  const numValue = Number(value);
  if (isNaN(numValue)) return null; // Let validateNumeric handle this
  
  if (numValue < min || numValue > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
};

export const validatePositive = (value: any, fieldName: string): string | null => {
  const numValue = Number(value);
  if (isNaN(numValue)) return null; // Let validateNumeric handle this
  
  if (numValue <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  return null;
};

export const validateInteger = (value: any, fieldName: string): string | null => {
  const numValue = Number(value);
  if (isNaN(numValue)) return null; // Let validateNumeric handle this
  
  if (!Number.isInteger(numValue)) {
    return `${fieldName} must be a whole number`;
  }
  return null;
};
```

## Step 5: Updating Editor Components

To implement autosave across all editor components, you'll need to update each `*Editor.tsx` file. Please see the following documents for specific implementation details for each editor type:

- [Implementing Autosave in ConnectorEditor](12a-ConnectorEditor-Implementation.md)
- [Implementing Autosave in ActivityEditor](12b-ActivityEditor-Implementation.md)
- [Implementing Autosave in ResourceEditor](12c-ResourceEditor-Implementation.md)
- [Implementing Autosave in EntityEditor](12d-EntityEditor-Implementation.md)
- [Implementing Autosave in GeneratorEditor](12e-GeneratorEditor-Implementation.md)
- [Handling Nested Component Autosave](12f-Nested-Components-Implementation.md)

## Step 6: Testing Your Implementation

Once you've updated all components, test the autosave functionality:

1. Test simple field edits and verify they save automatically
2. Test validation errors and verify autosave is blocked until fixed
3. Test fields excluded from autosave to ensure they require manual save
4. Test accessibility with screen readers
5. Test performance with many rapid changes

For a comprehensive testing plan, see [Testing Your Autosave Implementation](12g-Testing-Autosave.md).

## Troubleshooting Common Issues

Common issues you might encounter when implementing autosave include:

### Autosave Not Triggering

If autosave isn't triggering:

1. Check console logs for errors
2. Verify the field is registered in `setAutoSaveFields`
3. Ensure there are no validation errors blocking the save

### Multiple Save Operations

If multiple saves are occurring:

1. Check for duplicate field registrations
2. Verify debounce timers are being cleared correctly
3. Check for nested component auto-registrations

### UI Issues

If UI indicators aren't appearing correctly:

1. Verify CSS is properly loaded
2. Check that `isSaving` and `currentSavingField` states are being set
3. Ensure field names match between registration and UI

### Validation Not Working

If validation isn't working properly:

1. Confirm validators are registered for all autosave fields
2. Check validator functions for logic errors
3. Verify validation errors are being displayed correctly

For more troubleshooting details, see [Autosave Troubleshooting Guide](12h-Troubleshooting-Guide.md).

## Next Steps

After implementing the basic autosave functionality across all editors, consider these advanced enhancements:

1. Implement user configuration options for enabling/disabling autosave
2. Add performance monitoring to optimize debounce timing
3. Enhance error recovery mechanisms
4. Implement local storage backup for unsaved changes

For more information on these advanced features, see [Advanced Autosave Features](12i-Advanced-Features.md).

## Conclusion

By following this guide, you can implement consistent autosave functionality across all editor components in the Quodsi LucidChart extension. This approach:

- Improves the user experience by reducing manual save actions
- Maintains data integrity through validation
- Provides clear feedback to users about save status
- Ensures accessibility for all users

For any questions or additional assistance, consult the other documents in the autosave documentation set or reach out to the development team.
