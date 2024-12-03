import { Activity } from "../shared/types/elements/Activity";
import { Connector } from "../shared/types/elements/Connector";
import { Entity } from "../shared/types/elements/Entity";
import { Resource } from "../shared/types/elements/Resource";
import { Scenario } from "../shared/types/elements/Scenario";
import { Experiment } from "../shared/types/elements/Experiment";
import { Generator } from "../shared/types/elements/Generator";
export declare class DefaultSimulationObjects {
    static initialActivity(): Activity;
    static initialConnector(): Connector;
    static initialEntity(): Entity;
    static initialResource(): Resource;
    static initialScenario(): Scenario;
    static initialExperiment(): Experiment;
    static initialGenerator(): Generator;
}
