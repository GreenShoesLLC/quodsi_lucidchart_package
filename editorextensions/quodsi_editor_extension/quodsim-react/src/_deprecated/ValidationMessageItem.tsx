import React from "react";
import { ValidationMessage } from "@quodsi/shared";
import { AlertTriangle, XCircle, Info } from "lucide-react";

interface ValidationMessageItemProps {
  message: ValidationMessage;
}

const ValidationMessageItem: React.FC<ValidationMessageItemProps> = ({
  message,
}) => {
  const getMessageStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "error":
        return {
          container: "bg-red-50 border-l-4 border-red-500 p-4 mb-2",
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: "text-red-700",
        };
      case "warning":
        return {
          container: "bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-2",
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          text: "text-yellow-700",
        };
      default:
        return {
          container: "bg-blue-50 border-l-4 border-blue-500 p-4 mb-2",
          icon: <Info className="h-5 w-5 text-blue-500" />,
          text: "text-blue-700",
        };
    }
  };

  const style = getMessageStyle(message.type);

  return (
    <div className={style.container}>
      <div className="flex">
        <div className="flex-shrink-0">{style.icon}</div>
        <div className="ml-3">
          <p className={`text-sm ${style.text}`}>{message.message}</p>
        </div>
      </div>
    </div>
  );
};

export default ValidationMessageItem;
