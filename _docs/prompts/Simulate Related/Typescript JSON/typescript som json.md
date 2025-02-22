I have a "Validate" button defined in my React app that when the user clicks on it, a message is sent from quodsi_react to quodsi_editor_extension.  ModelPanel receives the messages and handles it in the handleValidateRequest method

Here is the full path to ModelPanel

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts

```typescript
async handleValidateRequest(): Promise<void> {
    const validationResult = await this.modelManager.validateModel();

    // Send separate validation result message for explicit validation requests
    this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
}
```





# Code Request
My long term goal is to enhance ModelPanel.handleValidateRequest by calling to an endpoint after validateModel where the payload of that endpoint is json version of ModelDefinition.

The first task in reach that goal is to create the code needed that transforms an instance of ModelDefinition into json.

It is important to understand that the json format will be used to initialize a complex discrete event simulation (DES).  The DES engine is expecting a certain format and will not work if the format is different from what the DES engine expects.

The Quodsi application is early in its design and also early in finding product market fit.  It is fully anticipated that ModelDefinition will change over time.

Please read over all the referenced code files.  Please do not code yet as I want to simply discuss the potential design first.  What are some other questions you might have?