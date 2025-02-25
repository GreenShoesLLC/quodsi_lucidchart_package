 File upload

Menu items can be specified as prompting a file upload. To do this, you first register a named action for receiving the uploaded file content using EditorClient.registerFileUploadAction. This callback will receive an array of files that were selected by the user, including the file names and content as text. Optionally, the content may also be included as a Uint8Array if your menu item requests that binary be included:
TypeScriptconst client = new EditorClient();
const menu = new Menu(client);

client.registerFileUploadAction('logFileContent', (files: FileUploadData[]) => {
    console.log(files);
    for (const file of files) {
        console.log(file.fileName);
        console.log(file.text);
        if (file.binary) {
            console.log(file.binary);
        }
    }
});

menu.addDropdownMenuItem({
    label: 'Upload file for processing',
    file: {
        action: 'logFileContent',
        accept: 'text/csv',
        singleFileOnly: true,
        binary: true,
    },
});
