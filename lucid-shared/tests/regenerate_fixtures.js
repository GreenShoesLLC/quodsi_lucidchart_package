// This script manually runs the serialization process to regenerate fixtures

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// Create expected JSON directory if it doesn't exist
const fixturesPath = path.join(__dirname, 'serialization', '__fixtures__');
const expectedJsonPath = path.join(fixturesPath, 'expectedJson');

if (!fs.existsSync(expectedJsonPath)) {
  fs.mkdirSync(expectedJsonPath, { recursive: true });
  console.log(`Created directory: ${expectedJsonPath}`);
}

// Run the generateFixtures script with Node.js
console.log('Generating serialization fixtures...');
try {
  // Point to the serialization test script
  const generateFixturesPath = path.join(__dirname, 'serialization', 'generateFixtures.ts');
  
  // Use ts-node to run the TypeScript file directly
  const tsNodePath = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
  );
  
  console.log(`Running: ${tsNodePath} ${generateFixturesPath}`);
  
  childProcess.execSync(`${tsNodePath} ${generateFixturesPath}`, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  console.log('Serialization fixtures generated successfully');
} catch (error) {
  console.error('Error generating fixtures:', error);
  process.exit(1);
}
