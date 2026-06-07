import { 
  ElementShape, 
  ModelItemData, 
  ValidationResult, 
  EditorReferenceData, 
  DiagramElementType, 
  SelectionType,
  SelectionState
} from '@quodsi/lucid-shared';

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
  selectionState: SelectionState;
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
