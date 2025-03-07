


# No npm start script found
"No npm start script found in C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react."


# Identity Management
Any other companies similar to Quodsi you could introduce us to for networking purposes?

"The app your building is purely an extension, correct? The Identity management I've seen happen with extensions is with this flow:
User installs extension from Lucid marketplace
User attempts to open/use extension in Lucid 
Extension triggers OAuth flow provided in Extension API
User is navigated to third-party webpage where they are prompted to login and authenticate"



# Workaround for oauth flow
where do we add the Lucid modal prompt code?  

const menu = new Menu(client);
client.registerAction("import", async () => {
    // Temporary workaround. You must call oauthXhr once before performDataAction will work
    const triggerOauth = await client.oauthXhr("lucid", {
        url: "https://api.lucid.co/folders/search",
        headers: {
            "Lucid-Api-Version": "1",
            "Content-Type": "application/json",
        },
        data: "{}",
        method: "POST",
    });
    const result = await client.performDataAction({
        dataConnectorName: "data-connector-1",
        actionName: "Import",
        actionData: { message: "ImportFolders" },
        asynchronous: true,
    });
    console.log(result);
});

menu.addMenuItem({
    label: "Import",
    action: "import",
    menuType: MenuType.Main,
});

# use google sheets or excel as database