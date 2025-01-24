 Package settings















Extension packages can specify settings to be configured by the end user who installs the package. The user will be prompted to enter values for these setting during installation. The values of these settings are shared for all users of each installation of your package (typically all users on the Lucid account).
Setting entries in manifest.json
The package manifest file can optionally include an array of settings, each of which has the following fields:
nameA string uniquely identifying this setting within this packagelabelA human-readable string label for this setting, which will be used in the default UI for configuring your packagedescriptionA longer description for the setting, to be displayed alongside the label where appropriatetypeThe type of the setting; currently the only legal value is "string"defaultOptional: A default value. If set, the user will not be prompted to fill this field out at installation time
For example, if you wanted to allow the user to be able to configure a subdomain of your app to connect to for data, you might add the following to your manifest:
JSON{
    // ...

    "settings": [{
        "name": "subdomain",
        "label": "MyApp Subdomain",
        "description": "The subdomain of your instance of MyApp. If you log in to MyApp at company.example.com, you should enter 'company' for your MyApp Subdomain.",
        "type": "string"
    }]
}

You can then use the user provided value for this setting within the OAuth provider section or the data connector URL. For instance, in the example below, {{=@subdomain}} will be replaced with the value the user provided for the subdomain package setting when the extension attempts to use OAuth:
JSON{
    // ...

    "oauthProviders": [
        {
            "name": "provider",
            "title": "Provider",
            "authorizationUrl": "https://{{=@subdomain}}.example.com/-/oauth_authorize",
            "tokenUrl": "https://{{=@subdomain}}.example.com/-/oauth_token",
            "scopes": ["default"],
            "domainWhitelist": ["https://{{=@subdomain}}.example.com"],
            "clientAuthentication": "clientParameters"
        }
    ],
}

Accessing the configured values
You can query the user's configured values for your package's settings from your editor extension code, check their permissions to edit those values (only users with permissions to manage the extension installation can edit setting values), and even prompt the user to edit their settings:
TypeScriptimport {EditorClient, Menu, MenuType} from 'lucid-extension-sdk';

const client = new EditorClient();
const menu = new Menu(client);

client.registerAction('import-data', async () => {
    let settings = await client.getPackageSettings();
    if (!settings.get('subdomain')) {
        if (await client.canEditPackageSettings()) {
            await client.alert(
                'You have not configured a MyApp subdomain. You will now be prompted to complete that configuration.',
            );
            await client.showPackageSettingsModal();
            settings = await client.getPackageSettings();
            if (!settings.get('subdomain')) {
                return;
            }
        } else {
            client.alert(
                'Your account has not configured a MyApp subdomain. Talk with your Lucid account administrator to complete configuration of the MyApp integration.',
            );
        }
    }

    // Do whatever you need with the configured settings
});

menu.addDropdownMenuItem({
    label: 'Import data',
    action: 'import-data',
});

You can programmatically set package settings using await client.setPackageSettings(myPackageSettings) if you prefer to build custom UI rather than use the standard await client.showPackageSettingsModal() modal. As with the standard modal, only users with permissions to edit the extension installation can set new package settings. myPackageSettings should be Record<string,string> | Map<string|string>. If a subset of setting values are provided, those values will be set while leaving others unchanged.