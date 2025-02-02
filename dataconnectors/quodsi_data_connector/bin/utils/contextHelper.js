"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredContext = getRequiredContext;
exports.getExistingPageIds = getExistingPageIds;
const checks_1 = require("lucid-extension-sdk/core/checks");
function getRequiredContext(action) {
    var _a;
    console.log("Getting required context for action:", action.name);
    // For import action, data is passed directly
    if (action.name === 'ImportSimulationResults') {
        const data = action.data;
        if (!data.documentId || !data.userId || !data.pageId) {
            throw new Error('Import action requires documentId, userId, and pageId in action.data');
        }
        return {
            documentId: data.documentId,
            userId: data.userId,
            pageId: data.pageId
        };
    }
    // Log all available collections and context
    console.log("Action context:", {
        collections: Object.keys(action.context.documentCollections || {})
    });
    // Get the pageId from Models collection
    const modelData = ((_a = action.context.documentCollections) === null || _a === void 0 ? void 0 : _a['Models']) || [];
    console.log("Model data found:", modelData);
    if (modelData.length === 0) {
        console.log("No Models data found in document collections");
        return null;
    }
    try {
        // The stored value should be a quoted pageId string
        const pageId = JSON.parse(modelData[0]);
        // Try to get documentId and userId from context
        const documentId = 'b8728c9a-beb3-4ea2-9689-0f13843a6e8c'; //action.context.documentId;
        const userId = '202149326'; //action.context.userId;
        if (!documentId || !userId) {
            console.log("Missing required context:", { documentId, userId });
            return null;
        }
        const context = {
            documentId,
            userId,
            pageId
        };
        console.log("Retrieved context:", context);
        return context;
    }
    catch (error) {
        console.error('Error parsing model data:', error);
        return null;
    }
}
// Helper function to extract page IDs from collections
function getExistingPageIds(collections) {
    const modelData = collections['Models'] || [];
    return modelData
        .map(id => {
        try {
            return JSON.parse(id);
        }
        catch (_a) {
            return null;
        }
    })
        .filter(checks_1.isString);
}
