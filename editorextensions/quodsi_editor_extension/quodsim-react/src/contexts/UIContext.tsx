import React, { createContext, useContext, useReducer } from 'react';
import { DiagramElementType } from '@quodsi/shared';

// Define the state structure for UI-related data
export interface UIState {
  isProcessing: boolean;
  error: string | null;
  panelType: "auth" | "model" | null;
  showModelName: boolean;
  showModelItemName: boolean;
  isReady: boolean;
  visibleSections: {
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean;
  };
}

// Initial state
const initialUIState: UIState = {
  isProcessing: false,
  error: null,
  panelType: window.location.pathname.includes("auth") ? "auth" : null,
  showModelName: true,
  showModelItemName: true,
  isReady: false,
  visibleSections: {
    header: true,
    validation: false,
    editor: true,
    modelTree: false,
  },
};

// Define the action types for the reducer
type UIAction =
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PANEL_TYPE'; payload: "auth" | "model" | null }
  | { type: 'SET_SHOW_MODEL_NAME'; payload: boolean }
  | { type: 'SET_SHOW_MODEL_ITEM_NAME'; payload: boolean }
  | { type: 'SET_IS_READY'; payload: boolean }
  | { type: 'SET_VISIBLE_SECTIONS'; payload: UIState['visibleSections'] }
  | { type: 'SHOW_SECTION'; payload: keyof UIState['visibleSections'] }
  | { type: 'HIDE_SECTION'; payload: keyof UIState['visibleSections'] };

// Helper functions
interface UIContextHelpers {
  setError: (error: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  setPanelType: (panelType: "auth" | "model" | null) => void;
  showSection: (section: keyof UIState['visibleSections']) => void;
  hideSection: (section: keyof UIState['visibleSections']) => void;
}

// Create the context with an undefined default value
export const UIContext = createContext<
  | (UIContextHelpers & {
      state: UIState;
      dispatch: React.Dispatch<UIAction>;
    })
  | undefined
>(undefined);

// Reducer function
function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_PANEL_TYPE':
      return { ...state, panelType: action.payload };
      
    case 'SET_SHOW_MODEL_NAME':
      return { ...state, showModelName: action.payload };
      
    case 'SET_SHOW_MODEL_ITEM_NAME':
      return { ...state, showModelItemName: action.payload };
      
    case 'SET_IS_READY':
      return { ...state, isReady: action.payload };
      
    case 'SET_VISIBLE_SECTIONS':
      return { ...state, visibleSections: action.payload };
      
    case 'SHOW_SECTION':
      return { 
        ...state, 
        visibleSections: {
          ...state.visibleSections,
          [action.payload]: true
        }
      };
      
    case 'HIDE_SECTION':
      return { 
        ...state, 
        visibleSections: {
          ...state.visibleSections,
          [action.payload]: false
        }
      };
      
    default:
      return state;
  }
}

// Provider component
export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);
  
  // Helper functions that dispatch actions
  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };
  
  const setProcessing = (isProcessing: boolean) => {
    dispatch({ type: 'SET_PROCESSING', payload: isProcessing });
  };
  
  const setPanelType = (panelType: "auth" | "model" | null) => {
    dispatch({ type: 'SET_PANEL_TYPE', payload: panelType });
  };
  
  const showSection = (section: keyof UIState['visibleSections']) => {
    dispatch({ type: 'SHOW_SECTION', payload: section });
  };
  
  const hideSection = (section: keyof UIState['visibleSections']) => {
    dispatch({ type: 'HIDE_SECTION', payload: section });
  };
  
  // Combine state, dispatch and helper functions
  const contextValue = {
    state,
    dispatch,
    setError,
    setProcessing,
    setPanelType,
    showSection,
    hideSection
  };
  
  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

// Custom hook for using the UI context
export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
