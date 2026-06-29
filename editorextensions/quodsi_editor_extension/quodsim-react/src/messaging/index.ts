// Export the MessageProvider component and base hooks
export {
  MessageProvider,
  useMessaging,
  useMessagingDispatch,
  useSelection,
  useSimulation,
  useValidation
} from './MessageProvider';

// Export hooks we've implemented
export {
  useSendMessage
} from './hooks';

// Export message senders
export {
  useSender,
  useSimulationSender,
  useModelOpsSender
} from './senders';

// Export mapping functions
export { mapEnvelopeToAction } from './mappers';

// Export individual mappers directly from their source files to avoid any re-export issues
export { mapFramework } from './mappers/framework.mapper';
export { mapSelection } from './mappers/selection.mapper';
export { mapSimulation } from './mappers/simulation.mapper';
export { mapModelOps } from './mappers/modelOps.mapper';

// Export the reducer
export { messagingReducer, initialState } from './state';

// Export debug service
export { debugService } from './utils/debugService';

// Export initialization function
export { initializeMessaging, type MessagingInitOptions } from './initializeMessaging';

// Export types
export * from './state';
