 Lines

Creating a line
To create a line, you specify each endpoint as either a free-floating endpoint (just x/y coordinates), a block-connected endpoint, or a line-connected endpoint:
TypeScriptfunction connectBlocks(block1: BlockProxy, block2: BlockProxy) {
    block1.getPage().addLine({
        endpoint1: {
            connection: block1,
            linkX: 0.5,
            linkY: 1,
        },
        endpoint2: {
            connection: block2,
            linkX: 0.5,
            linkY: 0,
        },
    });
}

Text on lines
Any line can have any number of text areas on it. Each text area consists of its text, a position along the line (from 0 to 1), and a number specifying which side of the line the text should appear on:
TypeScriptfunction dumpLineText(page: PageProxy) {
    for (const [lineId, line] of page.lines) {
        for (const [key, text] of line.textAreas) {
            const position = line.getTextAreaPosition(key);
            if (position) {
                if (position.side == 0) {
                    console.log('Text on line: ' + text);
                } else if (position.side == -1) {
                    console.log('Text to left of line: ' + text);
                } else if (position.side == 1) {
                    console.log('Text to right of line: ' + text);
                }
            }
        }
    }
}

You can add or remove text with addTextArea and deleteTextArea. As with blocks, you can read and write text style with textStyles.