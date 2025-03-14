import React from "react";
import { FileOutput } from "lucide-react";
import { ExtensionMessaging, MessageTypes } from "@quodsi/shared";

const OutputForm = () => {
  const handleCreatePage = () => {
    // Now sending an empty page name - you may need to adjust the backend to handle this
    ExtensionMessaging.getInstance().sendMessage(
      MessageTypes.OUTPUT_CREATE_PAGE,
      { pageName: "Output Page" } // Using a default name instead of user input
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-blue-600">
        <FileOutput className="w-5 h-5" />
        <h2 className="font-medium">Simulation Results</h2>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleCreatePage}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Page
        </button>
      </div>
    </div>
  );
};

export default OutputForm;
