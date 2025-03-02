import { EditorClient, Viewport } from 'lucid-extension-sdk';
import { SimulationResultsReader } from '../simulation_results/SimulationResultsReader';

/**
 * Example showing how to use the SimulationResultsReader
 */
export async function displaySimulationResults() {
  // Create the required Lucid SDK components
  const client = new EditorClient();
  const viewport = new Viewport(client);
  
  // Create our SimulationResultsReader
  const resultsReader = new SimulationResultsReader(client);
  
  // Check if we have any simulation results
  const hasResults = await resultsReader.hasSimulationResults();
  if (!hasResults) {
    console.log('No simulation results found in this document');
    return;
  }
  
  // Get the current page ID
  const currentPage = viewport.getCurrentPage();
  if (!currentPage) {
    console.log('No current page found');
    return;
  }
  
  // Get model data for the current page
  const modelData = await resultsReader.getModelDataForPage(currentPage.id);
  console.log('Model data for current page:', modelData);
  
  // Get activity utilization data
  const activityUtilizationData = await resultsReader.getActivityUtilizationData();
  console.log('Activity Utilization data count:', activityUtilizationData.length);
  
  if (activityUtilizationData.length > 0) {
    console.log('First activity utilization:', {
      name: activityUtilizationData[0].Name,
      meanUtilization: activityUtilizationData[0].utilization_mean,
      maxUtilization: activityUtilizationData[0].utilization_max
    });
  }
  
  // Example of using the raw collection for more advanced operations
  const activityTimingCollection = await resultsReader.getActivityTimingCollection();
  if (activityTimingCollection) {
    console.log(`Found ${activityTimingCollection.items.size} activity timing records`);
    
    // Using the direct for...of iteration on MapProxy
    const activityIds: string[] = [];
    for (const [key, _] of activityTimingCollection.items) {
      activityIds.push(key);
    }
    console.log('Activity IDs:', activityIds);
    
    // We can also use the keys() method which is provided by MapProxy
    const allKeys = activityTimingCollection.items.keys();
    console.log('All keys:', allKeys);
  }
  
  // Example of using the strongly-typed data API
  const activityTimingData = await resultsReader.getActivityTimingData();
  if (activityTimingData.length > 0) {
    console.log('First activity timing:', {
      name: activityTimingData[0].Name,
      cycleTImeMean: activityTimingData[0].cycle_time_mean,
      serviceTimeMean: activityTimingData[0].service_time_mean
    });
  }
  
  // Example of working with entity throughput data
  const entityThroughputData = await resultsReader.getEntityThroughputRepSummaryData();
  console.log(`Found ${entityThroughputData.length} entity throughput records`);
  
  // Example of working with resource data
  const resourceRepSummaryData = await resultsReader.getResourceRepSummaryData();
  console.log(`Found ${resourceRepSummaryData.length} resource summary records`);
}