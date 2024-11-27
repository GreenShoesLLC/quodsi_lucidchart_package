 Data connector security















Data connectors and the data they manage are secured through two means:

Request signatures to validate requests to your data connector originated from Lucid's servers.
Data update tokens authorize your data connector to update specific Lucid documents with data.

Because data connectors use OAuth 2.0 user access tokens to communicate with third parties, make sure you're also aware of how we secure OAuth 2.0 tokens.
Request signatures
For your security, Lucid provides a request signature header (X-RSA-Signature) on all requests sent to data connectors. The signature can be used by data connectors to validate that incoming requests are legitimate traffic coming from Lucid. The signature is a concatenation of the request body and the query parameters.
Lucid signs requests using the RS384 algorithm. A full list of Lucid's public keys can be found here in JWKS format, and individual keys can be found by their IDs in PEM format at https://lucid.app/.well-known/pem/TPCP.
Validation
If you use the DataConnector class from the lucid-extension-sdk to implement your data connector, request validation is performed automatically for you.
If you would like to validate the requests yourself, you can follow this Node.js example:
TypeScriptconst crypto = require('crypto');

const parts = request.uri.split('?')
const params = parts.length > 0 ? parts[1] : "";
const nonce = request.headers['X-Lucid-RSA-Nonce'];
const signature = Buffer.from(request.headers["X-Lucid-Signature"], "base64");
const data = Buffer.from(body + nonce + params);
const verified = crypto.verify("SHA384", data, LUCID_PUBLIC_KEY, signature);

Data update tokens
When a data connector recieves a data action request from Lucid, it will usually contain a data update token which can be used to send data back to Lucid documents. The data update token is scoped in one of two ways, depending on the type of data action that was invoked:

Document Specific - The data update token is scoped to a particular document and data source. In this case, the token can be used to add, change, or delete any data for the data source on the document. The data update token can also create a data source or new collections if they don't already exist on the document.
Data Source Specific - The data update token is scoped to existing data for a particular data source across multiple Lucid documents. In this case the data update token can be used to add data to or change data in existing collections on those documents. However, the token cannot be used to create new collections or new data sources on the document.

The following table shows which type of data update token each data action will recieve:
Data Action NameUpdate Token TypeImportDocument SpecificHard RefreshDocument SpecificPatchNonePollData Source SpecificCustom Synchronous ActionNoneCustom Asynchronous ActionDocument Specific