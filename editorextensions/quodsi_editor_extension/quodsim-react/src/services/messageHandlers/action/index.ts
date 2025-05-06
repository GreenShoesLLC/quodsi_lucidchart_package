// src/services/messageHandlers/action/index.ts
import { MessageHandler } from '../../../_deprecated/messageHandlers';
import {
    actionRequestHandler,
    handleActionRequest,
    sendActionRequest
} from '../../../_deprecated/actionRequestHandlers';
import {
    actionResponseHandler,
    handleActionResponse
} from '../../../_deprecated/actionResponseHandlers';
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