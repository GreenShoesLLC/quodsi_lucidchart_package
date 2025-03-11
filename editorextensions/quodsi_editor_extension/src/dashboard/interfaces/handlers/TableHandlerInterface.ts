// TableHandlerInterface.ts

import { PageProxy, BlockProxy } from 'lucid-extension-sdk';
import { TableCreationResult } from '../results/TableResult';

/**
 * Interface for table handlers
 */
export interface TableHandlerInterface {
    /** Get the type identifier for this table */
    getTableType(): string;
    
    /** Get the default title for this table */
    getDefaultTitle(): string;
    
    /** Check if this table can be created (has data) */
    canCreateTable(): Promise<boolean>;
    
    /** Create the table at the specified position */
    createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult>;
    
    /** 
     * Create a header for the table
     * @param page The page to create the header on
     * @param position The position to create the header
     * @returns The created header and its height
     */
    createTableHeader(page: PageProxy, position: { x: number, y: number }): Promise<{
        header: BlockProxy;
        height: number;
    }>;
}
