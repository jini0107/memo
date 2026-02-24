import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';
import { Item } from '../types';
import { DELETE_CONFIRM_MESSAGE } from '../constants';

interface ItemListProps {
  items: Item[];
  onDelete: (id: string) => void;
  onItemClick?: (item: Item) => void;
}

/**
 * ItemList 컴포넌트
 * - 카드 뷰 / 테이블 뷰 지원
 * - 프리미엄 카드 디자인 + 마이크로 인터랙션
 */
const ItemList: React.FC<ItemListProps> = ({ items, onDelete, onItemClick }) => {
  const { state, dispatch } = useContext(AppContext);

  const handleItemClick = (item: Item) => {
    if (onItemClick) {
      onItemClick(item);
    } else {
      dispatch({ type: 'SET_SELECTED_ITEM', payload: item });
    }
  };

  /**
   * 카테고리별 색상 매핑
   * - 각 카테고리에 고유한 그라데이션 색상 부여
   */
  const getCategoryColor = (category: string): { bg: string; text: string; dot: string } => {
    const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
      '서류/문서': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
      '가전/IT': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400' },
      '의류/패션': { bg: 'bg-pink-50', text: 'text-pink-600', dot: 'bg-pink-400' },
      '생활용품': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
      '디지털 정보': { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' },
      '기타': { bg: 'bg-surface-100', text: 'text-surface-600', dot: 'bg-surface-400' },
    };
    return colorMap[category] || colorMap['기타'];
  };

  /**
   * 장소 타입별 아이콘 매핑
   */
  const getLocationIcon = (locationPath: string): string => {
    const locType = locationPath.split(' > ')[0] || '';
    const iconMap: Record<string, string> = {
      '집': 'fa-house',
      '사무실': 'fa-building',
      '디지털저장소': 'fa-cloud',
      '기타': 'fa-location-dot',
    };
    return iconMap[locType] || 'fa-location-dot';
  };

  /**
   * 상대 시간 포맷터
   */
  const getRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return new Date(timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };


  // ═══════════ 빈 상태 (아이템 없음) ═══════════
  if (items.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in-scale">
        <div className="w-20 h-20 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-5">
          <i className="fas fa-search text-3xl text-surface-300"></i>
        </div>
        <p className="text-base font-bold text-surface-500 mb-1">검색 결과가 없습니다</p>
        <p className="text-sm text-surface-400">다른 키워드로 검색해보세요</p>
      </div>
    );
  }

  // ═══════════ 테이블 뷰 ═══════════
  if (state.viewMode === 'table') {
    return (
      <div className="pb-28 space-y-2 animate-fade-in">
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`list-item-interactive card flex items-center gap-3 p-3 cursor-pointer ${item.isSecret ? 'bg-indigo-50/50' : ''}`}
            style={{ animationDelay: `${idx * 0.03}s` }}
          >
            {/* 썸네일 또는 아이콘 */}
            <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${item.isSecret ? 'bg-indigo-50' : 'bg-surface-100'}`}>
              {item.isSecret ? (
                <i className="fas fa-lock text-indigo-300 text-xs"></i>
              ) : item.imageUrls && item.imageUrls[0] ? (
                <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <i className={`fas ${getLocationIcon(item.locationPath)} text-surface-300 text-sm`}></i>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-surface-800 text-sm truncate">{item.name}</p>
              <p className="text-[11px] text-surface-400 font-medium truncate">
                {item.isSecret ? (
                  <span className="text-surface-200 flex items-center gap-1"><i className="fas fa-eye-slash text-[9px]"></i> 비공개</span>
                ) : (
                  <>
                    <i className={`fas ${getLocationIcon(item.locationPath)} mr-1 text-[9px]`}></i>
                    {item.locationPath.split('>').pop()?.trim()}
                  </>
                )}
              </p>
            </div>

            {/* 카테고리 뱃지 */}
            {!item.isSecret && (
              <div className={`badge ${getCategoryColor(item.category).bg} ${getCategoryColor(item.category).text} shrink-0`}>
                {item.category.split('/')[0]}
              </div>
            )}
            {item.isSecret && (
              <div className="w-8 shrink-0"></div>
            )}

            {/* 삭제 버튼 */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="w-8 h-8 rounded-lg text-surface-300 hover:bg-danger-500 hover:text-white flex items-center justify-center transition-all shrink-0 touch-feedback"
            >
              <i className="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
        ))}
      </div>
    );
  }

  // ═══════════ 카드 뷰 (기본) ═══════════
  return (
    <div className="space-y-3 pb-28 animate-fade-in">
      {items.map((item, idx) => {
        const catColor = getCategoryColor(item.category);

        return (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`card card-interactive p-4 cursor-pointer relative group ${item.isSecret ? 'bg-gradient-to-br from-white to-indigo-50/30' : ''}`}
            style={{ animationDelay: `${idx * 0.04}s` }}
          >
            {/* 삭제 버튼 (카드 우측 상단, 그룹 호버 시 더 잘 보이게) */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-surface-200 text-surface-400 hover:bg-danger-500 hover:text-white hover:border-danger-500 flex items-center justify-center transition-all opacity-100 z-10 shadow-sm touch-feedback"
              title="삭제"
            >
              <i className="fas fa-trash-alt text-xs"></i>
            </button>

            <div className="flex gap-3.5 items-start">
              {/* 썸네일 영역 */}
              <div className="relative shrink-0">
                {item.isSecret ? (
                  <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center ring-2 ring-indigo-50/50">
                    <i className="fas fa-lock text-indigo-300 text-xl"></i>
                  </div>
                ) : item.imageUrls && item.imageUrls.length > 0 && item.imageUrls[0] ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-100 ring-2 ring-surface-100 relative">
                    <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center ring-2 ring-primary-50">
                    <i className="fas fa-cube text-primary-300 text-xl"></i>
                  </div>
                )}

                {/* 카테고리 도트 (시크릿 아닐 때만 노출) */}
                {!item.isSecret && (
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-md ${catColor.dot} flex items-center justify-center ring-2 ring-white`}>
                    <i className="fas fa-tag text-white text-[7px]"></i>
                  </div>
                )}
              </div>

              {/* 아이템 정보 */}
              <div className="flex-1 min-w-0 pr-9">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-surface-800 text-base leading-tight truncate">{item.name}</h4>
                </div>

                {/* 위치 정보 */}
                <div className="flex items-center gap-1.5 mt-1.5 min-h-[18px]">
                  {item.isSecret ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-300 font-medium px-2 py-0.5 rounded-md bg-surface-100/50 w-fit">
                      <i className="fas fa-eye-slash text-[9px]"></i>
                      <span className="truncate">비공개 장소</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-surface-400 font-medium">
                      <i className={`fas ${getLocationIcon(item.locationPath)} text-primary-300 text-[10px]`}></i>
                      <span className="truncate max-w-[140px]">{item.locationPath}</span>
                    </div>
                  )}
                </div>

                {/* 태그 & 시간 행 */}
                <div className="flex items-end justify-between mt-2 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.isSecret ? (
                      <span className="badge bg-surface-100 text-surface-400">
                        <i className="fas fa-lock mr-1 text-[8px]"></i> 시크릿
                      </span>
                    ) : (
                      <>
                        <span className={`badge ${catColor.bg} ${catColor.text}`}>
                          {item.category}
                        </span>
                        {item.notes.length > 0 && (
                          <span className="badge badge-surface">
                            <i className="fas fa-sticky-note mr-1 text-[8px]"></i>
                            {item.notes.length}
                          </span>
                        )}
                        {item.imageUrls && item.imageUrls.filter(u => u).length > 0 && (
                          <span className="badge badge-surface">
                            <i className="fas fa-image mr-1 text-[8px]"></i>
                            {item.imageUrls.filter(u => u).length}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {/* 시간 표시 - 하단 우측으로 이동 */}
                  <span className="text-[10px] font-medium text-surface-300 shrink-0 mb-0.5">
                    {getRelativeTime(item.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ItemList;