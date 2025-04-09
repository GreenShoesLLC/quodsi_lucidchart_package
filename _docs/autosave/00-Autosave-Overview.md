# Autosave Overview

## Current State

The Quodsi editor extension for LucidChart currently implements a manual save approach for all editor components, including the ConnectorEditor. Users must explicitly click the "Save" button to persist any changes they make to connector properties like probability values. This approach:

- Requires explicit user action to persist changes
- Provides clear control over when changes are committed
- Avoids unintended data updates
- May lead to data loss if users forget to save
- Creates additional cognitive load for users who must remember to save

The current save flow works as follows:
1. User modifies input field (e.g., probability)
2. BaseEditor tracks changes in local state
3. User clicks "Save" button
4. BaseEditor calls `handleSave()`
5. Changes propagate through component hierarchy
6. Message is sent to extension via `MessageTypes.UPDATE_ELEMENT_DATA`
7. Extension saves data to the LucidChart document

## Future State with Autosave

The proposed autosave functionality will enable select fields to automatically persist changes after a short delay (debounce period). This approach:

- Eliminates the need to manually save common changes
- Reduces cognitive load on users
- Prevents data loss from forgotten saves
- Maintains manual save option for critical fields
- Provides immediate feedback on save status

The enhanced autosave flow will work as follows:
1. User modifies an autosave-enabled field (e.g., probability)
2. BaseEditor tracks change and starts debounce timer
3. After the debounce period (800ms), if no further changes occur:
   - Validation is performed
   - If valid, changes are automatically saved
   - Visual feedback indicates save status
4. For non-autosave fields, the manual save button remains available
5. Invalid inputs block autosave and display error messages

## Key Benefits

The introduction of autosave functionality offers several important benefits:

1. **Better User Experience**: Reduces friction in the editing process
2. **Data Safety**: Decreases likelihood of lost changes
3. **Selective Application**: Can be applied only to appropriate fields
4. **Graceful Degradation**: Falls back to manual save when needed
5. **Validation Integration**: Ensures only valid data is saved

## Implementation Approach

The autosave functionality will be implemented by:

1. Enhancing BaseEditor to support field-specific autosave
2. Adding validation to prevent saving invalid data
3. Implementing debouncing to optimize performance
4. Creating visual indicators for save status
5. Making the autosave feature configurable per field

This approach maintains backward compatibility while gradually introducing autosave where most beneficial.
