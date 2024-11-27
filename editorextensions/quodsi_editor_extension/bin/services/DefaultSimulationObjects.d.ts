import { Activity } from "../shared/types/elements/activity";
import { Connector } from "../shared/types/elements/connector";
import { Entity } from "../shared/types/elements/entity";
import { Resource } from "../shared/types/elements/resource";
import { Scenario } from "../shared/types/elements/scenario";
import { Experiment } from "../shared/types/elements/experiment";
import { Generator } from "../shared/types/elements/generator";
export declare class DefaultSimulationObjects {
    static initialActivity(): Activity;
    static initialConnector(): Connector;
    static initialEntity(): Entity;
    static initialResource(): Resource;
    static initialScenario(): Scenario;
    static initialExperiment(): Experiment;
    static initialGenerator(): Generator;
}
