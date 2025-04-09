# Accessibility Considerations for Autosave

## Current Accessibility State

The current manual save implementation has limited accessibility considerations:

1. **Basic Keyboard Navigation**: Standard form controls are keyboard navigable
2. **Standard Button Interactions**: Save and Cancel buttons work with standard keyboard interactions
3. **No Status Announcements**: No ARIA live regions for save status
4. **Limited Focus Management**: No special focus handling during save operations
5. **No Motion Sensitivity Accommodations**: No consideration for users with vestibular disorders

## Comprehensive Accessibility Approach for Autosave

Implementing autosave requires special attention to accessibility to ensure all users can understand when changes are being saved and receive appropriate feedback.

### 1. Screen Reader Announcements

Autosave status changes must be announced to screen reader users:

```tsx
// Status announcements component
const AutosaveStatusAnnouncement: React.FC<{
  status: 'idle' | 'saving' | 'success' | 'error';
  errorMessage?: string;
}> = ({ status, errorMessage }) => {
  // Only render when there's actually a status to announce
  if (status === 'idle') return null;
  
  let message = '';
  switch(status) {
    case 'saving':
      message = 'Saving your changes...';
      break;
    case 'success':
      message = 'Changes saved successfully.';
      break;
    case 'error':
      message = `Error saving changes. ${errorMessage || ''}`;
      break;
  }
  
  return (
    <div 
      aria-live="polite" 
      role="status" 
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Usage in BaseEditor
return (
  <form onSubmit={handleSubmit} className="quodsi-form">
    {children(localData, handleChange, setAutoSaveFields)}
    
    <AutosaveStatusAnnouncement 
      status={autoSaveState[currentSavingField] || 'idle'}
      errorMessage={autoSaveErrors[currentSavingField]?.message}
    />
    
    {/* Visual indicators for sighted users */}
    {isSaving && (
      <div className="quodsi-auto-save-indicator" aria-hidden="true">
        Saving changes...
      </div>
    )}
    
    {/* Rest of the component */}
  </form>
);
```

### 2. Keyboard Focus Management

Maintain appropriate keyboard focus during autosave operations:

```typescript
// Track input focus state
const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

// Save focus when an input gets focus
const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
  setFocusedElement(e.target);
};

// Add focus handlers to inputs
const wrapWithFocusHandlers = (
  element: JSX.Element, 
  key: string
): JSX.Element => {
  return React.cloneElement(element, {
    onFocus: handleInputFocus,
    key
  });
};

// Handle error state focus management
useEffect(() => {
  // If we get a new error and have a focused element
  if (validationErrors.length > 0 && focusedElement) {
    // Check if the focused element has an error
    const fieldName = focusedElement.getAttribute('name');
    const hasError = validationErrors.some(e => e.fieldName === fieldName);
    
    if (hasError) {
      // Find the associated error message element
      const errorId = `error-${fieldName}`;
      const errorElement = document.getElementById(errorId);
      
      // Announce the error to screen readers with appropriate ARIA
      if (errorElement && focusedElement) {
        // Connect the input to its error message
        focusedElement.setAttribute('aria-describedby', errorId);
        
        // No need to move focus - keep it on the input so user can fix the error
      }
    }
  }
}, [validationErrors, focusedElement]);
```

### 3. Semantic Markup for Validation

Ensure validation errors are properly connected to form controls:

```tsx
// Input field with accessible validation
const AccessibleField: React.FC<{
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  isAutosave?: boolean;
}> = ({ name, label, value, onChange, error, isAutosave }) => {
  const inputId = `field-${name}`;
  const errorId = `error-${name}`;
  
  return (
    <div className="quodsi-field">
      <label htmlFor={inputId} className="quodsi-label">
        {label}
        {isAutosave && (
          <span className="quodsi-autosave-indicator" aria-label="This field autosaves">
            (autosaves)
          </span>
        )}
      </label>
      
      <div className="quodsi-input-wrapper">
        <input
          type="text"
          id={inputId}
          name={name}
          className={`quodsi-input ${error ? 'quodsi-input-error' : ''}`}
          value={value}
          onChange={onChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
        />
        
        {error && (
          <div 
            id={errorId}
            className="quodsi-error-message" 
            role="alert"
          >
            {error}
          </div>
        )}
        
        {isAutosave && !error && (
          <small className="quodsi-help-text" id={`help-${name}`}>
            Auto-saves when changed
          </small>
        )}
      </div>
    </div>
  );
};
```

### 4. Reduced Motion Support

Respect user motion preferences:

```typescript
// Hook to detect motion preference
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    // Set up listener for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Older browsers
    // @ts-ignore - older API
    if (mediaQuery.addListener) {
      // @ts-ignore
      mediaQuery.addListener(handleChange);
      return () => {
        // @ts-ignore
        mediaQuery.removeListener(handleChange);
      };
    }
  }, []);
  
  return prefersReducedMotion;
};

// Usage in components
const AutosaveIndicator: React.FC<{
  status: 'idle' | 'saving' | 'success' | 'error';
}> = ({ status }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (status === 'idle') return null;
  
  return (
    <div 
      className={`quodsi-autosave-indicator quodsi-status-${status} ${
        prefersReducedMotion ? 'quodsi-no-animation' : 'quodsi-animated'
      }`}
      aria-hidden="true" // Visual indicator only, actual status is announced via ARIA live
    >
      {status === 'saving' && 'Saving changes...'}
      {status === 'success' && 'Changes saved'}
      {status === 'error' && 'Error saving changes'}
    </div>
  );
};
```

### 5. Color Independence

Ensure status information is not conveyed by color alone:

```css
/* CSS with accessible color use */
.quodsi-autosave-indicator {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.quodsi-status-saving::before {
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

.quodsi-status-success::before {
  content: "✓";
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  color: #10b981;
}

.quodsi-status-error::before {
  content: "!";
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  color: #ef4444;
  font-weight: bold;
  text-align: center;
  border: 1px solid #ef4444;
  border-radius: 50%;
}

/* No-animation alternatives */
.quodsi-no-animation.quodsi-status-saving::before {
  animation: none;
  border: none;
  content: "⟳";
}
```

### 6. Keyboard Shortcuts

Provide keyboard shortcuts for common actions:

```typescript
// Keyboard shortcut hook
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save with Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Trigger manual save
        handleSave();
      }
      
      // Other shortcuts as needed
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);
};

// Include keyboard instructions in help text
const KeyboardHelpText: React.FC = () => (
  <div className="quodsi-keyboard-help">
    <h3>Keyboard Shortcuts</h3>
    <ul>
      <li><kbd>Ctrl</kbd> + <kbd>S</kbd>: Save changes manually</li>
      <li><kbd>Esc</kbd>: Cancel editing</li>
    </ul>
  </div>
);
```

### 7. Progressive Enhancement

Ensure the form works without JavaScript for basic functionality:

```tsx
// Server-side fallback
<noscript>
  <div className="quodsi-noscript-warning">
    <p>Autosave requires JavaScript. Please enable JavaScript for the best experience.</p>
    <p>You can still use the form and save manually with the button below.</p>
  </div>
  
  <input 
    type="submit" 
    value="Save Changes" 
    className="quodsi-button quodsi-button-primary"
  />
</noscript>
```

### 8. Visible Focus Indicators

Ensure all interactive elements have visible focus indicators:

```css
/* Enhanced focus styles */
.quodsi-input:focus,
.quodsi-select:focus,
.quodsi-button:focus {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
}

/* Ensure focus is visible in high contrast mode */
@media (forced-colors: active) {
  .quodsi-input:focus,
  .quodsi-select:focus,
  .quodsi-button:focus {
    outline: 3px solid SelectedItem;
  }
}
```

### 9. Touch Target Size

Ensure touch targets are large enough for users with motor impairments:

```css
/* Touch-friendly control sizes */
.quodsi-button,
.quodsi-input,
.quodsi-select {
  min-height: 44px; /* Minimum recommended touch target size */
  padding: 8px 12px;
}

/* Increase spacing between elements for touch */
.quodsi-field {
  margin-bottom: 16px;
}

/* Ensure retry buttons are easily tappable */
.quodsi-retry-button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 10. Multi-Modal Feedback

Provide feedback through multiple channels:

```typescript
// Feedback through multiple channels
const provideFeedback = (message: string, type: 'success' | 'error' | 'info') => {
  // Visual feedback
  setFeedbackMessage({ text: message, type });
  
  // Screen reader announcement (ARIA live)
  setAriaAnnouncement(message);
  
  // Optional haptic feedback for supported devices
  if (window.navigator.vibrate && type === 'error') {
    window.navigator.vibrate(200);
  }
  
  // Clear visual feedback after delay
  setTimeout(() => {
    setFeedbackMessage(null);
  }, 3000);
};
```

## Accessibility Guidelines Implementation Plan

Implement accessibility features in this order:

### Phase 1: Basic Accessibility (High Priority)

1. **ARIA Live Regions**: Add for announcing save status
2. **Keyboard Focus Management**: Ensure focus is maintained during autosave
3. **Semantic Markup**: Properly connect form controls to labels and errors
4. **Color Independence**: Use icons and text alongside colors

### Phase 2: Enhanced Accessibility (Medium Priority)

1. **Reduced Motion Support**: Respect prefers-reduced-motion setting
2. **Visible Focus Indicators**: Enhance focus styles
3. **Touch Target Size**: Increase interactive element sizes
4. **Error Recovery**: Improve error handling for screen reader users

### Phase 3: Advanced Accessibility (Lower Priority)

1. **Keyboard Shortcuts**: Add helpful keyboard shortcuts
2. **Progressive Enhancement**: Ensure basic functionality without JS
3. **Multi-Modal Feedback**: Implement feedback through multiple channels
4. **Customizable Timing**: Allow users to adjust autosave timing

## Accessibility Testing Approach

To ensure accessibility requirements are met:

1. **Automated Testing**:
   - Use axe-core for automated accessibility checks
   - Verify ARIA attributes with unit tests

2. **Manual Testing**:
   - Test with screen readers (NVDA, JAWS, VoiceOver)
   - Keyboard navigation testing
   - High contrast mode testing
   - Reduced motion preference testing

3. **User Testing**:
   - Test with users who have various disabilities
   - Gather feedback on autosave usability

## WCAG 2.1 Compliance Checklist

Ensure autosave implementation meets these WCAG 2.1 success criteria:

| Criterion | Description | Implementation |
|-----------|-------------|----------------|
| 1.3.1 Info and Relationships | Form controls have associated labels | Use proper label-input relationships |
| 1.3.2 Meaningful Sequence | Logical focus order | Ensure tab order matches visual layout |
| 1.4.1 Use of Color | Color not sole means of conveying info | Use icons and text with colors |
| 1.4.3 Contrast | Sufficient contrast | 4.5:1 ratio for all text and indicators |
| 1.4.11 Non-text Contrast | UI components have sufficient contrast | 3:1 ratio for UI boundaries |
| 2.1.1 Keyboard | All functionality via keyboard | Ensure all controls are keyboard accessible |
| 2.1.2 No Keyboard Trap | Can move away with keyboard | Test keyboard navigation paths |
| 2.2.1 Timing Adjustable | Users can adjust timing | Allow configurable autosave timing |
| 2.4.3 Focus Order | Focus in meaningful order | Logical tab sequence |
| 2.4.7 Focus Visible | Keyboard focus indicator visible | Enhanced focus styles |
| 2.5.3 Label in Name | Label text in accessible name | Match visible labels with ARIA labels |
| 3.2.1 On Focus | Focus doesn't trigger change | No auto-focus or focus-triggered saves |
| 3.2.2 On Input | Input doesn't trigger unexpected change | Clear indication of autosave |
| 3.3.1 Error Identification | Identify input errors | Accessible error messages |
| 3.3.3 Error Suggestion | Suggest fixes for errors | Helpful validation messages |
| 4.1.2 Name, Role, Value | ARIA used appropriately | Proper ARIA for custom controls |

## Conclusion

By implementing these accessibility considerations, the autosave feature will be usable by all users, including those with disabilities. The phased approach allows for prioritizing the most critical accessibility features while planning for comprehensive coverage.

Remember that accessibility is an ongoing process - continue to test with users and refine the implementation based on feedback and evolving standards.
