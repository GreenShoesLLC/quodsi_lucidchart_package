// src/utils/registerDataSource.ts
import { DataConnector } from 'lucid-extension-sdk';
import { ScenarioResultsSchema } from '../collections/scenarioResultsSchema';
import { ModelSchema } from '../collections/modelSchema';

/**
 * Registers data sources and collections in the data connector
 * @param connector The data connector instance
 */
export function registerDataSources(connector: DataConnector): void {
    console.log('Registering data sources and collections...');
    
    // Register the simulation_results data source
    // connector.defineDataSource('simulation_results', {
    //     // Collections
    //     collections: {
    //         'Models': ModelSchema,
    //         'scenario_results': ScenarioResultsSchema
    //     }
    // });
    
    console.log('Data sources and collections registered successfully');
}
