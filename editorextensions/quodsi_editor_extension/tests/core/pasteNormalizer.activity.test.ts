// tests/core/pasteNormalizer.activity.test.ts
//
// Task 5 of the LucidChart Paste Normalizer plan: the Activity-block rule.
// A pasted Activity block's `q_data` domain carries the ORIGINAL block's
// actions, levers, and stored name verbatim (byte-for-byte -- that is what
// Lucid's copy/paste leaves on shapeData). Three identities need to go
// fresh on the pasted copy:
//
//   - action ids (`actions[].id`), recursively through any nested branch
//     arrays -- confirmed present in the shared Action union by grepping
//     `quodsi_shared/src/types/elements/actions` for `ifTrue`/`ifFalse`/
//     `actions:`:
//       BranchAction.ts:47:    ifTrue: Action[];
//       BranchAction.ts:52:    ifFalse: Action[];
//       LoopAction.ts:42:    actions: Action[];
//     So this suite pins BOTH the flat case and one nested-branch case
//     (a BranchAction whose ifTrue holds a JoinAction).
//   - lever ids (`levers[].leverId`); a lever's `actionId`, when it names
//     one of the re-minted actions, is repointed to that action's NEW id
//     (matched via the id map built while re-minting -- i.e. by POSITION
//     in the original array, never by the now-stale old id literal).
//   - the stored `name`, deduped against every OTHER Activity's stored name
//     on the page -- only on an actual collision does it change, and only
//     then does the notice fire.
//
// `resourceRequirementId` (Seize/DelayWithResource) and
// `failureProperties.repairResourceRequirementId` name a Resource
// requirement -- a different identity space this rule must leave alone.
//
// Fabrication pattern (same as pasteNormalizer.resource.test.ts): write
// q_data through the real StorageAdapter on a throwaway fake carrying the
// ORIGINAL id, then copy the raw q_data STRING onto a new-id fake. That is
// byte-for-byte what a Lucid paste leaves behind.

import { ActionType, SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

/** A detached block whose q_data was written for a DIFFERENT id: a paste. */
function makePastedActivityBlock(sa: StorageAdapter, newId: string, originalId: string, domain: Record<string, unknown>): any {
    const throwaway = makeFakeBlock(originalId);
    sa.setElementData(throwaway, { id: originalId, ...domain } as { id: string }, SimulationObjectType.Activity, {
        mappingSource: 'user',
    });
    const rawQData = throwaway.shapeData.get('q_data');
    const block = makeFakeBlock(newId);
    block.shapeData.set('q_data', rawQData!);
    return block;
}

/** A NORMAL (not pasted) Activity block already living on `page`, with a stored name. */
function addActivityBlock(sa: StorageAdapter, page: any, blockId: string, name: string): any {
    const block = addBlock(page, makeFakeBlock(blockId));
    sa.setElementData(block, { id: blockId, name }, SimulationObjectType.Activity, { mappingSource: 'user' });
    return block;
}

describe('PasteNormalizer — Activity blocks (Task 5)', () => {
    it('flat actions: every action id is re-minted', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const pasted = addBlock(
            page,
            makePastedActivityBlock(sa, 'block-new', 'block-orig', {
                name: 'Triage',
                actions: [
                    { id: 'act-seize', type: ActionType.SEIZE, resourceRequirementId: 'req-1' },
                    { id: 'act-delay', type: ActionType.DELAY, duration: { value: 5, unit: 'minutes' } },
                    { id: 'act-release', type: ActionType.RELEASE, resourceRequirementId: 'req-1' },
                ],
            })
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ actions: any[] }>(pasted)!;
        expect(data.actions).toHaveLength(3);
        const ids = data.actions.map((a) => a.id);
        expect(ids).not.toContain('act-seize');
        expect(ids).not.toContain('act-delay');
        expect(ids).not.toContain('act-release');
        expect(new Set(ids).size).toBe(3);
        expect(result.changed).toBe(true);
    });

    it('nested branch actions: ifTrue/ifFalse actions are re-minted recursively too', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const pasted = addBlock(
            page,
            makePastedActivityBlock(sa, 'block-new', 'block-orig', {
                name: 'Triage',
                actions: [
                    {
                        id: 'act-branch',
                        type: ActionType.BRANCH,
                        condition: null,
                        ifTrue: [{ id: 'act-join-nested', type: ActionType.JOIN, joinCount: 2 }],
                        ifFalse: [],
                    },
                ],
            })
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ actions: any[] }>(pasted)!;
        const branch = data.actions[0];
        expect(branch.id).not.toBe('act-branch');
        expect(branch.type).toBe(ActionType.BRANCH);
        expect(branch.ifTrue).toHaveLength(1);
        expect(branch.ifTrue[0].id).not.toBe('act-join-nested');
        expect(branch.ifTrue[0].type).toBe(ActionType.JOIN);
        expect(branch.ifTrue[0].joinCount).toBe(2);
        expect(branch.ifFalse).toEqual([]);
        expect(result.changed).toBe(true);
    });

    it("lever actionId is repointed to the SAME action's new id (matched by position, not by the stale old id)", () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const pasted = addBlock(
            page,
            makePastedActivityBlock(sa, 'block-new', 'block-orig', {
                name: 'Triage',
                actions: [
                    { id: 'act-seize', type: ActionType.SEIZE, resourceRequirementId: 'req-1' },
                    { id: 'act-delay-with-resource', type: ActionType.DELAY_WITH_RESOURCE, resourceRequirementId: 'req-1', duration: { value: 5, unit: 'minutes' } },
                ],
                levers: [
                    { leverId: 'lever-1', propertyName: 'duration', actionId: 'act-delay-with-resource', enabled: true, label: 'Processing time' },
                ],
            })
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ actions: any[]; levers: any[] }>(pasted)!;
        const secondAction = data.actions[1];
        expect(secondAction.type).toBe(ActionType.DELAY_WITH_RESOURCE); // same position as before
        expect(secondAction.id).not.toBe('act-delay-with-resource');

        expect(data.levers).toHaveLength(1);
        expect(data.levers[0].leverId).not.toBe('lever-1');
        expect(data.levers[0].leverId).toBeTruthy();
        expect(data.levers[0].actionId).toBe(secondAction.id); // repointed to the NEW id
        expect(data.levers[0].label).toBe('Processing time');
        expect(result.changed).toBe(true);
    });

    it('a lever whose actionId does not resolve to any action (dangling) is left unchanged', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const pasted = addBlock(
            page,
            makePastedActivityBlock(sa, 'block-new', 'block-orig', {
                name: 'Triage',
                actions: [{ id: 'act-delay', type: ActionType.DELAY, duration: { value: 5, unit: 'minutes' } }],
                levers: [
                    { leverId: 'lever-1', propertyName: 'capacity', actionId: 'act-does-not-exist', enabled: true, label: 'Stray lever' },
                ],
            })
        );

        normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ levers: any[] }>(pasted)!;
        expect(data.levers[0].actionId).toBe('act-does-not-exist');
        expect(data.levers[0].leverId).not.toBe('lever-1'); // leverId still re-minted
    });

    it('name suffixed only when it collides with another Activity on this page', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addActivityBlock(sa, page, 'block-other', 'Triage');
        const pasted = addBlock(page, makePastedActivityBlock(sa, 'block-new', 'block-orig', { name: 'Triage', actions: [] }));

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ name: string }>(pasted)!;
        expect(data.name).toBe('Triage_2');
        expect(result.notices).toEqual([`Pasted activity renamed to 'Triage_2'`]);
    });

    it('no collision -> name unchanged and no notice, but action ids still re-mint (a paste ALWAYS re-mints)', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addActivityBlock(sa, page, 'block-other', 'Registration');
        const pasted = addBlock(
            page,
            makePastedActivityBlock(sa, 'block-new', 'block-orig', {
                name: 'Triage',
                actions: [{ id: 'act-delay', type: ActionType.DELAY, duration: { value: 5, unit: 'minutes' } }],
            })
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ name: string; actions: any[] }>(pasted)!;
        expect(data.name).toBe('Triage');
        expect(result.notices).toEqual([]);
        expect(data.actions[0].id).not.toBe('act-delay');
        expect(result.changed).toBe(true);
    });

    it('requirement refs are byte-identical: Seize resourceRequirementId and failureProperties.repairResourceRequirementId are untouched', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const pasted = addBlock(
            page,
            makePastedActivityBlock(sa, 'block-new', 'block-orig', {
                name: 'Triage',
                actions: [{ id: 'act-seize', type: ActionType.SEIZE, resourceRequirementId: 'req-doctor-or-2-nurses' }],
                failureProperties: { enabled: true, repairResourceRequirementId: 'req-nurse-auto' },
            })
        );

        normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ actions: any[]; failureProperties: any }>(pasted)!;
        expect(data.actions[0].resourceRequirementId).toBe('req-doctor-or-2-nurses');
        expect(data.failureProperties.repairResourceRequirementId).toBe('req-nurse-auto');
    });

    it('is idempotent: a second pass writes nothing', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addActivityBlock(sa, page, 'block-other', 'Triage');
        const pasted = addBlock(
            page,
            makePastedActivityBlock(sa, 'block-new', 'block-orig', {
                name: 'Triage',
                actions: [{ id: 'act-delay', type: ActionType.DELAY, duration: { value: 5, unit: 'minutes' } }],
                levers: [{ leverId: 'lever-1', propertyName: 'duration', actionId: 'act-delay', enabled: true, label: 'Time' }],
            })
        );

        normalizePastedItems([pasted], sa);
        const qDataAfterFirst = pasted.shapeData.get('q_data');

        const second = normalizePastedItems([pasted], sa);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(pasted.shapeData.get('q_data')).toBe(qDataAfterFirst);
    });
});
