import React, { createContext, Dispatch, ReactNode, useEffect, useReducer } from 'react';
import { User } from '@supabase/supabase-js';
import { Category, Item } from '../../types';
import {
  CATEGORIES,
  DIGITAL_LOCATIONS,
  HOME_LOCATIONS,
  LOCATION_TYPES,
  OFFICE_LOCATIONS,
} from '../../constants';
import { getCurrentUser } from '../../services/authService';
import { supabaseService } from '../../services/supabaseService';

interface FormState {
  itemName: string;
  locType: string;
  locDetail: string;
  itemCat: string;
  itemNotes: string;
  itemImages: string[];
  itemImagePaths: string[];
  itemImageFiles: Array<File | null>;
  isSecret: boolean;
}

interface AppState {
  items: Item[];
  /** 현재 로그인된 사용자 정보. null이면 미로그인 상태. */
  authUser: User | null;
  searchTerm: string;
  sortOption: 'latest' | 'name' | 'category';
  viewMode: 'card' | 'table';
  isAdding: boolean;
  selectedItem: Item | null;
  isEditMode: boolean;
  formState: FormState;
  isAnalyzing: boolean;
  aiSearchResults: string[] | null;
  isSearchingAI: boolean;
  security: {
    failCount: number;
    lockedUntil: number | null;
    isAuthenticated: boolean;
  };
  config: {
    locTypes: string[];
    homeLocs: string[];
    officeLocs: string[];
    digitalLocs: string[];
    categories: string[];
    secretPin?: string;
    secretHint?: string;
  };
  isSettingsOpen: boolean;
}

const createInitialFormState = (): FormState => ({
  itemName: '',
  locType: LOCATION_TYPES[0],
  locDetail: HOME_LOCATIONS[0],
  itemCat: Category.OTHER,
  itemNotes: '',
  itemImages: ['', ''],
  itemImagePaths: ['', ''],
  itemImageFiles: [null, null],
  isSecret: false,
});

const initialState: AppState = {
  items: [],
  authUser: null, // 초기에는 미로그인 상태
  searchTerm: '',
  sortOption: 'latest',
  viewMode: 'card',
  isAdding: false,
  selectedItem: null,
  isEditMode: false,
  formState: createInitialFormState(),
  isAnalyzing: false,
  aiSearchResults: null,
  isSearchingAI: false,
  security: {
    failCount: 0,
    lockedUntil: null,
    isAuthenticated: false,
  },
  config: {
    locTypes: LOCATION_TYPES,
    homeLocs: HOME_LOCATIONS,
    officeLocs: OFFICE_LOCATIONS,
    digitalLocs: DIGITAL_LOCATIONS,
    categories: CATEGORIES,
  },
  isSettingsOpen: false,
};

type Action =
  | { type: 'SET_ITEMS'; payload: Item[] }
  | { type: 'SET_AUTH_USER'; payload: User | null }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_SORT_OPTION'; payload: 'latest' | 'name' | 'category' }
  | { type: 'SET_VIEW_MODE'; payload: 'card' | 'table' }
  | { type: 'TOGGLE_ADDING'; payload: boolean }
  | { type: 'SET_SELECTED_ITEM'; payload: Item | null }
  | { type: 'TOGGLE_EDIT_MODE'; payload: boolean }
  | { type: 'UPDATE_FORM'; payload: Partial<FormState> }
  | { type: 'RESET_FORM' }
  | { type: 'SET_IS_ANALYZING'; payload: boolean }
  | { type: 'SET_AI_SEARCH_RESULTS'; payload: string[] | null }
  | { type: 'SET_IS_SEARCHING_AI'; payload: boolean }
  | { type: 'UPDATE_CONFIG'; payload: Partial<AppState['config']> }
  | { type: 'TOGGLE_SETTINGS'; payload: boolean }
  | { type: 'INITIALIZE_STATE'; payload: Partial<AppState> }
  | { type: 'INCREMENT_PIN_FAIL' }
  | { type: 'RESET_PIN_FAIL' }
  | { type: 'RESET_PIN_LOCK' }
  | { type: 'SET_PIN_LOCKED'; payload: number }
  | { type: 'SET_AUTHENTICATED'; payload: boolean };

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return { ...state, ...action.payload };
    case 'SET_AUTH_USER':
      return { ...state, authUser: action.payload };
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
      return { ...state, formState: createInitialFormState() };
    case 'SET_IS_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    case 'SET_AI_SEARCH_RESULTS':
      return { ...state, aiSearchResults: action.payload };
    case 'SET_IS_SEARCHING_AI':
      return { ...state, isSearchingAI: action.payload };
    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'TOGGLE_SETTINGS':
      return { ...state, isSettingsOpen: action.payload };
    case 'INCREMENT_PIN_FAIL':
      return {
        ...state,
        security: {
          ...state.security,
          failCount: state.security.failCount + 1,
        },
      };
    case 'RESET_PIN_FAIL':
      return {
        ...state,
        security: {
          ...state.security,
          failCount: 0,
          lockedUntil: null,
        },
      };
    case 'RESET_PIN_LOCK':
      return {
        ...state,
        security: {
          ...state.security,
          lockedUntil: null,
        },
      };
    case 'SET_PIN_LOCKED':
      return {
        ...state,
        security: {
          ...state.security,
          lockedUntil: action.payload,
        },
      };
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        security: {
          ...state.security,
          isAuthenticated: action.payload,
          failCount: 0,
        },
      };
    default:
      return state;
  }
};

export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // 1단계: localStorage 캐시 즉시 표시 (빠른 초기 렌더링)
        const savedItems = localStorage.getItem('whereisit_items');
        const savedConfig = {
          locTypes: JSON.parse(localStorage.getItem('config_loc_types') || 'null'),
          homeLocs: JSON.parse(localStorage.getItem('config_home_locs') || 'null'),
          officeLocs: JSON.parse(localStorage.getItem('config_office_locs') || 'null'),
          digitalLocs: JSON.parse(localStorage.getItem('config_digital_locs') || 'null'),
          categories: JSON.parse(localStorage.getItem('config_categories') || 'null'),
          secretPin: localStorage.getItem('config_secret_pin') || undefined,
          secretHint: localStorage.getItem('config_secret_hint') || undefined,
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
        if (savedConfig.secretPin) config.secretPin = savedConfig.secretPin;
        if (savedConfig.secretHint) config.secretHint = savedConfig.secretHint;

        if (Object.keys(config).length > 0) {
          payload.config = { ...initialState.config, ...config };
        }

        dispatch({ type: 'INITIALIZE_STATE', payload });

        // 2단계: 기존 로그인 세션 확인 (이메일 인증 방식)
        const user = await getCurrentUser();
        if (user) {
          dispatch({ type: 'SET_AUTH_USER', payload: user });
          // 3단계: 로그인된 경우에만 클라우드에서 최신 아이템 fetch
          const cloudItems = await supabaseService.fetchItems();
          dispatch({ type: 'SET_ITEMS', payload: cloudItems });
        }
      } catch (error) {
        console.error('Failed to initialize application state:', error);
      }
    };

    void initializeData();
  }, []);

  useEffect(() => {
    try {
      // [M-1 Fix] localStorage에는 만료되는 imageUrls를 저장하지 않고 imagePaths(경로)만 보존합니다.
      // 앱 재시작 시 Supabase에서 항상 새 Signed URL을 발급받아 교체하므로 이미지 깨짐이 사라집니다.
      const itemsToCache = state.items.map((item) => ({
        ...item,
        imageUrls: [], // 만료 위험이 있는 Signed URL은 캐시에 저장하지 않음
      }));
      localStorage.setItem('whereisit_items', JSON.stringify(itemsToCache));
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        console.warn('LocalStorage is full. Items will remain available from Supabase only.');
      } else {
        console.error('Failed to save items to localStorage:', error);
      }
    }
  }, [state.items]);

  useEffect(() => {
    localStorage.setItem('config_loc_types', JSON.stringify(state.config.locTypes));
    localStorage.setItem('config_home_locs', JSON.stringify(state.config.homeLocs));
    localStorage.setItem('config_office_locs', JSON.stringify(state.config.officeLocs));
    localStorage.setItem('config_digital_locs', JSON.stringify(state.config.digitalLocs));
    localStorage.setItem('config_categories', JSON.stringify(state.config.categories));

    if (state.config.secretPin) {
      localStorage.setItem('config_secret_pin', state.config.secretPin);
    } else {
      localStorage.removeItem('config_secret_pin');
    }

    if (state.config.secretHint) {
      localStorage.setItem('config_secret_hint', state.config.secretHint);
    } else {
      localStorage.removeItem('config_secret_hint');
    }
  }, [state.config]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
