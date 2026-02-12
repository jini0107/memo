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
    } finally {
      dispatch({ type: 'SET_IS_SEARCHING_AI', payload: false });
    }
  };

  const resetAISearch = () => {
    dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
  };

  return (
    <div className="px-6 py-2 bg-transparent sticky top-[80px] z-40 mb-4">
      <div className="relative group flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search items..."
            className="w-full pl-12 pr-4 py-3 bg-[#f7f7f7] rounded-2xl border-2 border-[#e5e5e5] border-b-4 focus:bg-white focus:border-duo-blue focus:outline-none transition-all text-lg font-bold text-[#4b4b4b] placeholder:text-gray-400 placeholder:font-medium"
            value={searchTerm}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
          />
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>

          {isSearchingAI && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <i className="fas fa-spinner fa-spin text-duo-blue"></i>
            </div>
          )}
        </div>
      </div>

      {aiSearchResults && (
        <div className="mt-3 px-4 py-3 flex items-center justify-between bg-duo-green/10 rounded-xl border-2 border-duo-green/20">
          <p className="text-sm font-bold text-duo-green flex items-center">
            <i className="fas fa-magic mr-2"></i> AI Search Active
          </p>
          <button
            onClick={resetAISearch}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider btn-3d bg-white px-2 py-1 rounded-lg border border-gray-200"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;