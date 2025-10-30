import { useState, useEffect } from 'react';
import { useElementOpsState } from './useElementOpsState';

/**
 * Custom hook for managing parameter editor state with Redux integration
 *
 * Provides local state buffering to prevent prop changes from overwriting
 * user input during editing. Integrates with Redux save state to guard
 * against updates during save operations.
 *
 * @template T - The type of the parameter value
 * @param propValue - The value from props (source of truth when not editing)
 * @param elementId - Optional element ID to check save state in Redux
 * @returns Object with local value, setters, and state flags
 *
 * @example
 * ```typescript
 * const { localValue, setLocalValue, isDirty, setIsDirty, isSaving } =
 *   useParameterEditorState(props.value, props.elementId);
 *
 * const handleChange = (e) => {
 *   setLocalValue(e.target.value);
 *   setIsDirty(true);
 * };
 * ```
 */
export function useParameterEditorState<T>(
  propValue: T,
  elementId?: string
) {
  // Local state for input buffering
  const [localValue, setLocalValue] = useState<T>(propValue);
  const [isDirty, setIsDirty] = useState(false);

  // Get save state from Redux
  const elementOps = useElementOpsState();
  const isSaving = elementId ? elementOps.isSaving(elementId) : false;

  // Sync with prop only when safe (not dirty and not saving)
  useEffect(() => {
    if (!isDirty && !isSaving) {
      console.log('[useParameterEditorState] Syncing with prop value:', propValue);
      setLocalValue(propValue);
    } else {
      console.log('[useParameterEditorState] Sync blocked:', { isDirty, isSaving });
    }
  }, [propValue, isDirty, isSaving]);

  // Clear isDirty when save completes
  useEffect(() => {
    if (!isSaving && isDirty) {
      // Save just completed, clear dirty flag
      console.log('[useParameterEditorState] Save completed, clearing isDirty flag');
      setIsDirty(false);
    }
  }, [isSaving, isDirty]);

  return {
    /**
     * Local buffered value - use this for controlled inputs
     */
    localValue,

    /**
     * Update local value (call this in onChange handlers)
     */
    setLocalValue,

    /**
     * Indicates user has made changes that haven't been synchronized
     */
    isDirty,

    /**
     * Mark value as dirty (call after user edits)
     */
    setIsDirty,

    /**
     * Indicates element is currently being saved (from Redux)
     */
    isSaving,

    /**
     * Reset local state to prop value (useful for Cancel actions)
     */
    reset: () => {
      setLocalValue(propValue);
      setIsDirty(false);
    },
  };
}

/**
 * Variant for managing multiple related parameter fields
 * (e.g., UniformParameters with min/max)
 *
 * @template T - The type of the parameters object
 * @param propParams - The parameters object from props
 * @param elementId - Optional element ID to check save state
 * @returns Object with local params, field setters, and state flags
 *
 * @example
 * ```typescript
 * const { localParams, updateField, isDirty, setIsDirty, isSaving } =
 *   useMultiParameterEditorState(props.parameters, props.elementId);
 *
 * const handleMinChange = (value) => {
 *   updateField('min', value);
 *   setIsDirty(true);
 * };
 * ```
 */
export function useMultiParameterEditorState<T extends Record<string, any>>(
  propParams: T,
  elementId?: string
) {
  const [localParams, setLocalParams] = useState<T>(propParams);
  const [isDirty, setIsDirty] = useState(false);

  const elementOps = useElementOpsState();
  const isSaving = elementId ? elementOps.isSaving(elementId) : false;

  // Sync with props when safe
  useEffect(() => {
    if (!isDirty && !isSaving) {
      console.log('[useMultiParameterEditorState] Syncing with prop params:', propParams);
      setLocalParams(propParams);
    } else {
      console.log('[useMultiParameterEditorState] Sync blocked:', { isDirty, isSaving });
    }
  }, [propParams, isDirty, isSaving]);

  // Clear isDirty when save completes
  useEffect(() => {
    if (!isSaving && isDirty) {
      console.log('[useMultiParameterEditorState] Save completed, clearing isDirty flag');
      setIsDirty(false);
    }
  }, [isSaving, isDirty]);

  /**
   * Update a single field in the parameters object
   */
  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    setLocalParams(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return {
    localParams,
    setLocalParams,
    updateField,
    isDirty,
    setIsDirty,
    isSaving,
    reset: () => {
      setLocalParams(propParams);
      setIsDirty(false);
    },
  };
}
