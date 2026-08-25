// editorextensions/quodsi_editor_extension/src/types/hydrateActions.ts
//
// Extracted from ActivityLucid.ts (Task 7, connector-move-time-actions):
// both ActivityLucid and ConnectorLucid store `actions: Action[]` and must
// rebuild real StateModification instances from the plain objects storage
// hands back on read -- StateModification.fromJSON isn't invoked by the
// generic q_data deserialization, so a stored modification survives
// round-tripping as a plain object unless something calls it explicitly.
// Moved here verbatim, unchanged, so both Lucid classes share one hydrator
// instead of ActivityLucid owning a private copy ConnectorLucid can't reach.

import { Action, ActionType, StateModification } from '@quodsi/lucid-shared';

/**
 * Hydrate a single modification object to a StateModification instance.
 * This handles cases where modifications are loaded from storage as plain objects.
 */
export function hydrateModification(m: any): StateModification {
    if (m instanceof StateModification) {
        return m;
    }
    return StateModification.fromJSON(m);
}

/**
 * Hydrate actions loaded from storage.
 * Converts plain modification objects back to StateModification instances.
 *
 * Wire-cleanup Phase B2 Task 6/9: the action discriminator field renamed
 * `actionType` -> `type`; `DelayWithResourceAction`'s state-modification
 * list renamed `stateModifications` -> `modifications` (unified with every
 * other action type's field name for the same concept).
 */
export function hydrateActions(actions: Action[] | undefined): Action[] {
    if (!actions) {
        return [];
    }

    return actions.map(action => {
        if (action.type === ActionType.ASSIGN) {
            const assignAction = action as any;
            return {
                ...action,
                modifications: assignAction.modifications?.map(hydrateModification) || []
            };
        }
        if (action.type === ActionType.DELAY_WITH_RESOURCE) {
            const delayAction = action as any;
            return {
                ...action,
                modifications: delayAction.modifications?.map(hydrateModification) || []
            };
        }
        if (action.type === ActionType.SPLIT) {
            const splitAction = action as any;
            return {
                ...action,
                modifications: splitAction.modifications?.map(hydrateModification) || []
            };
        }
        return action;
    });
}
