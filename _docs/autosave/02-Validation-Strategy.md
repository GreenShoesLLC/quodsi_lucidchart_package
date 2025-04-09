# Validation Strategy for Autosave

## Current Validation Approach

In the current implementation, validation for form fields is limited:

1. **Client-Side HTML Validation**: Relies primarily on HTML attributes
   - Uses `min`, `max`, and `step` attributes for numeric inputs
   - No custom validation logic beyond browser defaults
   - No validation for semantic correctness or business rules

2. **Server-Side Validation**: The extension may reject invalid data
   - No clear mechanism for communicating validation failures back to the UI
   - User receives little feedback about why a save failed
   - The validation state is not tracked in the React component state

3. **User Experience Issues**:
   - Users may attempt to save invalid data
   - No immediate feedback on input errors
   - Validation failures are not clearly communicated
   - No guidance on how to correct errors

## Enhanced Validation for Autosave

A robust validation strategy is critical for autosave, as invalid data should never be automatically persisted. The enhanced approach includes:

### 1. Field-Level Validation

Each field will have dedicated validators:

```typescript
interface FieldValidator {
  field: string;
  validate: (value: any) => string | null; // Returns error message or null if valid
}

// Example implementation
const probabilityValidator: FieldValidator = {
  field: 'probability',
  validate: (value) => {
    // Convert to number for validation
    const numValue = Number(value);
    
    // Check if it's a valid number
    if (isNaN(numValue)) {
      return 'Probability must be a valid number';
    }
    
    // Check range
    if (numValue < 0 || numValue > 1) {
      return 'Probability must be between 0 and 1';
    }
    
    return null; // No error
  }
};
```

### 2. Validation Timing

Validation will occur at multiple points:

1. **Immediate Validation**: As soon as a field value changes
   - Provides instant feedback
   - Highlights errors before save attempts

2. **Pre-Save Validation**: Before any autosave operation
   - Prevents invalid data from being saved
   - Blocks autosave until validation passes

3. **Form Submission Validation**: Before manual form submission
   - Validates all fields, not just the one being changed
   - Prevents invalid form submissions

### 3. Validation UI Elements

The UI will clearly communicate validation state:

1. **Field-Level Indicators**:
   - Red border and background for invalid fields
   - Error messages directly beneath fields
   - Icon indicators for validity state

2. **Form-Level Summary**:
   - Summary of all validation errors at form level
   - Disabled save button when form is invalid
   - Error count indicators

3. **Autosave-Specific Elements**:
   - Indication when autosave is blocked due to validation
   - Guidance on how to correct errors to enable autosave

### 4. Validation Error Tracking

The component will maintain error state:

```typescript
interface ValidationError {
  fieldName: string;
  message: string;
}

const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

// Check if a field has an error
const hasFieldError = (fieldName: string) => 
  validationErrors.some(error => error.fieldName === fieldName);

// Get error message for a field
const getFieldErrorMessage = (fieldName: string) => {
  const error = validationErrors.find(error => error.fieldName === fieldName);
  return error ? error.message : null;
};
```

### 5. Business Logic Validation

Beyond basic type and range validation, the system will support complex validation rules:

1. **Context-Aware Validation**: Rules that depend on other field values
2. **Business Rule Validation**: Domain-specific requirements
3. **Relational Validation**: Checking constraints between fields

## Validation and Autosave Integration

The integration of validation with autosave ensures:

1. **No Invalid Autosaves**: Automatic saves only occur when data is valid
2. **Clear Feedback**: Users understand why an autosave didn't occur
3. **Seamless Correction**: Easy path to correct errors and resume autosave
4. **Graceful Degradation**: Falls back to manual save when needed

## Implementation Example

The BaseEditor component will integrate validation as follows:

```typescript
// In the debouncedSave function
const debouncedSave = useCallback((fieldName: string) => {
  // Clear existing timer
  if (debounceTimers[fieldName]) {
    clearTimeout(debounceTimers[fieldName]);
  }
  
  // Set new timer
  const newTimer = setTimeout(() => {
    // Validate the field first
    if (validateField(fieldName)) {
      // Only save if valid
      handleSave();
    } else {
      console.log(`Autosave canceled - validation failed for ${fieldName}`);
    }
    
    // Remove timer from state
    setDebounceTimers(prev => {
      const newState = {...prev};
      delete newState[fieldName];
      return newState;
    });
  }, 800);
  
  // Store timer
  setDebounceTimers(prev => ({
    ...prev,
    [fieldName]: newTimer
  }));
}, [debounceTimers, handleSave, validateField]);
```

This approach ensures data integrity while maintaining a smooth user experience with appropriate feedback.
