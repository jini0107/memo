import React, { useContext } from 'react';
import { Item } from '../types';
import { AppContext } from '../src/context/StateContext';
import { DELETE_CONFIRM_MESSAGE } from '../constants';

// 컴포넌트에 넘겨받을 데이터(Props) 모양을 정의합니다.
interface ItemDetailProps {
  item: Item;          // 어떤 아이템의 정보를 보여줄지
  onEdit: () => void;  // '수정하기' 버튼을 누르면 실행할 함수
}

/**
 * ItemDetail 컴포넌트: 물건 하나를 콕 집었을 때 나오는 상세 정보 화면입니다.
 * 큰 사진과 함께 자세한 정보를 보여주는 '카드'라고 생각하면 됩니다.
 */
const ItemDetail: React.FC<ItemDetailProps> = ({ item, onEdit }) => {
  const { state, dispatch } = useContext(AppContext);

  // '삭제하기' 버튼을 눌렀을 때 실행되는 함수입니다.
  const onDelete = () => {
    // 정말 지울지 물어봅니다.
    if (confirm(DELETE_CONFIRM_MESSAGE)) {
      // 목록에서 이 아이템을 빼고 다시 저장합니다.
      dispatch({ type: 'SET_ITEMS', payload: state.items.filter(i => i.id !== item.id) });
      // 상세 화면을 닫습니다. (선택된 아이템을 없앰)
      dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
    }
  };

  return (
    <div className="space-y-8 pb-4">
      {/* 사진 갤러리 섹션 */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <div className="aspect-square rounded-[2rem] overflow-hidden bg-gray-50 border-4 border-white shadow-2xl flex items-center justify-center relative">
              {item.imageUrls[idx] ? (
                // 사진이 있으면 보여줍니다.
                <img src={item.imageUrls[idx]} alt={idx === 0 ? '기억물품' : '수납장소'} className="w-full h-full object-cover" />
              ) : (
                // 사진이 없으면 'No Image'라고 표시합니다.
                <div className="flex flex-col items-center text-gray-200">
                  <i className="fas fa-image text-4xl mb-2 opacity-30"></i>
                  <span className="text-xs font-black uppercase tracking-tighter">No Image</span>
                </div>
              )}
              {/* 왼쪽 상단에 'ITEM'(물건)인지 'PLACE'(장소)인지 라벨을 붙여줍니다. */}
              <div className="absolute top-2 left-2 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-black uppercase tracking-widest">{idx === 0 ? 'ITEM' : 'PLACE'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 상세 정보 텍스트 섹션 */}
      <div className="space-y-6">
        {/* 이름과 날짜 */}
        <div className="p-1">
          <p className="text-xs font-black text-brand-500 uppercase tracking-[0.2em] mb-3">Item Identity</p>
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{item.name}</h3>
            <span className="shrink-0 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              {new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* 위치와 카테고리 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50/50 p-5 rounded-[2rem] border border-indigo-100/50 shadow-inner">
            <p className="text-xs font-black text-brand-400 uppercase tracking-widest mb-2">Location</p>
            <p className="text-base font-black text-indigo-700 leading-tight">{item.locationPath}</p>
          </div>
          <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100/50 shadow-inner">
            <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-2">Category</p>
            <p className="text-base font-black text-emerald-700 leading-tight">{item.category}</p>
          </div>
        </div>

        {/* 메모 내용 */}
        <div className="relative group">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Special Notes</p>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl relative overflow-hidden ring-4 ring-gray-50/50">
            <div className="text-base text-gray-700 leading-relaxed font-semibold whitespace-pre-wrap relative z-10 italic">
              "{item.notes.length > 0
                ? item.notes.join('\n')
                : '기록된 상세 정보가 없습니다.'}"
            </div>
            <i className="fas fa-quote-right absolute bottom-4 right-6 text-brand-50 text-5xl opacity-50"></i>
          </div>
        </div>
      </div>

      {/* 하단 버튼들 (삭제, 수정) */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={onDelete}
          className="flex-1 py-5 bg-red-50 text-red-500 rounded-3xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all border border-red-100 hover:bg-red-100 text-base"
        >
          <i className="fas fa-trash-alt"></i> 삭제
        </button>
        <button
          onClick={onEdit}
          className="flex-[2] py-5 brand-gradient text-white rounded-3xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-brand-100 active:scale-95 transition-all text-base tracking-tight"
        >
          <i className="fas fa-edit"></i> 정보 수정하기
        </button>
      </div>
    </div>
  );
};

export default ItemDetail;
