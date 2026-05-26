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
          // Extract requirement IDs from actions for usage counting
          actionRequirementIds: (a.actions || [])
            .map(action => {
              if ('resourceRequirementId' in action) {
                return (action as any).resourceRequirementId;
              }
              return null;
            })
            .filter((id): id is string => id !== null)
        }));

        referenceData.generators = modelDef.generators.getAll().map(g => ({
          id: g.id,
          name: g.name,
          // Carry the inter-arrival duration so the change-request editor can pre-fill.
          // Explicit field mapping keeps the structural type compatible (DistributionParameters
          // is a union of specific interfaces, not directly assignable to Record<string,number>).
          periodIntervalDuration: g.generationConfig?.periodIntervalDuration
            ? {
                durationPeriodUnit: g.generationConfig.periodIntervalDuration.durationPeriodUnit as string,
                distribution: {
                  distributionType: g.generationConfig.periodIntervalDuration.distribution.distributionType as string,
                  // DistributionParameters is a union of specific interfaces; cast via unknown
                  // because all concrete parameter types are plain {key: number} objects.
                  parameters: g.generationConfig.periodIntervalDuration.distribution.parameters as unknown as Record<string, number>,
                  description: g.generationConfig.periodIntervalDuration.distribution.description,
                },
              }
            : undefined,
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

        // Include time patterns - serialize TimePattern objects to ISerializedTimePattern format
        referenceData.timePatterns = modelDef.timePatterns.getAll().map(pattern => ({
          unique_id: pattern.id,
          name: pattern.name,
          weeklyWeights: pattern.weeklyWeights,
          dayOfWeekWeights: pattern.dayOfWeekWeights,
          dayOfWeekHourWeights: pattern.dayOfWeekHourWeights,
          minuteDistributionDef: {
            durationPeriodUnit: pattern.minuteDistribution.durationPeriodUnit,
            distribution: pattern.minuteDistribution.distribution
          }
        }));

        // Include time distributed configs - serialize TimeDistributedConfig objects to ISerializedTimeDistributedConfig format
        referenceData.timeDistributedConfigs = modelDef.timeDistributedConfigs.getAll().map(config => ({
          unique_id: config.id,
          name: config.name,
          timePatternId: config.timePatternId,
          totalVolume: config.totalVolume,
          volumePeriodBasis: config.volumePeriodBasis,
          startDate: config.startDate,
          endDate: config.endDate
        }));

        // Include scenarios - serialize Scenario objects
        referenceData.scenarios = modelDef.scenarios.getAll().map(scenario => scenario.toJSON());

        this.debug.log('Reference data built:', {
          activities: referenceData.activities?.length || 0,
          generators: referenceData.generators?.length || 0,
          resources: referenceData.resources?.length || 0,
          entities: referenceData.entities?.length || 0,
          resourceRequirements: referenceData.resourceRequirements?.length || 0,
          connectors: referenceData.connectors?.length || 0,
          states: referenceData.states?.length || 0,
          timePatterns: referenceData.timePatterns?.length || 0,
          timeDistributedConfigs: referenceData.timeDistributedConfigs?.length || 0,
          scenarios: referenceData.scenarios?.length || 0
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
