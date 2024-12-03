import { PageProxy, BlockProxy, LineProxy } from 'lucid-extension-sdk';
import { QuodsiShapeData } from '../../utilis/QuodsiShapeData';
import { DefaultSimulationObjects } from '../DefaultSimulationObjects';
import { SimulationObjectType } from '../../shared/types/elements/SimulationObjectType';

export class ConvertPageToModel {
    /**
     * Converts a PageProxy instance into a model representation.
     * For each block on the page, it creates lists based on the number of incoming and outgoing lines.
     * It also categorizes lines based on their connection to blocks.
     * @param page - The PageProxy instance to convert.
     */
    public convert(page: PageProxy): void {
        const outgoingOnlyBlocks: BlockProxy[] = [];
        const incomingOnlyBlocks: BlockProxy[] = [];
        const bothIncomingAndOutgoingBlocks: BlockProxy[] = [];
        const noLinesBlocks: BlockProxy[] = [];

        const soloOutgoingLines: LineProxy[] = [];
        const manyOutgoingLines: LineProxy[] = [];

        // First pass: categorize blocks
        for (const [blockId, block] of page.allBlocks) {
            let incomingLinesCount = 0;
            let outgoingLinesCount = 0;

            // Get all connected lines for the block
            const connectedLines: LineProxy[] = block.getConnectedLines();

            // Iterate over each connected line to determine its direction
            connectedLines.forEach(line => {
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (endpoint2.connection && endpoint2.connection.id === blockId) {
                    incomingLinesCount++;
                }

                if (endpoint1.connection && endpoint1.connection.id === blockId) {
                    outgoingLinesCount++;
                }
            });

            // Categorize the block based on its connections
            if (incomingLinesCount > 0 && outgoingLinesCount > 0) {
                bothIncomingAndOutgoingBlocks.push(block);
            } else if (incomingLinesCount > 0) {
                incomingOnlyBlocks.push(block);
            } else if (outgoingLinesCount > 0) {
                outgoingOnlyBlocks.push(block);
            } else {
                noLinesBlocks.push(block);
            }
        }

        // Second pass: categorize lines
        for (const line of page.allLines.values()) {
            const endpoint1 = line.getEndpoint1();
            const sourceBlockId = endpoint1.connection ? endpoint1.connection.id : null;

            if (sourceBlockId) {
                const sourceBlock = page.allBlocks.get(sourceBlockId);

                if (sourceBlock) {
                    const outgoingLinesFromSource = sourceBlock.getConnectedLines().filter(l => {
                        const ep1 = l.getEndpoint1();
                        return ep1.connection && ep1.connection.id === sourceBlockId;
                    });

                    if (outgoingLinesFromSource.length === 1) {
                        soloOutgoingLines.push(line);
                    } else if (outgoingLinesFromSource.length > 1) {
                        manyOutgoingLines.push(line);
                    }
                }
            }
        }

        // Process each block list using dedicated methods
        this.processOutgoingOnlyBlocks(outgoingOnlyBlocks);
        this.processIncomingOnlyBlocks(incomingOnlyBlocks);
        this.processBothIncomingAndOutgoingBlocks(bothIncomingAndOutgoingBlocks);
        this.processNoLinesBlocks(noLinesBlocks);

        // Process each line list using dedicated methods
        this.processSoloOutgoingLines(soloOutgoingLines);
        this.processManyOutgoingLines(manyOutgoingLines);
    }

    private processOutgoingOnlyBlocks(blocks: BlockProxy[]): void {
        blocks.forEach(block => {
            this.printBlockTextAreas(block, 'Outgoing Only Block');
            this.addInitialActivityDataToBlock(block);
        });
    }

    private processIncomingOnlyBlocks(blocks: BlockProxy[]): void {
        blocks.forEach(block => {
            this.printBlockTextAreas(block, 'Incoming Only Block');
            this.addInitialActivityDataToBlock(block);
        });
    }

    private processBothIncomingAndOutgoingBlocks(blocks: BlockProxy[]): void {
        blocks.forEach(block => {
            this.printBlockTextAreas(block, 'Both Incoming and Outgoing Block');
            this.addInitialActivityDataToBlock(block);
        });
    }

    private addInitialActivityDataToBlock(block: BlockProxy): void {
        const shapeDataHandler = new QuodsiShapeData(block);

        // Retrieve the content of the first text area, if it exists
        const firstTextAreaContent = block.textAreas.size > 0 ? Array.from(block.textAreas.values())[0] : 'DefaultActivityName';

        // Create the initial activity data with the name set to the text area content
        const activityData = DefaultSimulationObjects.initialActivity();
        activityData.name = firstTextAreaContent;

        shapeDataHandler.setObjectTypeAndData(SimulationObjectType.Activity, activityData);
        console.log(`Initial activity data set for Block ID: ${block.id} with name: ${activityData.name}`);
    }

    /**
     * Placeholder method to process blocks with no lines.
     */
    private processNoLinesBlocks(blocks: BlockProxy[]): void {
        blocks.forEach(block => this.printBlockTextAreas(block, 'No Lines Block'));
    }

    private processSoloOutgoingLines(lines: LineProxy[]): void {
        lines.forEach(line => {
            this.printLineDetails(line, 'Solo Outgoing Line');
            this.addInitialConnectorDataToLine(line);
        });
    }

    private addInitialConnectorDataToLine(line: LineProxy, probability: number = 1.0): void {
        const shapeDataHandler = new QuodsiShapeData(line);
        const connectorData = DefaultSimulationObjects.initialConnector();
        // Update the probability in the connector data
        connectorData.probability = probability;
        shapeDataHandler.setObjectTypeAndData(SimulationObjectType.Connector, connectorData);
        console.log(`Initial connector data set for Line ID: ${line.id} with probability: ${probability}`);
    }

    private processManyOutgoingLines(lines: LineProxy[]): void {
        // Calculate probability as 1 divided by number of lines
        const probability = 1.0 / lines.length;

        lines.forEach(line => {
            this.printLineDetails(line, 'Many Outgoing Lines');
            // Pass the calculated probability to addInitialConnectorDataToLine
            this.addInitialConnectorDataToLine(line, probability);
        });
    }

    /**
     * Prints the text areas of a given block.
     * @param block - The BlockProxy instance to print.
     * @param blockType - A description of the block type (e.g., 'Outgoing Only Block').
     */
    private printBlockTextAreas(block: BlockProxy, blockType: string): void {
        console.log(`${blockType} - Block ID: ${block.id}`);
        for (const [textAreaName, textAreaContent] of block.textAreas) {
            console.log(`TextArea Name: ${textAreaName}, Content: ${textAreaContent}`);
        }
    }

    /**
     * Prints the details of a given line.
     * @param line - The LineProxy instance to print.
     * @param lineType - A description of the line type (e.g., 'Solo Outgoing Line').
     */
    private printLineDetails(line: LineProxy, lineType: string): void {
        console.log(`${lineType} - Line ID: ${line.id}`);
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();
        console.log('Endpoint 1:', endpoint1);
        console.log('Endpoint 2:', endpoint2);
    }
}
