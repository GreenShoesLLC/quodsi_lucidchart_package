import { BlockAnalysis } from "./BlockAnalysis";
import { Connector } from "./elements/Connector";


export interface ProcessAnalysisResult {
    connections: Map<string, Connector>;
    blockAnalysis: Map<string, BlockAnalysis>;
}