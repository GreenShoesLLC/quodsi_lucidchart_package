// TableResult.ts

import { TableBlockProxy, BlockProxy } from 'lucid-extension-sdk';

/**
 * Information about a table in the dashboard
 */
export interface DashboardTable {
    /** Type of table (e.g., 'activityUtilization') */
    type: string;
    /** The table block proxy */
    table: TableBlockProxy;
    /** Position of the table on the page */
    position: { x: number; y: number };
    /** Header text block if created */
    header?: BlockProxy;
    /** Height of the table (for layout calculations) */
    height: number;
}

/**
 * Result of a table creation operation
 */
export interface TableCreationResult {
    /** The created table */
    table: TableBlockProxy | null;
    /** Height of the table (for layout calculations) */
    height: number;
    /** Whether the operation was successful */
    success: boolean;
    /** Error information if the operation failed */
    error?: any;
}
