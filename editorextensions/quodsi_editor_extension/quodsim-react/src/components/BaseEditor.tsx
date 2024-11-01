// Update BaseEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';

interface BaseEditorProps<T> {
  data: T;
  onSave: (data: T) => void;
  onCancel: () => void;
  children: (localData: T, handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void) => React.ReactNode;
  messageType: string;
}

const BaseEditor = <T,>({ data, onSave, onCancel, children, messageType }: BaseEditorProps<T>) => {
  const [localData, setLocalData] = useState<T>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = useCallback(() => {
    onSave(localData);
    window.parent.postMessage({
      messagetype: messageType,
      data: localData
    }, '*');
  }, [localData, onSave, messageType]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <form onSubmit={handleSubmit} className="editor-form">
      {children(localData, handleChange)}
      <div className="editor-buttons">
        <button type="submit" className="lucid-styling primary">Save</button>
        <button type="button" onClick={onCancel} className="lucid-styling secondary">Cancel</button>
      </div>
    </form>
  );
};

export default BaseEditor;