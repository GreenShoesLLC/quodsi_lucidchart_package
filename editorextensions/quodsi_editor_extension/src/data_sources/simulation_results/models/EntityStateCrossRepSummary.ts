import { MapProxy } from 'lucid-extension-sdk';

// Define the interface for the entity state cross rep summary data
export interface EntityStateCrossRepSummary {
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;
    count_mean: number;
    count_median: number;
    count_std_dev: number;
    time_in_system_mean: number;
    time_in_system_median: number;
    time_in_system_std_dev: number;
    time_waiting_mean: number;
    time_waiting_median: number;
    time_waiting_std_dev: number;
    time_blocked_mean: number;
    time_blocked_median: number;
    time_blocked_std_dev: number;
    time_in_operation_mean: number;
    time_in_operation_median: number;
    time_in_operation_std_dev: number;
    time_connecting_mean: number;
    time_connecting_median: number;
    time_connecting_std_dev: number;
    percent_waiting_mean: number;
    percent_waiting_std_dev: number;
    percent_blocked_mean: number;
    percent_blocked_std_dev: number;
    percent_operation_mean: number;
    percent_operation_std_dev: number;
    percent_connecting_mean: number;
    percent_connecting_std_dev: number;
}

// Create a mapping function for converting raw data to typed objects
// This function maps raw fields from the collection to a typed object
export function mapToEntityStateCrossRepSummary(itemFields: MapProxy<string, any> | any): EntityStateCrossRepSummary {
    console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary - Starting mapping');
    
    // Check if the fields object is undefined, null, or empty
    let isEmpty = false;
    
    if (!itemFields) {
        isEmpty = true;
    } else if (typeof itemFields.get === 'function') {
        // It's a MapProxy - check if it has any user-defined keys (not just method keys)
        try {
            let hasDataKeys = false;
            for (const [key, _] of itemFields) {
                if (key !== 'getKeys' && key !== 'getItem' && key !== 'size') {
                    hasDataKeys = true;
                    break;
                }
            }
            isEmpty = !hasDataKeys;
        } catch (error) {
            console.log('[EntityStateCrossRepSummary] Error checking MapProxy keys:', error);
            isEmpty = true; // Assume empty on error
        }
    } else {
        // Regular object
        isEmpty = Object.keys(itemFields).length === 0;
    }
    
    if (isEmpty) {
        console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary received null, undefined, or empty fields object');
        
        // Return a default object with sample values
        return {
            id: 'placeholder-1',
            scenario_id: 'current-scenario',
            scenario_name: 'New Scenario',
            entity_id: 'entity-1',
            entity_name: 'Patient',
            count_mean: 1,
            count_median: 1,
            count_std_dev: 0,
            time_in_system_mean: 120,
            time_in_system_median: 120,
            time_in_system_std_dev: 0,
            time_waiting_mean: 30,
            time_waiting_median: 30,
            time_waiting_std_dev: 0,
            time_blocked_mean: 15,
            time_blocked_median: 15,
            time_blocked_std_dev: 0,
            time_in_operation_mean: 75,
            time_in_operation_median: 75,
            time_in_operation_std_dev: 0,
            time_connecting_mean: 0,
            time_connecting_median: 0,
            time_connecting_std_dev: 0,
            percent_waiting_mean: 25,
            percent_waiting_std_dev: 0,
            percent_blocked_mean: 12.5,
            percent_blocked_std_dev: 0,
            percent_operation_mean: 62.5,
            percent_operation_std_dev: 0,
            percent_connecting_mean: 0,
            percent_connecting_std_dev: 0
        };
    }
    
    console.log('[EntityStateCrossRepSummary] Raw fields type:', typeof itemFields);
    console.log('[EntityStateCrossRepSummary] Raw fields keys:', Object.keys(itemFields));
    console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary raw fields:', itemFields);
    // Check if key fields exist and log their values and types
    console.log('[DEBUG] Raw field values:',
        'entity_name:', itemFields.entity_name, '(', typeof itemFields.entity_name, ')',
        'count_mean:', itemFields.count_mean, '(', typeof itemFields.count_mean, ')');
    console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary entity_name:', itemFields.entity_name);
    console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary scenario_name:', itemFields.scenario_name);
    
    // Perform the mapping
    console.log('[EntityStateCrossRepSummary] Creating mapped object');
    // Update the default fallback values in the safeString function
    const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined || value === '') return defaultValue;
        return String(value);
    };
    
    // Helper function to safely convert to number with custom default
    const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined || value === '') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    };
    
    // Check if itemFields is a MapProxy (has a get method)
    const isMapProxy = itemFields && typeof itemFields.get === 'function';
    console.log('[EntityStateCrossRepSummary] itemFields is MapProxy:', isMapProxy);
    
    // Fix for possible key case mismatch (e.g., Entity_name vs entity_name)
    // This allows for case-insensitive field matching
    const getField = (fieldName: string): any => {
        // If it's a MapProxy, use the get method
        if (isMapProxy) {
            try {
                const value = itemFields.get(fieldName);
                if (value !== undefined) return value;
                
                // If direct access fails, try case-insensitive match
                // We need to get all keys from the MapProxy
                const keys = [];
                try {
                    for (const [k, _] of itemFields) {
                        keys.push(k);
                    }
                } catch (error) {
                    console.log(`[EntityStateCrossRepSummary] Error getting keys from MapProxy:`, error);
                }
                
                // Look for case-insensitive match
                const lowerFieldName = fieldName.toLowerCase();
                for (const key of keys) {
                    if (key.toLowerCase() === lowerFieldName) {
                        console.log(`[EntityStateCrossRepSummary] Found case-insensitive match in MapProxy: ${fieldName} -> ${key}`);
                        return itemFields.get(key);
                    }
                }
            } catch (error) {
                console.log(`[EntityStateCrossRepSummary] Error accessing MapProxy field ${fieldName}:`, error);
            }
        } else {
            // Regular object - use bracket notation
            // Try exact match first
            if (itemFields[fieldName] !== undefined) return itemFields[fieldName];
            
            // Try case-insensitive match
            const lowerFieldName = fieldName.toLowerCase();
            for (const key of Object.keys(itemFields)) {
                if (key.toLowerCase() === lowerFieldName) {
                    console.log(`[EntityStateCrossRepSummary] Found case-insensitive match: ${fieldName} -> ${key}`);
                    return itemFields[key];
                }
            }
        }
        
        console.log(`[EntityStateCrossRepSummary] Field ${fieldName} not found in data`);
        return undefined;
    };
    
    const mappedObject = {
        id: safeString(getField('id'), 'placeholder-1'),
        scenario_id: safeString(getField('scenario_id'), 'current-scenario'),
        scenario_name: safeString(getField('scenario_name'), 'New Scenario'),
        entity_id: safeString(getField('entity_id'), 'entity-1'),
        entity_name: safeString(getField('entity_name'), 'Patient'),
        count_mean: safeNumber(getField('count_mean'), 1),
        count_median: safeNumber(getField('count_median'), 1),
        count_std_dev: safeNumber(getField('count_std_dev'), 0),
        time_in_system_mean: safeNumber(getField('time_in_system_mean'), 120),
        time_in_system_median: safeNumber(getField('time_in_system_median'), 120),
        time_in_system_std_dev: safeNumber(getField('time_in_system_std_dev'), 0),
        time_waiting_mean: safeNumber(getField('time_waiting_mean'), 30),
        time_waiting_median: safeNumber(getField('time_waiting_median'), 30),
        time_waiting_std_dev: safeNumber(getField('time_waiting_std_dev'), 0),
        time_blocked_mean: safeNumber(getField('time_blocked_mean'), 15),
        time_blocked_median: safeNumber(getField('time_blocked_median'), 15),
        time_blocked_std_dev: safeNumber(getField('time_blocked_std_dev'), 0),
        time_in_operation_mean: safeNumber(getField('time_in_operation_mean'), 75),
        time_in_operation_median: safeNumber(getField('time_in_operation_median'), 75),
        time_in_operation_std_dev: safeNumber(getField('time_in_operation_std_dev'), 0),
        time_connecting_mean: safeNumber(getField('time_connecting_mean'), 0),
        time_connecting_median: safeNumber(getField('time_connecting_median'), 0),
        time_connecting_std_dev: safeNumber(getField('time_connecting_std_dev'), 0),
        percent_waiting_mean: safeNumber(getField('percent_waiting_mean'), 25),
        percent_waiting_std_dev: safeNumber(getField('percent_waiting_std_dev'), 0),
        percent_blocked_mean: safeNumber(getField('percent_blocked_mean'), 12.5),
        percent_blocked_std_dev: safeNumber(getField('percent_blocked_std_dev'), 0),
        percent_operation_mean: safeNumber(getField('percent_operation_mean'), 62.5),
        percent_operation_std_dev: safeNumber(getField('percent_operation_std_dev'), 0),
        percent_connecting_mean: safeNumber(getField('percent_connecting_mean'), 0),
        percent_connecting_std_dev: safeNumber(getField('percent_connecting_std_dev'), 0)
    };
    
    console.log('[EntityStateCrossRepSummary] Mapped object created, checking critical fields:',
        'entity_name:', mappedObject.entity_name,
        'count_mean:', mappedObject.count_mean);
    
    return mappedObject;
}
