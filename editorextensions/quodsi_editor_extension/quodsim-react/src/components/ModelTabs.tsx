import React, { useState } from 'react';
import ModelEditor from './ModelEditor';
import ExperimentEditor from './ExperimentEditor';
import { OutputViewer } from './OutputViewer';
import { Model } from '../app/models/model'; // Ensure the import path is correct
import ModelUtilities from './ModelUtilities';

type TabType = 'model' | 'experiments' | 'output' | 'utilities';

interface ModelTabsProps {
  initialModel: Model;
}

export const ModelTabs: React.FC<ModelTabsProps> = ({ initialModel }) => {
  const [activeTab, setActiveTab] = useState<TabType>('model');
  const [model, setModel] = useState<Model>(initialModel);

  const handleModelSave = (updatedModel: Model) => {
    setModel(updatedModel);
    console.log('Model saved:', updatedModel);

    // Send the saved model data to the parent iframe
    window.parent.postMessage({
      messagetype: 'modelSaved',
      data: updatedModel
    }, '*');
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
                showSimulateButton={true}
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
