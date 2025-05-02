  User->>LucidChart: Clicks Model Panel icon
    LucidChart->>Extension: Initiates panel display
    Extension->>ModelPanel: show()
    ModelPanel->>ModelPanel: initializeModelManager()
    ModelPanel->>ModelPanel: sendAuthMessage(STATUS_REQUEST)
    ModelPanel->>React: Loads iframe with React app
    React->>MSALInit: Initialize MSAL
    MSALInit->>AuthProvider: Provide authentication context
    AuthProvider-->>React: Authentication state
    React->>ModelPanel: Sends REACT_APP_READY (with auth data)
    ModelPanel->>ModelPanel: handleReactReady()
    ModelPanel->>React: Sends AUTH message (PANEL_INIT, type: model)
    ModelPanel->>React: Sends AUTH message (STATUS_RESPONSE)
    ModelPanel->>ModelPanel: checks for current model
    ModelPanel->>React: Sends SELECTION_CHANGED message


User->>LucidChart: Clicks Model Panel icon 
ModelPanel->>React: Loads iframe with React app
React->>MSALInit: Initialize MSAL
MSALInit->>AuthProvider: Provide authentication context
AuthProvider-->>React: Authentication state
React->>ModelPanel: Sends REACT_APP_READY (with auth data)

ModelPanel handles REACT_APP_READY

if REACT_APP_READY contains authenticated = true then 

this.sendAuthMessage(AuthActionType.PANEL_INIT)
await this.handleSelectionChange(selectedItems);

if REACT_APP_READY contains authenticated = false then
we need to send a message to react to show either a message
that says the user must log in or, show the sign in page.