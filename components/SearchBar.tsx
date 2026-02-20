import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';
import { searchWithGemini } from '../services/geminiService';

/**
 * SearchBar 컴포넌트
 * - 키워드 검색 + AI 검색 지원
 * - 프리미엄 글래스 디자인 적용
 */
const SearchBar: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { searchTerm, isSearchingAI, aiSearchResults, items } = state;

  // AI 검색 실행
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

  // AI 검색 초기화
  const resetAISearch = () => {
    dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
  };

  return (
    <div className="w-full">
      {/* 검색 입력창 */}
      <div className="relative">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-300 text-sm"></i>
          <input
            type="text"
            placeholder="물건 이름, 장소, 메모로 검색..."
            className="input-field w-full pl-11 pr-12"
            value={searchTerm}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
          />

          {/* AI 검색 버튼 / 로딩 인디케이터 */}
          {searchTerm && (
            <button
              onClick={handleAISearch}
              disabled={isSearchingAI}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs transition-all touch-feedback disabled:opacity-50"
            >
              {isSearchingAI ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-wand-magic-sparkles"></i>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI 검색 활성 상태 뱃지 */}
      {aiSearchResults && (
        <div className="mt-2.5 px-3.5 py-2.5 flex items-center justify-between rounded-xl border border-primary-100 animate-fade-in-scale"
          style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}
        >
          <p className="text-xs font-bold text-primary-600 flex items-center gap-1.5">
            <i className="fas fa-wand-magic-sparkles text-primary-400"></i>
            AI 검색 활성
            <span className="badge badge-primary ml-1">{aiSearchResults.length}건</span>
          </p>
          <button
            onClick={resetAISearch}
            className="text-[11px] font-bold text-surface-400 hover:text-surface-600 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-surface-200 transition-all touch-feedback"
          >
            <i className="fas fa-times text-[9px]"></i>
            해제
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;