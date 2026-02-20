import React, { useContext } from 'react';
import { Item } from '../types';
import { AppContext } from '../src/context/StateContext';
import { DELETE_CONFIRM_MESSAGE } from '../constants';

interface ItemDetailProps {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * ItemDetail 컴포넌트
 * - 아이템 상세 정보 표시
 * - 프리미엄 카드 레이아웃 + 정보 계층 구조
 */
const ItemDetail: React.FC<ItemDetailProps> = ({ item, onEdit, onDelete }) => {
  const { state, dispatch } = useContext(AppContext);

  /**
   * 상대 시간 포맷
   */
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-5 pb-4 animate-fade-in">

      {/* ═══════ 사진 갤러리 ═══════ */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((idx) => (
          <div key={idx} className="relative">
            <div className="aspect-square rounded-2xl overflow-hidden bg-surface-100 flex items-center justify-center">
              {item.imageUrls[idx] ? (
                <img
                  src={item.imageUrls[idx]}
                  alt={idx === 0 ? '아이템 사진' : '보관 장소'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-surface-300">
                  <div className="w-12 h-12 rounded-xl bg-surface-200/50 flex items-center justify-center">
                    <i className={`fas ${idx === 0 ? 'fa-cube' : 'fa-location-dot'} text-xl`}></i>
                  </div>
                  <span className="text-[10px] font-bold">사진 없음</span>
                </div>
              )}
            </div>
            {/* 라벨 뱃지 */}
            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[9px] font-bold text-white uppercase tracking-widest"
              style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)' }}
            >
              {idx === 0 ? '📦 물건' : '📍 장소'}
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ 아이템 이름 + 날짜 ═══════ */}
      <div className="card p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">아이템 이름</p>
            <h3 className="text-xl font-extrabold text-surface-800 leading-tight">{item.name}</h3>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">업데이트</p>
            <p className="text-xs font-semibold text-surface-500">
              {formatDate(item.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ 위치 + 카테고리 ═══════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* 위치 카드 */}
        <div className="card p-4 border-l-4 border-l-primary-400" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)' }}>
          <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <i className="fas fa-map-marker-alt text-[8px]"></i>
            보관 위치
          </p>
          <p className="text-sm font-bold text-primary-700 leading-snug break-words">{item.locationPath}</p>
        </div>

        {/* 카테고리 카드 */}
        <div className="card p-4 border-l-4 border-l-accent-400" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f8fafc 100%)' }}>
          <p className="text-[10px] font-bold text-accent-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <i className="fas fa-tag text-[8px]"></i>
            카테고리
          </p>
          <p className="text-sm font-bold text-accent-700 leading-snug">{item.category}</p>
        </div>
      </div>

      {/* ═══════ 메모 영역 ═══════ */}
      <div className="card p-5 relative overflow-hidden">
        {/* 장식 요소 */}
        <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(251, 191, 36, 0.2), transparent)', transform: 'translate(30%, -30%)' }}
        />

        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <i className="fas fa-sticky-note text-warn-400 text-[9px]"></i>
          메모 · 특이사항
        </p>

        {item.notes.length > 0 ? (
          <div className="space-y-2">
            {item.notes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-warn-400 mt-1.5 shrink-0"></div>
                <p className="text-sm text-surface-700 font-medium leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-surface-300 font-medium italic">기록된 메모가 없습니다</p>
        )}
      </div>

      {/* ═══════ 액션 버튼 ═══════ */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onDelete}
          className="flex-1 py-3.5 btn-outline rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-danger-500 border-danger-500/20 hover:bg-danger-500 hover:text-white hover:border-danger-500 transition-all touch-feedback"
        >
          <i className="fas fa-trash-alt"></i>
          삭제
        </button>
        <button
          onClick={onEdit}
          className="flex-[2] py-3.5 btn-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 touch-feedback"
        >
          <i className="fas fa-pen"></i>
          수정하기
        </button>
      </div>
    </div>
  );
};

export default ItemDetail;
