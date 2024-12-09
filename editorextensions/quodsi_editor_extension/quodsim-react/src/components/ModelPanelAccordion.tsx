import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ModelStructure, SimulationObjectType } from '@quodsi/shared';

interface ModelPanelAccordionProps {
  modelStructure: ModelStructure;
  elementEditor: React.ReactNode;
  validation: React.ReactNode;
}

interface TreeNodeProps {
  node: {
    id: string;
    name: string;
    type: SimulationObjectType;
    hasChildren: boolean;
    children?: TreeNodeProps['node'][];
  };
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getTypeColor = (type: SimulationObjectType): string => {
    const colors: Record<SimulationObjectType, string> = {
      [SimulationObjectType.Activity]: 'bg-blue-100 text-blue-800',
      [SimulationObjectType.Connector]: 'bg-green-100 text-green-800',
      [SimulationObjectType.Resource]: 'bg-purple-100 text-purple-800',
      [SimulationObjectType.Generator]: 'bg-yellow-100 text-yellow-800',
      [SimulationObjectType.Entity]: 'bg-red-100 text-red-800',
      [SimulationObjectType.Model]: 'bg-gray-100 text-gray-800',
      [SimulationObjectType.Scenario]: 'bg-gray-100 text-gray-800',
      [SimulationObjectType.Experiment]: 'bg-gray-100 text-gray-800',
      [SimulationObjectType.None]: 'bg-gray-100 text-gray-800'
    };
    return colors[type];
  };

  return (
    <div>
      <div 
        className={`
          flex items-center gap-2 p-2 mx-1 my-0.5 rounded-md
          hover:bg-gray-50 cursor-pointer transition-colors
          border border-transparent hover:border-gray-200
        `}
        style={{ marginLeft: `${level * 16}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronRight 
          className={`w-4 h-4 text-gray-400 transform transition-transform duration-200
          ${isExpanded ? 'rotate-90' : ''}`}
        />
        <div className={`px-2 py-0.5 rounded-md text-sm ${getTypeColor(node.type)}`}>
          {node.name}
        </div>
      </div>
      {isExpanded && node.children?.map(child => 
        <TreeNode key={child.id} node={child} level={level + 1} />
      )}
    </div>
  );
};

const ModelPanelAccordion: React.FC<ModelPanelAccordionProps> = ({
  modelStructure,
  elementEditor,
  validation
}) => {
  const [openSection, setOpenSection] = useState<string>('structure');

  return (
    <div className="w-full bg-white rounded shadow border">
      {/* Model Structure Section */}
      <div className="border-b">
        <button
          onClick={() => setOpenSection(openSection === 'structure' ? '' : 'structure')}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">Model Structure</span>
          <ChevronDown className={`w-4 h-4 transform transition-transform ${openSection === 'structure' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'structure' && (
          <div className="p-2">
            <div className="border rounded max-h-[400px] overflow-y-auto">
              {modelStructure.elements.map(node => <TreeNode key={node.id} node={node} />)}
            </div>
          </div>
        )}
      </div>

      {/* Element Editor Section */}
      <div className="border-b">
        <button
          onClick={() => setOpenSection(openSection === 'editor' ? '' : 'editor')}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">Element Editor</span>
          <ChevronDown className={`w-4 h-4 transform transition-transform ${openSection === 'editor' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'editor' && (
          <div className="p-4">{elementEditor}</div>
        )}
      </div>

      {/* Validation Section */}
      <div>
        <button
          onClick={() => setOpenSection(openSection === 'validation' ? '' : 'validation')}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">Validation</span>
          <ChevronDown className={`w-4 h-4 transform transition-transform ${openSection === 'validation' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'validation' && (
          <div className="p-4">{validation}</div>
        )}
      </div>
    </div>
  );
};

export default ModelPanelAccordion;