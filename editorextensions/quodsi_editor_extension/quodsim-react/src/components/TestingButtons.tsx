// TestingButtons.tsx
import React from 'react';
import { SimulationObjectType } from '../app/models/enums';
// import { SimulationObjectType } from './yourSimulationTypesFile'; // Adjust this import as needed

interface TestingButtonsProps {
  sendTestMessage: (type: SimulationObjectType) => void;
}

export const TestingButtons: React.FC<TestingButtonsProps> = ({ sendTestMessage }) => {
  return (
    <div>
      <button onClick={() => sendTestMessage(SimulationObjectType.Activity)}>Test Activity</button>
      <button onClick={() => sendTestMessage(SimulationObjectType.Entity)}>Test Entity</button>
      <button onClick={() => sendTestMessage(SimulationObjectType.Connector)}>Test Connector</button>
    </div>
  );
};