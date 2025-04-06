// This script generates the fixture specifically for the mixed distribution model
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// Get the ts-node path
const tsNodePath = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
);

// Path to generateFixtures.ts
const generateFixturesPath = path.join(__dirname, 'generateFixtures.ts');

// Create expected JSON directory if it doesn't exist
const fixturesPath = path.join(__dirname, '__fixtures__');
const expectedJsonPath = path.join(fixturesPath, 'expectedJson');

if (!fs.existsSync(expectedJsonPath)) {
  fs.mkdirSync(expectedJsonPath, { recursive: true });
  console.log(`Created directory: ${expectedJsonPath}`);
}

// Run the generateFixtures script with ts-node, but only for the mixed distribution model
console.log('Generating mixed distribution model fixture...');
try {
  console.log(`Running: ${tsNodePath} ${generateFixturesPath} model_def_mixed_distributions`);
  
  childProcess.execSync(`${tsNodePath} ${generateFixturesPath} model_def_mixed_distributions`, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  console.log('Mixed distribution model fixture generated successfully');
} catch (error) {
  console.error('Error generating fixture:', error);
  process.exit(1);
}
