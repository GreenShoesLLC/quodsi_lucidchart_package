import {
    EnvelopeBase,
    EnvelopeMessageType,
    ConversionPreviewData,
    ConversionApplyRequest,
    ElementMappingOverride,
    SimulationObjectType
} from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, DocumentProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { LucidPageAnalyzer } from '../../../services/conversion/LucidPageAnalyzer';
import { LucidPageConversionService } from '../../../services/conversion/LucidPageConversionService';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';
import { SelectionHandler } from './selection';
import { canonicalModelName, pushModelDefinitionSnapshot } from '../../sync/scenarioSync';

// Simple ID generator for extension context
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Handler for conversion preview operations (analyze, preview, apply)
 */
export class ConversionPreviewHandler {
    private static logger = ExtensionDebugService.forComponent('ConversionPreviewHandler');

    /**
     * Handle messages related to conversion preview operations
     *
     * @param msg The received message
     * @returns Whether the message was handled
     */
    public static handleMessage(msg: EnvelopeBase): boolean {
        switch (msg.type) {
            case EnvelopeMessageType.CONVERSION_PREVIEW_REQUEST:
                ConversionPreviewHandler.handlePreviewRequest(msg)
                    .catch(err => ConversionPreviewHandler.logger.error('Error handling CONVERSION_PREVIEW_REQUEST:', err));
                return true;

            case EnvelopeMessageType.CONVERSION_APPLY:
                ConversionPreviewHandler.handleApplyConversion(msg)
                    .catch(err => ConversionPreviewHandler.logger.error('Error handling CONVERSION_APPLY:', err));
                return true;

            default:
                return false;
        }
    }

    /**
     * Handle conversion preview request - analyze the page and return preview data
     */
    private static async handlePreviewRequest(msg: EnvelopeBase): Promise<void> {
        try {
            ConversionPreviewHandler.logger.log('Conversion preview requested');

            const client = ModelManager.getClient();
            const viewport = new Viewport(client);
            const currentPage = viewport.getCurrentPage();

            if (!currentPage) {
                throw new Error('No current page available');
            }

            // Create required services
            const storageAdapter = new StorageAdapter();
            const pageAnalyzer = new LucidPageAnalyzer();

            // Analyze the page for preview
            const previewData = pageAnalyzer.analyzePageForPreview(currentPage, storageAdapter);

            ConversionPreviewHandler.logger.log('Preview analysis complete:', {
                pageId: previewData.pageId,
                isAlreadyConverted: previewData.isAlreadyConverted,
                totalMappings: previewData.mappings.length,
                summary: previewData.summary
            });

            // Send preview result
            router.send('model', {
                id: msg.id,
                type: EnvelopeMessageType.CONVERSION_PREVIEW_RESULT,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: previewData
            });

        } catch (error) {
            ConversionPreviewHandler.logger.error('Error generating conversion preview:', error);

            // Send error response
            router.send('model', {
                id: msg.id,
                type: EnvelopeMessageType.CONVERSION_PREVIEW_RESULT,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: {
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }

    /**
     * Handle apply conversion with user overrides
     */
    private static async handleApplyConversion(msg: EnvelopeBase): Promise<void> {
        try {
            const data = msg.data as ConversionApplyRequest;

            ConversionPreviewHandler.logger.log('Applying conversion with overrides:', {
                pageId: data.pageId,
                overrideCount: data.overrides?.length ?? 0
            });

            const client = ModelManager.getClient();
            const modelManager = ModelManager.getInstance();
            const viewport = new Viewport(client);
            const currentPage = viewport.getCurrentPage();
            const document = new DocumentProxy(client);

            if (!currentPage) {
                throw new Error('No current page available');
            }

            // Create required services
            const storageAdapter = new StorageAdapter();
            const lucidElementFactory = new LucidElementFactory(storageAdapter);
            const pageConversionService = new LucidPageConversionService(
                modelManager,
                lucidElementFactory,
                storageAdapter
            );
            const pageAnalyzer = new LucidPageAnalyzer();

            // Get the preview data to start with proposed mappings
            const previewData = pageAnalyzer.analyzePageForPreview(currentPage, storageAdapter);

            // Build the final mappings and track user overrides
            const finalMappings = new Map<string, SimulationObjectType | null>();
            const userOverrideIds = new Set<string>();

            if (previewData.isAlreadyConverted) {
                // For already-converted pages, only apply override mappings
                // Leave non-overridden elements unchanged
                if (data.overrides && data.overrides.length > 0) {
                    for (const override of data.overrides) {
                        finalMappings.set(override.elementId, override.targetType);
                        userOverrideIds.add(override.elementId);
                    }
                }
                ConversionPreviewHandler.logger.log('Already converted page - applying overrides only:', {
                    overrideCount: finalMappings.size,
                    userOverrideCount: userOverrideIds.size
                });
            } else {
                // For new conversions, start with all proposed mappings
                for (const mapping of previewData.mappings) {
                    finalMappings.set(mapping.elementId, mapping.proposedType);
                }

                // Apply user overrides
                if (data.overrides && data.overrides.length > 0) {
                    for (const override of data.overrides) {
                        finalMappings.set(override.elementId, override.targetType);
                        userOverrideIds.add(override.elementId);
                    }
                }

                ConversionPreviewHandler.logger.log('New conversion - full mappings prepared:', {
                    totalMappings: finalMappings.size,
                    userOverrideCount: userOverrideIds.size
                });
            }

            // Perform conversion with the final mappings and user override tracking
            const result = await pageConversionService.convertPageWithMappings(
                currentPage,
                finalMappings,
                userOverrideIds
            );

            ConversionPreviewHandler.logger.log('Conversion complete:', result);

            // Send success response
            router.send('model', {
                id: msg.id,
                type: EnvelopeMessageType.CONVERSION_APPLY_RESULT,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: {
                    success: true,
                    result
                }
            });

            // Send context refresh messages using SelectionHandler for proper modelItemData & referenceData
            Promise.resolve().then(async () => {
                const documentId = document.id;
                const title = document.getTitle() || 'Untitled Document';

                // Send MODEL_CONTEXT message
                router.send('model', {
                    id: generateId(),
                    type: EnvelopeMessageType.MODEL_CONTEXT,
                    source: 'host',
                    target: 'model-iframe',
                    version: '1.0',
                    data: {
                        documentId,
                        title,
                        pageId: currentPage.id,
                        isQuodsiModel: true,
                        hasValidModel: true
                    }
                });

                // Use SelectionHandler to send proper SELECTION_CHANGED with modelItemData & referenceData
                SelectionHandler.setDocumentContext(
                    documentId,
                    currentPage.id,
                    title,
                    true
                );

                ConversionPreviewHandler.logger.log('Sent context refresh messages after conversion');

                // Register model in quodsi_api database (fire-and-forget)
                const modelName = await canonicalModelName(modelManager);
                LucidDataActionUtility.performDataAction(client, {
                    dataConnectorName: 'quodsi_api_data_connector',
                    actionName: 'UpsertModel',
                    actionData: {
                        documentId,
                        pageId: currentPage.id,
                        modelName
                    },
                    asynchronous: false
                }).then(() => {
                    ConversionPreviewHandler.logger.log('Model registered in database after conversion');
                    // Seed the model-definition snapshot so a freshly-converted model
                    // has a lever/study catalog before the user ever clicks Studies.
                    // Best-effort; must not block or throw into the convert flow.
                    void pushModelDefinitionSnapshot(client, {
                        documentId,
                        pageId: currentPage.id,
                        modelName,
                    }).catch(err => {
                        ConversionPreviewHandler.logger.error('Failed to seed model snapshot after conversion:', err);
                    });
                }).catch(err => {
                    ConversionPreviewHandler.logger.error('Failed to register model in database:', err);
                });
            }).catch(error => {
                ConversionPreviewHandler.logger.error('Error sending context refresh messages:', error);
            });

        } catch (error) {
            ConversionPreviewHandler.logger.error('Error applying conversion:', error);

            // Send error response
            router.send('model', {
                id: msg.id,
                type: EnvelopeMessageType.CONVERSION_APPLY_RESULT,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }
}
