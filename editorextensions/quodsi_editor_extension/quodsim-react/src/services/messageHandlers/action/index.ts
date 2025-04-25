// src/services/messageHandlers/action/index.ts
import { MessageHandler } from '../messageHandlers';
import {
    actionRequestHandler,
    handleActionRequest,
    sendActionRequest
} from './actionRequestHandlers';
import {
    actionResponseHandler,
    handleActionResponse
} from './actionResponseHandlers';
import { MessageTypes } from '@quodsi/shared';

/**
 * Combined action message handlers (both request and response)
 */
export const actionMessageHandlers: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    ...actionRequestHandler,
    ...actionResponseHandler
};

export {
    handleActionRequest,
    handleActionResponse,
    sendActionRequest
};

export default actionMessageHandlers;