import { SchemaDefinition } from 'lucid-extension-sdk';

/**
 * Configuration for table generation
 */
export interface TableGenerationConfig {
    title?: string;
    position?: { x: number; y: number; };
    width?: number;
    height?: number;
    formatNumbers?: boolean;
    percentDecimals?: number;
    numberDecimals?: number;
    styleHeader?: boolean;
    headerBackgroundColor?: string;
    headerTextBold?: boolean;
    /** Only include columns that have data */
    dynamicColumns?: boolean;
    /** Maximum number of columns to display */
    maxColumns?: number;
    /** Column sorting behavior */
    columnOrder?: 'schema' | 'alphabetical' | 'numerical-first' | string[];
    /** Display types to prioritize */
    columnTypePriority?: string[];
    excludeColumns?: string[];
}

/**
 * Default configuration for table generation
 */
export const DEFAULT_CONFIG: TableGenerationConfig = {
    position: { x: 100, y: 100 },
    width: 600,
    height: 300,
    formatNumbers: true,
    percentDecimals: 1,
    numberDecimals: 2,
    styleHeader: true,
    headerBackgroundColor: '#f0f0f0',
    headerTextBold: true,
    dynamicColumns: true,
    maxColumns: 8,
    columnOrder: 'schema',
    columnTypePriority: ['mean', 'max', 'min']
};

/**
 * Column definition for table generation
 */
export interface ColumnDefinition {
    header: string;
    field: string;
    formatter?: (value: any) => string;
    width?: number;
    displayName?: string;
    sortOrder?: number;
    isIdentifier?: boolean;
    isPercentage?: boolean;
}

/**
 * Schema mapping for different data types
 */
export interface SchemaMapping {
    schema: SchemaDefinition;
    identifierFields: string[];
    percentageFields: string[];
    priorityFields: string[];
}