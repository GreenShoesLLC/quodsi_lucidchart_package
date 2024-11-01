import React, { useState, useEffect } from 'react';
import ActivityEditor from './components/ActivityEditor';
import EntityEditor from './components/EntityEditor';
import ConnectorEditor from './components/ConnectorEditor';
import { Activity } from './app/models/activity';
import { Entity } from './app/models/entity';
import { Generator } from './app/models/generator';
import {Model} from './app/models/model'
import { Connector } from './app/models/connector';
import { TestingButtons } from './components/TestingButtons';
import { ModelTabs } from './components/ModelTabs';
import { Resource } from './app/models/resource';
import ResourceEditor from './components/ResourceEditor';
import { LucidChartMessage, LucidChartMessageClass } from './app/models/LucidChartMessage';
import ModelUtilities from './components/ModelUtilities';
import { SimulationObjectType } from './app/models/enums/simulationObjectType';
import GeneratorEditor from './components/GeneratorEditor';

const initialModel: Model = {
  id: 'initial-id',
  name: 'Initial Model',
  reps: 1,
  forecastDays: 30,
  type: SimulationObjectType.Model,
  // Add other necessary fields with default values if needed
};

const App: React.FC = () => {
  const [editor, setEditor] = useState<JSX.Element | null>(null);

  const handleMessage = (data: LucidChartMessage) => {
    console.log("React: handleMessage called with data:", data);

    if (data.messagetype === 'lucidchartdata') {
      let instanceData = {};

      try {
        instanceData = JSON.parse(data.instancedata || '{}');
        // console.log('Parsed instance data:', instanceData);
      } catch (error) {
        console.error('Error parsing instance data:', error);
      }

      console.log("React: instanceData:", instanceData);
      switch (data.simtype) {
        case 'ValidateModel':
          console.log("React: setEditor to model_utilities")
          setEditor(
            <ModelUtilities
                showConvertButton={false}
                showValidateButton={true}
                showRemoveButton={true}
                showSimulateButton={true}
            />
          );
          break;
        case 'ConvertPageToModel':
          console.log("React: setEditor to model_utilities")
          setEditor(
            <ModelUtilities
                showConvertButton={true}
                showValidateButton={false}
                showRemoveButton={false}
                showSimulateButton={false}
            />
          );
          break;
        case 'rightpanel':
          console.log("React: setEditor to rightpanel")
          setEditor(
            <ModelTabs initialModel={initialModel} />
          );
          break;
        case 'contentdock':
          console.log("React: setEditor to ContentDock")
          setEditor(
            <ModelTabs initialModel={initialModel} />
          );
          break;
        case 'resource':
          console.log("React: setEditor to ResourceEditor")
          setEditor(
            <ResourceEditor
              key={data.lucidId}
              resource={instanceData as Resource}
              onSave={(resource) => console.log(JSON.stringify(resource))}
              onCancel={() => setEditor(null)}
            />
          );
          break;
        case 'activity':
          console.log("React: setEditor to ActivityEditor")
          setEditor(
            <ActivityEditor
              key={data.lucidId}
              activity={instanceData as Activity}
              onSave={(activity) => console.log(JSON.stringify(activity))}
              onCancel={() => setEditor(null)}
            />
          );
          break;
        case 'entity':
          console.log("React: setEditor to EntityEditor")
          setEditor(
            <EntityEditor
              key={data.lucidId}
              entity={instanceData as Entity}
              onSave={(entity) => console.log(JSON.stringify(entity))}
              onCancel={() => setEditor(null)}
            />
          );
          break;
        case 'connector':
          console.log("React: setEditor to ConnectorEditor")
          setEditor(
            <ConnectorEditor
              key={data.lucidId}
              connector={instanceData as Connector}
              onSave={(connector) => console.log(JSON.stringify(connector))}
              onCancel={() => setEditor(null)}
            />
          );
          break;
        case 'generator':
          console.log("React: setEditor to ConnectorEditor")
          setEditor(
            <GeneratorEditor
              key={data.lucidId}
              generator={instanceData as Generator}
              onSave={(generator) => console.log(JSON.stringify(generator))}
              onCancel={() => setEditor(null)}
            />
          );
          break;
        case 'model':
          console.log("React: setEditor to ModelTabs");
          setEditor(
            <ModelTabs 
              initialModel={instanceData as Model} 
            />
          );
          break;
      }
    }
  };

  useEffect(() => {
    console.log('React: Adding message event listener');
    const eventListener = (event: MessageEvent) => {
      console.log('React: Received message event:', event);
      handleMessage(event.data as LucidChartMessage);
    };
    window.addEventListener('message', eventListener);
    // Signal the parent that the React app is ready
    const readyMessage = LucidChartMessageClass.createMessage(
      'reactAppReady',
      '{}',
      ''
    ).toObject();
    window.parent.postMessage(readyMessage, '*');
    return () => {
      console.log('React: Removing message event listener');
      window.removeEventListener('message', eventListener);
    };
  }, []);
  
const sendTestMessage = (type: SimulationObjectType) => {
  let testData: LucidChartMessageClass;

  switch (type) {
    case SimulationObjectType.Activity:
      testData = LucidChartMessageClass.createMessage(
        'lucidchartdata',
        JSON.stringify({ id: '123', capacity: 3, name: 'Test Activity', type: SimulationObjectType.Activity }),
        'v1',
        'activity',
        '1'
      );
      break;
    case SimulationObjectType.Entity:
      testData = LucidChartMessageClass.createMessage(
        'lucidchartdata',
        JSON.stringify({ id: '456', name: 'Test Entity', type: SimulationObjectType.Entity }),
        'v1',
        'entity',
        '1'
      );
      break;
    case SimulationObjectType.Connector:
      testData = LucidChartMessageClass.createMessage(
        'lucidchartdata',
        JSON.stringify({ id: '789', fromActivityId: '123', toActivityId: '456', name: 'Test Connector', type: SimulationObjectType.Connector }),
        'v1',
        'connector',
        '1'
      );
      break;
    default:
      throw new Error(`Unsupported SimulationObjectType: ${type}`);
  }

  handleMessage(testData.toObject());
};

  return (
    <div>
      {!editor && <TestingButtons sendTestMessage={sendTestMessage} />}
      {editor}
    </div>
  );
};

export default App;
