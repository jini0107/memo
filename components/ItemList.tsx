import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';
import { Item } from '../types';
import { DELETE_CONFIRM_MESSAGE } from '../constants';

interface ItemListProps {
  items: Item[];
}

const ItemList: React.FC<ItemListProps> = ({ items }) => {
  const { state, dispatch } = useContext(AppContext);

  const onSelectItem = (item: Item) => {
    dispatch({ type: 'SET_SELECTED_ITEM', payload: item });
  };

  const onDeleteItem = (id: string) => {
    if (confirm(DELETE_CONFIRM_MESSAGE)) {
      dispatch({ type: 'SET_ITEMS', payload: state.items.filter(i => i.id !== id) });
      if (state.selectedItem?.id === id) {
        dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 glass rounded-[2.5rem] border-dashed border-2 border-gray-200">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-box-open text-3xl opacity-30"></i>
        </div>
        <p className="text-sm font-bold text-gray-500">비어있는 기억 저장소</p>
        <p className="text-[10px] text-gray-400 mt-1">잊고 싶지 않은 물건을 아래 + 버튼으로 추가하세요.</p>
      </div>
    );
  }

  if (state.viewMode === 'table') {
    return (
      <div className="pb-28 overflow-x-auto -mx-2 px-2">
        <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">품명</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">위치</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">카테고리</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">최종수정</th>
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="hover:bg-brand-50/30 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {item.imageUrls[0] ? (
                      <img src={item.imageUrls[0]} className="w-8 h-8 rounded-lg object-cover shadow-sm bg-gray-100" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                        <i className="fas fa-box text-[10px]"></i>
                      </div>
                    )}
                    <span className="font-bold text-gray-900 text-xs truncate max-w-[120px]">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[10px] font-medium text-gray-600 truncate max-w-[100px]">{item.locationPath}</td>
                <td className="px-4 py-4">
                  <span className="text-[9px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md whitespace-nowrap">{item.category}</span>
                </td>
                <td className="px-4 py-4 text-[9px] text-gray-400 tabular-nums">
                  {new Date(item.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-3 py-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="w-7 h-7 rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <i className="fas fa-trash-alt text-[10px]"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => onSelectItem(item)}
          className="bg-white p-4 rounded-[2rem] card-shadow border border-white/60 flex gap-4 items-center group transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] cursor-pointer relative"
        >
          <div className="flex -space-x-4 overflow-hidden p-1 shrink-0">
            {item.imageUrls && item.imageUrls.length > 0 ? (
              item.imageUrls.slice(0, 2).map((url, idx) => (
                <div key={idx} className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 border-4 border-white shadow-xl ring-1 ring-gray-100 relative" style={{ zIndex: 2 - idx }}>
                  <img src={url} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              ))
            ) : (
              <div className="w-20 h-20 rounded-2xl flex-shrink-0 bg-brand-50 border-2 border-white shadow-inner flex items-center justify-center text-brand-200">
                <i className="fas fa-layer-group text-2xl"></i>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-black px-2.5 py-1 bg-brand-600 text-white rounded-lg shadow-sm shadow-brand-200 uppercase tracking-tighter">{item.category}</span>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg">{item.locationPath.split(' > ')[1] || item.locationPath}</span>
            </div>
            <h4 className="font-extrabold text-gray-900 text-base mb-1 tracking-tight">{item.name}</h4>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.notes.slice(0, 2).map(note => (
                <span key={note} className="text-[10px] text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">#{note}</span>
              ))}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
            }}
            className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
          >
            <i className="fas fa-trash-alt text-xs"></i>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ItemList;