One of the most significant features that must work to perfection is the ability for a user to add Simulation Component data to Page, Shapes and Lines in Lucidchart.  Programmatically, Page, Shapes and Lines are ElementProxy.

I would like to heavily focus on the user interface that is supporting a user managing simulation component data on Page, Shapes and Lines.  

Please review the code in the Project Knowledge.  I added a folder_structure.md, project-overview.md and message-passing-docs.md files to the Project Knowledge.

Quodsi is a LucidChart extension package.  Extension packages can add a "Context Panel", "Right Panel", right click context menu items and a level Menus.  Quodsi primarily is using the "Right Panel".  It is important to note that panels are limited to a width of 264 but consumes all vertical space available.

Suppose a user started with one of their existing LucidChart diagram that has many shapes, lines on a page.  Assume also that a user has added "Quodsi" application to their LucidChart account.  When a Extension package is part of a user account, when the document is loaded, the extension.ts code is executed.  Notice in extension.ts:

const rightPanel = new RightPanel(client);

where:

export class RightPanel extends Panel {

    constructor(client: EditorClient) {
        // console.log("RightPanel constructor called");
        // by default, this constructor is called when the extension is loaded and only once.
        super(client, {
            title: 'Quodsi Right Panel',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: RightPanel.icon,
        });

notice location: PanelLocation.RightDock, which sets Quodsi's RightPanel to be the right panel in the LucidChart.

Also notice: iconUrl: RightPanel.icon, which places that icon inside of LucidChart UI.

The project implements a clever strategy of utilizing LucidChart's native shape data storage capabilities to create a persistent simulation model. This approach leverages LucidChart's built-in `shapeData` API to store custom simulation data within the diagram elements themselves.  Please see the file "data-storage-strategy.md" and "data-storage-requirements.md" for additional details.

The first thing the user would want to do is "convert" or map the page to the simulation component type of Model.

In the current design, if the current selection is NOT a shape or line, then the selection is consider is the page.  If the page is selected, and the user clicks on the RightPanel.icon, then a 264 by full height window is opened.  the "url: 'quodsim-react/index.html'," property of right panel will render Quodsi's React application in this window.  Please see App.tsx for the code that launches.

Please do the following:
Review my current code in Project Knowledge.
Reply with a markdown file that describes the Quodsi application startup code
Reply with a markdown file the process of converting an existing LucidChart document to a Model.




Please notice that in extension.ts:
selectionChangedCallback
viewport.hookSelection(selectionChangedCallback);

Criteria:



