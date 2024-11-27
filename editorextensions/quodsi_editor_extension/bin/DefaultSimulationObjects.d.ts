import { Activity } from "./models/activity";
import { Connector } from "./models/connector";
import { Entity } from "./models/entity";
import { Resource } from "./models/resource";
import { Scenario } from "./models/scenario";
import { Experiment } from "./models/experiment";
import { Generator } from "./models/generator";
export declare class DefaultSimulationObjects {
    static initialActivity(): Activity;
    static initialConnector(): Connector;
    static initialEntity(): Entity;
    static initialResource(): Resource;
    static initialScenario(): Scenario;
    static initialExperiment(): Experiment;
    static initialGenerator(): Generator;
}
