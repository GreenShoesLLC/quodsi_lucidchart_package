import { MessageTypes } from '../MessageTypes';

export interface ModelTreePayloads {
    [MessageTypes.TREE_STATE_UPDATE]: {
        expandedNodes: string[];
        pageId: string;
    };

    [MessageTypes.TREE_NODE_TOGGLE]: {
        nodeId: string;
        expanded: boolean;
        pageId: string;
    };

    [MessageTypes.TREE_NODE_EXPAND_PATH]: {
        nodeId: string;
        pageId: string;
    };

    [MessageTypes.TREE_STATE_SYNC]: {
        expandedNodes: string[];
        pageId: string;
    };
}
