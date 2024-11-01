import React from 'react';
import { Generator } from '../app/models/generator';
import BaseEditor from './BaseEditor';

import { Duration } from '../app/models/duration';
import DurationEditor from './DurationEditor';

interface Props {
  generator: Generator;
  onSave: (generator: Generator) => void;
  onCancel: () => void;
}

const GeneratorEditor: React.FC<Props> = ({ generator, onSave, onCancel }) => {
  const handleDurationChange = (name: string, updatedDuration: Duration) => {
    onSave({ ...generator, [name]: updatedDuration });
  };

  return (
    <BaseEditor
      data={generator}
      onSave={onSave}
      onCancel={onCancel}
      messageType="generatorSaved"
    >
      {(localGenerator, handleChange) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="activityKeyId">Generate at Activity:</label>
            <input
              type="text"
              id="activityKeyId"
              name="activityKeyId"
              className="lucid-styling"
              value={localGenerator.activityKeyId}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="entityType">Entity Type to Generate:</label>
            <input
              type="text"
              id="entityType"
              name="entityType"
              className="lucid-styling"
              value={localGenerator.entityType}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="entitiesPerCreation">Entities Per Generation:</label>
            <input
              type="number"
              id="entitiesPerCreation"
              name="entitiesPerCreation"
              className="lucid-styling"
              value={localGenerator.entitiesPerCreation}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="periodicOccurrences">Generation Count:</label>
            <input
              type="number"
              id="periodicOccurrences"
              name="periodicOccurrences"
              className="lucid-styling"
              value={localGenerator.periodicOccurrences}
              onChange={handleChange}
              min="0"
            />
          </div>

          <DurationEditor
            duration={localGenerator.periodIntervalDuration}
            onChange={(updatedDuration) => handleDurationChange('periodIntervalDuration', updatedDuration)}
          />

          <DurationEditor
            duration={localGenerator.periodicStartDuration}
            onChange={(updatedDuration) => handleDurationChange('periodicStartDuration', updatedDuration)}
          />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="maxEntities">Max Entities:</label>
            <input
              type="number"
              id="maxEntities"
              name="maxEntities"
              className="lucid-styling"
              value={localGenerator.maxEntities}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default GeneratorEditor;