import { EditorReferenceData, EditorReferenceActionSummary, EditorReferenceStateModification } from '@quodsi/lucid-shared';
import { ModelManager } from '../../../../../core/ModelManager';
import { ExtensionDebugService } from '../../../../logging/ExtensionDebugService';

/**
 * Reduce a StateModification (or any object shaped like one) to the fields the
 * delete-state expression detector needs. `valueExpression` is included only
 * when present, so literal-value modifications don't carry a stray `undefined`
 * key into the summary.
 */
function summarizeModification(mod: any): EditorReferenceStateModification {
  const summary: EditorReferenceStateModification = {
    stateUniqueId: mod.stateUniqueId,
    stateName: mod.stateName,
    operation: mod.operation,
  };
  if (typeof mod.valueExpression === 'string' && mod.valueExpression.length > 0) {
    summary.valueExpression = mod.valueExpression;
  }
  return summary;
}

function summarizeModifications(mods: unknown): EditorReferenceStateModification[] | undefined {
  if (!Array.isArray(mods) || mods.length === 0) return undefined;
  return mods.map(summarizeModification);
}

/**
 * Build the per-action summary used by both the change-request editor (Action
 * picker + resource-requirement dropdown) and the delete-state expression
 * detector. Recurses into BRANCH's ifTrue/ifFalse and LOOP's actions so a
 * modification buried in either is still visible to
 * findExpressionsReferencingState's walk (quodsi_shared/src/conversion/stateReferences.ts).
 */
function summarizeAction(action: any): EditorReferenceActionSummary {
  const hasDuration = 'duration' in action && action.duration != null;
  const hasRequirementId = 'resourceRequirementId' in action;

  const summary: EditorReferenceActionSummary = {
    id: action.id as string,
    actionType: action.actionType as string,
    duration: hasDuration
      ? {
          durationPeriodUnit: action.duration.durationPeriodUnit as string,
          distribution: {
            distributionType: action.duration.distribution.distributionType as string,
            // DistributionParameters is a union of specific interfaces; cast via unknown
            // because all concrete parameter types are plain {key: number} objects.
            parameters: action.duration.distribution.parameters as unknown as Record<string, number>,
            description: action.duration.distribution.description as string | undefined,
          },
        }
      : undefined,
    resourceRequirementId: hasRequirementId
      ? (action.resourceRequirementId as string | null)
      : undefined,
  };

  const modifications = summarizeModifications(action.modifications);
  if (modifications) summary.modifications = modifications;

  const stateModifications = summarizeModifications(action.stateModifications);
  if (stateModifications) summary.stateModifications = stateModifications;

  if (Array.isArray(action.ifTrue) && action.ifTrue.length > 0) {
    summary.ifTrue = action.ifTrue.map(summarizeAction);
  }
  if (Array.isArray(action.ifFalse) && action.ifFalse.length > 0) {
    summary.ifFalse = action.ifFalse.map(summarizeAction);
  }
  if (Array.isArray(action.actions) && action.actions.length > 0) {
    summary.actions = action.actions.map(summarizeAction);
  }

  return summary;
}


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
        referenceData.activities = modelDef.activities.getAll().map(a => {
          // A self-generating activity's own initial state modifications (distinct
          // from a Generator's generationConfig — this is Activity.sourceConfig).
          // findExpressionsReferencingState and ModelManager.cleanupStateReferences
          // both already look here; the summary would otherwise silently miss it.
          const sourceConfigMods = summarizeModifications((a as any).sourceConfig?.initialStateModifications);

          return {
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
              .filter((id): id is string => id !== null),
            // Carry per-action summary so the change-request editor can offer an Action
            // picker and a resource-requirement dropdown, AND so the States delete
            // dialog can warn about expressions referencing the state being deleted
            // (findExpressionsReferencingState needs modifications/stateModifications,
            // recursively through BRANCH/LOOP — see summarizeAction above).
            actions: (a.actions || []).map(action => summarizeAction(action as any)),
            sourceConfig: sourceConfigMods ? { initialStateModifications: sourceConfigMods } : undefined,
          };
        });

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
          // Carry initial state modifications so the States delete dialog can warn
          // about expressions referencing the state being deleted (same reason as
          // activities.actions above).
          initialStateModifications: summarizeModifications(g.generationConfig?.initialStateModifications),
        }));

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

        // Include scenarios - serialize Scenario objects
        referenceData.scenarios = modelDef.scenarios.getAll().map(scenario => scenario.toJSON());

        this.debug.log('Reference data built:', {
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

    return referenceData;
  }
};
