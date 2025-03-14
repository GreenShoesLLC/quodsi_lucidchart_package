// TableConfig.ts

/**
 * Configuration for an individual table in the dashboard
 */
export interface TableConfig {
    /** Whether this table type is included in the dashboard */
    included?: boolean;
    
    /** Display header for this table */
    header?: string;
    
    /** Column configuration */
    columns?: {
        /** Column display order */
        order?: string[];
        
        /** Columns to exclude */
        exclude?: string[];
    };
}
