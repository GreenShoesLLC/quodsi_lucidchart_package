import React, { useCallback } from "react";
import { SimComponentType } from "@quodsi/shared";
import { SimulationComponentSelector } from "./SimulationComponentSelector";

interface SelectionContextProviderProps {
  elementId: string;
  currentType?: SimComponentType;
  onTypeChange: (newType: SimComponentType, elementId: string) => void;
  disabled?: boolean;
}

export const SelectionContextProvider: React.FC<SelectionContextProviderProps> =
  React.memo(({ elementId, currentType, onTypeChange, disabled }) => {
    const handleTypeChange = useCallback(
      (newType: SimComponentType, elementId: string) => {
        console.log("[SelectionContext] Type change requested:", {
          elementId,
          from: currentType,
          to: newType,
        });
        onTypeChange(newType, elementId);
      },
      [onTypeChange, currentType]
    );

    return React.createElement(SimulationComponentSelector, {
      currentType,
      elementId, // Pass the elementId here
      onTypeChange: handleTypeChange,
      disabled,
    });
  });
