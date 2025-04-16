# LucidChart Requirements for Quodsi SSO Implementation

This document outlines the LucidChart-specific requirements for implementing Quodsi's Single Sign-On (SSO) solution within the LucidChart extension environment.

## LucidChart Account Requirements

### Account Type

To develop and publish Quodsi as a LucidChart extension, you need:

- **LucidChart Team or Enterprise account**
- **Developer tools access enabled** for your account
- **Team Admin permissions** for the LucidChart account

> **Note:** Free or Individual accounts do not support developer tools and extension development.

### Developer Tools

Ensure your LucidChart account has developer tools enabled:

1. Log in to your LucidChart account
2. Access Team Administration
3. Go to "Account Settings" > "Developer Tools"
4. Ensure Developer Tools are activated

If developer tools are not enabled, contact LucidChart support to request access.

## Extension Development Requirements

### Required LucidChart APIs and SDKs

| Component | Version | Purpose |
|-----------|---------|---------|
| Extension API | Latest | Core extension functionality |
| Panel SDK | Latest | Creating custom UI panels |
| OAuth API | Latest | Authentication integration |

### Extension Package Structure

Your extension package will need:

```
quodsi_lucidchart_package/
├── manifest.json               # Extension manifest
├── editorextensions/
│   └── quodsi_editor_extension/
│       ├── src/                # Extension source code
│       ├── public/             # Static resources
│       └── quodsim-react/      # React application
└── shapelibraries/
    └── quodsi_shapes/          # Custom simulation shapes
```

### Required Permissions in manifest.json

Your extension will need these scopes in the manifest:

```json
"scopes": [
  "CUSTOM_UI",     // For Panel UI
  "READ",          // Read from the diagram
  "WRITE",         // Write to the diagram
  "DATA_SOURCES"   // For data integration
]
```

## LucidChart Panel SDK Requirements

### Panel Integration

To integrate the Quodsi React application within a LucidChart panel:

- The Panel must be configured to use the right dock area in LucidChart
- The React application must be packaged with the extension
- Any static resources must be included in the `public` directory

### Iframe-specific Considerations

Since the React app will run within an iframe:

- **Cross-domain messaging** must be implemented
- **Origin verification** is required for security
- **Navigation constraints** must be considered for authentication flows
- **Third-party cookie limitations** may impact authentication

## LucidChart Marketplace Requirements

If you plan to publish Quodsi in the LucidChart Marketplace:

- Extension must pass LucidChart's security review
- Privacy policy must be provided
- Terms of service must be available
- Extension must comply with LucidChart's design guidelines
- Extension must support both desktop and mobile views

## Developer Environment Configuration

### Local Development Setup

For developing the LucidChart extension locally:

1. Install the LucidChart CLI tools:
   ```bash
   npm install -g lucid-package
   ```

2. Create a development environment:
   ```bash
   npx lucid-package@latest create my-package
   cd my-package
   ```

3. Test your extension in LucidChart:
   ```bash
   npx lucid-package@latest test-editor-extension quodsi_editor_extension
   ```

### Testing Requirements

- Chrome or Firefox browser for development
- LucidChart account with access to the development environment
- Access to developer tools in the browser

## External URL Access

Your extension will need to access these external URLs:

- Azure AD B2C authentication endpoints
- Stripe API endpoints
- Your backend API endpoints

Ensure all these domains are properly configured for cross-origin resource sharing (CORS).

## Next Steps

1. Verify your LucidChart account meets the requirements above
2. Set up the local development environment
3. Configure your extension manifest
4. Proceed to [development environment setup](./development_environment.md)
