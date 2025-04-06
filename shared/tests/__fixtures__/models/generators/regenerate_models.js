const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// Get the typescript compiler path
const tscPath = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
);

// First, compile the template_generator.ts to JavaScript
console.log('Compiling TypeScript files...');
try {
  console.log('Running: ' + tscPath + ' --outDir ./temp ' + path.join(__dirname, 'template_generator.ts'));
  childProcess.execSync(tscPath + ' --outDir ./temp ' + path.join(__dirname, 'template_generator.ts'), {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  console.log('Running: ' + tscPath + ' --outDir ./temp ' + path.join(__dirname, 'generate_models.ts'));
  childProcess.execSync(tscPath + ' --outDir ./temp ' + path.join(__dirname, 'generate_models.ts'), {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Error during TypeScript compilation:', error);
  process.exit(1);
}

// Then, run the generate_models.js script
console.log('Generating model files...');
try {
  const nodePath = process.execPath;
  const generateModelsPath = path.join(process.cwd(), 'temp', 'tests', '__fixtures__', 'models', 'generators', 'generate_models.js');
  
  console.log('Running: ' + nodePath + ' ' + generateModelsPath);
  childProcess.execSync(nodePath + ' ' + generateModelsPath, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  // Move the generated files from tmp to valid directory
  const generatedDir = path.join(__dirname);
  const targetDir = path.join(__dirname, '..', 'valid');
  
  fs.readdirSync(generatedDir).forEach(file => {
    if (file.startsWith('model_def_') && file.endsWith('.ts')) {
      const sourcePath = path.join(generatedDir, file);
      const targetPath = path.join(targetDir, file);
      
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${file} to valid directory`);
    }
  });
  
  // Update the index.ts in valid directory
  const indexPath = path.join(generatedDir, 'index.ts');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Append additional exports
    const additionalExports = `
export * from './sequential_flow';
export * from './non_sequential_flow';
`;
    fs.writeFileSync(path.join(targetDir, 'index.ts'), indexContent + additionalExports);
    console.log('Updated index.ts in valid directory');
  }
  
  console.log('Model files generation completed successfully');
} catch (error) {
  console.error('Error during model files generation:', error);
  process.exit(1);
}
