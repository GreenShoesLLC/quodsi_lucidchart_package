import { ModelStructure, ModelElement } from '@quodsi/shared';
import { ModelDefinition, SimulationObjectType } from '@quodsi/shared';

export class ModelStructureBuilder {
    public static buildModelStructure(modelData: ModelDefinition): ModelStructure {
        console.group('ModelStructureBuilder.buildModelStructure');

        if (!modelData) {
            console.warn('Empty model data');
            console.groupEnd();
            return { elements: [], hierarchy: {} };
        }

        const elements: ModelElement[] = [];
        const hierarchy: Record<string, string[]> = {};

        // Create root node for ModelDefinition
        const rootElement: ModelElement = {
            id: modelData.id,
            name: modelData.name,
            type: SimulationObjectType.Model,
            hasChildren: true,
            children: []
        };
        elements.push(rootElement);

        // Create nodes for each manager type
        const managerTypes = [
            { id: 'activities', name: 'Activities', type: SimulationObjectType.Activity, items: modelData.activities },
            { id: 'connectors', name: 'Connectors', type: SimulationObjectType.Connector, items: modelData.connectors },
            { id: 'resources', name: 'Resources', type: SimulationObjectType.Resource, items: modelData.resources },
            { id: 'generators', name: 'Generators', type: SimulationObjectType.Generator, items: modelData.generators },
            { id: 'entities', name: 'Entities', type: SimulationObjectType.Entity, items: modelData.entities }
        ];

        // Add manager nodes and their items
        managerTypes.forEach(manager => {
            const managerId = `${modelData.id}_${manager.id}`;

            const managerElement: ModelElement = {
                id: managerId,
                name: manager.name,
                type: manager.type,
                hasChildren: manager.items.getAll().length > 0,
                children: []
            };

            elements.push(managerElement);
            hierarchy[modelData.id] = hierarchy[modelData.id] || [];
            hierarchy[modelData.id].push(managerId);

            // Add individual items under each manager
            manager.items.getAll().forEach(item => {
                const itemElement: ModelElement = {
                    id: item.id,
                    name: item.name,
                    type: manager.type,
                    hasChildren: false,
                    children: []
                };
                elements.push(itemElement);
                hierarchy[managerId] = hierarchy[managerId] || [];
                hierarchy[managerId].push(item.id);
            });
        });

        console.debug('Build complete:', { totalElements: elements.length });
        console.groupEnd();
        return { elements, hierarchy };
    }
}