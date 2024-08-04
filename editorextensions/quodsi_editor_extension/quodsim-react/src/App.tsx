import React, { useState, useEffect } from 'react';
import ActivityEditor from './components/ActivityEditor';
import EntityEditor from './components/EntityEditor';
import ConnectorEditor from './components/ConnectorEditor';
import { SimulationObjectType } from './app/models/enums';
import { Activity } from './app/models/activity';
import { Entity } from './app/models/entity';
import { Connector } from './app/models/connector';
import { TestingButtons } from './components/TestingButtons';
import { ContentDock } from './components/ContentDock';


const App: React.FC = () => {
  const [editor, setEditor] = useState<JSX.Element | null>(null);

  const handleMessage = (data: any) => {

    // console.log(`handleMessage called with data: ${JSON.stringify(data)}`);
    // console.log("handleMessage called", { data });
    console.log("React: handleMessage called with data:", data);

    if (data.messagetype === 'lucidchartdata') {
      let instanceData = {};

      try {
        instanceData = JSON.parse(data.instancedata || '{}');
        console.log('Parsed instance data:', instanceData);
      } catch (error) {
        console.error('Error parsing instance data:', error);
      }

      console.log("React: instanceData:", instanceData);
      switch (data.simtype) {
        case 'contentdock':
          console.log("React: setEditor to ContentDock")
          setEditor(
            <ContentDock
            />
          );
          break;
        case 'activity':
          console.log("React: setEditor to ActivityEditor")
          setEditor(
            <ActivityEditor
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
              connector={instanceData as Connector}
              onSave={(connector) => console.log(JSON.stringify(connector))}
              onCancel={() => setEditor(null)}
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
      handleMessage(event.data);
    };
    window.addEventListener('message', eventListener);
    // Signal the parent that the React app is ready
    window.parent.postMessage({ messagetype: 'reactAppReady' }, '*');
    return () => {
      console.log('React: Removing message event listener');
      window.removeEventListener('message', eventListener);
    };
  }, []);

  const sendTestMessage = (type: SimulationObjectType) => {
    let testData;
    switch (type) {
      case SimulationObjectType.Activity:
        testData = {
          messagetype: 'lucidchartdata',
          simtype: 'activity',
          version: '1',
          instancedata: JSON.stringify({ id: '123', capacity: 3, name: 'Test Activity', type: SimulationObjectType.Activity })
        };
        break;
      case SimulationObjectType.Entity:
        testData = {
          messagetype: 'lucidchartdata',
          simtype: 'entity',
          version: '1',
          instancedata: JSON.stringify({ id: '456', name: 'Test Entity', type: SimulationObjectType.Entity })
        };
        break;
      case SimulationObjectType.Connector:
        testData = {
          messagetype: 'lucidchartdata',
          simtype: 'connector',
          version: '1',
          instancedata: JSON.stringify({ id: '789', fromActivityId: '123', toActivityId: '456', name: 'Test Connector', type: SimulationObjectType.Connector })
        };
        break;
    }
    handleMessage(testData);
  };

  return (
    <div>
      {!editor && <TestingButtons sendTestMessage={sendTestMessage} />}
      {editor}
    </div>
  );
};

export default App;
