import { EditorReferenceData, SimulationObjectType } from '@quodsi/shared';
import { ModelManager } from '../../../../../core/ModelManager';

/**
 * Utility functions for building reference data
 */
export const referenceDataBuilder = {
  /**
   * Builds reference data for entities
   * @param modelManager The model manager
   * @returns Reference data containing entities
   */
  async buildEntityReferenceData(
    modelManager: ModelManager
  ): Promise<EditorReferenceData> {
    console.log('[referenceDataBuilder] Building entity reference data');
    
    const referenceData: EditorReferenceData = {};
    
    try {
      const modelDef = await modelManager.getModelDefinition();
      if (modelDef) {
        const allEntities = modelDef.entities.getAll();

        referenceData.entities = allEntities.map(e => {
          console.log('[referenceDataBuilder] Adding entity to reference data:', e.name);
          return {
            id: e.id,
            name: e.name
          };
        });
      }
    } catch (error) {
      console.error('[referenceDataBuilder] Error building entity reference data:', error);
    }
    
    return referenceData;
  },
  
  /**
   * Builds reference data for resources
   * @param modelManager The model manager
   * @returns Reference data containing resource requirements
   */
  async buildResourceReferenceData(
    modelManager: ModelManager
  ): Promise<EditorReferenceData> {
    console.log('[referenceDataBuilder] Building resource reference data');
    
    const referenceData: EditorReferenceData = {};
    
    try {
      const modelDef = await modelManager.getModelDefinition();
      if (modelDef) {
        const requirements = modelDef.resourceRequirements.getAll();
        referenceData.resourceRequirements = requirements;
        
        console.log('[referenceDataBuilder] Added resource requirements:', {
          count: requirements.length
        });
      }
    } catch (error) {
      console.error('[referenceDataBuilder] Error building resource reference data:', error);
    }
    
    return referenceData;
  },
  
  /**
   * Builds reference data based on element type
   * @param elementType The type of element
   * @param modelManager The model manager
   * @returns Appropriate reference data for the element type
   */
  async buildReferenceData(
    elementType: SimulationObjectType,
    modelManager: ModelManager
  ): Promise<EditorReferenceData> {
    console.log('[referenceDataBuilder] Building reference data for type:', elementType);
    
    let referenceData: EditorReferenceData = {};
    
    switch (elementType) {
      case SimulationObjectType.Generator:
        referenceData = await this.buildEntityReferenceData(modelManager);
        break;
        
      case SimulationObjectType.Activity:
      case SimulationObjectType.Connector:
        referenceData = await this.buildResourceReferenceData(modelManager);
        break;
    }
    
    return referenceData;
  }
};
