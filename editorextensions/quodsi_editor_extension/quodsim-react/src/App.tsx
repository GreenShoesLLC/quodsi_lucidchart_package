import React, { useState, useEffect } from 'react';
import ActivityEditor from './components/ActivityEditor';
import EntityEditor from './components/EntityEditor';
import ConnectorEditor from './components/ConnectorEditor';
import { SimulationObjectType } from './app/models/enums';
import { Activity } from './app/models/activity';
import { Entity } from './app/models/entity';
import { Connector } from './app/models/connector';


const App: React.FC = () => {
  const [editor, setEditor] = useState<JSX.Element | null>(null);

  const handleMessage = (data: any) => {

    // console.log(`handleMessage called with data: ${JSON.stringify(data)}`);
    // console.log("handleMessage called", { data });
    console.log("handleMessage called with data:", data);

    if (data.messagetype === 'lucidchartdata') {
      const instanceData = JSON.parse(data.instancedata);
      console.log("instanceData:", instanceData);
      switch (data.simtype) {
        case 'activity':
          console.log("setEditor to ActivityEditor")
          setEditor(
            <ActivityEditor
              activity={instanceData as Activity}
              onSave={(activity) => console.log(JSON.stringify(activity))}
              onCancel={() => setEditor(null)}
            />
          );
          break;
        case 'entity':
          console.log("setEditor to EntityEditor")
          setEditor(
            <EntityEditor
              entity={instanceData as Entity}
              onSave={(entity) => console.log(JSON.stringify(entity))}
              onCancel={() => setEditor(null)}
            />
          );
          break;
        case 'connector':
          console.log("setEditor to ConnectorEditor")
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
    console.log('Adding message event listener');
    const eventListener = (event: MessageEvent) => {
      console.log('Received message event:', event);
      handleMessage(event.data);
    };
    window.addEventListener('message', eventListener);
    // Signal the parent that the React app is ready
    window.parent.postMessage({ messagetype: 'reactAppReady' }, '*');
    return () => {
      console.log('Removing message event listener');
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
      {!editor && (
        <div>
          <button onClick={() => sendTestMessage(SimulationObjectType.Activity)}>Test Activity2</button>
          <button onClick={() => sendTestMessage(SimulationObjectType.Entity)}>Test Entity2</button>
          <button onClick={() => sendTestMessage(SimulationObjectType.Connector)}>Test Connector2</button>
        </div>
      )}
      {editor}
    </div>
  );
};

export default App;
