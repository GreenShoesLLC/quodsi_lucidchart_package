import { ResourceRequirement } from '@quodsi/shared';
import { Connector } from '@quodsi/shared';
import { ConnectType } from '@quodsi/shared';
import { ISerializedDuration } from "../serialization/interfaces/ISerializedDuration";
import { ISerializedScenario } from "../serialization/interfaces/ISerializedScenario";
import { SwimLaneContainment } from "./swimlane/SwimLaneQuodsiData";

/**
 * A single state modification, reduced to what delete-time reference detection
 * needs (`@quodsi/shared`'s `findExpressionsReferencingState` /
 * `removeStateReferences`, see conversion/stateReferences.ts).
 *
 * Wire-cleanup Phase B2 Task 6/9: `stateUniqueId` + the redundant `stateName`
 * collapsed to the single clean-wire `stateId` field; `valueExpression`
 * renamed to `expression` (present only for expression-mode modifications —
 * literal-value modifications omit it).
 */
export interface EditorReferenceStateModification {
    stateId: string;
    operation: string;
    expression?: string;
}

/**
 * Per-action summary for the change-request editor (Action picker + resource-requirement
 * dropdown) AND the delete-state expression detector.
 *
 * Recursive: BRANCH's ifTrue/ifFalse and LOOP's actions are themselves
 * EditorReferenceActionSummary[], mirroring how the real Action tree nests and how
 * `findExpressionsReferencingState`'s walkActionsForExpressions walks it — without
 * this recursion, a modification buried in a BRANCH/LOOP body would be invisible to
 * the detector even though the summary "has" actions.
 *
 * Wire-cleanup Phase B2 Task 9: `actionType` renamed to `type`; `duration`
 * is the flat clean-wire `ISerializedDuration` shape (`{value, unit}` or
 * `{distribution, ...params, unit}`), not the old nested `{durationPeriodUnit,
 * distribution: {distributionType, parameters, description}}` wrapper. The old
 * `stateModifications` field (Seize/DelayWithResource's differently-named
 * modifications list) was unified into `modifications` at Task 6 — no longer
 * a separate field here.
 */
export interface EditorReferenceActionSummary {
    id: string;
    type: string;
    duration?: ISerializedDuration;
    resourceRequirementId?: string | null;
    /** State modifications carried by this action. */
    modifications?: EditorReferenceStateModification[];
    /** BRANCH: actions to run when the condition is true. */
    ifTrue?: EditorReferenceActionSummary[];
    /** BRANCH: actions to run when the condition is false. */
    ifFalse?: EditorReferenceActionSummary[];
    /** LOOP: the repeated action body. */
    actions?: EditorReferenceActionSummary[];
}

/**
 * Reference data for React editors containing model-wide lookup data.
 *
 * This interface consolidates all reference data that editors need for
 * dropdowns, lookups, and cross-references. All data comes from the
 * ModelDefinition and is built by referenceDataBuilder.
 */
export interface EditorReferenceData {
    entities?: Array<{ id: string, name: string, description?: string }>;
    resources?: Array<{ id: string, name: string }>;
    activities?: Array<{
        id: string,
        name: string,
        routing?: ConnectType,
        actionRequirementIds?: string[];  // Requirement IDs used by actions
        /** Per-action summary for the change-request editor (Action picker + resource-requirement dropdown). */
        actions?: EditorReferenceActionSummary[];
        /**
         * Self-generating activity's own initial state modifications
         * (Activity.sourceConfig.initialStateModifications on the model — a
         * SPLIT/self-gen activity's `sourceConfig`, distinct from a Generator's
         * `generationConfig`). No authoring UI reaches this in quodsim-react today,
         * but the detector (findExpressionsReferencingState) and Lucid's own removal
         * path (ModelManager.cleanupStateReferences) both already handle it, so the
         * summary carries it too rather than being the one surface where the three
         * disagree.
         */
        sourceConfig?: {
            initialStates?: EditorReferenceStateModification[];
        };
    }>;
    generators?: Array<{
        id: string;
        name: string;
        /** Wire-cleanup Phase B2 Task 5/9: renamed from `periodIntervalDuration`
         *  (dissolved `EntitySourceConfig`); flat clean-wire Duration shape. */
        interarrivalTime?: ISerializedDuration;
        /** Initial state modifications applied to each new entity (Generator.initialStates
         *  on the model). Named to match `StateReferenceScope`'s own `initialStates` field
         *  (`@quodsi/shared`'s `findExpressionsReferencingState` reads this key directly off
         *  this same summary object — see referenceDataBuilder's integration comment). */
        initialStates?: EditorReferenceStateModification[];
    }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];
    states?: any[]; // Serialized state definitions for all components
    scenarios?: ISerializedScenario[]; // Serialized scenario definitions
    swimLaneContainment?: SwimLaneContainment; // Swimlane lane containing the selected activity (if any)
}