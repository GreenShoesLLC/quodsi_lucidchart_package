// DashboardTypes.ts

import { PageProxy, TableBlockProxy } from 'lucid-extension-sdk';

/**
 * Configuration for dashboard generation
 */
export interface DashboardConfig {
    /** Title to display at the top of the dashboard */
    title?: string;
    /** Space between tables (in pixels) */
    tableSpacing?: number;
    /** Initial X position for tables */
    initialX?: number;
    /** Initial Y position for tables */
    initialY?: number;
    /** Width for all tables */
    tableWidth?: number;
    /** Configuration to apply to all tables */
    tableConfig?: {
        formatNumbers?: boolean;
        percentDecimals?: number;
        numberDecimals?: number;
        styleHeader?: boolean;
        dynamicColumns?: boolean;
        maxColumns?: number;
    };
    /** Control which data types are included in the dashboard */
    includedDataTypes?: {
        activityUtilization?: boolean;
        activityRepSummary?: boolean;
        activityTiming?: boolean;
        entityThroughput?: boolean;
        resourceRepSummary?: boolean;
        entityState?: boolean;
    };
    /** Custom column configurations for specific table types */
    customColumnConfig?: {
        [dataType: string]: {
            columnOrder?: string[];
            excludeColumns?: string[];
        }
    };
}

/**
 * Default dashboard configuration
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
    title: 'Simulation Results Dashboard',
    tableSpacing: 50,
    initialX: 50,
    initialY: 50,
    tableWidth: 800,
    tableConfig: {
        formatNumbers: true,
        percentDecimals: 1,
        numberDecimals: 2,
        styleHeader: true,
        dynamicColumns: true,
        maxColumns: 6
    },
    includedDataTypes: {
        activityUtilization: true,
        activityRepSummary: true,
        activityTiming: true,
        entityThroughput: true,
        resourceRepSummary: true,
        entityState: true
    },
    customColumnConfig: {
        activityUtilization: {
            columnOrder: [
                'Name',
                'utilization_mean',
                'utilization_max',
                'capacity_mean',
                'capacity_max'
            ],
            excludeColumns: ['Id']
        },
        activityRepSummary: {
            columnOrder: [
                'activity_id',
                'rep',
                'utilization_percentage',
                'throughput_rate',
                'capacity'
            ]
        }
    }
};

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
}
