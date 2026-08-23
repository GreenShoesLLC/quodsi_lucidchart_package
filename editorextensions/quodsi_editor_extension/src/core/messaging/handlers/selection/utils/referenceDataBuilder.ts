import { EditorReferenceData, EditorReferenceActionSummary, EditorReferenceStateModification } from '@quodsi/lucid-shared';
import { ModelManager } from '../../../../../core/ModelManager';
import { getLogger } from '@quodsi/lucid-shared';

/**
 * Reduce a StateModification (or any object shaped like one) to the fields the
 * delete-state expression detector needs. `expression` is included only
 * when present, so literal-value modifications don't carry a stray `undefined`
 * key into the summary.
 *
 * Wire-cleanup Phase B2 Task 6/9: `stateUniqueId`/`stateName` collapsed to
 * `stateId`; `valueExpression` renamed to `expression`.
 */
function summarizeModification(mod: any): EditorReferenceStateModification {
  const summary: EditorReferenceStateModification = {
    stateId: mod.stateId,
    operation: mod.operation,
  };
  if (typeof mod.expression === 'string' && mod.expression.length > 0) {
    summary.expression = mod.expression;
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
 *
 * Wire-cleanup Phase B2 Task 9: `actionType` renamed to `type`; `duration`
 * is the flat clean-wire shape (`{value, unit}` or `{distribution, ...params,
 * unit}`) carried through as-is rather than translated into the old nested
 * `{durationPeriodUnit, distribution: {...}}` wrapper. The old
 * `stateModifications` field (Seize/DelayWithResource) was unified into
 * `modifications` at Task 6 — a single summarizeModifications call covers it.
 */
function summarizeAction(action: any): EditorReferenceActionSummary {
  const hasDuration = 'duration' in action && action.duration != null;
  const hasRequirementId = 'resourceRequirementId' in action;

  const summary: EditorReferenceActionSummary = {
    id: action.id as string,
    type: action.type as string,
    duration: hasDuration ? action.duration : undefined,
    resourceRequirementId: hasRequirementId
      ? (action.resourceRequirementId as string | null)
      : undefined,
  };

  const modifications = summarizeModifications(action.modifications);
  if (modifications) summary.modifications = modifications;

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
        referenceData.activities = modelDef.activities.getAll().map(a => {
          // A self-generating activity's own initial state modifications (distinct
          // from a Generator's own flat fields — this is Activity.sourceConfig).
          // findExpressionsReferencingState and ModelManager.cleanupStateReferences
          // both already look here; the summary would otherwise silently miss it.
          const sourceConfigMods = summarizeModifications((a as any).sourceConfig?.initialStates);

          return {
            id: a.id,
            name: a.name,
            routing: a.routing,
            // Carry per-action summary so the change-request editor can offer an Action
            // picker and a resource-requirement dropdown, AND so the States delete
            // dialog can warn about expressions referencing the state being deleted
            // (findExpressionsReferencingState needs modifications, recursively
            // through BRANCH/LOOP — see summarizeAction above).
            actions: (a.actions || []).map(action => summarizeAction(action as any)),
            sourceConfig: sourceConfigMods ? { initialStates: sourceConfigMods } : undefined,
            failureProperties: (a as any).failureProperties?.repairResourceRequirementId
              ? { repairResourceRequirementId: (a as any).failureProperties.repairResourceRequirementId as string }
              : undefined,
          };
        });

        referenceData.generators = modelDef.generators.getAll().map(g => ({
          id: g.id,
          name: g.name,
          // Carry the inter-arrival duration so the change-request editor can pre-fill.
          // Wire-cleanup Phase B2 Task 5/9: `EntitySourceConfig` dissolved —
          // `interarrivalTime` is flat on the Generator now; already the
          // clean-wire flat Duration shape, carried through as-is.
          interarrivalTime: g.interarrivalTime,
          // Carry initial state modifications so the States delete dialog can warn
          // about expressions referencing the state being deleted (same reason as
          // activities.actions above). Named `initialStates` (not
          // `initialStateModifications`) to match `StateReferenceScope`'s own field
          // name — `findExpressionsReferencingState` reads this key directly off
          // this same summary object.
          initialStates: summarizeModifications(g.initialStates),
          // Carry routing/mode/entityId so the shared ConnectorRoutingView can
          // drive its mode selector and single-entity-type hint.
          routing: g.routing,
          mode: g.mode,
          entityId: g.entityId,
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

    return referenceData;
  }
};
