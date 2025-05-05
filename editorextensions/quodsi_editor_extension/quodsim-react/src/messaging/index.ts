// Export the MessageProvider component and base hooks
export { 
  MessageProvider,
  useMessaging,
  useMessagingDispatch,
  useAuth,
  useSubscription,
  useSelection,
  useSimulation,
  useValidation
} from './MessageProvider';

// Export enhanced state hooks
export { 
  useMessagingState,
  useAuthState,
  useSubscriptionState,
  useSelectionState,
  useSimulationState,
  useValidationState
} from './hooks';

// Export message senders
export { 
  useSender,
  useAuthSender,
  useSubscriptionSender,
  useSimulationSender,
  useModelOpsSender,
  useStorageSender
} from './senders';

// Export mapping functions
export { 
  mapEnvelopeToAction,
  mapFramework,
  mapAuth,
  mapSubscription,
  mapSelection,
  mapSimulation,
  mapModelOps,
  mapStorage
} from './mappers';

// Export the reducer
export { messagingReducer, initialState } from './reducer';

// Export debug service
export { debugService } from './utils/debugService';

// Export initialization function
export { initializeMessaging, type MessagingInitOptions } from './initializeMessaging';

// Export types
export * from './types';
