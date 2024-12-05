import { createContext } from 'react';
import { ModelDefinition } from '../shared/types/elements/ModelDefinition';

interface ModelContextType {
    modelDefinition: ModelDefinition | null;
}

export const ModelContext = createContext<ModelContextType>({
    modelDefinition: null
});