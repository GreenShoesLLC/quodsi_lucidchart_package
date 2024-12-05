import React, { useState, useEffect } from "react";
import { SimulationObjectType } from "../shared/types/elements/SimulationObjectType";

// Define the minimum interface that T must satisfy
interface BaseSimulationElement {
  id: string;
  type: SimulationObjectType;
}

interface BaseEditorProps<T extends BaseSimulationElement> {
  data: T;
  onSave: (data: T) => void;
  onCancel: () => void;
  children: (
    localData: T,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => React.ReactNode;
  messageType: string;
}

const BaseEditor = <T extends BaseSimulationElement>({
  data,
  onSave,
  onCancel,
  children,
  messageType,
}: BaseEditorProps<T>) => {
  // Ensure we keep the full data including type
  const [localData, setLocalData] = useState<T>(data);

  useEffect(() => {
    console.log("BaseEditor useEffect - new data:", data);
    setLocalData(data);
  }, [data]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setLocalData((prev) => {
      console.log("BaseEditor handleChange:", { prev, name, value });
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSave = () => {
    console.log("BaseEditor handleSave:", localData);
    // Preserve all data including type when saving
    onSave({
      ...localData,
      // Ensure type is preserved from original data if not in localData
      type: localData.type || data.type,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <form onSubmit={handleSubmit} className="editor-form">
      {children(localData, handleChange)}
      <div className="editor-buttons">
        <button type="submit" className="lucid-styling primary">
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="lucid-styling secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default BaseEditor;
