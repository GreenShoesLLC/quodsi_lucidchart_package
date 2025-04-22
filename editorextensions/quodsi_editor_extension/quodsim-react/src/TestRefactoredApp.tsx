import React from 'react';
import { ModelProvider } from './contexts/ModelContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { UIProvider } from './contexts/UIContext';
import { RefactoredApp } from './components/RefactoredApp';

/**
 * TestRefactoredApp is a wrapper for the refactored app that provides all necessary contexts.
 * This can be used as an entry point for testing the refactored components without
 * modifying the existing application.
 */
const TestRefactoredApp: React.FC = () => {
  return (
    <UIProvider>
      <ModelProvider>
        <SimulationProvider>
          <div className="test-container">
            <h2 className="p-2 bg-blue-100 text-blue-800">
              Refactored App (Testing Mode)
            </h2>
            <RefactoredApp />
          </div>
        </SimulationProvider>
      </ModelProvider>
    </UIProvider>
  );
};

export default TestRefactoredApp;
