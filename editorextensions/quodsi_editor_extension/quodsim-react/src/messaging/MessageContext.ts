import React, { createContext, useContext } from 'react';
import { 
  initialState, 
  MessagingState, 
  MessagingAction 
} from './state';
import { EnvelopeMessageType } from '@quodsi/shared';

// Context types
export type MessagingContextValue = MessagingState & {
  sendMessage: <T extends EnvelopeMessageType>(type: T, data?: any) => void;
};

export type MessagingDispatch = React.Dispatch<MessagingAction>;

// Create the contexts
export const MessagingContext = createContext<MessagingContextValue>({
  ...initialState,
  sendMessage: () => {},
});

export const MessagingDispatchContext = createContext<MessagingDispatch>(() => {});

// Hook exports for consuming contexts
export function useMessaging() {
  return useContext(MessagingContext);
}

export function useMessagingDispatch() {
  return useContext(MessagingDispatchContext);
}

/**
 * Hook to access selection state
 */
export function useSelection() {
  const { selection } = useMessaging();
  
  // Add enhanced logging
  console.log('[useSelection] Selection state retrieved:', {
    selectedElementsCount: selection?.selectedElements?.length || 0,
    hasDocumentContext: !!selection?.documentContext,
    lastUpdated: selection?.lastUpdated,
    documentContextIsQuodsiModel: selection?.documentContext?.isQuodsiModel
  });
  
  return selection;
}

/**
 * Hook to access simulation state
 */
export function useSimulation() {
  const { simulation } = useMessaging();
  return simulation;
}

/**
 * Hook to access validation state
 */
export function useValidation() {
  const { validation } = useMessaging();
  return validation;
}

/**
 * Hook to access element operations state
 */
export function useElementOps() {
  const { elementOps } = useMessaging();
  return elementOps;
}

/**
 * Hook to access simulation runs state
 */
export function useSimulationRuns() {
  const { simulationRuns } = useMessaging();
  return simulationRuns;
}

/**
 * Hook to access conversion preview state
 */
export function useConversionPreviewState() {
  const { conversionPreview } = useMessaging();
  return conversionPreview;
}

/**
 * Hook to access scenario definitions state
 */
export function useScenarioDefinitions() {
  const { scenarioDefinitions } = useMessaging();
  return scenarioDefinitions;
}

/**
 * Hook to access authentication state
 */
export function useAuth() {
  const { auth } = useMessaging();
  return auth;
}

/**
 * Hook to access entitlements state (plan, features, trial).
 * Use alongside selectors from state/entitlementsSlice, e.g.:
 *   const entitlements = useEntitlements();
 *   const canSubmit = canSubmitSimulation(entitlements);
 */
export function useEntitlements() {
  const { entitlements } = useMessaging();
  return entitlements;
}
