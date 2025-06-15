import React, { useState, useEffect } from "react";
import { SimulationObjectType } from "@quodsi/shared";

const isDevelopment = process.env.NODE_ENV === 'development';

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
  const [localData, setLocalData] = useState<T>(data);

  useEffect(() => {
    if (isDevelopment) {
      console.log("BaseEditor useEffect - new data:", data);
    }
    setLocalData(data);
  }, [data]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setLocalData((prev) => {
      if (isDevelopment) {
        console.log("BaseEditor handleChange:", { prev, name, value });
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSave = () => {
    if (isDevelopment) {
      console.log("BaseEditor handleSave:", localData);
    }
    if (localData.type === SimulationObjectType.Activity) {
      onSave({
        ...localData,
        type: localData.type || data.type,
        operationSteps: (localData as any).operationSteps, // Explicitly pass operationSteps
      });
    } else {
      onSave({
        ...localData,
        type: localData.type || data.type,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {children(localData, handleChange)}
      <div className="flex space-x-2 mt-2 justify-end">
        <button 
          type="submit" 
          className="px-2 py-1 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 transition-colors text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 bg-white text-gray-700 border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-colors text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default BaseEditor;