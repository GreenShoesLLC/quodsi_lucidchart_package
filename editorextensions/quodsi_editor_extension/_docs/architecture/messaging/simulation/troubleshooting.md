# Troubleshooting Guide

Common issues, solutions, and debugging commands for simulation execution problems.

## Quick Diagnostic Checklist

When a simulation fails, check these items in order:

1. ☐ Is the page a Quodsi model? (Look for "Initialize Quodsi Model" button)
2. ☐ Does the model have required elements? (At least 1 Activity and 1 Generator)
3. ☐ Is the model valid? (Click "Validate" button, check for errors)
4. ☐ Is the browser console showing errors? (F12 → Console tab)
5. ☐ Is the data connector online? (Check network tab for 500 errors)
6. ☐ Are Azure resources configured? (Check environment variables)

---

## Common Issues

### Issue 1: "No active page found"

**Symptoms:**
- Clicking "Run Simulation" shows error immediately
- Error message: "No active page found"

**Causes:**
- Not viewing a page in LucidChart
- Extension initialized before page load

**Solutions:**
1. Make sure you're viewing a LucidChart page (not in folder view)
2. Refresh the page (F5)
3. Close and reopen the Quodsi panel

**Prevention:** Disable simulate button when no active page

---

### Issue 2: "Current page is not a Quodsi model"

**Symptoms:**
- Simulation fails immediately with this error
- "Initialize Quodsi Model" button visible

**Causes:**
- Page hasn't been converted to Quodsi model
- Page metadata missing

**Solutions:**
1. Click "Initialize Quodsi Model" button
2. Or: Create Quodsi model from existing diagram
3. Verify page has Quodsi elements (Activities, Resources, etc.)

**Prevention:** Only show simulate button on Quodsi pages

---

### Issue 3: "No model definition found"

**Symptoms:**
- Page shows as Quodsi model but simulation fails
- Error message: "No model definition found..."

**Causes:**
- Model failed to load
- ModelManager not initialized
- Page has no simulation elements

**Solutions:**
1. Add Quodsi elements to the page (Activity, Resource, Generator)
2. Try clicking "Validate" first to load model
3. Refresh page and retry
4. Re-convert the page

**Debug:**
```javascript
// Browser console
const modelManager = window.quodsiExtension?.modelManager;
await modelManager?.getModelDefinition();
// Should return object, not null
```

---

### Issue 4: "Failed to submit simulation" (OAuth)

**Symptoms:**
- Simulation starts, then fails with OAuth-related error
- Network tab shows failed API call to `api.lucid.co/folders/search`

**Causes:**
- LucidChart OAuth not triggered
- Network connectivity issues
- LucidChart API temporarily down

**Solutions:**
1. **Retry:** Click "Run Simulation" again (OAuth should work second time)
2. **Refresh page:** Force OAuth reset
3. **Check network:** Ensure internet connectivity

**Debug:**
```javascript
// Browser console
window.LucidDataActionUtility?.resetOauthTriggerStatus();
// Then retry simulation
```

**Prevention:** OAuth failures are non-blocking; simulation continues anyway

---

### Issue 5: "Failed to submit simulation" (Data Connector)

**Symptoms:**
- Simulation starts, hangs, then fails
- Network tab shows failed POST to data connector
- Error: "Failed to connect to data connector"

**Causes:**
- Data connector not running (local development)
- Wrong data connector URL
- Network issues
- Data connector crashed

**Solutions:**

**For Local Development:**
1. Start data connector: `cd dataconnectors/quodsi_data_connector_lucidchart_v2 && npm start`
2. Verify running: `curl http://localhost:7071/api/simulation/save-and-submit`
3. Check `local.settings.json` exists and is configured

**For Production:**
1. Check Azure Function status in Azure Portal
2. Verify function app is running
3. Check function logs for errors
4. Restart function app if needed

**Debug:**
```bash
# Test data connector
curl -X POST http://localhost:7071/api/simulation/save-and-submit \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "test",
    "scenarioId": "00000000-0000-0000-0000-000000000000",
    "model": {"name": "Test"}
  }'
```

---

### Issue 6: "Batch configuration error"

**Symptoms:**
- Simulation fails with batch configuration error
- Azure Function logs show missing environment variables

**Causes:**
- Missing `BATCH_ACCOUNT_URL`
- Missing `BATCH_ACCOUNT_NAME`
- Missing `BATCH_ACCOUNT_KEY`
- Missing `BATCH_POOL_ID`

**Solutions:**

**Local Development:**
1. Copy `local.settings.json.template` to `local.settings.json`
2. Fill in values from Azure Portal:
   ```json
   {
     "BATCH_ACCOUNT_URL": "https://{account}.{region}.batch.azure.com",
     "BATCH_ACCOUNT_NAME": "{accountName}",
     "BATCH_ACCOUNT_KEY": "{key from Azure Portal}",
     "BATCH_POOL_ID": "dev-quodsi-pool"
   }
   ```
3. Restart function: `npm start`

**Production:**
1. Azure Portal → Function App → Configuration
2. Add/update application settings
3. Restart function app

**Verify:**
```bash
# Check environment variables
curl http://localhost:7071/api/health  # If health endpoint exists
```

---

### Issue 7: "Failed to upload model definition"

**Symptoms:**
- Simulation fails during upload phase
- Azure Function logs show blob storage error

**Causes:**
- Invalid storage connection string
- Storage account doesn't exist
- Network timeout
- Storage account full

**Solutions:**
1. Verify `AZURE_STORAGE_CONNECTION_STRING` in configuration
2. Check storage account exists in Azure Portal
3. Verify storage account is accessible
4. Check storage account quota

**Debug:**
```bash
# Test storage connection
az storage container list --connection-string "$AZURE_STORAGE_CONNECTION_STRING"
```

---

### Issue 8: "Failed to create batch job"

**Symptoms:**
- Upload succeeds but batch job creation fails
- Error: "Job already exists" or "Pool not found"

**Causes:**
- Pool doesn't exist or is inactive
- Job ID collision (extremely rare)
- Batch account permissions
- Pool has no compute nodes

**Solutions:**
1. Verify pool exists: Azure Portal → Batch Account → Pools
2. Check pool state: Should be "Active" or "Resizing"
3. Verify pool has nodes: Check "Current dedicated" or "Current low-priority"
4. Check batch account permissions

**Debug:**
```bash
# List pools
az batch pool list --account-name {accountName}

# Show pool details
az batch pool show --pool-id dev-quodsi-pool --account-name {accountName}
```

---

### Issue 9: Simulation button stuck on "Running..."

**Symptoms:**
- Button stays disabled with "Running..." text
- No error message
- No completion

**Causes:**
- Status polling stopped due to error
- Data connector unavailable during polling
- Network connectivity lost
- Azure Storage returning errors
- Extension lost state

**Solutions:**
1. **Check console:** Look for polling errors in browser console
2. **Check data connector:** Verify data connector is responding
3. **Check network:** Monitor network tab for failed requests
4. **Refresh page:** Hard refresh (Ctrl+Shift+R) to reset state
5. **Verify Azure Storage:** Check if GetDocumentStatus is working

**Debug:**
```javascript
// Browser console - Check active jobs
const handler = window.SimulationHandler;
handler.getActiveJobs();
// Should show job with status, progress, and pollInterval

// Check if polling interval is active
const jobs = handler.getActiveJobs();
jobs.forEach(job => {
  console.log(`Job ${job.jobId}: polling=${!!job.pollInterval}`);
});

// Try to resume polling manually
handler.resumePollingIfNeeded(documentId);
```

**Manual Recovery:**
```javascript
// Stop stuck polling
handler.stopPolling(jobId);

// Clear all jobs and restart
handler.getActiveJobs().forEach(job => {
  handler.stopPolling(job.jobId);
});
```

**Prevention:**
- Polling includes error handling that stops polling on failure
- User can manually retry simulation to restart polling
- `resumePollingIfNeeded()` can restart polling when returning to page

---

### Issue 10: Model validation fails before simulation

**Symptoms:**
- Validation shows errors
- "Run Simulation" button disabled
- Error messages in validation panel

**Causes:**
- Missing required elements
- Invalid element configurations
- Broken connections

**Solutions:**
1. Click "Validate" to see all errors
2. Fix each error:
   - Missing Activity: Add activity to model
   - Missing Generator: Add generator to model
   - Invalid connections: Fix connectors
   - Missing properties: Fill in required fields
3. Re-validate
4. Once valid, simulate button enables

**Common Validation Errors:**
- "Model must have at least one Activity"
- "Model must have at least one Generator"
- "Activity must have at least one outgoing connector"
- "Connector must connect two elements"

---

## Debug Commands

### Browser Console Commands

#### Get Active Jobs
```javascript
const handler = window.SimulationHandler;
handler.getActiveJobs();
```

#### Get Specific Job
```javascript
const handler = window.SimulationHandler;
handler.getJob('job-abc123-1234567890');
```

#### Check ModelManager
```javascript
const mm = window.quodsiExtension?.modelManager;
await mm?.getModelDefinition();
```

#### Check MessageRouter
```javascript
const router = window.quodsiExtension?.messageRouter;
router?.dumpChannelState();
```

#### View Message Log
```javascript
window.__msgLog; // Last 100 messages
```

#### Reset OAuth Status
```javascript
window.LucidDataActionUtility?.resetOauthTriggerStatus();
```

---

### Azure Function Debug Commands

#### View Function Logs
```bash
# Azure CLI
az webapp log tail --name {functionAppName} --resource-group {resourceGroup}
```

#### Test Data Connector
```bash
curl -X POST https://{functionApp}.azurewebsites.net/api/simulation/save-and-submit \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

#### Check Function Status
```bash
az functionapp show --name {functionAppName} --resource-group {resourceGroup}
```

---

### Azure Batch Debug Commands

#### List Jobs
```bash
az batch job list --account-name {accountName}
```

#### Show Job Details
```bash
az batch job show --job-id {jobId} --account-name {accountName}
```

#### List Tasks in Job
```bash
az batch task list --job-id {jobId} --account-name {accountName}
```

#### View Task Logs
```bash
# Get task output files
az batch task file list --job-id {jobId} --task-id {taskId} --account-name {accountName}

# Download stderr.txt
az batch task file download \
  --job-id {jobId} \
  --task-id {taskId} \
  --file-path stderr.txt \
  --destination ./stderr.txt \
  --account-name {accountName}
```

---

## Performance Issues

### Issue: Slow Simulation Submission (> 10s)

**Symptoms:**
- Long delay between clicking "Run Simulation" and receiving ACK
- Browser appears frozen

**Causes:**
- Large model (many elements)
- Complex diagram (SVG capture slow)
- Slow network
- Data connector overloaded

**Solutions:**
1. **Simplify model:** Remove unnecessary elements
2. **Simplify diagram:** Reduce visual complexity
3. **Check network:** Run speed test
4. **Scale up data connector:** Increase Azure Function tier

**Debug:**
- Check Azure Function metrics: Response time, requests per second
- Check browser network tab: Time to first byte

---

### Issue: Status Updates Slow or Missing

**Symptoms:**
- Long delays between status updates (>15 seconds)
- Progress bar doesn't update
- Status stuck on same value

**Causes:**
- Data connector slow to respond
- Azure Storage query delays
- Network latency
- GetDocumentStatus failing silently

**Solutions:**
1. **Check console:** Verify status messages arriving every 10s
2. **Monitor network:** Check for GetDocumentStatus calls in network tab
3. **Check data connector logs:** Look for slow queries or errors
4. **Verify Azure Storage:** Check storage account performance metrics

**Debug:**
```javascript
// Check last update time for jobs
const jobs = handler.getActiveJobs();
jobs.forEach(job => {
  console.log(`Job ${job.jobId}: Last update ${job.lastUpdate}`);
  const secondsSinceUpdate = (Date.now() - job.lastUpdate.getTime()) / 1000;
  console.log(`  -> ${secondsSinceUpdate}s ago`);
});
```

**Expected Behavior:**
- New status message every 10 seconds
- `lastUpdate` timestamp should refresh regularly
- Console shows `[SimulationHandler]` polling messages

### Issue 11: GetDocumentStatus Failing

**Symptoms:**
- Polling stops after first attempt
- Console shows "Failed to check status" errors
- Simulation never completes

**Causes:**
- Data connector action not registered
- Invalid documentId
- Azure Storage permissions issues
- Network connectivity problems

**Solutions:**
1. **Verify data connector:** Test GetDocumentStatus action manually
2. **Check documentId:** Ensure valid LucidChart document ID
3. **Check permissions:** Verify storage account access
4. **Review logs:** Check Azure Function logs for errors

**Debug:**
```bash
# Test GetDocumentStatus via data connector
curl -X POST https://{function-app}/api/dataConnector/getDocumentStatus \
  -H "Content-Type: application/json" \
  -d '{"documentId": "your-doc-id"}'
```

---

## Getting Help

### Before Asking for Help

1. ✓ Check browser console for errors
2. ✓ Check Azure Function logs
3. ✓ Try the solutions in this guide
4. ✓ Collect relevant information (see below)

### Information to Provide

**For Bug Reports:**
- Browser console errors (full stack traces)
- Azure Function logs (request ID, error details)
- Steps to reproduce
- LucidChart document ID
- Job ID (if available)
- Screenshot of error message

**For Performance Issues:**
- Model size (number of elements)
- Diagram complexity
- Network speed test results
- Azure Function metrics
- Browser network tab waterfall

---

## Related Documentation

- [01. Simulation Lifecycle](./01_simulation_lifecycle.md) - Understand normal flow
- [02. Message Flow](./02_message_flow.md) - Message details
- [07. Error Handling](./07_error_handling.md) - Detailed error information
- [03. Extension Handler](./03_extension_handler.md) - Extension internals
- [04. Data Connector Integration](./04_data_connector_integration.md) - Azure Function details
- [05. Batch Service](./05_batch_service.md) - Batch job details
