import React, { useState } from 'react';
import ModelEditor from './ModelEditor';
import ExperimentEditor from './ExperimentEditor';
import { OutputViewer } from './OutputViewer';
import { Model } from '../app/models/model'; // Make sure this import path is correct
import { SimulationObjectType } from '../app/models/enums';
import ModelUtilities from './ModelUtilities';

type TabType = 'model' | 'experiments' | 'output' | 'utilities';

export const ContentDock: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('model');
  const [model, setModel] = useState<Model>({
    // Initialize with default values
    id: '',
    name: '',
    reps: 1,
    forecastDays: 30,
    type: SimulationObjectType.Model,
    // Add other default values as needed
  });

  const handleModelSave = (updatedModel: Model) => {
    setModel(updatedModel);
    // Here you might want to save the model to your backend or perform other actions
    console.log('Model saved:', updatedModel);
  };

  const handleModelCancel = () => {
    // Handle cancellation, e.g., reset the model to its original state
    console.log('Model editing cancelled');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'model':
        return (
          <ModelEditor 
            model={model} 
            onSave={handleModelSave} 
            onCancel={handleModelCancel}
          />
        );
      case 'experiments':
        return <ExperimentEditor />;
      case 'output':
        return <OutputViewer />;
      case 'utilities':
        return (
            <ModelUtilities
                showConvertButton={false}
                showValidateButton={true}
                showRemoveButton={true}
            />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div>
        <button 
          onClick={() => setActiveTab('model')}
          style={{ fontWeight: activeTab === 'model' ? 'bold' : 'normal' }}
        >
          Model
        </button>
        <button 
          onClick={() => setActiveTab('experiments')}
          style={{ fontWeight: activeTab === 'experiments' ? 'bold' : 'normal' }}
        >
          Experiments
        </button>
        <button 
          onClick={() => setActiveTab('output')}
          style={{ fontWeight: activeTab === 'output' ? 'bold' : 'normal' }}
        >
          Output
        </button>
          <button 
          onClick={() => setActiveTab('utilities')}
          style={{ fontWeight: activeTab === 'utilities' ? 'bold' : 'normal' }}
        >
          Utilities
        </button>
      </div>
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};