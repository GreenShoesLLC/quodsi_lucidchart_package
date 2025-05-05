import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/message-types';

/**
 * Basic shape information for diagram elements
 */
export interface ElementShape {
  /** Element ID in Lucid */
  id: string;
  
  /** Element type in Lucid */
  type: string;
  
  /** Text content */
  text?: string;
  
  /** X coordinate */
  x?: number;
  
  /** Y coordinate */
  y?: number;
  
  /** Width */
  width?: number;
  
  /** Height */
  height?: number;
}

/**
 * Sent when document context is established
 */
export interface ModelContextMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_CONTEXT;
  data: {
    /** Unique ID of the Lucid document */
    documentId: string;
    
    /** Document title */
    title: string;
    
    /** Page ID within the document */
    pageId: string;
    
    /** Whether the document is a Quodsi model */
    isQuodsiModel: boolean;
    
    /** Additional document metadata */
    metadata?: Record<string, unknown>;
  };
}

/**
 * Sent when selection in the editor changes
 */
export interface SelectionChangedMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SELECTION_CHANGED;
  data: {
    /** Currently selected elements */
    selectedElements: ElementShape[];
    
    /** Number of elements selected */
    selectionCount: number;
    
    /** Total number of elements on the page */
    totalElementCount: number;
  };
}

/** Union type of all selection messages */
export type SelectionMessage = 
  | ModelContextMessage
  | SelectionChangedMessage;
