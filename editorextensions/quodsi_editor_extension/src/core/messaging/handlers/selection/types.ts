import { 
  ElementShape, 
  ModelItemData, 
  ValidationResult, 
  EditorReferenceData, 
  DiagramElementType
} from '@quodsi/lucid-shared';

/**
 * What kind of thing is selected on the canvas.
 */
export enum SelectionType {
  NONE = 'none',
  UNCONVERTED_ELEMENT = 'unconverted_element',
  MULTIPLE = 'multiple',
  UNKNOWN_BLOCK = 'unknown_block',
  UNKNOWN_LINE = 'unknown_line',
  ACTIVITY = 'activity',
  CONNECTOR = 'connector',
  ENTITY = 'entity',
  GENERATOR = 'generator',
  RESOURCE = 'resource',
  MODEL = 'model',
  SWIMLANE = 'swimlane'
}

/**
 * The page, the selected element ids and the selection type -- sent to the
 * panel as SELECTION_CHANGED's `selectionState`.
 */
export interface SelectionSnapshot {
  pageId: string;
  selectedIds: string[];
  selectionType: SelectionType;
}

/**
 * Complete selection state data structure
 * Combined from both old and new system requirements
 */
export interface SelectionStateData {
  // Basic selection info
  selectedElements: ElementShape[];
  selectionCount: number;
  totalElementCount: number;

  // Core selection fields (from old system)
  selectionType: SelectionType;
  selectionState: SelectionSnapshot;
  documentId: string;

  // Model data
  hasModel?: boolean;
  modelItemData?: ModelItemData | ModelItemData[];
  validationResult?: ValidationResult;
  referenceData?: EditorReferenceData;

  // Element specifics
  diagramElementType?: DiagramElementType;
  elementId?: string;

  // Status
  isProcessing?: boolean;
  error?: string;
  errorDetails?: any;
}

/**
 * Document context information
 */
export interface DocumentContextData {
  documentId?: string;
  pageId?: string;
  title?: string;
  isQuodsiModel: boolean;
  metadata?: Record<string, unknown>;
}
