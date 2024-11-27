/**
 * Defines all possible selection types
 */
export declare enum SelectionType {
    NONE = "none",
    MULTIPLE = "multiple",
    UNKNOWN_BLOCK = "unknown_block",
    UNKNOWN_LINE = "unknown_line",
    ACTIVITY = "activity",
    CONNECTOR = "connector",
    ENTITY = "entity",
    GENERATOR = "generator",
    RESOURCE = "resource",
    MODEL = "model"
}
/**
 * Represents the current selection state
 */
export interface SelectionState {
    /** ID of the current page */
    pageId: string;
    /** Array of selected element IDs */
    selectedIds: string[];
    /** Type of the current selection */
    selectionType: SelectionType;
}
