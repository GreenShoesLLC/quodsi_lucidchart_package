# Handling Nested Component Autosave

This guide focuses on implementing autosave functionality for nested components, which present unique challenges. In the Quodsi LucidChart extension, components like OperationStepEditor are nested within parent editors, creating complexity for autosave implementation.

## The Challenge with Nested Components

Nested components present several challenges for autosave:

1. **Field Naming**: How to uniquely identify fields within nested structures
2. **State Management**: How to track changes in nested components
3. **Validation Flow**: How to validate nested component data before autosave
4. **Communication**: How parent and child components coordinate autosave

## Solution Strategy: Options for Nested Component Autosave

When implementing autosave for nested components, you have several options:

### Option 1: Parent-Controlled Approach

The parent component manages all state and passes callbacks to children:

```typescript
// Parent component (e.g., ActivityEditor)
const ActivityEditor: React.FC<ActivityEditorProps> = (props) => {
  // ...existing implementation

  // Expanded children render function
  return (
    <BaseEditor>
      {(localData, handleChange, setAutoSaveFields, setValidators) => {
        // Register all fields including nested ones
        useEffect(() => {
          setAutoSaveFields([
            'capacity',
            'inputBufferCapacity',
            'outputBufferCapacity',
            // Register operation step fields with array indices
            ...localData.operationSteps.flatMap((_, index) => [
              `operationSteps[${index}].duration.value`,
              `operationSteps[${index}].resourceQuantity`
            ])
          ]);
        }, [localData.operationSteps.length, setAutoSaveFields]);
        
        // Register validators for all fields
        useEffect(() => {
          setValidators([
            // Basic field validators
            {
              field: 'capacity',
              validate: (value) => validatePositiveInteger(value, 'Capacity')
            },
            // Nested field validators 
            ...localData.operationSteps.flatMap((_, index) => [
              {
                field: `operationSteps[${index}].duration.value`,
                validate: (value) => validatePositive(value, 'Duration')
              },
              {
                field: `operationSteps[${index}].resourceQuantity`,
                validate: (value) => validateInteger(value, 'Resource Quantity')
              }
            ])
          ]);
        }, [localData.operationSteps.length, setValidators]);
        
        // Create a special change handler for nested components
        const handleNestedChange = (index: number, field: string, value: any) => {
          // Use path notation to update nested values
          const updatedData = { ...localData };
          
          // Handle different patterns of nested fields
          if (field === 'duration.value') {
            updatedData.operationSteps[index].duration.value = value;
          } else if (field === 'resourceQuantity') {
            updatedData.operationSteps[index].resourceQuantity = value;
          }
          // etc...
          
          // Construct field name with index
          const fieldName = `operationSteps[${index}].${field}`;
          
          // Simulate a change event
          handleChange({
            target: {
              name: fieldName,
              value: value
            }
          } as React.ChangeEvent<HTMLInputElement>);
        };
        
        return (
          <div>
            {/* Regular fields */}
            <AutosaveField 
              label="Capacity"
              name="capacity"
              value={localData.capacity}
              onChange={handleChange}
              isAutosave={true}
            />
            
            {/* Nested components */}
            {localData.operationSteps.map((step, index) => (
              <OperationStepEditor
                key={index}
                step={step}
                index={index}
                // Pass the special handler down
                onFieldChange={(field, value) => handleNestedChange(index, field, value)}
                // No need for regular onChange as we handle all changes through onFieldChange
                onDelete={() => handleDeleteStep(index)}
              />
            ))}
          </div>
        );
      }}
    </BaseEditor>
  );
};
```

### Option 2: Event-Based Communication

Use custom events to communicate between nested components:

```typescript
// Parent component (e.g., ActivityEditor)
const ActivityEditor: React.FC<ActivityEditorProps> = (props) => {
  // ...existing implementation
  
  // Listen for child component autosave events
  useEffect(() => {
    const handleNestedAutosave = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { index, field, value } = customEvent.detail;
      
      // Update the local data
      const updatedData = { ...localData };
      
      // Path-based update using lodash's set or similar
      // set(updatedData, `operationSteps[${index}].${field}`, value);
      
      // Or manual update
      if (field === 'duration.value') {
        updatedData.operationSteps[index].duration.value = value;
      } else if (field === 'resourceQuantity') {
        updatedData.operationSteps[index].resourceQuantity = value;
      }
      
      // Trigger the autosave
      debouncedSave(updatedData);
    };
    
    document.addEventListener('nestedComponentAutosave', handleNestedAutosave);
    
    return () => {
      document.removeEventListener('nestedComponentAutosave', handleNestedAutosave);
    };
  }, [localData, debouncedSave]);
  
  // ...rest of component
};

// Child component (e.g., OperationStepEditor)
const OperationStepEditor: React.FC<OperationStepEditorProps> = (props) => {
  // ...existing implementation
  
  // Function to trigger autosave
  const triggerAutosave = (field: string, value: any) => {
    // Update local state
    // ...
    
    // Dispatch event for parent to handle
    const event = new CustomEvent('nestedComponentAutosave', {
      detail: {
        index: props.index,
        field,
        value
      }
    });
    document.dispatchEvent(event);
  };
  
  return (
    <div>
      <AutosaveField
        label="Duration"
        name={`duration-${props.index}`} // Local name for the input
        value={props.step.duration.value}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          triggerAutosave('duration.value', value);
        }}
        isAutosave={true}
      />
      {/* Other fields */}
    </div>
  );
};
```

### Option 3: Context-Based Solution

Use React Context to share autosave functionality:

```typescript
// Create a context for autosave
interface AutosaveContextType {
  registerForAutosave: (path: string) => void;
  triggerAutosave: (path: string, value: any) => void;
  validationErrors: { [path: string]: string };
}

const AutosaveContext = React.createContext<AutosaveContextType>({
  registerForAutosave: () => {},
  triggerAutosave: () => {},
  validationErrors: {}
});

// Provider in parent component
const ActivityEditor: React.FC<ActivityEditorProps> = (props) => {
  // ...existing implementation
  
  // Create context value
  const autosaveContextValue = useMemo(() => {
    return {
      registerForAutosave: (path: string) => {
        // Add to autoSaveFields
        setAutoSaveFields(prev => [...prev, path]);
      },
      triggerAutosave: (path: string, value: any) => {
        // Update data at path and trigger save
        const updatedData = { ...localData };
        // set(updatedData, path, value);
        debouncedSave(updatedData);
      },
      validationErrors: validationErrors.reduce((acc, error) => {
        acc[error.fieldName] = error.message;
        return acc;
      }, {} as { [path: string]: string })
    };
  }, [localData, debouncedSave, validationErrors]);
  
  return (
    <BaseEditor>
      {/* BaseEditor implementation */}
      
      <AutosaveContext.Provider value={autosaveContextValue}>
        {/* Nested components */}
        {localData.operationSteps.map((step, index) => (
          <OperationStepEditor
            key={index}
            step={step}
            index={index}
            onChange={/* ... */}
            onDelete={/* ... */}
          />
        ))}
      </AutosaveContext.Provider>
    </BaseEditor>
  );
};

// Child component using context
const OperationStepEditor: React.FC<OperationStepEditorProps> = (props) => {
  // Get autosave context
  const { registerForAutosave, triggerAutosave, validationErrors } = useContext(AutosaveContext);
  
  // Register fields for autosave
  useEffect(() => {
    const basePath = `operationSteps[${props.index}]`;
    registerForAutosave(`${basePath}.duration.value`);
    registerForAutosave(`${basePath}.resourceQuantity`);
  }, [props.index, registerForAutosave]);
  
  // Generate field path helper
  const getFieldPath = (field: string) => `operationSteps[${props.index}].${field}`;
  
  // Get validation error if any
  const getFieldError = (field: string) => {
    const path = getFieldPath(field);
    return validationErrors[path];
  };
  
  return (
    <div>
      <AutosaveField
        label="Duration"
        name={`duration-${props.index}`} // Local name for the input
        value={props.step.duration.value}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          const path = getFieldPath('duration.value');
          triggerAutosave(path, value);
        }}
        error={getFieldError('duration.value')}
        isAutosave={true}
      />
      {/* Other fields */}
    </div>
  );
};
```

## Recommended Approach: Hybrid Solution

For the Quodsi editors, we recommend a hybrid approach that combines the best aspects of each option:

1. **Parent-controlled registration** for all autosave fields and validators
2. **Specialized callbacks** passed to child components for field changes
3. **Path-based identifiers** for nested fields
4. **Custom validation helper** for accessing nested data

Here's a complete implementation:

```typescript
// utils/deepPath.ts - Utility functions for working with nested paths

// Get a value from an object using a dot-notation path
export const getValueAtPath = (obj: any, path: string): any => {
  const segments = path.replace(/\[(\w+)\]/g, '.$1').split('.');
  let result = obj;
  
  for (const segment of segments) {
    if (result === null || result === undefined) return undefined;
    result = result[segment];
  }
  
  return result;
};

// Set a value in an object using a dot-notation path
export const setValueAtPath = (obj: any, path: string, value: any): any => {
  const segments = path.replace(/\[(\w+)\]/g, '.$1').split('.');
  
  if (segments.length === 0) return value;
  
  const result = { ...obj };
  let current = result;
  
  // Navigate to the parent of the target property
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    
    if (current[segment] === undefined) {
      // Create the path if it doesn't exist
      current[segment] = {};
    } else {
      // Clone the object to avoid mutating the original
      current[segment] = { ...current[segment] };
    }
    
    current = current[segment];
  }
  
  // Set the value on the target property
  const lastSegment = segments[segments.length - 1];
  current[lastSegment] = value;
  
  return result;
};
```

```typescript
// Parent component (ActivityEditor.tsx)
const ActivityEditor: React.FC<ActivityEditorProps> = (props) => {
  // ...existing implementation
  
  return (
    <BaseEditor
      data={localActivity}
      onSave={handleSave}
      onCancel={onCancel}
      messageType="activitySaved"
    >
      {(localData, handleChange, setAutoSaveFields, setValidators, validationErrors) => {
        // Function to handle nested field changes with path notation
        const handleNestedChange = (path: string, value: any) => {
          // Create a field name that BaseEditor can work with
          handleChange({
            target: {
              name: path,
              value
            }
          } as React.ChangeEvent<HTMLInputElement>);
        };
        
        // Register all fields that should autosave
        useEffect(() => {
          // Basic fields
          const autoSaveFields = [
            'capacity',
            'inputBufferCapacity',
            'outputBufferCapacity'
          ];
          
          // Add operation step fields
          localData.operationSteps.forEach((_, index) => {
            autoSaveFields.push(`operationSteps[${index}].duration.value`);
            autoSaveFields.push(`operationSteps[${index}].resourceQuantity`);
          });
          
          setAutoSaveFields(autoSaveFields);
        }, [localData.operationSteps.length, setAutoSaveFields]);
        
        // Register validators for all fields
        useEffect(() => {
          // Basic validators
          const validators = [
            {
              field: 'capacity',
              validate: (value) => validateBasic(value, 'Capacity')
            },
            {
              field: 'inputBufferCapacity',
              validate: (value) => validateBasic(value, 'Input Buffer')
            }
            // Add more validators for basic fields
          ];
          
          // Add validators for operation steps
          localData.operationSteps.forEach((_, index) => {
            validators.push({
              field: `operationSteps[${index}].duration.value`,
              validate: (value) => validatePositive(value, 'Duration')
            });
            validators.push({
              field: `operationSteps[${index}].resourceQuantity`,
              validate: (value) => validateInteger(value, 'Resource Quantity')
            });
          });
          
          setValidators(validators);
        }, [localData.operationSteps.length, setValidators]);
        
        // Helper to get validation error for any path
        const getErrorForPath = (path: string) => {
          const error = validationErrors.find(e => e.fieldName === path);
          return error ? error.message : undefined;
        };
        
        return (
          <div>
            {/* Basic fields with AutosaveField component */}
            <AutosaveField
              label="Capacity"
              name="capacity"
              value={localData.capacity}
              onChange={handleChange}
              error={getErrorForPath('capacity')}
              isAutosave={true}
            />
            
            {/* Nested components */}
            {localData.operationSteps.map((step, index) => (
              <OperationStepEditor
                key={index}
                step={step}
                index={index}
                // Pass special handlers and error lookup
                onChange={(step) => handleOperationStepChange(index, step)}
                onDelete={() => handleDeleteStep(index)}
                onFieldChange={(field, value) => {
                  const path = `operationSteps[${index}].${field}`;
                  handleNestedChange(path, value);
                }}
                getFieldError={(field) => {
                  const path = `operationSteps[${index}].${field}`;
                  return getErrorForPath(path);
                }}
                isAutosave={true}
              />
            ))}
          </div>
        );
      }}
    </BaseEditor>
  );
};
```

```typescript
// Child component (OperationStepEditor.tsx)
interface OperationStepEditorProps {
  step: OperationStep;
  index: number;
  onChange: (step: OperationStep) => void;
  onDelete: () => void;
  // Special props for autosave
  onFieldChange?: (field: string, value: any) => void;
  getFieldError?: (field: string) => string | undefined;
  isAutosave?: boolean;
}

export const OperationStepEditor: React.FC<OperationStepEditorProps> = ({
  step,
  index,
  onChange,
  onDelete,
  onFieldChange,
  getFieldError,
  isAutosave = false
}) => {
  // Regular change handler (for non-autosave mode)
  const handleChange = (field: string, value: any) => {
    const updatedStep = { ...step };
    
    // Update the step based on field
    if (field === 'duration.value') {
      updatedStep.duration.value = value;
    } else if (field === 'resourceQuantity') {
      updatedStep.resourceQuantity = value;
    }
    // Add other fields as needed
    
    // Call parent's onChange
    onChange(updatedStep);
  };
  
  // Special handler for auto-saving fields
  const handleFieldChange = (field: string, value: any) => {
    // Update local state through regular onChange
    handleChange(field, value);
    
    // Also notify for autosave if enabled
    if (isAutosave && onFieldChange) {
      onFieldChange(field, value);
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      {/* Duration field with autosave */}
      <AutosaveField
        label="Duration"
        name={`duration-${index}`} // Local name for the input
        value={step.duration.value}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          handleFieldChange('duration.value', value);
        }}
        type="number"
        min="0"
        step="0.1"
        error={getFieldError ? getFieldError('duration.value') : undefined}
        isAutosave={isAutosave}
      />
      
      {/* Other fields */}
    </div>
  );
};
```

## Handling Dynamic Nested Components

When dealing with components that can be added or removed (like OperationSteps), special handling is needed:

### 1. Recompute Registration on Array Change

When the array of nested components changes, recompute all registrations:

```typescript
// Inside parent component
useEffect(() => {
  // Recompute all autosave field registrations
  const fields = [
    'capacity',
    'inputBufferCapacity',
    // ...other base fields
  ];
  
  // Add all operation step fields
  localData.operationSteps.forEach((_, index) => {
    fields.push(`operationSteps[${index}].duration.value`);
    // ...other operation step fields
  });
  
  setAutoSaveFields(fields);
}, [localData.operationSteps.length]); // Dependency on array length
```

### 2. Clean Up Validation Errors for Removed Items

When removing an item, clean up any lingering validation errors:

```typescript
// Inside parent component
const handleDeleteStep = (index: number) => {
  // Update the local data
  const updatedSteps = [...localData.operationSteps];
  updatedSteps.splice(index, 1);
  
  // Update the data
  handleChange({
    target: {
      name: 'operationSteps',
      value: updatedSteps
    }
  } as React.ChangeEvent<HTMLInputElement>);
  
  // Clear any validation errors for the removed step
  const errorsToRemove = validationErrors
    .filter(e => e.fieldName.startsWith(`operationSteps[${index}]`))
    .map(e => e.fieldName);
  
  if (errorsToRemove.length > 0) {
    // Custom function to remove validation errors
    // This would need to be implemented in BaseEditor
    clearValidationErrors(errorsToRemove);
  }
};
```

### 3. Handle Reindexing After Removal

When an item is removed, the indices of subsequent items change. Two approaches:

#### Option A: Full Reregistration

```typescript
// After removing an item, completely reregister all fields
// This is handled by the useEffect with operationSteps.length dependency
```

#### Option B: Targeted Updates

```typescript
// Inside parent component
const handleDeleteStep = (index: number) => {
  // ... existing deletion logic
  
  // Update all affected field registrations
  for (let i = index; i < updatedSteps.length; i++) {
    // Unregister old paths
    const oldBasePath = `operationSteps[${i + 1}]`;
    unregisterAutoSaveField(`${oldBasePath}.duration.value`);
    unregisterAutoSaveField(`${oldBasePath}.resourceQuantity`);
    
    // Register new paths
    const newBasePath = `operationSteps[${i}]`;
    registerAutoSaveField(`${newBasePath}.duration.value`);
    registerAutoSaveField(`${newBasePath}.resourceQuantity`);
    
    // Update validators similarly
    // ...
  }
};
```

## Best Practices for Nested Component Autosave

1. **Consistent Path Notation**: Use consistent notation for nested paths (e.g., `parent[index].child.property`)

2. **Parent Control**: Let the parent component control all registrations and validations

3. **Specialized Props**: Pass specialized props to child components for autosave interaction:
   - `onFieldChange`: For triggering autosave for specific fields
   - `getFieldError`: For retrieving validation errors by field
   - `isAutosave`: Flag to enable/disable autosave behavior

4. **Validation Access**: Provide helpers to access validation errors for nested fields

5. **Recomputation Triggers**: Recompute registrations when array structure changes

6. **Error Cleanup**: Clean up validation errors when components are removed

7. **Array Indices**: Be careful with array indices, especially after removals

## Performance Considerations

Nested component autosave can impact performance, especially with large numbers of components:

1. **Selective Registration**: Only register fields that truly need autosave

2. **Debounce Per Component**: Consider separate debounce timers for different components

3. **Batched Updates**: Batch related changes to minimize save operations

4. **Memoization**: Use React.memo and useMemo to reduce unnecessary rerenders:
   ```typescript
   // Memoize the OperationStepEditor component
   export const OperationStepEditor = React.memo(({ ... }) => {
     // Component implementation
   });
   ```

5. **Virtualization**: For very large lists, consider virtualization to render only visible items

## Conclusion

Implementing autosave for nested components requires careful consideration of state management, validation, and component communication. The hybrid approach outlined in this guide provides a robust solution that balances functionality with performance and maintainability.

By following these patterns, you can implement autosave for complex nested structures while maintaining a clean, predictable codebase.
