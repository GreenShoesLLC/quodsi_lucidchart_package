// editorextensions/quodsi_editor_extension/src/core/referenceSummaries.ts
//
// The ONE place the host reduces activities, generators, connectors and states
// to the summary rows panels read (spec 2026-09-12 §1). Two producers share it:
//   - referenceDataBuilder: selection referenceData (the Activity, Generator
//     and Connector editors);
//   - modelRootProjection: MODEL_ROOT_SNAPSHOT (every tab of the Model editor).
// One module, so the two views of one model cannot drift.
//
// PURE, with type-only imports. modelRootProjection.ts must stay importable
// from quodsim-react's Vitest suite (see that file's header), so this module
// must never import ModelManager, lucid-extension-sdk or the messaging barrel.

import type { EditorReferenceActionSummary, EditorReferenceStateModification } from '@quodsi/lucid-shared';

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

export function summarizeModifications(mods: unknown): EditorReferenceStateModification[] | undefined {
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
 * unit}`) carried through as-is. The old `stateModifications` field
 * (Seize/DelayWithResource) was unified into `modifications` at Task 6.
 */
export function summarizeAction(action: any): EditorReferenceActionSummary {
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
 * An activity as referenceData has always carried it. The action summaries
 * feed the change-request editor's pickers AND the States delete dialog's
 * expression warning. `sourceConfig.initialStates` is a self-generating
 * activity's own initial modifications (findExpressionsReferencingState and
 * ModelManager.cleanupStateReferences both already look there). The repair
 * requirement lets usage counts include failure repairs.
 */
export function summarizeActivity(a: any) {
    const initialStates = summarizeModifications(a.sourceConfig?.initialStates);
    return {
        id: a.id as string,
        name: a.name as string,
        routing: a.routing,
        actions: ((a.actions || []) as unknown[]).map(summarizeAction),
        sourceConfig: initialStates ? { initialStates } : undefined,
        failureProperties: a.failureProperties?.repairResourceRequirementId
            ? { repairResourceRequirementId: a.failureProperties.repairResourceRequirementId as string }
            : undefined,
    };
}

/**
 * A generator as referenceData has always carried it: the interarrival
 * duration (change-request pre-fill), initial-state summaries named
 * `initialStates` to match StateReferenceScope, and routing/mode/entityId for
 * the shared ConnectorRoutingView.
 */
export function summarizeGenerator(g: any) {
    return {
        id: g.id as string,
        name: g.name as string,
        interarrivalTime: g.interarrivalTime,
        initialStates: summarizeModifications(g.initialStates),
        routing: g.routing,
        mode: g.mode,
        entityId: g.entityId,
    };
}

/** A state as ISerializedState, without the class's `type` tag. */
export function summarizeState(s: any) {
    return {
        id: s.id as string,
        name: s.name as string,
        componentType: s.componentType,
        dataType: s.dataType,
        initialValue: s.initialValue,
        categoryValues: s.categoryValues,
        description: s.description,
        collectStatistics: s.collectStatistics,
    };
}

/**
 * A connector without its geometry (sourceX/Y, targetX/Y, x/y, path): the
 * routing fields, action summaries and levers the Model editor's delete
 * dialogs and state-delete preview read.
 */
export function summarizeConnector(c: any) {
    return {
        id: c.id as string,
        name: c.name as string,
        sourceId: c.sourceId as string,
        targetId: c.targetId as string,
        weight: c.weight,
        priority: c.priority,
        entityId: c.entityId,
        condition: c.condition,
        actions: ((c.actions || []) as unknown[]).map(summarizeAction),
        levers: (c.levers ?? []) as unknown[],
    };
}
