# Technical Implementation of Autosave

## Current Implementation

### Component Hierarchy

The current implementation follows this component hierarchy:

```
QuodsiApp
├── ModelPanelAccordion
│   └── ElementEditor
│       └── ConnectorEditor (and other specialized editors)
│           └── BaseEditor
```

### Save Process Flow

The current save process relies on explicit user action:

1. User modifies a field and clicks "Save"
2. BaseEditor captures the form submission and calls `handleSave()`
3. The `onSave` callback is invoked with the updated data
4. The callback chain passes data up the component hierarchy:
   - ConnectorEditor → ElementEditor → ModelPanelAccordion → QuodsiApp
5. QuodsiApp's `handleElementUpdate` method processes the update
6. A message is sent to the extension using `MessageTypes.UPDATE_ELEMENT_DATA`
7. The extension's ModelPanel receives and processes the update
8. The extension updates the LucidChart document and sends a confirmation

### Current Limitations

- All fields require manual saving
- No distinction between critical vs. frequent changes
- No validation before save attempts
- No visual feedback during save process
- Potential for data loss if users forget to save

## Proposed Technical Implementation

### Enhanced BaseEditor Component

The core of the autosave implementation is an enhanced BaseEditor component with:

1. **Field Registration**: Allow child components to register which fields should autosave
   ```typescript
   const [autoSaveFields, setAutoSaveFields] = useState<string[]>([]);
   ```

2. **Debounced Save Logic**: Implement debounce to prevent excessive saves
   ```typescript
   const debouncedSave = useCallback((fieldName: string) => {
     if (debounceTimers[fieldName]) {
       clearTimeout(debounceTimers[fieldName]);
     }
     const newTimer = setTimeout(() => {
       handleSave();
       // ... additional logic ...
     }, 800);
     // ... timer management ...
   }, [debounceTimers, handleSave]);
   ```

3. **Modified Change Handler**: Trigger autosave when appropriate
   ```typescript
   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, value } = e.target;
     setLocalData(prev => ({ ...prev, [name]: value }));
     
     if (autoSaveFields.includes(name)) {
       debouncedSave(name);
     }
   };
   ```

4. **Validation Integration**: Only save valid data
   ```typescript
   // Before autosaving
   if (validateField(fieldName)) {
     handleSave();
   } else {
     // Display validation errors
   }
   ```

5. **Conditional UI**: Show/hide save buttons based on context
   ```typescript
   {showButtons && (
     <div className="quodsi-button-group">
       <button type="submit" className="quodsi-button quodsi-button-primary">
         Save
       </button>
       <button type="button" onClick={onCancel} className="quodsi-button quodsi-button-secondary">
         Cancel
       </button>
     </div>
   )}
   ```

### Child Component Integration

Child components like ConnectorEditor will need to:

1. Register autosave fields on mount
   ```typescript
   useEffect(() => {
     setAutoSaveFields(['probability']);
   }, [setAutoSaveFields]);
   ```

2. Provide field validators
   ```typescript
   useEffect(() => {
     setValidators([
       {
         field: 'probability',
         validate: (value) => {
           // Validation logic
           return isValid ? null : 'Error message';
         }
       }
     ]);
   }, [setValidators]);
   ```

3. Add visual elements to indicate autosave status
   ```tsx
   <small className="quodsi-help-text">Auto-saves when changed</small>
   ```

### Extension Interaction

The interaction with the extension remains unchanged:
- The same message types are used (`MessageTypes.UPDATE_ELEMENT_DATA`)
- The extension processes updates in the same way
- Validation occurs in the React app before sending to the extension

This approach maintains compatibility while introducing autosave functionality where appropriate.

## Fallback and Error Handling

The implementation includes graceful fallback mechanisms:

1. If validation fails, autosave is blocked and errors are displayed
2. If a save operation fails, the UI shows an error and maintains dirty state
3. For fields not registered for autosave, manual save remains available
4. If all registered autosave fields have saved, the save button disappears
5. If any non-autosave field is modified, the save button reappears

This balanced approach provides the benefits of autosave while maintaining robustness and user control.
