import { ModelStructure, ModelElement } from '@quodsi/shared';
import { MessagePayloads, MessageTypes } from '@quodsi/shared';
import { SelectionState } from '@quodsi/shared';

export class ModelMessageBuilder {
    /**
     * Builds the model structure message payload to send to the React app
     */
    public static buildInitialStateMessage(data: any): MessagePayloads[MessageTypes.INITIAL_STATE] {
        return {
            pageId: data.pageId,
            documentId: data.documentId,
            isModel: data.isModel,
            canConvert: data.canConvert,
            modelData: {
                elements: this.buildModelStructure(data.modelData).elements,
                hierarchy: this.buildModelStructure(data.modelData).hierarchy
            },
            selectionState: data.selectionState
        };
    }

    private static buildModelStructure(modelData: any): ModelStructure {
        const elements: ModelElement[] = [];
        const hierarchy: Record<string, string[]> = {};

        if (!modelData) return { elements, hierarchy };

        const buildElementTree = (element: any, parentId?: string) => {
            const modelElement: ModelElement = {
                id: element.id,
                name: element.name || 'Unnamed Element',
                type: element.type,
                hasChildren: false,
                children: []
            };

            if (parentId) {
                hierarchy[parentId] = hierarchy[parentId] || [];
                hierarchy[parentId].push(element.id);
            }

            if (element.children?.length) {
                modelElement.hasChildren = true;
                modelElement.children = element.children.map((child: any) => 
                    buildElementTree(child, element.id)
                );
            }

            elements.push(modelElement);
            return modelElement;
        };

        if (Array.isArray(modelData)) {
            modelData.forEach(element => buildElementTree(element));
        } else {
            buildElementTree(modelData);
        }

        return { elements, hierarchy };
    }
}