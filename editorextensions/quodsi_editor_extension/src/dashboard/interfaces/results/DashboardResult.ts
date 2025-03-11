// DashboardResult.ts

import { PageProxy } from 'lucid-extension-sdk';
import { DashboardTable } from './TableResult';

/**
 * Result of a dashboard creation operation
 */
export interface DashboardResult {
    /** The created page */
    page: PageProxy;
    /** Tables that were successfully created */
    tables: DashboardTable[];
    /** Data types that had no data available */
    emptyDataTypes: string[];
    /** Any errors that occurred during creation */
    errors: { type: string; error: any }[];
}
