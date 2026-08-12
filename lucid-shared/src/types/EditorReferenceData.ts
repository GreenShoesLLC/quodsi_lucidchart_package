import { ResourceRequirement } from '@quodsi/shared';
import { Connector } from '@quodsi/shared';
import { ConnectType } from '@quodsi/shared';
import { ISerializedScenario } from "../serialization/interfaces/ISerializedScenario";
import { SwimLaneContainment } from "./swimlane/SwimLaneQuodsiData";

/**
 * A single state modification, reduced to what delete-time reference detection
 * needs (`@quodsi/shared`'s `findExpressionsReferencingState` /
 * `removeStateReferences`, see conversion/stateReferences.ts). `valueExpression`
 * is present only for expression-mode modifications (state-expressions feature);
 * literal-value modifications omit it.
 */
export interface EditorReferenceStateModification {
    stateUniqueId: string;
    stateName: string;
    operation: string;
    valueExpression?: string;
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
 */
export interface EditorReferenceActionSummary {
    id: string;
    actionType: string;
    /** Reuses the same inline serialized-duration shape as generator periodIntervalDuration. */
    duration?: {
        durationPeriodUnit: string;
        distribution: { distributionType: string; parameters: Record<string, number>; description?: string };
    };
    resourceRequirementId?: string | null;
    /** State modifications carried directly by Assign/Create/Split/Join actions. */
    modifications?: EditorReferenceStateModification[];
    /** State modifications carried by Seize/DelayWithResource actions (a differently-named field on the model). */
    stateModifications?: EditorReferenceStateModification[];
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
        connectType?: ConnectType,
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
            initialStateModifications?: EditorReferenceStateModification[];
        };
    }>;
    generators?: Array<{
        id: string;
        name: string;
        periodIntervalDuration?: {
            durationPeriodUnit: string;
            distribution: { distributionType: string; parameters: Record<string, number>; description?: string };
        };
        /** Initial state modifications applied to each new entity (generationConfig.initialStateModifications on the model). */
        initialStateModifications?: EditorReferenceStateModification[];
    }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];
    states?: any[]; // Serialized state definitions for all components
    scenarios?: ISerializedScenario[]; // Serialized scenario definitions
    swimLaneContainment?: SwimLaneContainment; // Swimlane lane containing the selected activity (if any)
}