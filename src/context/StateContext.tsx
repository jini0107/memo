import React, { createContext, useReducer, Dispatch, ReactNode, useEffect } from 'react';
import { Item, Category } from '../../types';
import {
  LOCATION_TYPES,
  HOME_LOCATIONS,
  OFFICE_LOCATIONS,
  DIGITAL_LOCATIONS,
  CATEGORIES
} from '../../constants';

// --- STATE ---
interface AppState {
  items: Item[];
  searchTerm: string;
  sortOption: 'latest' | 'name' | 'category';
  viewMode: 'card' | 'table';
  isAdding: boolean;
  selectedItem: Item | null;
  isEditMode: boolean;

  // Form State
  formState: {
    itemName: string;
    locType: string;
    locDetail: string;
    itemCat: string;
    itemNotes: string;
    itemImages: string[];
  };

  isAnalyzing: boolean;
  aiSearchResults: string[] | null;
  isSearchingAI: boolean;

  // Camera State
  isCameraActive: boolean;
  activeCameraSlot: number | null;

  // Config State
  config: {
    locTypes: string[];
    homeLocs: string[];
    officeLocs: string[];
    digitalLocs: string[];
    categories: string[];
  };
  isSettingsOpen: boolean;
}

const initialState: AppState = {
  items: [],
  searchTerm: '',
  sortOption: 'latest',
  viewMode: 'card',
  isAdding: false,
  selectedItem: null,
  isEditMode: false,
  formState: {
    itemName: '',
    locType: LOCATION_TYPES[0],
    locDetail: HOME_LOCATIONS[0],
    itemCat: Category.OTHER,
    itemNotes: '',
    itemImages: [],
  },
  isAnalyzing: false,
  aiSearchResults: null,
  isSearchingAI: false,
  isCameraActive: false,
  activeCameraSlot: null,
  config: {
    locTypes: LOCATION_TYPES,
    homeLocs: HOME_LOCATIONS,
    officeLocs: OFFICE_LOCATIONS,
    digitalLocs: DIGITAL_LOCATIONS,
    categories: CATEGORIES,
  },
  isSettingsOpen: false,
};

// --- ACTIONS ---
type Action =
  | { type: 'SET_ITEMS'; payload: Item[] }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_SORT_OPTION'; payload: 'latest' | 'name' | 'category' }
  | { type: 'SET_VIEW_MODE'; payload: 'card' | 'table' }
  | { type: 'TOGGLE_ADDING'; payload: boolean }
  | { type: 'SET_SELECTED_ITEM'; payload: Item | null }
  | { type: 'TOGGLE_EDIT_MODE'; payload: boolean }
  | { type: 'UPDATE_FORM'; payload: Partial<AppState['formState']> }
  | { type: 'RESET_FORM' }
  | { type: 'SET_IS_ANALYZING'; payload: boolean }
  | { type: 'SET_AI_SEARCH_RESULTS'; payload: string[] | null }
  | { type: 'SET_IS_SEARCHING_AI'; payload: boolean }
  | { type: 'SET_CAMERA_ACTIVE'; payload: { isActive: boolean; slot: number | null } }
  | { type: 'UPDATE_CONFIG'; payload: Partial<AppState['config']> }
  | { type: 'TOGGLE_SETTINGS'; payload: boolean }
  | { type: 'INITIALIZE_STATE'; payload: Partial<AppState> };

// --- REDUCER ---
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return { ...state, ...action.payload };
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_SORT_OPTION':
      return { ...state, sortOption: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'TOGGLE_ADDING':
      return { ...state, isAdding: action.payload, selectedItem: null, isEditMode: false };
    case 'SET_SELECTED_ITEM':
      return { ...state, selectedItem: action.payload, isAdding: false };
    case 'TOGGLE_EDIT_MODE':
      return { ...state, isEditMode: action.payload };
    case 'UPDATE_FORM':
      return { ...state, formState: { ...state.formState, ...action.payload } };
    case 'RESET_FORM':
      return {
        ...state,
        formState: initialState.formState
      };
    case 'SET_IS_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    case 'SET_AI_SEARCH_RESULTS':
      return { ...state, aiSearchResults: action.payload };
    case 'SET_IS_SEARCHING_AI':
      return { ...state, isSearchingAI: action.payload };
    case 'SET_CAMERA_ACTIVE':
      return { ...state, isCameraActive: action.payload.isActive, activeCameraSlot: action.payload.slot };
    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'TOGGLE_SETTINGS':
      return { ...state, isSettingsOpen: action.payload };
    default:
      return state;
  }
};

// --- CONTEXT ---
export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

// --- PROVIDER ---
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('whereisit_items');
      const savedConfig = {
        locTypes: JSON.parse(localStorage.getItem('config_loc_types') || 'null'),
        homeLocs: JSON.parse(localStorage.getItem('config_home_locs') || 'null'),
        officeLocs: JSON.parse(localStorage.getItem('config_office_locs') || 'null'),
        digitalLocs: JSON.parse(localStorage.getItem('config_digital_locs') || 'null'),
        categories: JSON.parse(localStorage.getItem('config_categories') || 'null'),
      };

      const payload: Partial<AppState> = {};
      if (savedItems) {
        payload.items = JSON.parse(savedItems);
      }

      const config: Partial<AppState['config']> = {};
      if (savedConfig.locTypes) config.locTypes = savedConfig.locTypes;
      if (savedConfig.homeLocs) config.homeLocs = savedConfig.homeLocs;
      if (savedConfig.officeLocs) config.officeLocs = savedConfig.officeLocs;
      if (savedConfig.digitalLocs) config.digitalLocs = savedConfig.digitalLocs;
      if (savedConfig.categories) config.categories = savedConfig.categories;

      if (Object.keys(config).length > 0) {
        payload.config = { ...initialState.config, ...config };
      }

      dispatch({ type: 'INITIALIZE_STATE', payload });
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('whereisit_items', JSON.stringify(state.items));
  }, [state.items]);

  useEffect(() => {
    localStorage.setItem('config_loc_types', JSON.stringify(state.config.locTypes));
    localStorage.setItem('config_home_locs', JSON.stringify(state.config.homeLocs));
    localStorage.setItem('config_office_locs', JSON.stringify(state.config.officeLocs));
    localStorage.setItem('config_digital_locs', JSON.stringify(state.config.digitalLocs));
    localStorage.setItem('config_categories', JSON.stringify(state.config.categories));
  }, [state.config]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
