import React, { useState } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import MsalInitializer from './auth/components/MsalInitializer';
import { createMsalInstance } from './auth/msalSetup';
import { ModelProvider } from './contexts/ModelContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { UIProvider } from './contexts/UIContext';
import { AuthenticationWrapper } from './components/AuthWrapper';
import { ModelPanel } from './components/ModelPanel';
import { RefactoredApp } from './components/RefactoredApp';
import { ContextDemo } from './components/Demo';

/**
 * A test harness component that allows testing different components
 * from the refactored architecture in isolation.
 * 
 * This can be mounted anywhere in the application for testing purposes.
 */
const TestHarness: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<string>('demo');
  const msalInstance = createMsalInstance();
  
  // Helper to render the selected component
  const renderComponent = () => {
    switch (activeComponent) {
      case 'refactoredApp':
        return <RefactoredApp />;
      case 'modelPanel':
        return <ModelPanel />;
      case 'authWrapper':
        return (
          <AuthenticationWrapper>
            <div className="p-4 bg-green-100 rounded m-4">
              Authentication wrapper content
            </div>
          </AuthenticationWrapper>
        );
      case 'demo':
      default:
        return <ContextDemo />;
    }
  };
  
  return (
    <div className="border-2 border-blue-300 m-4 p-4 rounded shadow-md">
      <h1 className="text-xl font-bold mb-4">Refactoring Test Harness</h1>
      
      <div className="flex space-x-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${activeComponent === 'demo' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveComponent('demo')}
        >
          Context Demo
        </button>
        <button
          className={`px-3 py-1 rounded ${activeComponent === 'refactoredApp' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveComponent('refactoredApp')}
        >
          Refactored App
        </button>
        <button
          className={`px-3 py-1 rounded ${activeComponent === 'modelPanel' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveComponent('modelPanel')}
        >
          Model Panel
        </button>
        <button
          className={`px-3 py-1 rounded ${activeComponent === 'authWrapper' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveComponent('authWrapper')}
        >
          Auth Wrapper
        </button>
      </div>
      
      {/* Wrap components with all necessary providers */}
      <MsalInitializer msalInstance={msalInstance}>
        <AuthProvider msalInstance={msalInstance}>
          <UIProvider>
            <ModelProvider>
              <SimulationProvider>
                <div className="border p-4 rounded">
                  {renderComponent()}
                </div>
              </SimulationProvider>
            </ModelProvider>
          </UIProvider>
        </AuthProvider>
      </MsalInitializer>
    </div>
  );
};

export default TestHarness;
