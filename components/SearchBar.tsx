import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';
import { searchWithGemini } from '../services/geminiService';

/**
 * SearchBar 컴포넌트: 물건을 찾을 수 있는 검색창입니다.
 * 글자를 입력하면 해당하는 물건들을 찾아줍니다.
 */
const SearchBar: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { searchTerm, isSearchingAI, aiSearchResults, items } = state;

  // AI 검색을 실행하는 함수입니다. (엔터 키를 누르면 실행)
  const handleAISearch = async () => {
    if (!searchTerm.trim()) return; // 검색어가 없으면 멈춥니다.
    dispatch({ type: 'SET_IS_SEARCHING_AI', payload: true }); // "검색 중..." 상태로 변경
    try {
      const results = await searchWithGemini(searchTerm, items); // AI에게 물어봅니다.
      dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: results }); // 결과를 저장합니다.
    } catch (error) {
      console.error("AI Search failed", error);
      // Alert is handled in the service
    } finally {
      dispatch({ type: 'SET_IS_SEARCHING_AI', payload: false }); // 검색 끝!
    }
  };

  // 검색 결과를 초기화하는 함수입니다.
  const resetAISearch = () => {
    dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
  };

  return (
    <div className="px-6 py-4 bg-transparent sticky top-[110px] z-40">
      <div className="relative group flex gap-2">
        <div className="relative flex-1">
          {/* 실제 검색어를 입력하는 칸 */}
          <input
            type="text"
            placeholder="어떤 물건을 찾으시나요?"
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-md rounded-3xl border border-white/50 focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all text-base shadow-xl card-shadow outline-none"
            value={searchTerm}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()} // 엔터를 치면 AI 검색 실행
          />
          {/* 돋보기 아이콘 */}
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-brand-400 text-lg transition-transform group-focus-within:scale-110"></i>
        </div>

      </div>

      {/* AI 검색 결과가 있으면 화면에 표시해줍니다. */}
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