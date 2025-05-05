import { useMemo } from 'react';
import { useMessaging, useMessagingDispatch } from '../MessageProvider';

/**
 * Enhanced hook for accessing the full messaging state
 * Provides both the state and dispatch function in one hook
 * 
 * @returns An object containing the full state and dispatch function
 */
export function useMessagingState() {
  const state = useMessaging();
  const dispatch = useMessagingDispatch();
  
  // Memoize the return value to prevent unnecessary rerenders
  const messagingState = useMemo(() => ({
    state,
    dispatch
  }), [state, dispatch]);
  
  return messagingState;
}
