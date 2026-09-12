// import { ModelValidationService } from "@quodsi/lucid-shared/src/validation/ModelValidationService";
import {
    evaluateValidationGate,
    Activity,
    ActionType,
    Connector,
    Generator,
    Entity,
    Model,
    ModelDefinition,
    SimulationObject,
    SimulationObjectType,
    ValidationResult,
    ElementTypeInfo,
    ModelStructure,
    ModelElement,
    ActivityListManager,
    ValidationMessages,
    ISerializedState,
    ISerializedEntity,
    ISerializedArrivalPattern,
    ISerializedArrivalSchedule,
    ISerializedWorkSchedule,
    ModelDefaults,
    ISerializedResourceRequirement,
    ISerializedScenario,
    EnvelopeMessageType,
    ValidationSeverity,
    ValidationIssue,
    ensureBaselineScenario,
    takeClearedFields,
    ModelRootProjection,
    stripTransientResourceMarkers,
    StoredResourceRecord,
    resourceLinkIssues,
    removeEntityReferences,
    removeStateReferences,
    removeRequirementReferences,
    removeResourceReferences,
    pickFallbackEntityId,
    isPlainAutoRequirement,
    MODEL_FIELD_KEYS,
} from "@quodsi/lucid-shared";
import type { ReferenceCleanupOptions } from "@quodsi/lucid-shared";

/** Stored element data a shared reference-cleanup rule runs over, keyed by Lucid item id. */
type SharedCleanupCollections = {
    generators: Array<Record<string, unknown>>;
    activities: Array<Record<string, unknown>>;
    connectors: Array<Record<string, unknown>>;
};

/** What the @quodsi/shared reference-cleanup rules return. */
type SharedCleanupResult = {
    collections: {
        generators?: Array<Record<string, unknown>>;
        activities?: Array<Record<string, unknown>>;
        connectors?: Array<Record<string, unknown>>;
    };
    changedElementIds: string[];
};
import { projectModelRoot } from "./modelRootProjection";
import { StorageAdapter } from "./StorageAdapter";
import { BlockProxy, DocumentProxy, ElementProxy, PageProxy, EditorClient, LineProxy } from "lucid-extension-sdk";
import { upsertModel, canonicalModelName } from "./sync/scenarioSync";
import { ModelDefinitionPageBuilder } from "./ModelDefinitionPageBuilder";
import { ModelStructureBuilder } from "../services/accordion/ModelStructureBuilder";
import { LucidElementFactory } from "../services/LucidElementFactory";
import { activityStorageRemoveKeys } from "../types/ActivityLucid";
import { resourceStorageRemoveKeys } from "../types/ResourceLucid";
import { generatorStorageRemoveKeys } from "../types/GeneratorLucid";
import { getLogger } from '@quodsi/lucid-shared';
import { router } from "./messaging";
import { LucidVersionManager } from "../versioning/LucidVersionManager";
import { LUCID_STORAGE_FORMAT, StorageFormatTooNewError } from "./storageFormat";
import { migrateResourcesToModelLevel } from "./ResourceStorageMigration";



interface ChangeTracker {
    modelDefinitionDirty: boolean;        // Tracks if we need to rebuild ModelDefinition
    validationDirty: boolean;             // Tracks if we need to revalidate
    lastModelDefinitionUpdate: number;     // Timestamp of last ModelDefinition rebuild
    lastValidationUpdate: number;          // Timestamp of last validation
    pendingChanges: Set<string>;          // IDs of elements with pending changes
}

/**
 * updateModelRoot keys that write the page's own model settings: the Model
 * field roster minus `id` (the host owns identity). spec 2026-09-12 §2.
 */
const MODEL_SETTINGS_KEYS: readonly string[] = MODEL_FIELD_KEYS.filter(key => key !== 'id');

/** A blank model name takes the page title, else 'Untitled Model' (spec 2026-09-12 decision 7). */
function blankModelNameFallback(page: PageProxy): string {
    return (page.getTitle() ?? '').trim() || 'Untitled Model';
}

function isBlankName(name: unknown): boolean {
    return typeof name !== 'string' || name.trim() === '';
}

export class ModelManager {
    private debug = getLogger('ModelManager');
    private modelDefinition: ModelDefinition | null = null;
    /**
     * The page the cached modelDefinition was built for. The rebuild diff
     * (detectAndCleanupDeletedElements) runs only when rebuilding that same
     * page -- after a page switch the cached model belongs to another page
     * (spec 2026-09-11 page guard, decision 5).
     */
    private modelDefinitionPageId: string | null = null;
    private storageAdapter: StorageAdapter;
    private currentPage: PageProxy | null = null;
    private currentValidationResult: ValidationResult | null = null;
    private versionManager: LucidVersionManager;
    private versionCheckedPageId: string | null = null;
    /**
     * The builder that produced `modelDefinition`. Kept so validateModel() can
     * read the resource-link rejections that build recorded -- a dangling or
     * duplicate pointer is by definition absent from the model, so no
     * ValidationRule can find it after the fact.
     */
    private pageBuilder: ModelDefinitionPageBuilder | null = null;
    /**
     * One-shot notices, consumed exactly once by the next validateModel().
     * Originally migrate-on-open only (duplicate names the storage-format
     * 1 -> 2 migration had to rename); Task 2 of the paste-normalizer plan
     * generalized the channel so any host-side event that produces an
     * informational notice (e.g. a pasted item silently re-stamped) can push
     * onto it via pushNotices(). A permanent nag for a one-time event would
     * be noise, hence drain-on-read rather than a standing list.
     */
    private pendingNotices: ValidationIssue[] = [];

    // Singleton instance and client reference
    private static instance: ModelManager | null = null;
    private static editorClient: EditorClient | null = null;

    /**
     * Get the singleton instance of ModelManager
     * @returns ModelManager instance
     * @throws Error if not initialized
     */
    public static getInstance(): ModelManager {
        if (!ModelManager.instance) {
            throw new Error('ModelManager not initialized');
        }
        return ModelManager.instance;
    }

    /**
     * Get the EditorClient reference
     * @returns EditorClient instance
     * @throws Error if not initialized
     */
    public static getClient(): EditorClient {
        if (!ModelManager.editorClient) {
            throw new Error('EditorClient not initialized');
        }
        return ModelManager.editorClient;
    }

    /**
     * Initialize the ModelManager singleton with client and storage adapter
     * @param client EditorClient instance
     * @param storageAdapter StorageAdapter instance
     */
    public static initialize(client: EditorClient, storageAdapter: StorageAdapter): void {
        ModelManager.editorClient = client;
        ModelManager.instance = new ModelManager(storageAdapter);
        // Use a static debug instance for the static method
        const staticDebug = getLogger('ModelManager');
        staticDebug.debug('Initialized singleton instance');
    }

    // Change tracking
    private changeTracker: ChangeTracker = {
        modelDefinitionDirty: false,
        validationDirty: false,
        lastModelDefinitionUpdate: 0,
        lastValidationUpdate: 0,
        pendingChanges: new Set<string>()
    };

    // Cache timeouts (in milliseconds)
    private static readonly VALIDATION_CACHE_TIMEOUT = 5000;      // 5 seconds
    private static readonly MODEL_DEF_CACHE_TIMEOUT = 10000;      // 10 seconds

    constructor(storageAdapter: StorageAdapter) {
        this.storageAdapter = storageAdapter;
        this.versionManager = new LucidVersionManager();
        this.debug.debug('ModelManager instance created');
    }
    /**
     * Marks the model as needing rebuild and validation
     */
    private markModelDirty(elementId?: string): void {
        this.changeTracker.modelDefinitionDirty = true;
        this.changeTracker.validationDirty = true;
        if (elementId) {
            this.changeTracker.pendingChanges.add(elementId);
        }
    }

    /**
     * Checks if caches are still valid based on timeouts
     */
    private checkCacheTimeouts(): void {
        const now = Date.now();

        // Check ModelDefinition cache timeout
        if (now - this.changeTracker.lastModelDefinitionUpdate > ModelManager.MODEL_DEF_CACHE_TIMEOUT) {
            this.changeTracker.modelDefinitionDirty = true;
        }

        // Check validation cache timeout
        if (now - this.changeTracker.lastValidationUpdate > ModelManager.VALIDATION_CACHE_TIMEOUT) {
            this.changeTracker.validationDirty = true;
        }
    }

    /**
     * Gets the current ModelDefinition, rebuilding if necessary
     */
    private async ensureModelDefinition(): Promise<ModelDefinition | null> {
        this.checkCacheTimeouts();

        if ((this.changeTracker.modelDefinitionDirty || !this.modelDefinition) && this.currentPage) {
            // Check version once per page — upgrade storage data before rebuilding
            if (this.versionCheckedPageId !== this.currentPage.id) {
                if (this.storageAdapter.isQuodsiModel(this.currentPage)) {
                    let upgradeResult = { upgraded: false, sourceVersion: '', targetVersion: '' };
                    try {
                        // FORWARD guard (Plan 2b): a document stamped higher than
                        // this build understands was written by a newer extension.
                        // The clean-only readers would silently default away
                        // whatever they don't recognize, so refuse to build at all
                        // -- same posture as the upgrade-failure catch below.
                        const format = this.storageAdapter.getStorageFormat(this.currentPage);
                        if (format !== null && format > LUCID_STORAGE_FORMAT) {
                            throw new StorageFormatTooNewError(format);
                        }
                        // Lucid storage format 1 -> 2: lift shape-owned and
                        // lane-owned resources into page-level q_resources.
                        // UNCONDITIONAL, and ahead of handlePageLoad: the schema
                        // upgrade only runs when versions differ, so a
                        // current-schema document still holding shape-owned
                        // resources would otherwise never migrate. Idempotent.
                        const migration = migrateResourcesToModelLevel(this.currentPage, this.storageAdapter);
                        if (migration.renames.length > 0) {
                            const pairs = migration.renames.map(r => `${r.from} -> ${r.to}`).join(', ');
                            this.pendingNotices.push(ValidationMessages.createIssue(
                                ValidationSeverity.WARNING,
                                'resource_renamed_on_migration',
                                `While moving resources to the model level, ${migration.renames.length} duplicate name(s) were renamed: ${pairs}. Review them on the Model Editor's Resources tab.`
                            ));
                        }
                        upgradeResult = await this.versionManager.handlePageLoad(this.currentPage);
                    } catch (error) {
                        // Wire-cleanup Phase B2 Task 11 (carry item 4, sanctioned edit):
                        // a failed upgrade used to fall straight through to building
                        // the model below over storage that may still carry old field
                        // names -- the clean-only readers (ModelDefinitionPageBuilder /
                        // the *Lucid classes) silently default away anything they don't
                        // recognize rather than failing loudly, a silent-loss class of
                        // bug. Mirrors the drawio/Visio B1 posture (DrawioModelManager.
                        // bootstrap's upgradeOnOpen catch): on upgrade failure, surface
                        // a VISIBLE error and do NOT proceed to build.
                        // `NotificationService.showError` (which LucidVersionManager
                        // itself already calls on its own internal failures) is NOT
                        // actually wired to anything user-visible today -- it is a
                        // log.error stub ("TODO: Implement actual LucidChart
                        // notification"). `broadcastValidationResults()` via
                        // MODEL_VALIDATION_RESULT is the one mechanism in this file
                        // already proven to reach the user (renders on the Model
                        // Editor's Validation tab) -- reused here identically to the
                        // "no model initialized" case a few lines below in
                        // validateModel().
                        this.debug.error('Version check failed:', error);
                        const message = error instanceof Error ? error.message : String(error);
                        this.modelDefinition = null;
                        this.modelDefinitionPageId = null;
                        // A too-new document is not a failed upgrade: reloading
                        // cannot help, only updating the extension can, so it
                        // carries its own code and its own (already complete)
                        // message rather than the retry advice below.
                        const tooNew = error instanceof StorageFormatTooNewError;
                        this.currentValidationResult = {
                            isValid: false,
                            issues: [ValidationMessages.createIssue(
                                ValidationSeverity.ERROR,
                                tooNew ? 'extension_outdated' : 'upgrade_failed',
                                tooNew
                                    ? message
                                    : `Model upgrade failed, so the model could not be loaded: ${message}. Reload the page to retry.`
                            )],
                            summary: {
                                errorCount: 1,
                                warningCount: 0,
                                infoCount: 0
                            }
                        };
                        this.broadcastValidationResults(this.currentValidationResult);
                        // Deliberately do NOT set versionCheckedPageId, run
                        // ensureBaselineScenario, or reach the builder below --
                        // leaving the gate unmarked means the NEXT
                        // ensureModelDefinition call retries the version check
                        // instead of latching this failure forever (mirrors
                        // DrawioModelManager.bootstrap resetting bootstrappedRoot
                        // on a caught upgrade-on-open failure).
                        return null;
                    }
                    // Ensure a Baseline scenario exists for this model page
                    this.ensureBaselineScenario(this.currentPage);

                }
                this.versionCheckedPageId = this.currentPage.id;
            }

            const lucidElementFactory = new LucidElementFactory(this.storageAdapter)
            lucidElementFactory.setLogging(false);
            const builder = new ModelDefinitionPageBuilder(this.storageAdapter, lucidElementFactory);
            this.pageBuilder = builder;
            try {
                const newModelDefinition = builder.buildFromConvertedPage(this.currentPage);

                if (!newModelDefinition) {
                    throw new Error('Builder returned null ModelDefinition');
                }

                if (!(newModelDefinition instanceof ModelDefinition)) {
                    throw new Error(`Invalid ModelDefinition type: ${typeof newModelDefinition}`);
                }

                // Verify activities manager
                if (!newModelDefinition.activities) {
                    throw new Error('activities property is undefined');
                }
                if (!(newModelDefinition.activities instanceof ActivityListManager)) {
                    throw new Error(`activities is not an ActivityListManager: ${typeof newModelDefinition.activities}`);
                }
                if (typeof newModelDefinition.activities.add !== 'function') {
                    throw new Error(`activities.add is not a function: ${typeof newModelDefinition.activities.add}`);
                }

                // Detect elements deleted from diagram and clean up orphaned references --
                // only when the cached model was built for THIS page. After a page switch
                // the cached model is another page's, and diffing it would treat that
                // page's elements as deleted from this one and write cleanups to this
                // page's storage (spec 2026-09-11 page guard, decision 5).
                if (this.modelDefinition && this.modelDefinitionPageId === this.currentPage.id) {
                    await this.detectAndCleanupDeletedElements(this.modelDefinition, newModelDefinition, this.currentPage);
                }

                this.modelDefinition = newModelDefinition;
                this.modelDefinitionPageId = this.currentPage.id;
                this.changeTracker.modelDefinitionDirty = false;
                this.changeTracker.lastModelDefinitionUpdate = Date.now();
                this.changeTracker.pendingChanges.clear();

                return this.modelDefinition;

            } catch (error) {
                this.debug.error('Error ensuring ModelDefinition:', error);
                throw error;
            }
        }

        return this.modelDefinition;
    }

    /**
     * Initializes a new model definition with data from storage
     */
    public async initializeModel(modelData: Model, pageProxy: PageProxy): Promise<void> {
        this.currentPage = pageProxy;

        // Store the model data FIRST so ensureModelDefinition can read it
        this.storageAdapter.setElementData(
            pageProxy,
            modelData,
            SimulationObjectType.Model
        );

        // Now rebuild from storage (will find the data we just wrote)
        this.markModelDirty();
        await this.ensureModelDefinition();

        await this.validateModel();
    }

    /**
     * Registers a simulation element
     */
    public async registerElement(element: SimulationObject, elementProxy: ElementProxy): Promise<void> {
        if (element.type === SimulationObjectType.Model) {
            this.modelDefinition = new ModelDefinition(element as Model);
            this.modelDefinitionPageId = this.currentPage?.id ?? null;
            this.markModelDirty();
            return;
        }

        const modelDef = await this.ensureModelDefinition();
        if (!modelDef) {
            throw new Error('Model not initialized');
        }

        // Get default name format
        const defaultName = `New ${element.type}`;

        // Register with appropriate list manager and update name if needed
        switch (element.type) {
            case SimulationObjectType.Activity:
                if (element.name === defaultName) {
                    element.name = modelDef.activities.getNextName();
                }
                modelDef.activities.add(element as Activity);
                break;
            case SimulationObjectType.Connector:
                if (element.name === defaultName) {
                    element.name = modelDef.connectors.getNextName();
                }
                modelDef.connectors.add(element as Connector);
                break;
            case SimulationObjectType.Generator:
                if (element.name === defaultName) {
                    element.name = modelDef.generators.getNextName();
                }
                modelDef.generators.add(element as Generator);
                break;
            case SimulationObjectType.Resource:
                // model-level; the record was written to q_resources at
                // conversion (ResourceLucid.createFromConversion); the rebuild
                // derives its auto-requirement
                break;
            case SimulationObjectType.Entity:
                if (element.name === defaultName) {
                    element.name = modelDef.entities.getNextName();
                }
                modelDef.entities.add(element as Entity);
                break;
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }

        this.markModelDirty(element.id);
        await this.validateModelIfNeeded();
    }

    /**
     * Updates an existing element
     */
    public async updateElement(element: SimulationObject): Promise<void> {
        const modelDef = await this.ensureModelDefinition();
        if (!modelDef || !this.currentPage) {
            throw new Error('Model not initialized');
        }

        const elementProxy = this.findElementProxy(element.id);
        if (!elementProxy) {
            throw new Error(`No element found for ID: ${element.id}`);
        }

        // Update in appropriate list manager
        switch (element.type) {
            case SimulationObjectType.Activity:
                modelDef.activities.add(element as Activity);
                break;
            case SimulationObjectType.Connector:
                modelDef.connectors.add(element as Connector);
                break;
            case SimulationObjectType.Generator:
                modelDef.generators.add(element as Generator);
                break;
            case SimulationObjectType.Resource:
                // model-level; the record was written to q_resources at
                // conversion (ResourceLucid.createFromConversion); the rebuild
                // derives its auto-requirement
                break;
            case SimulationObjectType.Entity:
                modelDef.entities.add(element as Entity);
                break;
        }

        // Update storage. NOT for a Resource: its block is a POINTER, and the
        // pointer is written only by conversion or by an ELEMENT_UPDATE that
        // carries `resourceId` (handleDataUpdate). Writing a domain Resource
        // here would put name/capacity/geometry back onto q_data, which the
        // migration's own docblock calls out as the shape that resurrects a
        // shape-owned record.
        if (element.type !== SimulationObjectType.Resource) {
            this.storageAdapter.updateElementData(elementProxy, element);
        }

        this.markModelDirty(element.id);
        await this.validateModelIfNeeded();
    }

    /**
     * Removes an element.
     *
     * For Resources: no cascade -- a Resource block is a pointer; a resource is
     * deleted only through updateModelRoot({ resources }) (see below).
     *
     * For Entities: Cascading cleanup clears entity references in Generators,
     * Activities (sourceConfig), and CreateActions (entityTemplateId).
     */
    public async removeElement(elementId: string): Promise<void> {
        const modelDef = await this.ensureModelDefinition();
        if (!modelDef || !this.currentPage) return;

        const elementProxy = this.findElementProxy(elementId);
        if (!elementProxy) {
            this.debug.warn('No element found for ID:', elementId);
            return;
        }

        // NO Resource cascade here (Plan 2b): a Resource BLOCK is a pointer at a
        // model-level record, so removing the block un-links it and nothing
        // more. The record and every requirement that requests it survive -- a
        // resource is deleted only from the Resources tab, through
        // updateModelRoot({ resources }), which runs the cascade itself.
        // Deleting a shape used to delete the resource because the shape WAS
        // the resource; under format 2 that would destroy model data the user
        // never asked to lose (and, for the common migrated case where
        // resourceId === blockId, it fired on exactly the ids the migration
        // produced).

        // Check if this is an Entity - if so, perform cascading cleanup
        const existingEntity = modelDef.entities.get(elementId);
        if (existingEntity) {
            this.debug.debug('Entity deletion detected, performing cascading cleanup:', elementId);
            const fallbackEntityId = this.entityFallbackFor(
                modelDef.entities.getAll().filter(e => e.id !== elementId)
            );
            const affectedCount = await this.cleanupEntityReferences(elementId, fallbackEntityId, this.currentPage);
            this.debug.debug('Cleaned up entity references:', { affectedCount });
        }

        // Check if this is an Activity - if so, clean up destination references in actions
        const existingActivity = modelDef.activities.get(elementId);
        if (existingActivity) {
            this.debug.debug('Activity deletion detected, performing destination cleanup:', elementId);
            const affectedCount = await this.cleanupActivityDestinationReferences(elementId, this.currentPage);
            this.debug.debug('Cleaned up activity destination references:', { affectedCount });
        }

        // Check if this is a Generator with a linked ArrivalPattern - if so,
        // remove the pattern UNLESS another generator still references it
        // (a hand-authored share; deleting it out from under a sibling
        // generator would be worse). Read BEFORE the generator record is
        // removed below, so `arrivalPatternId` is still on hand.
        //
        // This mirrors removePatternForGenerator's "generator deleted" rule
        // (quodsi_studio's platforms/shared/panels/arrivalPatternLifecycle.ts
        // -- see its own doc comment) -- that helper was previously wired
        // ONLY into GeneratorEditor.tsx's mode-switch handler, never into
        // deletion, so a deleted PATTERN generator's pattern survived
        // forever in q_arrival_patterns. Reimplemented here rather than
        // imported: removePatternForGenerator operates on a plain-object
        // `{generators, arrivalPatterns}` projection shape, and the package
        // that exports it (quodsi_studio) is a dependency of quodsim-react
        // only -- the extension host has no dependency edge to it. The
        // invariant enforced is identical: spare a pattern still referenced
        // by another generator.
        const existingGenerator = modelDef.generators.get(elementId);
        const patternIdToCheck = existingGenerator?.arrivalPatternId;
        if (patternIdToCheck) {
            const stillReferenced = modelDef.generators.getAll().some(
                g => g.id !== elementId && g.arrivalPatternId === patternIdToCheck
            );
            if (!stillReferenced) {
                this.debug.debug('Generator deletion detected, removing orphaned ArrivalPattern:', {
                    elementId,
                    patternId: patternIdToCheck
                });
                modelDef.arrivalPatterns.remove(patternIdToCheck);
                this.storageAdapter.setArrivalPatterns(
                    this.currentPage,
                    modelDef.arrivalPatterns.getAll().map(p => p.toJSON()) as ISerializedArrivalPattern[]
                );
            }
        }

        // Check if this is a Generator with a linked ArrivalSchedule - if so,
        // remove the schedule UNLESS another generator still references it.
        // Same shape as the ArrivalPattern block above, and for the same
        // reason: this method's two callers (saveElementData's un-convert
        // path, LucidPageConversionService's re-conversion path) run with a
        // live element proxy, BEFORE the generator record is removed below,
        // so `arrivalScheduleId` is still on hand here. The rebuild-diff
        // branch in detectAndCleanupDeletedElements cannot substitute for
        // this: removeElement mutates `modelDef.generators` in place, so by
        // the next rebuild `oldModel` no longer carries the deleted
        // generator's `arrivalScheduleId` and the diff never sees it -- an
        // un-converted or re-converted SCHEDULED generator's schedule would
        // otherwise survive forever in q_arrival_schedules as silent dead
        // data (no validation rule flags an unreferenced schedule).
        //
        // A generator can carry both arrivalPatternId and arrivalScheduleId
        // at once (Lucid storage strips `undefined`, not stale defined
        // values, so a stale id can survive a mode switch) -- this block is
        // independent of the pattern block above and fires on its own.
        const scheduleIdToCheck = existingGenerator?.arrivalScheduleId;
        if (scheduleIdToCheck) {
            const stillReferencedSchedule = modelDef.generators.getAll().some(
                g => g.id !== elementId && g.arrivalScheduleId === scheduleIdToCheck
            );
            if (!stillReferencedSchedule) {
                this.debug.debug('Generator deletion detected, removing orphaned ArrivalSchedule:', {
                    elementId,
                    scheduleId: scheduleIdToCheck
                });
                modelDef.arrivalSchedules.remove(scheduleIdToCheck);
                this.storageAdapter.setArrivalSchedules(
                    this.currentPage,
                    modelDef.arrivalSchedules.getAll().map(s => s.toJSON()) as ISerializedArrivalSchedule[]
                );
            }
        }

        // Remove from all list managers
        modelDef.activities.remove(elementId);
        modelDef.connectors.remove(elementId);
        modelDef.generators.remove(elementId);
        // modelDef.resources deliberately NOT touched: resources are model-level
        // records keyed independently of the shape that draws them (see above).
        modelDef.entities.remove(elementId);
        modelDef.resourceRequirements.remove(elementId);

        // Remove from storage
        this.storageAdapter.clearElementData(elementProxy);

        this.markModelDirty(elementId);
        await this.validateModelIfNeeded();
    }

    /**
     * Validates the model only if needed
     */
    private async validateModelIfNeeded(): Promise<ValidationResult | null> {
        this.checkCacheTimeouts();

        if (!this.changeTracker.validationDirty) {
            return this.currentValidationResult;
        }

        return await this.validateModel();
    }

    /**
     * Forces a model validation
     */
    public async validateModel(): Promise<ValidationResult> {
        // Force rebuild from storage to pick up any deleted elements
        this.changeTracker.modelDefinitionDirty = true;
        const modelDef = await this.ensureModelDefinition();

        if (!modelDef) {
            this.currentValidationResult = {
                isValid: false,
                issues: [ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'no_model_initialized',
                    'No model initialized'
                )],
                summary: {
                    errorCount: 1,
                    warningCount: 0,
                    infoCount: 0
                }
            };
            this.broadcastValidationResults(this.currentValidationResult);
            return this.currentValidationResult;
        }

        const gate = evaluateValidationGate(modelDef);

        // gate.result is a ValidationResult — same shape the dashboard already consumes
        const result = gate.result;

        // Two classes of issue no ValidationRule can produce, appended here:
        //
        //  1. Resource-link rejections. A rule receives the built model and
        //     inspects it; a dangling pointer names a resource that is by
        //     definition NOT in the model, and a duplicate claim leaves no
        //     trace on the winner. Both are recorded by the page builder at
        //     build time. Message text and severity live in @quodsi/shared's
        //     resourceLinkIssues so the three hosts cannot drift.
        //  2. Migrate-on-open notices, drained (spliced) so they show once.
        const linkIssues = this.pageBuilder
            ? resourceLinkIssues(
                this.pageBuilder.getLastResourceLinkRejections(),
                new Map(modelDef.resources.getAll().map(r => [r.id, r.name])))
            : [];
        const extra = [...linkIssues, ...this.pendingNotices.splice(0)];
        if (extra.length > 0) {
            // ModelValidationService pushes its "Model validation passed
            // successfully" INFO when the RULES produce nothing (see its
            // validate(): `if (issues.length === 0) issues.push(...)`). It
            // cannot know about the issues appended here, so an otherwise-clean
            // model with a dangling pointer would render "passed successfully"
            // and a warning side by side in the same panel. Drop the success
            // note whenever we are about to add something; a clean model with
            // no appended issues keeps it.
            result.issues = [
                ...result.issues.filter(i => i.code !== 'validation_success'),
                ...extra,
            ];
            result.summary = {
                errorCount: result.issues.filter(i => i.severity === ValidationSeverity.ERROR).length,
                warningCount: result.issues.filter(i => i.severity === ValidationSeverity.WARNING).length,
                infoCount: result.issues.filter(i => i.severity === ValidationSeverity.INFO).length,
            };
            result.isValid = result.summary.errorCount === 0;
        }

        this.currentValidationResult = result;

        this.changeTracker.validationDirty = false;
        this.changeTracker.lastValidationUpdate = Date.now();

        // Broadcast validation results to React UI
        this.broadcastValidationResults(this.currentValidationResult);

        return this.currentValidationResult;
    }

    /**
     * Broadcasts validation results to React UI panels
     */
    private broadcastValidationResults(result: ValidationResult): void {
        try {
            // Result already has the correct structure with issues and summary
            this.debug.debug('Broadcasting validation results', {
                isValid: result.isValid,
                errorCount: result.summary.errorCount,
                warningCount: result.summary.warningCount,
                infoCount: result.summary.infoCount
            });

            // Send validation state changed message
            router.send('model', {
                id: `validation-${Date.now()}`,
                type: EnvelopeMessageType.MODEL_VALIDATION_RESULT,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: {
                    isValid: result.isValid,
                    issues: result.issues,
                    summary: result.summary
                }
            });
        } catch (error) {
            this.debug.error('Error broadcasting validation results:', error);
        }
    }

    // Other helper methods remain the same...
    public findElementProxy(elementId: string): ElementProxy | null {
        if (!this.currentPage) return null;
        return this.currentPage.allBlocks.get(elementId) ||
            this.currentPage.allLines.get(elementId);
    }

    public getModel(): Model | null {
        return this.modelDefinition?.model ?? null;
    }

    /**
     * Sets the current page for model definition building
     */
    public setCurrentPage(page: PageProxy): void {
        this.currentPage = page;
        // Mark model as dirty so it gets rebuilt with the new page context
        this.markModelDirty();
    }

    /**
     * The Lucid page the model manager is currently tracking. Stamped on
     * referenceData so panel writes can be tied to the page they were based on
     * (spec 2026-09-11 page guard).
     */
    public getCurrentPageId(): string | undefined {
        return this.currentPage?.id;
    }

    /**
     * Invalidates the cached ModelDefinition so it is rebuilt on next access.
     * Used by handlers that modify model data outside the normal element CRUD flow
     * (e.g., swimlane lane-to-resource conversion).
     */
    public invalidateModelCache(): void {
        this.markModelDirty();
    }

    /**
     * Appends to the one-shot notices channel drained by the next
     * validateModel() (see pendingNotices' doc comment). Used by hosts
     * outside the normal element CRUD flow that need to surface an
     * informational notice without failing validation (e.g. the paste
     * normalizer reporting a silently re-stamped item).
     */
    public pushNotices(issues: ValidationIssue[]): void {
        this.pendingNotices.push(...issues);
    }

    public async getModelDefinition(): Promise<ModelDefinition | null> {
        return await this.ensureModelDefinition();
    }

    public getCurrentValidation(): ValidationResult | null {
        return this.currentValidationResult;
    }
    /**
     * Gets an element by ID from any list manager
     */
    public getElementById(id: string): SimulationObject | undefined {
        if (!this.modelDefinition) return undefined;

        return this.modelDefinition.activities.get(id) ||
            this.modelDefinition.connectors.get(id) ||
            this.modelDefinition.generators.get(id) ||
            this.modelDefinition.resources.get(id) ||
            this.modelDefinition.resourceRequirements.get(id) ||
            this.modelDefinition.entities.get(id);
    }

    /**
     * Gets elements by type
     */
    public getElementsByType(type: SimulationObjectType): SimulationObject[] {
        if (!this.modelDefinition) return [];

        switch (type) {
            case SimulationObjectType.Activity:
                return this.modelDefinition.activities.getAll();
            case SimulationObjectType.Connector:
                return this.modelDefinition.connectors.getAll();
            case SimulationObjectType.Generator:
                return this.modelDefinition.generators.getAll();
            case SimulationObjectType.Resource:
                return this.modelDefinition.resources.getAll();
            case SimulationObjectType.ResourceRequirement:
                return this.modelDefinition.resourceRequirements.getAll();
            case SimulationObjectType.Entity:
                return this.modelDefinition.entities.getAll();
            default:
                return [];
        }
    }
    public clear(): void {
        if (this.modelDefinition && this.currentPage) {
            for (const [, block] of this.currentPage.allBlocks) {
                this.storageAdapter.clearElementData(block);
            }
            for (const [, line] of this.currentPage.allLines) {
                this.storageAdapter.clearElementData(line);
            }
        }

        this.modelDefinition = null;
        this.modelDefinitionPageId = null;
        this.currentPage = null;
        this.currentValidationResult = null;
        this.pageBuilder = null;
        this.pendingNotices = [];
        // Reset the once-per-page version/baseline gate. Without this, after a
        // model is removed and re-created on the SAME page in the same session,
        // the gate at ensureModelDefinition() still sees this page as "checked"
        // and skips ensureBaselineScenario(), so the re-created model is left
        // with no Baseline scenario.
        this.versionCheckedPageId = null;

        // Reset change tracking
        this.changeTracker = {
            modelDefinitionDirty: false,
            validationDirty: false,
            lastModelDefinitionUpdate: 0,
            lastValidationUpdate: 0,
            pendingChanges: new Set<string>()
        };
    }
    public isQuodsiModel(page: PageProxy): boolean {
        return this.storageAdapter.isQuodsiModel(page);
    }

    public getElementData<T>(element: ElementProxy): T | null {
        return this.storageAdapter.getElementData<T>(element);
    }

    public getElementType(element: ElementProxy): ElementTypeInfo | null {
        return this.storageAdapter.getElementType(element);
    }

    public setElementData(
        element: ElementProxy,
        data: any,
        type: SimulationObjectType,
        options?: { mappingSource?: import('@quodsi/lucid-shared').MappingSource }
    ): void {
        try {
            // Call storage adapter
            this.storageAdapter.setElementData(element, data, type, options);

            // Mark model as dirty
            this.markModelDirty(element.id);
        } catch (error) {
            this.debug.error('setElementData - Error', {
                elementId: element.id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    public clearElementData(element: ElementProxy): void {
        this.storageAdapter.clearElementData(element);
        this.markModelDirty(element.id);
    }
    /**
     * Removes the model from the specified page and clears manager state
     */
    public removeModelFromPage(page: PageProxy): void {
        if (!page) {
            throw new Error('No page provided for model removal');
        }

        try {
            this.storageAdapter.clearAllModelData(page)
            // Clear all internal state
            this.clear();
        } catch (error) {
            this.debug.error('Error removing model:', error);
            throw new Error(`Failed to remove model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    public getStorageAdapter(): StorageAdapter {
        return this.storageAdapter;
    }

    public isUnconvertedElement(element: ElementProxy): boolean {
        return this.getElementData(element) === null;
    }

    /**
     * Handles saving simulation element data and metadata
     */
    public async saveElementData(
        element: ElementProxy,
        data: any,
        type: SimulationObjectType,
        page: PageProxy
    ): Promise<void> {
        try {
            // Take the explicit cleared-field declaration OFF the payload before
            // anything else looks at it. The declaration says which fields the
            // writer affirmatively cleared (see @quodsi/lucid-shared's
            // clearedFields); it is metadata ABOUT the save, never model data, so
            // it must not survive into registerElement or into shape storage —
            // from where it would be published in model JSON. Payloads without a
            // declaration come back byte-identical (same object reference).
            const { data: payload, clearedFields } = takeClearedFields(data ?? {});
            data = payload;

            // Handle conversion to NONE type (removing simulation data)
            if (type === SimulationObjectType.None) {
                const existingElement = this.getElementById(element.id);
                if (existingElement) {
                    // Must await: removeElement is async (clears q_data via
                    // clearElementData + cascades). Without the await, saveElementData
                    // returns and the caller's validateModel()/selection refresh race
                    // ahead of the removal, leaving the panel showing the stale type.
                    await this.removeElement(element.id);
                }
                return;
            }

            // Handle type conversion with no data
            if (type && (!data || Object.keys(data).length === 0)) {
                await this.handleTypeConversion(element, type, page);
                return;
            }

            // Handle regular data update
            await this.handleDataUpdate(element, data, type, page, clearedFields);
        } catch (error) {
            this.debug.error('Error in saveElementData:', error);
            throw error;
        }
    }

    /**
     * Clean up every reference to a deleted State with the SHARED rule
     * (@quodsi/shared removeStateReferences) -- the same rule drawio, Visio and
     * Studio run (spec 2026-09-11 States). Covers generator initialStates,
     * activity sourceConfig.initialStates, action modifications, inheritStates,
     * splitIndexState / matchState / joinCountState and condition (recursing
     * BRANCH and LOOP), activity queueRanking (the rule sets it to undefined;
     * setElementData's whole-record write drops the key), connector condition
     * and connector actions.
     *
     * @param stateId Unique ID of the deleted state (id-keyed references)
     * @param stateName Name of the deleted state (name-keyed references)
     * @returns Number of elements rewritten
     */
    private async cleanupStateReferences(
        stateId: string,
        stateName: string,
        page: PageProxy
    ): Promise<number> {
        this.debug.debug('Cleaning up references to state:', { stateId, stateName });
        return this.applySharedReferenceCleanup(page, (c) =>
            removeStateReferences(c, stateId, stateName)
        );
    }

    /**
     * Clean up every reference to a deleted Entity, using the SHARED rule
     * (@quodsi/shared removeEntityReferences) so LucidChart deletes an entity
     * exactly the way drawio, Visio and Studio do (spec 2026-09-11):
     * - Generator.entityId, Activity.sourceConfig.entityId: re-pointed to
     *   `fallbackEntityId` (required fields)
     * - Connector.entityId: deleted (optional; absent = no entity-template
     *   restriction)
     * - CREATE entityTemplateId: null, inside BRANCH and LOOP bodies too
     *
     * @returns Number of elements rewritten
     */
    private async cleanupEntityReferences(
        entityId: string,
        fallbackEntityId: string,
        page: PageProxy
    ): Promise<number> {
        this.debug.debug('Cleaning up references to entity:', { entityId, fallbackEntityId });
        return this.applySharedReferenceCleanup(page, (c) =>
            removeEntityReferences(c, entityId, fallbackEntityId)
        );
    }

    /**
     * Run a shared reference-cleanup rule over this page's stored element data
     * and write back ONLY the elements the rule reports changed.
     *
     * Generator and Activity blocks and Connector lines are gathered with their
     * stored data, each keyed by its Lucid item id for the round trip. Changed
     * records are written with setElementData, which re-serializes the whole
     * envelope -- so a field the rule sets to `undefined` (connector entityId,
     * activity queueRanking) becomes a deleted key. Each record's stored `id`
     * field is restored on write so the rule can never rename a record.
     *
     * @returns Number of elements rewritten
     */
    private applySharedReferenceCleanup(
        page: PageProxy,
        run: (collections: SharedCleanupCollections) => SharedCleanupResult
    ): number {
        type Origin = { item: ElementProxy; type: SimulationObjectType; storedId: unknown };
        const origins = new Map<string, Origin>();
        const collections: SharedCleanupCollections = { generators: [], activities: [], connectors: [] };

        const collect = (
            item: ElementProxy,
            type: SimulationObjectType,
            into: Array<Record<string, unknown>>
        ) => {
            const data = this.storageAdapter.getElementData<Record<string, unknown>>(item);
            if (!data) return;
            origins.set(item.id, { item, type, storedId: data.id });
            into.push({ ...data, id: item.id });
        };

        for (const [, block] of page.allBlocks) {
            const type = this.storageAdapter.getElementType(block)?.type;
            if (type === SimulationObjectType.Generator) collect(block, type, collections.generators);
            else if (type === SimulationObjectType.Activity) collect(block, type, collections.activities);
        }
        for (const [, line] of page.allLines) {
            const type = this.storageAdapter.getElementType(line)?.type;
            if (type === SimulationObjectType.Connector) collect(line, type, collections.connectors);
        }

        const result = run(collections);

        const cleanedById = new Map<string, Record<string, unknown>>();
        for (const list of [result.collections.generators, result.collections.activities, result.collections.connectors]) {
            for (const record of list ?? []) cleanedById.set(String(record.id), record);
        }

        for (const id of result.changedElementIds) {
            const origin = origins.get(id);
            const cleaned = cleanedById.get(id);
            if (!origin || !cleaned) continue;
            const { id: _itemId, ...rest } = cleaned;
            const record = origin.storedId === undefined ? rest : { ...rest, id: origin.storedId };
            this.storageAdapter.setElementData(origin.item, record as { id: string }, origin.type);
            this.debug.debug('Cleaned references from element:', { id, type: origin.type });
        }

        return result.changedElementIds.length;
    }

    /**
     * The fallback for a deleted entity's required references, given the
     * entities that REMAIN. Lucid always keeps the Default Entity
     * (updateEntities re-inserts it), so an empty remainder can only come from
     * a malformed page -- treat it as "Default Entity" rather than throwing
     * mid-cascade.
     */
    private entityFallbackFor(remaining: ReadonlyArray<{ id: string }>): string {
        return pickFallbackEntityId(
            remaining.length > 0 ? remaining : [{ id: ModelDefaults.DEFAULT_ENTITY_ID }]
        );
    }

    /**
     * Clean up all action destinationId references to a deleted Activity.
     * Scans all blocks (Activities) and lines (Connectors) for SPLIT, CREATE, and JOIN
     * actions whose destinationId matches the deleted Activity ID, and nullifies them.
     */
    private async cleanupActivityDestinationReferences(
        activityId: string,
        page: PageProxy
    ): Promise<number> {
        this.debug.debug('Cleaning up destination references to activity:', activityId);
        let affectedCount = 0;

        // Process all blocks (Activities)
        for (const [, block] of page.allBlocks) {
            const elementData = this.storageAdapter.getElementData<any>(block);
            if (!elementData) continue;

            const typeInfo = this.storageAdapter.getElementType(block);
            if (typeInfo?.type !== SimulationObjectType.Activity) continue;

            let modified = false;

            if (elementData.actions && Array.isArray(elementData.actions)) {
                const result = this.cleanActionsActivityDestinationReferences(
                    elementData.actions,
                    activityId
                );
                elementData.actions = result.actions;
                if (result.modified) modified = true;
            }

            if (modified) {
                this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Activity);
                affectedCount++;
                this.debug.debug('Cleaned activity destination references from Activity:', block.id);
            }
        }

        // Process all lines (Connectors)
        for (const [, line] of page.allLines) {
            const elementData = this.storageAdapter.getElementData<any>(line);
            if (!elementData) continue;

            const lineTypeInfo = this.storageAdapter.getElementType(line);
            if (lineTypeInfo?.type !== SimulationObjectType.Connector) continue;

            let modified = false;

            if (elementData.actions && Array.isArray(elementData.actions)) {
                const result = this.cleanActionsActivityDestinationReferences(
                    elementData.actions,
                    activityId
                );
                elementData.actions = result.actions;
                if (result.modified) modified = true;
            }

            if (modified) {
                this.storageAdapter.setElementData(line, elementData, SimulationObjectType.Connector);
                affectedCount++;
                this.debug.debug('Cleaned activity destination references from Connector:', line.id);
            }
        }

        return affectedCount;
    }

    /**
     * Helper method to clean activity destination references from an actions array.
     * Handles SPLIT, CREATE, and JOIN actions that have a destinationId field.
     * Nullifies destinationId when it references the deleted activity.
     */
    private cleanActionsActivityDestinationReferences(
        actions: any[],
        deletedActivityId: string
    ): { actions: any[]; modified: boolean } {
        let modified = false;

        for (const action of actions) {
            if (!action || !action.type) continue;

            // Nullify destinationId for SPLIT, CREATE, JOIN actions referencing the deleted activity
            if (
                (action.type === ActionType.SPLIT || action.type === ActionType.CREATE || action.type === ActionType.JOIN) &&
                action.destinationId === deletedActivityId
            ) {
                this.debug.debug(`Nullifying ${action.type} action destinationId:`, deletedActivityId);
                action.destinationId = null;
                modified = true;
            }

            // Handle BRANCH action - recursively clean nested actions
            if (action.type === ActionType.BRANCH) {
                if (action.ifTrue && Array.isArray(action.ifTrue)) {
                    const result = this.cleanActionsActivityDestinationReferences(action.ifTrue, deletedActivityId);
                    action.ifTrue = result.actions;
                    if (result.modified) modified = true;
                }

                if (action.ifFalse && Array.isArray(action.ifFalse)) {
                    const result = this.cleanActionsActivityDestinationReferences(action.ifFalse, deletedActivityId);
                    action.ifFalse = result.actions;
                    if (result.modified) modified = true;
                }
            }

            // Handle LOOP action - recursively clean nested actions
            if (action.type === ActionType.LOOP && action.actions && Array.isArray(action.actions)) {
                const result = this.cleanActionsActivityDestinationReferences(action.actions, deletedActivityId);
                action.actions = result.actions;
                if (result.modified) modified = true;
            }
        }

        return { actions, modified };
    }

    /**
     * Detects elements that were present in the old model but missing from the new model
     * (i.e., deleted from the diagram via native deletion, undo, etc.) and runs the
     * existing cascading cleanup methods to remove orphaned references.
     */
    private async detectAndCleanupDeletedElements(
        oldModel: ModelDefinition,
        newModel: ModelDefinition,
        page: PageProxy
    ): Promise<void> {
        // Detect deleted Activities → clean destinationId references
        const newActivityIds = new Set(newModel.activities.getAll().map(a => a.id));
        for (const oldActivity of oldModel.activities.getAll()) {
            if (!newActivityIds.has(oldActivity.id)) {
                this.debug.debug('Detected deleted activity during rebuild:', oldActivity.id);
                await this.cleanupActivityDestinationReferences(oldActivity.id, page);
            }
        }

        // Detect deleted Entities → clean generator/activity/action references
        const newEntities = newModel.entities.getAll();
        const newEntityIds = new Set(newEntities.map(e => e.id));
        const rebuildFallbackEntityId = this.entityFallbackFor(newEntities);
        for (const oldEntity of oldModel.entities.getAll()) {
            if (!newEntityIds.has(oldEntity.id)) {
                this.debug.debug('Detected deleted entity during rebuild:', oldEntity.id);
                await this.cleanupEntityReferences(oldEntity.id, rebuildFallbackEntityId, page);
            }
        }

        // NO deleted-Resource branch (Plan 2b): resources no longer come from
        // the canvas, so a rebuild diff cannot mean "the user deleted a
        // resource" -- it means a block stopped claiming one. The only path
        // that removes a resource is updateModelRoot({ resources }), which runs
        // the requirement/action cascade itself before writing q_resources.

        // Detect deleted Generators → remove an orphaned ArrivalPattern.
        //
        // Native canvas deletion of a generator never reaches removeElement()
        // (see its doc comment above: only the panel un-convert path and
        // LucidPageConversionService call it, and it early-returns once the
        // shape proxy is already gone). This is the only hook that observes
        // a canvas-deleted generator, via the rebuild diff. oldModel is the
        // pre-rebuild ModelDefinition, still holding the deleted generator's
        // arrivalPatternId, so read-before-removal falls out for free.
        //
        // Spares a pattern still referenced by another generator in
        // newModel (a hand-authored share) -- same invariant removeElement
        // enforces for its own callers.
        const newGeneratorIds = new Set(newModel.generators.getAll().map(g => g.id));
        for (const oldGenerator of oldModel.generators.getAll()) {
            if (newGeneratorIds.has(oldGenerator.id)) continue;

            const patternId = oldGenerator.arrivalPatternId;
            if (!patternId) continue;

            this.debug.debug('Detected deleted generator during rebuild:', oldGenerator.id);

            const stillReferenced = newModel.generators.getAll().some(
                g => g.arrivalPatternId === patternId
            );
            if (stillReferenced) continue;

            this.debug.debug('Removing orphaned ArrivalPattern after generator deletion:', {
                generatorId: oldGenerator.id,
                patternId
            });
            newModel.arrivalPatterns.remove(patternId);
            this.storageAdapter.setArrivalPatterns(
                page,
                newModel.arrivalPatterns.getAll().map(p => p.toJSON()) as ISerializedArrivalPattern[]
            );
        }

        // Detect deleted Generators → remove an orphaned ArrivalSchedule.
        //
        // Mirrors the ArrivalPattern branch above exactly, for the same
        // reason: native canvas deletion of a generator never reaches
        // removeElement() (only the panel un-convert path and
        // LucidPageConversionService call it, and it early-returns once the
        // shape proxy is already gone). This rebuild diff is the only hook
        // that observes a canvas-deleted generator. oldModel is the
        // pre-rebuild ModelDefinition, still holding the deleted generator's
        // arrivalScheduleId, so read-before-removal falls out for free.
        //
        // Spares a schedule still referenced by another generator in
        // newModel (a hand-authored share) -- evaluated against newModel
        // (the survivors), not oldModel, which would still show the
        // deleted generator referencing its own schedule and never clean
        // up anything.
        for (const oldGenerator of oldModel.generators.getAll()) {
            if (newGeneratorIds.has(oldGenerator.id)) continue;

            const scheduleId = oldGenerator.arrivalScheduleId;
            if (!scheduleId) continue;

            this.debug.debug('Detected deleted generator during rebuild:', oldGenerator.id);

            const stillReferenced = newModel.generators.getAll().some(
                g => g.arrivalScheduleId === scheduleId
            );
            if (stillReferenced) continue;

            this.debug.debug('Removing orphaned ArrivalSchedule after generator deletion:', {
                generatorId: oldGenerator.id,
                scheduleId
            });
            newModel.arrivalSchedules.remove(scheduleId);
            this.storageAdapter.setArrivalSchedules(
                page,
                newModel.arrivalSchedules.getAll().map(s => s.toJSON()) as ISerializedArrivalSchedule[]
            );
        }
    }

    /**
     * Updates the states array for the model
     */
    public async updateStates(states: ISerializedState[], page: PageProxy): Promise<void> {
        this.debug.debug('updateStates - Start', {
            statesCount: states.length,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Get current states to detect deletions
            const currentStates = this.storageAdapter.getStates(page) || [];
            const newStateIds = new Set(states.map(s => s.id));

            // Find deleted states
            const deletedStates = currentStates.filter(s => !newStateIds.has(s.id));

            // Clean up references for each deleted state
            let totalAffected = 0;
            for (const deletedState of deletedStates) {
                this.debug.debug('Detected deleted state, cleaning up references:', {
                    stateId: deletedState.id,
                    stateName: deletedState.name
                });
                const affectedCount = await this.cleanupStateReferences(
                    deletedState.id,
                    deletedState.name,
                    page
                );
                totalAffected += affectedCount;
            }

            // Save states to page storage
            this.storageAdapter.setStates(page, states);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.debug('updateStates - Complete with cascading cleanup', {
                deletedCount: deletedStates.length,
                affectedElements: totalAffected
            });
        } catch (error) {
            this.debug.error('Error in updateStates:', error);
            throw error;
        }
    }

    /**
     * Updates the entities array for the model.
     *
     * Entities are stored as a page-level list (q_entities), mirroring updateStates.
     * Deleting an entity cascades reference cleanup through the shared rule (see
     * cleanupEntityReferences): required references re-point to the Default Entity,
     * optional ones are cleared.
     *
     * The default entity (ModelDefaults.DEFAULT_ENTITY_ID) is load-bearing: every new
     * Generator defaults its entityId to it, and the model must always have at least one
     * entity. The UI prevents its deletion; here we re-assert that invariant as defense in
     * depth so a malformed payload cannot drop it.
     */
    public async updateEntities(entities: ISerializedEntity[], page: PageProxy): Promise<void> {
        this.debug.debug('updateEntities - Start', {
            entitiesCount: entities.length,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Defense in depth: ensure the default entity is always present.
            let entitiesToSave = entities;
            if (!entities.some(e => e.id === ModelDefaults.DEFAULT_ENTITY_ID)) {
                this.debug.debug('Default entity missing from payload; re-inserting it');
                entitiesToSave = [
                    {
                        id: ModelDefaults.DEFAULT_ENTITY_ID,
                        name: ModelDefaults.DEFAULT_ENTITY_NAME
                    },
                    ...entities
                ];
            }

            // Get current entities to detect deletions
            const currentEntities = this.storageAdapter.getEntities(page) || [];
            const newEntityIds = new Set(entitiesToSave.map(e => e.id));

            // Find deleted entities
            const deletedEntities = currentEntities.filter(e => !newEntityIds.has(e.id));

            // Clean up references for each deleted entity. entitiesToSave always
            // holds the Default Entity (re-inserted above), so the fallback is it.
            const fallbackEntityId = this.entityFallbackFor(entitiesToSave);
            let totalAffected = 0;
            for (const deletedEntity of deletedEntities) {
                this.debug.debug('Detected deleted entity, cleaning up references:', {
                    entityId: deletedEntity.id,
                    entityName: deletedEntity.name
                });
                const affectedCount = await this.cleanupEntityReferences(
                    deletedEntity.id,
                    fallbackEntityId,
                    page
                );
                totalAffected += affectedCount;
            }

            // Save entities to page storage
            this.storageAdapter.setEntities(page, entitiesToSave);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.debug('updateEntities - Complete with cascading cleanup', {
                deletedCount: deletedEntities.length,
                affectedElements: totalAffected
            });
        } catch (error) {
            this.debug.error('Error in updateEntities:', error);
            throw error;
        }
    }

    /**
     * A resource was deleted from the Resources tab (spec 2026-09-11 resource
     * delete cleanup). Runs the SHARED rule drawio, Visio and Studio run:
     *   1. prune the stored requirements (@quodsi/shared removeResourceReferences):
     *      a requirement loses only what depended on the resource and is deleted
     *      only when it can no longer be met;
     *   2. clean every step that used a deleted requirement -- INCLUDING the
     *      resource's own requirement, which storage format 2 never stores, so
     *      the old stored-list cascade never saw it -- through
     *      applySharedReferenceCleanup over stored activity, generator and
     *      connector data, with the user's Seize/Release choice.
     */
    private applyResourceDeleteRule(resourceId: string, page: PageProxy, options: ReferenceCleanupOptions): void {
        const stored = this.storageAdapter.getResourceRequirements(page) || [];
        const pruned = removeResourceReferences(
            {
                resourceRequirements: stored as unknown as Array<Record<string, unknown>>,
                // Already written by updateModelRoot, so the deleted resource is
                // absent. A stored override of a SURVIVING resource that this
                // delete makes unmeetable is dropped (the resource reverts to its
                // plain own requirement, re-derived at build), but its id is never
                // treated as deleted, so that resource's steps keep working.
                resources: this.storageAdapter.getResources(page) as unknown as Array<Record<string, unknown>>,
            },
            resourceId,
            options
        );
        const kept = pruned.collections.resourceRequirements ?? [];
        if (kept.length !== stored.length || pruned.prunedRequirementIds.length > 0) {
            this.storageAdapter.setResourceRequirements(page, kept as unknown as ISerializedResourceRequirement[]);
        }
        this.applySharedReferenceCleanup(page, (c) =>
            removeRequirementReferences(c, pruned.deletedRequirementIds, options)
        );
    }

    /**
     * Persist a model-ROOT patch. The patch arrives WHOLE from
     * LucidModelStateAccessor.updateModel and is dispatched per key here --
     * the single place in this path that is allowed to know key names.
     *
     * An unrecognised key THROWS. It must never be dropped silently: that is
     * the bug LucidEmbedModelAccessor once shipped, where branching on
     * `patch.scenarios` alone made an `{ arrivalPatterns }` patch vanish with
     * no error and no warning.
     *
     * Unknown keys are checked BEFORE anything is written, so a mixed patch
     * like `{ arrivalPatterns, bogus }` throws without persisting the
     * recognised keys either -- all-or-nothing, not a partial write followed
     * by a loud failure.
     *
     * Mirrors its siblings (updateStates / updateEntities /
     * updateResourceRequirements / updateScenarios): every one of them calls
     * `markModelDirty()` after writing, and this does too, so the cached
     * ModelDefinition is never left stale for a caller that reads it without
     * also calling `validateModel()` first.
     *
     * Model settings (spec 2026-09-12 §2): the Model editor's Basic and Levers
     * tabs send the model's own fields here. They MERGE into the page's q_data
     * (StorageAdapter.updateElementData), written first, and are refused --
     * before any key of the patch is written -- when the page has no model
     * data. A blank name becomes the page title. No registerElement: the
     * cached ModelDefinition is invalidated by markModelDirty like every other
     * key, and a registerElement swap would reset the rebuild-diff baseline.
     * `states` routes through updateStates, which runs the shared state-delete
     * rule over stored shape data.
     */
    public async updateModelRoot(patch: Record<string, unknown>, page: PageProxy, options: ReferenceCleanupOptions = {}): Promise<void> {
        this.debug.debug('updateModelRoot - Start', { keys: Object.keys(patch) });

        const knownKeys = [
            ...MODEL_SETTINGS_KEYS,
            'arrivalPatterns', 'arrivalSchedules', 'workSchedules', 'states', 'entities', 'resources', 'resourceRequirements',
        ];
        const unhandled = Object.keys(patch).filter(key => !knownKeys.includes(key));
        if (unhandled.length > 0) {
            throw new Error(
                `updateModelRoot: no persistence path for model-root key(s): ${unhandled.join(', ')}. ` +
                'The patch was NOT persisted. Add a case above rather than ignoring it.'
            );
        }

        const settingsKeys = Object.keys(patch).filter(key => MODEL_SETTINGS_KEYS.includes(key));
        if (settingsKeys.length > 0 && this.storageAdapter.getElementData(page) == null) {
            throw new Error('updateModelRoot: this page has no model data; convert it before editing settings.');
        }

        if (settingsKeys.length > 0) {
            const settings: Record<string, unknown> = {};
            for (const key of settingsKeys) {
                settings[key] = patch[key];
            }
            if ('name' in settings && isBlankName(settings.name)) {
                settings.name = blankModelNameFallback(page);
            }
            this.storageAdapter.updateElementData(page, { id: page.id, ...settings });
        }

        if ('arrivalPatterns' in patch) {
            this.storageAdapter.setArrivalPatterns(
                page,
                patch.arrivalPatterns as ISerializedArrivalPattern[]
            );
        }

        if ('arrivalSchedules' in patch) {
            this.storageAdapter.setArrivalSchedules(
                page,
                patch.arrivalSchedules as ISerializedArrivalSchedule[]
            );
        }

        // Work schedules (spec 2026-08-27 §3.1). Written whole, exactly like
        // the two lists above: WorkSchedulesEditor, WorkScheduleModal and
        // CapacitySourcePicker's "New schedule" all send the ENTIRE
        // `workSchedules` list, never a delta.
        if ('workSchedules' in patch) {
            this.storageAdapter.setWorkSchedules(
                page,
                patch.workSchedules as ISerializedWorkSchedule[]
            );
        }

        // States (spec 2026-09-12): the Model editor's States tab writes the
        // WHOLE list. Before entities, which reference no states.
        if ('states' in patch) {
            await this.updateStates(patch.states as ISerializedState[], page);
        }

        // Entities (spec 2026-09-11): Lucid's Entities tab mounts the shared
        // EntitiesEditor, which writes the WHOLE list. Routed through
        // updateEntities, never a bare setEntities: that is the one place that
        // re-inserts the Default Entity and runs the shared delete rule over
        // stored shape data. Entities and resources reference nothing of each
        // other, so this position is arbitrary -- but fixed.
        if ('entities' in patch) {
            await this.updateEntities(patch.entities as ISerializedEntity[], page);
        }

        // `resources` before `resourceRequirements`: a delete patch's cascade
        // (below) removes the deleted resource's auto/custom requirements
        // from storage first, so if the same patch also carries
        // `resourceRequirements`, updateResourceRequirements's own
        // before/after diff has nothing further to clean up.
        if ('resources' in patch) {
            const next = (patch.resources as Array<Record<string, unknown>>)
                .map(stripTransientResourceMarkers)
                .map(({ shapeLabel: _label, ...rest }) => rest) as unknown as StoredResourceRecord[];
            const before = this.storageAdapter.getResources(page);
            const nextIds = new Set(next.map(r => String(r.id)));
            const removed = before.filter(r => !nextIds.has(String(r.id))).map(r => String(r.id));
            this.storageAdapter.setResources(page, next);
            // Host-side cascade, and the ONLY one: since Plan 2b Task 5 neither
            // removeElement nor the rebuild diff cascades on a resource (a
            // Resource block is just a pointer), so deleting a resource from the
            // shared Resources tab is the single path that has to clean up the
            // requirements and actions that referenced it.
            for (const id of removed) {
                this.applyResourceDeleteRule(id, page, options);
            }
        }

        if ('resourceRequirements' in patch) {
            // Read AFTER the `resources` branch above, so a patch that creates
            // or renames a resource filters against the list it just stored.
            const resourcesById = new Map(this.storageAdapter.getResources(page).map(r => [String(r.id), r]));
            const incoming = patch.resourceRequirements as ISerializedResourceRequirement[];
            await this.updateResourceRequirements(
                incoming.filter(r => !isPlainAutoRequirement(r, resourcesById.get(String(r.id)))),
                page,
                options
            );
        }

        this.markModelDirty();
    }

    /**
     * Build the plain-data projection the shared panels read.
     *
     * Page resolution only -- the ModelDefinition -> ModelRootProjection
     * mapping lives in `projectModelRoot` (./modelRootProjection), so
     * quodsim-react's Vitest suite can run the REAL producer against the REAL
     * consumer (quodsi_studio's ScheduleModal) without importing this class,
     * which drags in lucid-extension-sdk and the messaging barrel. See that
     * module's header for the missing-field bug the split was introduced to
     * make testable.
     */
    public async buildModelRootProjection(page: PageProxy): Promise<ModelRootProjection> {
        // Honor `page` -- getModelDefinition()/ensureModelDefinition() read
        // `this.currentPage`, not any parameter, so a caller building the
        // projection for a page other than the currently-tracked one used to
        // silently get the WRONG page's data (updateModelRoot, right above,
        // already honors its own `page` argument for the write side -- this
        // brings the read side in line). Only switches (and force-rebuilds
        // via setCurrentPage's markModelDirty) when the pages actually
        // differ, so the common same-page call stays on the cached
        // ModelDefinition.
        if (this.currentPage?.id !== page.id) {
            this.setCurrentPage(page);
        }
        // Stamp the page the snapshot was built for (spec 2026-09-11 page
        // guard): writes based on it echo this back as basedOnPageId.
        return { ...projectModelRoot(await this.getModelDefinition()), pageId: page.id };
    }

    /**
     * Updates the resource requirements array for the model
     */
    public async updateResourceRequirements(requirements: ISerializedResourceRequirement[], page: PageProxy, options: ReferenceCleanupOptions = {}): Promise<void> {
        this.debug.debug('updateResourceRequirements - Start', {
            requirementsCount: requirements.length,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Get current requirements to detect deletions
            const currentReqs = this.storageAdapter.getResourceRequirements(page) || [];
            const newReqIds = new Set(requirements.map(r => r.id));

            // Find deleted requirements
            const deletedReqs = currentReqs.filter(r => !newReqIds.has(r.id));

            // Never clean a LIVE resource's id. A stored record whose id is a
            // live resource id is that resource's own requirement (or an
            // override of it), re-derived at build while the resource exists.
            // A plain-auto filter (isPlainAutoRequirement, @quodsi/shared) strips
            // a live resource's own derived requirement from the incoming list
            // without the user deleting anything -- the hazard
            // ResourceStorageMigration.ts:171-195 describes -- and cleaning it
            // would flag or remove steps the delete dialog never counted.
            const liveResourceIds = new Set(this.storageAdapter.getResources(page).map(r => String(r.id)));
            const deletedIds = deletedReqs.map(r => r.id).filter(id => !liveResourceIds.has(String(id)));

            // The shared rule (spec 2026-09-11 resource delete cleanup), with the
            // user's Seize/Release choice.
            if (deletedIds.length > 0) {
                this.applySharedReferenceCleanup(page, (c) =>
                    removeRequirementReferences(c, deletedIds, options)
                );
            }

            // Save resource requirements to page storage
            this.storageAdapter.setResourceRequirements(page, requirements);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.debug('updateResourceRequirements - Complete with cascading cleanup', {
                deletedCount: deletedReqs.length
            });
        } catch (error) {
            this.debug.error('Error in updateResourceRequirements:', error);
            throw error;
        }
    }

    /**
     * Ensures a Baseline scenario exists for the given page.
     * If no scenario has isBaseline === true, creates one and persists it.
     * Also migrates any legacy zero-UUID baseline ids (predates the
     * database) to fresh UUIDs so SyncScenarios won't collide on the
     * server-side global PK. Called once per page load during model
     * definition initialization.
     */
    private ensureBaselineScenario(page: PageProxy): void {
        const scenarios = this.storageAdapter.getScenarios(page);
        const { scenarios: updated, baselineAdded, migrated } = ensureBaselineScenario(scenarios);
        if (baselineAdded || migrated) {
            if (baselineAdded) {
                this.debug.debug('ensureBaselineScenario - Creating Baseline scenario');
            }
            if (migrated) {
                this.debug.debug('ensureBaselineScenario - Migrated legacy zero-UUID baseline to a real UUID');
            }
            this.storageAdapter.setScenarios(page, updated);

            // Push the new/migrated Baseline to quodsi_api now, so a Run (or the
            // Scenarios list) doesn't depend on panel-init sync timing. Fire-and-forget:
            // never block model build on a network call; the run path also syncs.
            void this.syncBaselineAfterCreate(page, updated);
        }
    }

    /**
     * Fire-and-forget sync of scenarios right after the Baseline is auto-created
     * or migrated. Errors are logged only -- the sync-before-run guarantee covers
     * the Run path regardless. Applies any server id substitution back to storage.
     */
    private async syncBaselineAfterCreate(
        page: PageProxy,
        scenarios: ISerializedScenario[],
    ): Promise<void> {
        try {
            const client = ModelManager.getClient();
            const documentProxy = new DocumentProxy(client);
            const { substitutions } = await upsertModel(client, {
                documentId: documentProxy.id,
                pageId: page.id,
                modelName: await canonicalModelName(this),
            });
            if (substitutions.size > 0) {
                const updated = scenarios.map(s =>
                    substitutions.has(s.id) ? { ...s, id: substitutions.get(s.id)! } : s
                );
                this.storageAdapter.setScenarios(page, updated);
                this.debug.debug('Baseline synced + id substitution applied after create');
            } else {
                this.debug.debug('Baseline synced after create');
            }
        } catch (err) {
            this.debug.error('Baseline post-create sync failed (non-fatal):', err);
        }
    }

    /**
     * Updates the scenarios array for the model.
     * Scenarios have no cross-references to clean up, so this is a simple save.
     */
    public async updateScenarios(scenarios: ISerializedScenario[], page: PageProxy): Promise<void> {
        this.debug.debug('updateScenarios - Start', {
            scenariosCount: scenarios.length,
            pageId: page.id,
        });

        try {
            this.storageAdapter.setScenarios(page, scenarios);
            this.markModelDirty();

            this.debug.debug('updateScenarios - Complete');
        } catch (error) {
            this.debug.error('Error in updateScenarios:', error);
            throw error;
        }
    }

    /**
     * Defensive cleanup: Filters out orphaned state modifications from Generator data.
     * This handles edge cases where state modifications reference deleted states that
     * weren't properly cleaned up by cascading deletion (timing issues, different code paths,
     * or imported/loaded data with orphaned references).
     *
     * @param elementData The element data being saved
     * @param type The simulation object type
     * @param page The page to get valid states from
     * @returns Object with cleaned data and whether any modifications were removed
     */
    private cleanOrphanedStateModifications(
        elementData: any,
        type: SimulationObjectType,
        page: PageProxy
    ): { data: any; cleaned: boolean } {
        let cleaned = false;

        if (type === SimulationObjectType.Generator) {
            // Wire-cleanup Phase B2 Task 5/9: EntitySourceConfig dissolved --
            // initialStates is flat on the stored generator now (not nested
            // under generationConfig); StateModification.stateUniqueId ->
            // stateId (Task 6).
            const modifications = elementData.initialStates;
            if (modifications && Array.isArray(modifications) && modifications.length > 0) {
                // Get valid state IDs from storage
                const states = this.storageAdapter.getStates(page) || [];
                const validStateIds = new Set(states.map(s => s.id));

                const originalLength = modifications.length;
                elementData.initialStates = modifications.filter(
                    (mod: any) => validStateIds.has(mod.stateId)
                );

                if (elementData.initialStates.length !== originalLength) {
                    cleaned = true;
                    this.debug.debug('Cleaned orphaned state modifications from Generator', {
                        elementId: elementData.id,
                        originalCount: originalLength,
                        cleanedCount: elementData.initialStates.length,
                        removedCount: originalLength - elementData.initialStates.length
                    });
                }
            }
        }

        return { data: elementData, cleaned };
    }

    /**
     * Handles converting an element to a new simulation type
     * Uses LucidElementFactory for proper element creation with all required fields
     */
    private async handleTypeConversion(
        element: ElementProxy,
        newType: SimulationObjectType,
        page: PageProxy
    ): Promise<void> {
        this.debug.debug('handleTypeConversion - Start', {
            elementId: element.id,
            newType: newType,
            elementType: element.constructor.name
        });

        // Ensure model exists
        if (!this.getModel()) {
            const model = {
                id: page.id,
                name: page.getTitle() || 'New Model',
                type: SimulationObjectType.Model
            };
            await this.initializeModel(model as Model, page);
        }

        try {
            // Log element details for debugging
            this.debug.debug('Element details before conversion:', {
                elementId: element.id,
                elementConstructor: element.constructor.name,
                isLineProxy: element instanceof LineProxy,
                isBlockProxy: element instanceof BlockProxy,
                hasGetEndpoint1: 'getEndpoint1' in element,
                hasGetEndpoint2: 'getEndpoint2' in element
            });

            // Validate element type matches target type
            if (newType === SimulationObjectType.Connector && !(element instanceof LineProxy)) {
                throw new Error(`Cannot convert element ${element.id} to Connector: element is not a LineProxy (found ${element.constructor.name})`);
            }
            if (newType !== SimulationObjectType.Connector && !(element instanceof BlockProxy)) {
                throw new Error(`Cannot convert element ${element.id} to ${newType}: element is not a BlockProxy (found ${element.constructor.name})`);
            }

            // Use LucidElementFactory to create proper platform object
            const factory = new LucidElementFactory(this.storageAdapter);
            factory.setLogging(false);

            this.debug.debug('Creating platform object using factory');
            const platformObject = factory.createPlatformObject(
                element,
                newType,
                true, // isConversion flag
                'user' // manual map/convert via UI → tag as user-created
            );

            // Get the simulation object
            const simObject = platformObject.getSimulationObject();

            this.debug.debug('Created simulation object:', {
                id: simObject.id,
                type: simObject.type,
                name: simObject.name
            });

            // For Connectors, calculate and set probability based on outgoing connections
            if (newType === SimulationObjectType.Connector && element instanceof LineProxy) {
                const weight = this.calculateConnectorProbability(element as LineProxy, page);
                (simObject as Connector).weight = weight;

                this.debug.debug('Set connector probability:', {
                    connectorId: simObject.id,
                    probability: weight
                });

                // Update storage with the probability
                platformObject.updateFromPlatform();
            }

            // Register with model manager
            this.debug.debug('Registering element with model manager');
            await this.registerElement(simObject, element);

            // Auto-convert connected lines to Connectors for Activity/Generator conversions
            if (
                element instanceof BlockProxy &&
                (newType === SimulationObjectType.Activity || newType === SimulationObjectType.Generator)
            ) {
                await this.autoConvertConnectedLines(element, page);
            }

            this.debug.debug('handleTypeConversion - Completed successfully');

        } catch (error) {
            this.debug.error('handleTypeConversion - Error:', error);
            throw error;
        }
    }

    /**
     * Auto-converts connected lines to Connectors when a block is converted to Activity or Generator.
     * Only converts lines where the other endpoint is already mapped to an Activity or Generator.
     */
    private async autoConvertConnectedLines(
        block: BlockProxy,
        page: PageProxy
    ): Promise<void> {
        for (const [lineId, line] of page.allLines) {
            try {
                // Skip lines already mapped to a simulation type
                if (this.storageAdapter.getElementType(line)) {
                    continue;
                }

                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                // Both endpoints must be connected to blocks
                if (!endpoint1?.connection || !endpoint2?.connection) {
                    continue;
                }

                // Determine if this line connects to the just-converted block
                const ep1Id = endpoint1.connection.id;
                const ep2Id = endpoint2.connection.id;

                let otherBlockId: string;
                if (ep1Id === block.id) {
                    otherBlockId = ep2Id;
                } else if (ep2Id === block.id) {
                    otherBlockId = ep1Id;
                } else {
                    // Line doesn't connect to this block
                    continue;
                }

                // Check if the other block is mapped to Activity or Generator
                const otherBlock = page.allBlocks.get(otherBlockId);
                if (!otherBlock) {
                    continue;
                }
                const otherTypeInfo = this.storageAdapter.getElementType(otherBlock);
                if (
                    !otherTypeInfo ||
                    (otherTypeInfo.type !== SimulationObjectType.Activity &&
                     otherTypeInfo.type !== SimulationObjectType.Generator)
                ) {
                    continue;
                }

                // Convert the line to a Connector
                this.debug.debug('Auto-converting line to Connector', { lineId });

                const factory = new LucidElementFactory(this.storageAdapter);
                factory.setLogging(false);

                const platformObject = factory.createPlatformObject(
                    line,
                    SimulationObjectType.Connector,
                    true
                );

                const connector = platformObject.getSimulationObject() as Connector;
                connector.sourceId = ep1Id;
                connector.targetId = ep2Id;
                connector.weight = 1.0;

                platformObject.updateFromPlatform();
                await this.registerElement(connector, line);

            } catch (error) {
                this.debug.error(`Failed to auto-convert line ${lineId}:`, error);
                // Continue with other lines rather than failing the whole operation
            }
        }
    }

    /**
     * Calculates connector probability based on outgoing connections from source
     * Probability = 1.0 / number of outgoing connections from source
     */
    private calculateConnectorProbability(line: LineProxy, page: PageProxy): number {
        try {
            const endpoint1 = line.getEndpoint1();
            if (!endpoint1?.connection) {
                this.debug.debug('No source connection, defaulting probability to 1.0');
                return 1.0;
            }

            const sourceId = endpoint1.connection.id;

            // Count outgoing connections from this source
            let outgoingCount = 0;
            for (const [, otherLine] of page.allLines) {
                const otherEndpoint1 = otherLine.getEndpoint1();
                if (otherEndpoint1?.connection?.id === sourceId) {
                    outgoingCount++;
                }
            }

            const probability = outgoingCount > 0 ? 1.0 / outgoingCount : 1.0;

            this.debug.debug('Calculated connector probability:', {
                sourceId,
                outgoingCount,
                probability
            });

            return probability;

        } catch (error) {
            this.debug.error('Error calculating connector probability:', error);
            return 1.0; // Default to 1.0 on error
        }
    }

    /**
     * Handles updating element data
     */
    private async handleDataUpdate(
        element: ElementProxy,
        updateData: any,
        type: SimulationObjectType,
        page: PageProxy,
        /** Fields the writer explicitly declared cleared; already stripped from
         *  updateData by saveElementData. Empty for every silent/partial save. */
        clearedFields: readonly string[] = []
    ): Promise<void> {
        this.debug.debug('handleDataUpdate - Start', {
            elementId: element.id,
            updateDataType: typeof updateData,
            simulationObjectType: type,
            pageId: page.id
        });

        try {
            // Check and log model existence
            const existingModel = this.getModel();
            if (!existingModel) {
                this.debug.debug('No existing model found. Creating new model.');
                const model = {
                    id: page.id,
                    name: page.getTitle() || 'New Model',
                    type: SimulationObjectType.Model
                };
                this.debug.debug('Initializing new model:', model);
                await this.initializeModel(model as Model, page);
            } else {
                this.debug.debug('Existing model found:', {
                    modelId: existingModel.id,
                    modelName: existingModel.name
                });
            }

            // Determine element name
            //
            // A Model's element IS the page (elementOpsHandler passes
            // currentPage), and getDefaultElementName has no page branch -- it
            // returned 'Unnamed Connector'. A blank model name takes the page
            // title instead (spec 2026-09-12 decision 7).
            const isModel = type === SimulationObjectType.Model;
            const elementName = isModel
                ? blankModelNameFallback(page)
                : this.getDefaultElementName(element);
            // Fetched once, up front, so both the name resolution below and the
            // create-vs-update branch further down (~line 2229) see the same
            // snapshot of storage.
            const existingElementData = this.storageAdapter.getElementData<any>(element);
            const hasExplicitName = updateData && typeof updateData === 'object' && !Array.isArray(updateData) && 'name' in updateData;
            this.debug.debug('Element name determination:', {
                defaultElementName: elementName,
                updateDataContainsName: hasExplicitName,
                hasExistingStoredName: existingElementData?.name !== undefined
            });

            // Resolve the name to persist.
            //
            // - An explicit `name` in the patch always wins (a falsy value, e.g.
            //   `''`, still falls back to the canvas label -- this preserves the
            //   pre-existing `|| elementName` behaviour, not a new rule).
            // - A partial patch that OMITS `name` must not reset it: absence of a
            //   key in a partial patch means "leave this field unchanged", so it
            //   falls back to whatever name is already in storage.
            // - Only when there is no prior stored name at all -- i.e. this is the
            //   element's first save / creation -- does it default to the canvas
            //   label, matching StorageAdapter.setElementData's create path (see
            //   the getElementData(element) != null branch below).
            // - A Model's blank (or whitespace) explicit name takes the page title.
            const explicitName = hasExplicitName ? (updateData as { name?: unknown }).name : undefined;
            const resolvedName: string = hasExplicitName
                ? (isModel
                    ? (isBlankName(explicitName) ? elementName : (explicitName as string))
                    : ((explicitName as string) || elementName))
                : (existingElementData?.name || elementName);

            // Prepare element data.
            //
            // A Resource BLOCK is a POINTER (Plan 2b storage format 2), not the
            // resource: the record lives in the page-level q_resources list and
            // is edited through updateModelRoot({ resources }). The only domain
            // key the block owns is `resourceId`, so a Resource-typed update
            // writes exactly that and nothing else -- no synthesized `name`, no
            // capacity, no geometry. (Left to the generic path below, the name
            // resolution alone would put a `name` back next to `resourceId`,
            // which is the merge shape ResourceStorageMigration's docblock
            // warns re-classifies a pointer block as a legacy record.)
            let elementData: any = type === SimulationObjectType.Resource
                ? {
                    id: element.id,
                    type: type,
                    ...(updateData && (updateData as any).resourceId !== undefined
                        ? { resourceId: (updateData as any).resourceId }
                        : {})
                }
                : {
                    id: element.id,
                    type: type,
                    ...updateData,
                    name: resolvedName
                };

            this.debug.debug('Prepared Element Data:', {
                id: elementData.id,
                type: elementData.type,
                name: elementData.name,
                additionalKeys: Object.keys(elementData).filter(k => !['id', 'type', 'name'].includes(k))
            });

            // Defensive cleanup: Filter orphaned state modifications for Generators
            const { data: cleanedData, cleaned } = this.cleanOrphanedStateModifications(elementData, type, page);
            if (cleaned) {
                elementData = cleanedData;
                this.debug.debug('Element data cleaned of orphaned state modifications');
            }

            // Register and save
            this.debug.debug('Registering element');
            this.registerElement(elementData, element);

            this.debug.debug('Setting element data', {
                elementId: element.id,
                type
            });
            // A field edit is a partial update: when the element already has stored
            // data, merge into it so platform metadata (mappingSource) and stored
            // fields the panel did not send (e.g. width/height) are preserved.
            // Fall back to a full create when there is no prior q_data.
            //
            // Activities and Generators each carry one field the merge cannot
            // round-trip: Activity.queueRanking and Generator.arrivalPatternId,
            // where absence of the key IS the value ("first come, first served";
            // "no linked pattern"). The panel's clear arrives here as a MISSING
            // key — JSON transport drops undefined — so it must be spelled out
            // as a deletion or the stored value survives a clear.
            //
            // Spelled out by the WRITER, never inferred from the missing key: most
            // Activity payloads that reach here are partial (ConnectorsEditor sends
            // connectType + financialProperties only; handleElementConvert can send
            // a bare stub) and would otherwise read as a clear. Only a declaration
            // deletes. See activityStorageRemoveKeys / generatorStorageRemoveKeys for
            // the full story; this is the path a panel save actually walks (the
            // panel never reaches ActivityLucid.updateFromPlatform).
            const removeKeys = type === SimulationObjectType.Activity
                ? activityStorageRemoveKeys(clearedFields)
                : type === SimulationObjectType.Generator
                ? generatorStorageRemoveKeys(clearedFields)
                : type === SimulationObjectType.Resource
                ? resourceStorageRemoveKeys(clearedFields)
                : undefined;

            if (existingElementData != null) {
                this.storageAdapter.updateElementData(element, elementData, { removeKeys });
                this.markModelDirty(element.id);
            } else {
                this.setElementData(
                    element,
                    elementData,
                    type
                );
            }

            this.debug.debug('handleDataUpdate - Completed Successfully');
        } catch (error) {
            this.debug.error('Error in handleDataUpdate:', error);
            throw error;
        }
    }

    /**
     * Gets default name for an element based on its type
     */
    private getDefaultElementName(element: ElementProxy): string {
        if (element instanceof BlockProxy) {
            // Check for text areas on the block
            if (element.textAreas && element.textAreas.size > 0) {
                for (const text of element.textAreas.values()) {
                    if (text && text.trim()) {
                        return text.trim();
                    }
                }
            }
            // If no text found, use class name
            const className = element.getClassName() || 'Block';
            return `Block ${className}`;
        }
        return 'Unnamed Connector';
    }

    public async getModelStructure(): Promise<ModelStructure | undefined> {
        const modelDef = await this.getModelDefinition();
        if (modelDef) {
            return ModelStructureBuilder.buildModelStructure(modelDef);
        }
        return undefined;
    }
}