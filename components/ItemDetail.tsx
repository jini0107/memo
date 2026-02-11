import React, { useContext } from 'react';
import { Item } from '../types';
import { AppContext } from '../src/context/StateContext';
import { DELETE_CONFIRM_MESSAGE } from '../constants';

interface ItemDetailProps {
  item: Item;
  onEdit: () => void;
}

const ItemDetail: React.FC<ItemDetailProps> = ({ item, onEdit }) => {
  const { state, dispatch } = useContext(AppContext);

  const onDelete = () => {
    if (confirm(DELETE_CONFIRM_MESSAGE)) {
      dispatch({ type: 'SET_ITEMS', payload: state.items.filter(i => i.id !== item.id) });
      dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
    }
  };

  return (
    <div className="space-y-8 pb-4">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <div className="aspect-square rounded-[2rem] overflow-hidden bg-gray-50 border-4 border-white shadow-2xl flex items-center justify-center relative">
              {item.imageUrls[idx] ? (
                <img src={item.imageUrls[idx]} alt={idx === 0 ? '기억물품' : '수납장소'} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-gray-200">
                  <i className="fas fa-image text-4xl mb-2 opacity-30"></i>
                  <span className="text-xs font-black uppercase tracking-tighter">No Image</span>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-black uppercase tracking-widest">{idx === 0 ? 'ITEM' : 'PLACE'}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="p-1">
          <p className="text-xs font-black text-brand-500 uppercase tracking-[0.2em] mb-3">Item Identity</p>
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{item.name}</h3>
            <span className="shrink-0 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              {new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

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
