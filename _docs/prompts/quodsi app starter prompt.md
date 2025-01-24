extension is the entry found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts

it instantiates ModelPanel
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts

ModelPanel calls initializeModelManager.  initializeModelManager has this code:

        if (!currentPage || !this.storageAdapter.isQuodsiModel(currentPage)) {
            console.log('[ModelPanel] Page is not a Quodsi model, skipping initialization');
            return;
        }

ModelPanel will trigger the React app to fire up index.tsx found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\index.tsx

index.tsx loads up QuodsiApp component found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\QuodsiApp.tsx

QuodsiApp has this code:

sendMessage(MessageTypes.REACT_APP_READY)

which uses ExtensionMessaging to send REACT_APP_READY to the parent extension app.

ExtensionMessaging found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\utils\ExtensionMessaging.ts

ModelPanel receives the REACT_APP_READY message and executes handleModelSpecificReactReady