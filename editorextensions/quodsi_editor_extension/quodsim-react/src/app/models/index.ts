export enum SimulationObjectType {
  Entity = "Entity",
  Activity = "Activity",
  Connector = "Connector",
}

export interface SimulationObject {
  id: string;
  name: string;
}

export interface Entity extends SimulationObject {
  type: SimulationObjectType.Entity;
}

export interface Activity extends SimulationObject {
  type: SimulationObjectType.Activity;
  capacity: number;
}

export interface Connector extends SimulationObject {
  type: SimulationObjectType.Connector;
  fromActivityId: string;
  toActivityId?: string;
}
