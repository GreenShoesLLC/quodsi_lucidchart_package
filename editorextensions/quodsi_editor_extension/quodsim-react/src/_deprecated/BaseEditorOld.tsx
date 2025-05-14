import React, { useState, useEffect } from "react";
import { SimulationObjectType } from "@quodsi/shared";

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

const BaseEditorOld = <T extends BaseSimulationElement>({
  data,
  onSave,
  onCancel,
  children,
  messageType,
}: BaseEditorProps<T>) => {
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
      <div className="flex space-x-3 mt-4 justify-end">
        <button
          type="submit"
          className="px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default BaseEditorOld;
