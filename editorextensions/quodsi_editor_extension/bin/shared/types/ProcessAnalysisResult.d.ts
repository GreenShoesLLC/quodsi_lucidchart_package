import { BlockAnalysis } from "./BlockAnalysis";
import { ConnectionInfo } from "./ConnectionInfo";
/**
 * Tracking structure for process analysis
 */
export interface ProcessAnalysisResult {
    connections: Map<string, ConnectionInfo>;
    blockAnalysis: Map<string, BlockAnalysis>;
}
