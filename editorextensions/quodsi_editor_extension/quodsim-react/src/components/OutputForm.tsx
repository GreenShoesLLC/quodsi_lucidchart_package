import React, { useState } from "react";
import { FileOutput } from "lucide-react";
import { ExtensionMessaging, MessageTypes } from "@quodsi/shared";

const OutputForm = () => {
  const [pageName, setPageName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pageName.trim()) {
      ExtensionMessaging.getInstance().sendMessage(
        MessageTypes.OUTPUT_CREATE_PAGE,
        { pageName: pageName.trim() }
      );
      setPageName("");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-blue-600">
        <FileOutput className="w-5 h-5" />
        <h2 className="font-medium">Output Page Setup</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Output Page Name
          </label>
          <input
            type="text"
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Enter page name"
          />
        </div>

        <button
          type="submit"
          disabled={!pageName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Page
        </button>
      </form>
    </div>
  );
};

export default OutputForm;
