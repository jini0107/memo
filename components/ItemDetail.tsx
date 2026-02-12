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
    <div className="space-y-6 pb-4">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center relative">
              {item.imageUrls[idx] ? (
                <img src={item.imageUrls[idx]} alt={idx === 0 ? 'Item' : 'Place'} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-gray-300">
                  <i className="fas fa-image text-3xl mb-2"></i>
                  <span className="text-xs font-black uppercase">No Photo</span>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-black uppercase tracking-widest border border-white/20">
                {idx === 0 ? 'ITEM' : 'PLACE'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-200">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Identity</p>
          <div className="flex justify-between items-start">
            <h3 className="text-2xl font-extrabold text-[#4b4b4b]">{item.name}</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-lg border-2 border-gray-200">
              {new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-duo-blue/10 p-4 rounded-2xl border-2 border-duo-blue/20 border-b-4">
            <p className="text-xs font-black text-duo-blue uppercase tracking-widest mb-1">Location</p>
            <p className="text-lg font-black text-duo-blue leading-tight truncate">{item.locationPath}</p>
          </div>
          <div className="bg-duo-green/10 p-4 rounded-2xl border-2 border-duo-green/20 border-b-4">
            <p className="text-xs font-black text-duo-green uppercase tracking-widest mb-1">Category</p>
            <p className="text-lg font-black text-duo-green leading-tight truncate">{item.category}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 border-b-4 relative">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Notes</p>
          <div className="text-lg text-[#4b4b4b] font-bold whitespace-pre-wrap relative z-10 leading-relaxed">
            "{item.notes.length > 0 ? item.notes.join('\n') : 'No details recorded.'}"
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-2">
        <button
          onClick={onDelete}
          className="flex-1 py-4 bg-white text-duo-red rounded-2xl font-black border-2 border-gray-200 border-b-4 hover:border-duo-red hover:bg-duo-red hover:text-white active:border-b-2 active:translate-y-1 transition-all uppercase tracking-widest"
        >
          DELETE
        </button>
        <button
          onClick={onEdit}
          className="flex-[2] py-4 bg-duo-blue text-white rounded-2xl font-black border-b-4 border-[#1899d6] active:border-b-0 active:translate-y-1 transition-all uppercase tracking-widest hover:bg-[#2ec0ff]"
        >
          EDIT ITEM
        </button>
      </div>
    </div>
  );
};

export default ItemDetail;
