/**
 * Script to regenerate all expected JSON fixtures for model serialization tests
 * 
 * This script:
 * 1. Uses npm to run the test:update-snapshots command
 * 2. Verifies all snapshots are updated correctly
 * 3. Provides detailed feedback on the process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define constants
const SHARED_DIR = path.resolve(__dirname);
const FIXTURES_DIR = path.join(SHARED_DIR, 'tests', 'serialization', '__fixtures__', 'expectedJson');

// Log helper functions
const log = {
  info: (msg) => console.log(`\x1b[36mINFO:\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32mSUCCESS:\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33mWARNING:\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31mERROR:\x1b[0m ${msg}`),
  divider: () => console.log('\n' + '-'.repeat(80) + '\n')
};

/**
 * Runs a command and returns the output
 * @param {string} command - Command to execute
 * @param {boolean} silent - Whether to suppress console output
 * @returns {string} Command output
 */
function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { 
      cwd: SHARED_DIR,
      stdio: silent ? 'pipe' : 'inherit' 
    });
    return output ? output.toString() : '';
  } catch (error) {
    if (silent) {
      return error.stdout ? error.stdout.toString() : '';
    }
    throw error;
  }
}

/**
 * Gets the list of fixture files
 * @returns {string[]} List of fixture filenames
 */
function getFixtureFiles() {
  return fs.readdirSync(FIXTURES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
}

/**
 * Main function to regenerate fixtures
 */
async function regenerateFixtures() {
  try {
    // Start message
    log.divider();
    log.info('Starting fixture regeneration process');
    log.info(`Working directory: ${SHARED_DIR}`);
    
    // Get initial fixtures
    const initialFixtures = getFixtureFiles();
    log.info(`Found ${initialFixtures.length} existing fixtures`);
    
    // Backup existing fixtures
    const backupDir = path.join(SHARED_DIR, 'tests', 'serialization', '__fixtures__', 'backup_' + Date.now());
    fs.mkdirSync(backupDir, { recursive: true });
    
    initialFixtures.forEach(fixture => {
      const source = path.join(FIXTURES_DIR, `${fixture}.json`);
      const dest = path.join(backupDir, `${fixture}.json`);
      fs.copyFileSync(source, dest);
    });
    log.success(`Backed up existing fixtures to ${backupDir}`);
    
    // Run update command
    log.info('Updating all snapshots...');
    runCommand('npm run test:update-snapshots');
    log.success('Snapshot update command completed');
    
    // Verify snapshots
    log.info('Verifying updated snapshots...');
    const verifyOutput = runCommand('npm run test:verify-snapshots', true);
    
    if (verifyOutput.includes('FAIL')) {
      log.error('Snapshot verification failed');
      log.error(verifyOutput);
      
      // Restore from backup
      log.info('Restoring fixtures from backup...');
      initialFixtures.forEach(fixture => {
        const source = path.join(backupDir, `${fixture}.json`);
        const dest = path.join(FIXTURES_DIR, `${fixture}.json`);
        fs.copyFileSync(source, dest);
      });
      log.success('Restored fixtures from backup');
      
      throw new Error('Snapshot verification failed');
    }
    
    // Get updated fixtures
    const updatedFixtures = getFixtureFiles();
    
    // Calculate stats
    const added = updatedFixtures.filter(f => !initialFixtures.includes(f));
    const removed = initialFixtures.filter(f => !updatedFixtures.includes(f));
    const updated = updatedFixtures.filter(f => initialFixtures.includes(f));
    
    // Final summary
    log.divider();
    log.success('All fixtures regenerated and verified successfully');
    log.info(`Total fixtures: ${updatedFixtures.length}`);
    
    if (added.length > 0) {
      log.info(`Added fixtures (${added.length}): ${added.join(', ')}`);
    }
    
    if (removed.length > 0) {
      log.warning(`Removed fixtures (${removed.length}): ${removed.join(', ')}`);
    }
    
    log.info(`Updated fixtures (${updated.length}): ${updated.join(', ')}`);
    log.divider();
    
    // Cleanup
    log.info('Removing backup directory...');
    fs.rmSync(backupDir, { recursive: true, force: true });
    log.success('Backup directory removed');
    
  } catch (error) {
    log.divider();
    log.error(`Failed to regenerate fixtures: ${error.message}`);
    process.exit(1);
  }
}

// Run the regeneration
regenerateFixtures();
