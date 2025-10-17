# OAuthXHRRequest SDK Reference

This document provides a reference for the `OAuthXHRRequest` SDK, which simplifies making authenticated requests to Lucid APIs using OAuth 2.0.

## Overview

The `OAuthXHRRequest` SDK handles the complexities of OAuth 2.0 authentication, including token management and refresh.  It provides a convenient way to make API calls without needing to manually manage access tokens.

## Installation

```bash
npm install lucid-extension-sdk  // or yarn add lucid-extension-sdk
Usage
JavaScript

import { OAuthXHRRequest } from 'lucid-extension-sdk';

const oauthXHR = new OAuthXHRRequest();

// Make a request to a Lucid API endpoint
oauthXHR.get('/api/v1/me')
  .then(response => {
    console.log('API Response:', response.data);
  })
  .catch(error => {
    console.error('API Error:', error);
  });

// Example with POST data:
const data = { name: 'New Document' };
oauthXHR.post('/api/v1/documents', data)
  .then(response => {
    console.log('Create Document Response:', response.data);
  })
  .catch(error => {
    console.error('Create Document Error:', error);
  });


// Example with custom headers:
oauthXHR.get('/api/v1/me', { headers: { 'X-Custom-Header': 'value' } })
  .then(response => { /* ... */ })
  .catch(error => { /* ... */ });

// Example with full URL (less common):
oauthXHR.get('[https://api.lucidchart.com/api/v1/me](https://api.lucidchart.com/api/v1/me)') // Corrected URL
  .then(response => { /* ... */ })
  .catch(error => { /* ... */ });
API
OAuthXHRRequest
constructor()
Creates a new OAuthXHRRequest instance.  No arguments are required.  The SDK automatically handles OAuth setup.

get(url, [options])
Makes a GET request to the specified url.

url (string): The URL of the API endpoint. Can be a relative path (e.g., /api/v1/me) or a full URL.
options (object, optional): Additional options for the request, such as headers. Uses the same options as axios.
Returns a Promise that resolves with the API response (an axios response object) or rejects with an error.

post(url, data, [options])
Makes a POST request to the specified url with the provided data.

url (string): The URL of the API endpoint.
data (object): The data to be sent in the request body.
options (object, optional): Additional options for the request, such as headers. Uses the same options as axios.
Returns a Promise that resolves with the API response or rejects with an error.

put(url, data, [options])
Makes a PUT request.  Similar to post.

delete(url, [options])
Makes a DELETE request. Similar to get.

patch(url, data, [options])
Makes a PATCH request. Similar to post.

request(config)
A more general method to make requests with full control over the configuration.  Uses the same configuration object as axios.

JavaScript

oauthXHR.request({
  method: 'GET',
  url: '/api/v1/me',
  headers: { 'X-Custom-Header': 'value' }
})
.then(response => { /* ... */ })
.catch(error => { /* ... */ });
Error Handling
API errors will reject the Promise returned by the request methods.  You can use .catch() to handle errors:

JavaScript

oauthXHR.get('/api/v1/me')
  .then(response => { /* ... */ })
  .catch(error => {
    console.error('API Error:', error.response); // Access the error response
    console.error('API Error Message:', error.message); // Access the error message
  });
Important Considerations
This SDK relies on the Lucid extension framework for OAuth 2.0 authentication. Make sure your extension is properly configured.
The base URL for Lucid APIs is automatically handled by the SDK. You typically only need to provide relative paths.
The SDK uses axios for making HTTP requests. You can refer to the axios documentation for more advanced request options. The response object will be an axios response object.
Example (Full)
JavaScript

import { OAuthXHRRequest } from 'lucid-extension-sdk';

const oauthXHR = new OAuthXHRRequest();

async function getMe() {
  try {
    const response = await oauthXHR.get('/api/v1/me');
    console.log('Me:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

getMe();