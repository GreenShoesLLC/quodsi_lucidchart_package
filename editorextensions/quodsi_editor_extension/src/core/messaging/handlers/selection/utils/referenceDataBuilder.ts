import { EditorReferenceData, SimulationObjectType } from '@quodsi/shared';
import { ModelManager } from '../../../../../core/ModelManager';
import { ExtensionDebugService } from '../../../../logging/ExtensionDebugService';


/**
 * Utility functions for building reference data
 */
export const referenceDataBuilder = {
  debug: ExtensionDebugService.forComponent('ReferenceDataBuilder'),
  /**
   * Builds reference data for entities
   * @param modelManager The model manager
   * @returns Reference data containing entities
   */
  async buildEntityReferenceData(
    modelManager: ModelManager
  ): Promise<EditorReferenceData> {
    this.debug.log('Building entity reference data');
    
    const referenceData: EditorReferenceData = {};
    
    try {
      const modelDef = await modelManager.getModelDefinition();
      if (modelDef) {
        const allEntities = modelDef.entities.getAll();

        referenceData.entities = allEntities.map(e => {
          this.debug.debug('Adding entity to reference data:', e.name);
          return {
            id: e.id,
            name: e.name
          };
        });
      }
    } catch (error) {
      this.debug.error('Error building entity reference data:', error);
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
    this.debug.log('Building resource reference data');
    
    const referenceData: EditorReferenceData = {};
    
    try {
      const modelDef = await modelManager.getModelDefinition();
      if (modelDef) {
        const requirements = modelDef.resourceRequirements.getAll();
        referenceData.resourceRequirements = requirements;
        
        this.debug.log('Added resource requirements:', {
          count: requirements.length
        });
      }
    } catch (error) {
      this.debug.error('Error building resource reference data:', error);
    }
    
    return referenceData;
  },
  
  /**
   * Builds complete reference data with all elements
   * @param modelManager The model manager
   * @returns Reference data containing all elements (activities, resources, entities)
   */
  async buildCompleteReferenceData(
    modelManager: ModelManager
  ): Promise<EditorReferenceData> {
    this.debug.log('Building complete reference data');
    
    const referenceData: EditorReferenceData = {};
    
    try {
      // Add debugging to see if ModelManager has the right context
      this.debug.log('ModelManager state before getModelDefinition:', {
        hasCurrentPage: !!(modelManager as any).currentPage,
        isModelDirty: !!(modelManager as any).changeTracker?.modelDefinitionDirty
      });
      
      const modelDef = await modelManager.getModelDefinition();
      this.debug.log('Model definition exists:', !!modelDef);
      
      if (modelDef) {
        // Get all activities
        const allActivities = modelDef.activities.getAll();
        this.debug.log('Raw activities:', allActivities);
        
        referenceData.activities = allActivities.map(a => {
          this.debug.debug('Mapping activity:', { id: a.id, name: a.name });
          return {
            id: a.id,
            name: a.name
          };
        });
        
        // Get all resources
        const allResources = modelDef.resources.getAll();
        this.debug.log('Raw resources:', allResources);
        
        referenceData.resources = allResources.map(r => ({
          id: r.id,
          name: r.name
        }));
        
        // Get all entities
        const allEntities = modelDef.entities.getAll();
        this.debug.log('Raw entities:', allEntities);
        
        referenceData.entities = allEntities.map(e => ({
          id: e.id,
          name: e.name
        }));
        
        // Also include resource requirements
        referenceData.resourceRequirements = modelDef.resourceRequirements.getAll();
        
        this.debug.log('Complete reference data built:', {
          activities: referenceData.activities?.length || 0,
          resources: referenceData.resources?.length || 0,
          entities: referenceData.entities?.length || 0,
          resourceRequirements: referenceData.resourceRequirements?.length || 0,
          activitiesData: referenceData.activities,
          resourcesData: referenceData.resources,
          entitiesData: referenceData.entities
        });
        
        // Add a special marker to verify the data made it through serialization
        this.debug.log('REFERENCE_DATA_CHECKPOINT_1: Data built with marker');
        (referenceData as any)._debugMarker = 'ReferenceDataBuilder_' + Date.now();
        
        // Test JSON serialization to see if data survives
        try {
          const serialized = JSON.stringify(referenceData);
          const deserialized = JSON.parse(serialized);
          this.debug.log('REFERENCE_DATA_CHECKPOINT_2: JSON serialization test passed', {
            originalSize: JSON.stringify(referenceData).length,
            deserializedActivitiesLength: deserialized.activities?.length,
            deserializedResourcesLength: deserialized.resources?.length,
            deserializedEntitiesLength: deserialized.entities?.length,
            hasMarker: !!deserialized._debugMarker
          });
        } catch (serError) {
          this.debug.error('REFERENCE_DATA_CHECKPOINT_2: JSON serialization failed:', serError);
        }
      } else {
        this.debug.warn('No model definition available');
      }
    } catch (error) {
      this.debug.error('Error building complete reference data:', error);
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
    this.debug.log('Building reference data for type:', elementType);
    
    let referenceData: EditorReferenceData = {};
    
    switch (elementType) {
      case SimulationObjectType.Generator:
        referenceData = await this.buildEntityReferenceData(modelManager);
        break;
        
      case SimulationObjectType.Activity:
        referenceData = await this.buildResourceReferenceData(modelManager);
        break;
        
      case SimulationObjectType.Connector:
        // For connectors, we need all elements to show source/target names
        referenceData = await this.buildCompleteReferenceData(modelManager);
        break;
    }
    
    return referenceData;
  }
};
