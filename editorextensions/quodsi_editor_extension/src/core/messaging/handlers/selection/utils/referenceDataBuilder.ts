import { EditorReferenceData } from '@quodsi/shared';
import { ModelManager } from '../../../../../core/ModelManager';
import { ExtensionDebugService } from '../../../../logging/ExtensionDebugService';


/**
 * Utility for building reference data for React editors
 */
export const referenceDataBuilder = {
  debug: ExtensionDebugService.forComponent('ReferenceDataBuilder'),

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
    this.debug.log('Building complete reference data for all editors');

    const referenceData: EditorReferenceData = {};

    try {
      const modelDef = await modelManager.getModelDefinition();

      if (modelDef) {
        // Build all reference data - performance is negligible for typical model sizes
        referenceData.activities = modelDef.activities.getAll().map(a => ({
          id: a.id,
          name: a.name,
          connectType: a.connectType,
          // Extract requirement IDs from operation steps for usage counting
          operationStepRequirementIds: a.operationSteps
            .map(step => step.requirementId)
            .filter(id => id !== null) as string[]
        }));

        referenceData.resources = modelDef.resources.getAll().map(r => ({
          id: r.id,
          name: r.name
        }));

        referenceData.entities = modelDef.entities.getAll().map(e => ({
          id: e.id,
          name: e.name
        }));

        referenceData.resourceRequirements = modelDef.resourceRequirements.getAll();

        referenceData.connectors = modelDef.connectors.getAll();

        // Include states - serialize State objects to ISerializedState format
        referenceData.states = modelDef.states.getAll().map(state => ({
          id: state.id,
          name: state.name,
          componentType: state.componentType,
          dataType: state.dataType,
          initialValue: state.initialValue,
          categoryValues: state.categoryValues,
          description: state.description,
          collectStatistics: state.collectStatistics
        }));

        this.debug.log('Reference data built:', {
          activities: referenceData.activities?.length || 0,
          resources: referenceData.resources?.length || 0,
          entities: referenceData.entities?.length || 0,
          resourceRequirements: referenceData.resourceRequirements?.length || 0,
          connectors: referenceData.connectors?.length || 0,
          states: referenceData.states?.length || 0
        });
      } else {
        this.debug.warn('No model definition available');
      }
    } catch (error) {
      this.debug.error('Error building reference data:', error);
    }

    return referenceData;
  }
};
