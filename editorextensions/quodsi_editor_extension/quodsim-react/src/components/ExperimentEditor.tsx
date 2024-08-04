// ExperimentEditor.tsx
import React, { useState } from 'react';
import { Experiment } from '../app/models/experiment';
import { Scenario } from '../app/models/scenario';

const ExperimentEditor: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);

  const handleAddExperiment = () => {
    // Logic to add a new experiment
  };

  const handleEditExperiment = (experiment: Experiment) => {
    // Logic to edit an existing experiment
  };

  const handleDeleteExperiment = (experiment: Experiment) => {
    // Logic to delete an experiment
  };

  const handleSelectExperiment = (experiment: Experiment) => {
    setSelectedExperiment(experiment);
  };

  const handleRunScenario = (scenario: Scenario) => {
    // Logic to run a scenario
  };

  const handleAddScenario = () => {
    // Logic to add a new scenario to the selected experiment
  };

  const handleEditScenario = (scenario: Scenario) => {
    // Logic to edit an existing scenario
  };

  const handleDeleteScenario = (scenario: Scenario) => {
    // Logic to delete a scenario from the selected experiment
  };

  const handleDuplicateScenario = (scenario: Scenario) => {
    // Logic to duplicate a scenario within the selected experiment
  };

  return (
    <div>
      <h2>Experiments</h2>
      <ul>
        {experiments.map((experiment) => (
          <li key={experiment.id}>
            <span onClick={() => handleSelectExperiment(experiment)}>{experiment.name}</span>
            <button onClick={() => handleEditExperiment(experiment)}>Edit</button>
            <button onClick={() => handleDeleteExperiment(experiment)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={handleAddExperiment}>Add Experiment</button>

      {selectedExperiment && (
        <div>
          <h3>Scenarios for {selectedExperiment.name}</h3>
          <ul>
            {selectedExperiment.scenarios.map((scenario) => (
              <li key={scenario.id}>
                <span>{scenario.name}</span>
                <button onClick={() => handleRunScenario(scenario)}>Run</button>
                <button onClick={() => handleEditScenario(scenario)}>Edit</button>
                <button onClick={() => handleDeleteScenario(scenario)}>Delete</button>
                <button onClick={() => handleDuplicateScenario(scenario)}>Duplicate</button>
              </li>
            ))}
          </ul>
          <button onClick={handleAddScenario}>Add Scenario</button>
        </div>
      )}
    </div>
  );
};

export default ExperimentEditor;