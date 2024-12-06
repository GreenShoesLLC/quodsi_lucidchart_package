import { createContext } from 'react';
import { ModelDefinition } from '@quodsi/shared';

interface ModelContextType {
    modelDefinition: ModelDefinition | null;
}

export const ModelContext = createContext<ModelContextType>({
    modelDefinition: null
});