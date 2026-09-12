import { EditorReferenceData } from '@quodsi/lucid-shared';
import { ModelManager } from '../../../../../core/ModelManager';
import { getLogger } from '@quodsi/lucid-shared';
import { summarizeActivity, summarizeGenerator, summarizeState } from '../../../../referenceSummaries';

/**
 * Utility for building reference data for React editors
 */
export const referenceDataBuilder = {
  debug: getLogger('ReferenceDataBuilder'),

  /**
   * Builds complete reference data with all elements
   *
   * This function always returns all available reference data (activities, resources,
   * entities, resourceRequirements, connectors) regardless of which editor is using it.
   * This simplifies maintenance and ensures consistency across all editors.
   *
   * Performance impact is negligible (<1ms) since all data is already in memory.
   *
   * @param modelManager The model manager
   * @returns Complete reference data with all elements
   */
  async buildAllReferenceData(
    modelManager: ModelManager
  ): Promise<EditorReferenceData> {
    this.debug.debug('Building complete reference data for all editors');

    const referenceData: EditorReferenceData = {};

    try {
      const modelDef = await modelManager.getModelDefinition();

      if (modelDef) {
        // Build all reference data - performance is negligible for typical model sizes
        referenceData.activities = modelDef.activities.getAll().map(a => summarizeActivity(a));

        referenceData.generators = modelDef.generators.getAll().map(g => summarizeGenerator(g));

        referenceData.resources = modelDef.resources.getAll().map(r => ({
          id: r.id,
          name: r.name
        }));

        referenceData.entities = modelDef.entities.getAll().map(e => ({
          id: e.id,
          name: e.name,
          description: e.description
        }));

        referenceData.resourceRequirements = modelDef.resourceRequirements.getAll();

        referenceData.connectors = modelDef.connectors.getAll();

        // Include states - serialize State objects to ISerializedState format
        referenceData.states = modelDef.states.getAll().map(state => summarizeState(state));

        // Include scenarios - serialize Scenario objects
        referenceData.scenarios = modelDef.scenarios.getAll().map(scenario => scenario.toJSON());

        this.debug.debug('Reference data built:', {
          activities: referenceData.activities?.length || 0,
          activityActionsTotal: referenceData.activities?.reduce((sum, a) => sum + (a.actions?.length || 0), 0) || 0,
          generators: referenceData.generators?.length || 0,
          resources: referenceData.resources?.length || 0,
          entities: referenceData.entities?.length || 0,
          resourceRequirements: referenceData.resourceRequirements?.length || 0,
          connectors: referenceData.connectors?.length || 0,
          states: referenceData.states?.length || 0,
          scenarios: referenceData.scenarios?.length || 0
        });
      } else {
        this.debug.warn('No model definition available');
      }
    } catch (error) {
      this.debug.error('Error building reference data:', error);
    }

    // Page guard (spec 2026-09-11): name the page this data was built from.
    referenceData.pageId = modelManager.getCurrentPageId();

    return referenceData;
  }
};
