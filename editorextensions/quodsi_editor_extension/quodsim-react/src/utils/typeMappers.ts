import { SimComponentType } from "@quodsi/shared";
import { SimulationObjectType } from "@quodsi/shared";

export const typeMappers = {
    mapSimulationTypeToComponentType: (
        type: SimulationObjectType
    ): SimComponentType => {
        switch (type) {
            case SimulationObjectType.Activity:
                return SimComponentType.ACTIVITY;
            case SimulationObjectType.Connector:
                return SimComponentType.CONNECTOR;
            case SimulationObjectType.Entity:
                return SimComponentType.ENTITY;
            case SimulationObjectType.Generator:
                return SimComponentType.GENERATOR;
            case SimulationObjectType.Resource:
                return SimComponentType.RESOURCE;
            case SimulationObjectType.Model:
                return SimComponentType.MODEL;
            case SimulationObjectType.None:
                return SimComponentType.NONE;
            default:
                throw new Error(`Unknown simulation type: ${type}`);
        }
    },

    mapComponentTypeToSimulationType: (
        componentType: SimComponentType
    ): SimulationObjectType => {
        switch (componentType) {
            case SimComponentType.ACTIVITY:
                return SimulationObjectType.Activity;
            case SimComponentType.CONNECTOR:
                return SimulationObjectType.Connector;
            case SimComponentType.ENTITY:
                return SimulationObjectType.Entity;
            case SimComponentType.GENERATOR:
                return SimulationObjectType.Generator;
            case SimComponentType.RESOURCE:
                return SimulationObjectType.Resource;
            case SimComponentType.MODEL:
                return SimulationObjectType.Model;
            case SimComponentType.NONE:
                return SimulationObjectType.None;
            default:
                throw new Error(`Unknown component type: ${componentType}`);
        }
    }
};