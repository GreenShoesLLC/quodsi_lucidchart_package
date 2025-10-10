import React from "react";
import { FileOutput } from "lucide-react";
import { useMessaging } from "../../messaging/MessageProvider";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";

const OutputForm = () => {
  const { selection, simulation } = useMessaging();
  const modelOpsSender = useModelOpsSender();

  const handleCreatePage = () => {
    const documentId = selection.documentContext?.documentId;
    const jobId = simulation.jobId;

    if (!documentId || !jobId) {
      console.warn("Cannot create results page: missing documentId or jobId");
      return;
    }

    modelOpsSender.createResultsPage(jobId, documentId, "Simulation Results");
  };

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center gap-1 text-blue-600">
        <FileOutput className="w-3 h-3" />
        <h2 className="text-xs font-medium">Simulation Results</h2>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleCreatePage}
          className="w-full flex items-center justify-center gap-1 bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700 transition-colors text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          Create Page
        </button>
      </div>
    </div>
  );
};

export default OutputForm;
