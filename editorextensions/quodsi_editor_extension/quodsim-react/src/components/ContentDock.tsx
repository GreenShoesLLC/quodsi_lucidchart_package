
import React, { useState } from 'react';
import { ModelEditor } from './ModelEditor';
// import { ExperimentEditor } from './ExperimentEditor';
import { OutputViewer } from './OutputViewer';
import ExperimentEditor from './ExperimentEditor';


type TabType = 'model' | 'experiments' | 'output';

export const ContentDock: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('model');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'model':
        return <ModelEditor />;
      case 'experiments':
        return <ExperimentEditor />;
      case 'output':
        return <OutputViewer />;
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
      </div>
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};