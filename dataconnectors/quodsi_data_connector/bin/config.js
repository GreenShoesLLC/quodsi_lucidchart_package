"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
// Use process.env values that are replaced during build time
const config = {
    // apiBaseUrl: process.env.QUODSI_API_URL || 'http://localhost:5000/api/'
    apiBaseUrl: 'https://dev-quodsi-webapp-01.azurewebsites.net/api/'
};
function getConfig() {
    return config;
}
