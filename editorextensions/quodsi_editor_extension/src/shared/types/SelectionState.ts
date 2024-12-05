import { SelectionType } from "./SelectionType";

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