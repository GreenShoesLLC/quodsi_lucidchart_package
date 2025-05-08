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

// Export hooks we've implemented
export { 
  useAuthState,
  useSendMessage
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
export { mapEnvelopeToAction } from './mappers';

// Export individual mappers directly from their source files to avoid any re-export issues
export { mapFramework } from './mappers/framework.mapper';
export { mapAuth } from './mappers/auth.mapper';
export { mapSubscription } from './mappers/subscription.mapper';
export { mapSelection } from './mappers/selection.mapper';
export { mapSimulation } from './mappers/simulation.mapper';
export { mapModelOps } from './mappers/modelOps.mapper';
export { mapStorage } from './mappers/storage.mapper';

// Export the reducer
export { messagingReducer, initialState } from './state';

// Export debug service
export { debugService } from './utils/debugService';

// Export initialization function
export { initializeMessaging, type MessagingInitOptions } from './initializeMessaging';

// Export types
export * from './state';
