// GeneratorTypes.ts

import { SchemaDefinition } from 'lucid-extension-sdk';

/**
 * Configuration for table generation
 */
export interface TableGenerationConfig {
    /**
     * Title for the table
     */
    title?: string;
    
    /**
     * Position for the table
     */
    position?: {
        x: number;
        y: number;
    };
    
    /**
     * Width of the table
     */
    width?: number;
    
    /**
     * Height of the table (auto-calculated if not specified)
     */
    height?: number;
    
    /**
     * How to order columns (string method or array of field names)
     */
    columnOrder?: string[] | string;
    
    /**
     * Priority order for column types (mean, max, etc.)
     */
    columnTypePriority?: string[];
    
    /**
     * Columns to exclude
     */
    excludeColumns?: string[];
    
    /**
     * Whether to format numbers
     */
    formatNumbers?: boolean;
    
    /**
     * Number of decimal places for percentages
     */
    percentDecimals?: number;
    
    /**
     * Number of decimal places for non-percentage numbers
     */
    numberDecimals?: number;
    
    /**
     * Background color for header row
     */
    headerBackgroundColor?: string;
    
    /**
     * Whether to make header text bold
     */
    headerTextBold?: boolean;
    
    /**
     * Whether to style the header row
     */
    styleHeader?: boolean;
    
    /**
     * Whether to only show columns that have data
     */
    dynamicColumns?: boolean;
    
    /**
     * Maximum number of columns to show
     */
    maxColumns?: number;
}

/**
 * Default configuration for table generation
 */
export const DEFAULT_CONFIG: TableGenerationConfig = {
    formatNumbers: true,
    percentDecimals: 1,
    numberDecimals: 2,
    styleHeader: true,
    headerBackgroundColor: '#F0F0F0',
    headerTextBold: true,
    dynamicColumns: true,
    maxColumns: 10,  // Increased from original 6
    columnTypePriority: ['mean', 'median', 'max', 'min', 'std_dev', 'cv']
};

/**
 * Column definition for table generation
 */
export interface ColumnDefinition {
    /**
     * Field name in the data object
     */
    field: string;
    
    /**
     * Header text
     */
    header: string;
    
    /**
     * Display name (may be different from header)
     */
    displayName: string;
    
    /**
     * Function to format cell values
     */
    formatter?: (value: any) => string;
    
    /**
     * Sort order for the column
     */
    sortOrder?: number;
    
    /**
     * Whether this is an identifier column
     */
    isIdentifier?: boolean;
    
    /**
     * Whether this column contains percentage values
     */
    isPercentage?: boolean;
}

/**
 * Schema mapping for table generation
 */
export interface SchemaMapping {
    /**
     * Schema definition
     */
    schema: SchemaDefinition;
    
    /**
     * Fields that uniquely identify records
     */
    identifierFields: string[];
    
    /**
     * Fields that contain percentage values
     */
    percentageFields: string[];
    
    /**
     * Fields to prioritize (in order)
     */
    priorityFields: string[];
}
