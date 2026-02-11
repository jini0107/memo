import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';
import { searchWithGemini } from '../services/geminiService';

const SearchBar: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { searchTerm, isSearchingAI, aiSearchResults, items } = state;

  const handleAISearch = async () => {
    if (!searchTerm.trim()) return;
    dispatch({ type: 'SET_IS_SEARCHING_AI', payload: true });
    try {
      const results = await searchWithGemini(searchTerm, items);
      dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: results });
    } catch (error) {
      console.error("AI Search failed", error);
      // Alert is handled in the service
    } finally {
      dispatch({ type: 'SET_IS_SEARCHING_AI', payload: false });
    }
  };

  const resetAISearch = () => {
    dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
  };

  return (
    <div className="px-6 py-4 bg-transparent sticky top-[110px] z-40">
      <div className="relative group flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="어떤 물건을 찾으시나요?"
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-md rounded-3xl border border-white/50 focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all text-base shadow-xl card-shadow outline-none"
            value={searchTerm}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
          />
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-brand-400 text-lg transition-transform group-focus-within:scale-110"></i>
        </div>

      </div>
      {aiSearchResults && (
        <div className="mt-2 px-2 flex items-center justify-between">
          <p className="text-xs font-bold text-brand-600">
            <i className="fas fa-magic mr-1"></i> AI가 분석한 검색 결과입니다.
          </p>
          <button
            onClick={resetAISearch}
            className="text-xs font-bold text-gray-400 hover:text-gray-600"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;