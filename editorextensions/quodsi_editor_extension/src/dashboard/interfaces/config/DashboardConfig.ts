// DashboardConfig.ts

import { TableConfig, DEFAULT_TABLE_CONFIGS } from './TableConfig';

/**
 * Configuration for dashboard generation
 */
export interface DashboardConfig {
    /** Title to display at the top of the dashboard */
    title?: string;
    
    /** Layout settings */
    layout?: {
        /** Space between tables (in pixels) */
        tableSpacing?: number;
        /** Initial X position for tables */
        initialX?: number;
        /** Initial Y position for tables */
        initialY?: number;
        /** Width for all tables */
        tableWidth?: number;
    };
    
    /** Default configuration to apply to all tables */
    tableDefaults?: {
        formatNumbers?: boolean;
        percentDecimals?: number;
        numberDecimals?: number;
        styleHeader?: boolean;
        dynamicColumns?: boolean;
        maxColumns?: number;
    };
    
    /** Table-specific configurations */
    tables?: {
        [dataType: string]: TableConfig;
    };
}

/**
 * Default dashboard configuration
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
    title: 'Sim Results',
    layout: {
        tableSpacing: 50,
        initialX: 50,
        initialY: 50,
        tableWidth: 800,
    },
    tableDefaults: {
        formatNumbers: true,
        percentDecimals: 1,
        numberDecimals: 2,
        styleHeader: true,
        dynamicColumns: false,  // Changed to false to show all columns
        maxColumns: 15  // Increased from 6 to 15
    },
    tables: DEFAULT_TABLE_CONFIGS
};

/**
 * Helper function to get a configuration value, checking table-specific settings first,
 * then falling back to global defaults
 * 
 * @param config The dashboard configuration
 * @param tableType The type of table
 * @param valuePath Path to the configuration value (dot notation)
 * @param defaultValue Default value if not found
 * @returns The configuration value
 */
export function getConfigValue<T>(
    config: DashboardConfig,
    tableType: string,
    valuePath: string,
    defaultValue: T
): T {
    if (!config) return defaultValue;
    
    // Debug logging
    console.log(`Getting config value for table type: ${tableType}, path: ${valuePath}`);
    
    // Check table-specific config first
    const tableConfig = config.tables?.[tableType];
    if (tableConfig) {
        const pathParts = valuePath.split('.');
        let currentObj: any = tableConfig;
        
        for (let i = 0; i < pathParts.length; i++) {
            if (currentObj === undefined || currentObj === null) break;
            currentObj = currentObj[pathParts[i]];
        }
        
        if (currentObj !== undefined && currentObj !== null) {
            console.log(`Found table-specific value: ${currentObj}`);
            return currentObj as T;
        }
    }
    
    // Fall back to global defaults
    if (valuePath.startsWith('columns.')) {
        console.log(`No global defaults for column-specific setting: ${valuePath}`);
        return defaultValue; // No global defaults for column-specific settings
    }
    
    // For other paths, try to find in tableDefaults
    const globalPath = valuePath.replace(/^columns\./, '');
    const pathParts = globalPath.split('.');
    let currentObj: any = config.tableDefaults;
    
    for (let i = 0; i < pathParts.length; i++) {
        if (currentObj === undefined || currentObj === null) break;
        currentObj = currentObj[pathParts[i]];
    }
    
    if (currentObj !== undefined && currentObj !== null) {
        console.log(`Found global default value: ${currentObj}`);
        return currentObj as T;
    }
    
    console.log(`Using provided default value: ${defaultValue}`);
    return defaultValue;
}
