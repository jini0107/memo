import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';

interface ItemFormProps {
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isAnalyzing: boolean;
  performNameAnalysis: () => void;
  removeImage: (index: number) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, slot: number) => void;
}

const ItemForm: React.FC<ItemFormProps> = ({
  onSubmit,
  submitLabel,
  isAnalyzing,
  performNameAnalysis,
  removeImage,
  handleImageUpload,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { formState, config } = state;
  const { itemName, locType, locDetail, itemNotes, itemImages } = formState;

  const updateForm = (updates: Partial<typeof formState>) => {
    dispatch({ type: 'UPDATE_FORM', payload: updates });
  };

  // Refs for file inputs (one pair for each slot)
  const cameraInputRefs = [React.useRef<HTMLInputElement>(null), React.useRef<HTMLInputElement>(null)];
  const galleryInputRefs = [React.useRef<HTMLInputElement>(null), React.useRef<HTMLInputElement>(null)];

  return (
    <form onSubmit={onSubmit} className="space-y-6 pt-2">
      <div className="flex flex-col items-center">
        <div className="w-full grid grid-cols-2 gap-4">
          {[0, 1].map((idx) => (
            <div key={idx} className="aspect-square rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:bg-gray-100 hover:border-duo-blue active:border-solid transition-all">

              {itemImages[idx] ? (
                <div className="w-full h-full relative group">
                  <img src={itemImages[idx]} className="w-full h-full object-cover" alt="img" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <button type="button" onClick={() => removeImage(idx)} className="bg-duo-red text-white px-3 py-1.5 rounded-xl font-bold border-b-4 border-[#b91e1e] active:border-b-0 active:translate-y-1">Remove</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-2">
                    {/* Camera Button directly wrapped in label for reliability */}
                    <label className="w-12 h-12 bg-white rounded-xl border-2 border-gray-200 border-b-4 flex items-center justify-center hover:bg-gray-50 active:border-b-2 active:translate-y-1 text-gray-400 hover:text-duo-blue cursor-pointer">
                      <i className="fas fa-camera text-xl"></i>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, idx)}
                      />
                    </label>

                    {/* Gallery Button directly wrapped in label */}
                    <label className="w-12 h-12 bg-white rounded-xl border-2 border-gray-200 border-b-4 flex items-center justify-center hover:bg-gray-50 active:border-b-2 active:translate-y-1 text-gray-400 hover:text-duo-green cursor-pointer">
                      <i className="fas fa-image text-xl"></i>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, idx)}
                      />
                    </label>
                  </div>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{idx === 0 ? 'ITEM PHOTO' : 'PLACE PHOTO'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Item Name</label>
        <div className="relative">
          <input
            required
            type="text"
            className="w-full p-4 bg-gray-100 rounded-xl text-lg outline-none focus:bg-white border-2 border-gray-200 border-b-4 focus:border-duo-blue font-bold placeholder:text-gray-300 transition-all text-[#4b4b4b]"
            placeholder="e.g. Passport, Keys"
            value={itemName}
            onChange={(e) => updateForm({ itemName: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Type</label>
          <select
            className="w-full p-4 bg-gray-100 rounded-xl text-base font-bold outline-none border-2 border-gray-200 border-b-4 focus:border-duo-purple text-[#4b4b4b]"
            value={locType}
            onChange={(e) => {
              const newType = e.target.value;
              updateForm({ locType: newType });
              if (newType === config.locTypes[0] && config.homeLocs.length > 0) updateForm({ locDetail: config.homeLocs[0] });
              else if (newType === config.locTypes[1] && config.officeLocs.length > 0) updateForm({ locDetail: config.officeLocs[0] });
              else if (newType === config.locTypes[2] && config.digitalLocs.length > 0) updateForm({ locDetail: config.digitalLocs[0] });
              else updateForm({ locDetail: '' });
            }}
          >
            {config.locTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Detail</label>
          <div className="relative">
            {[config.locTypes[0], config.locTypes[1], config.locTypes[2]].includes(locType) ? (
              <select
                className="w-full p-4 bg-gray-100 rounded-xl text-base font-bold outline-none border-2 border-gray-200 border-b-4 focus:border-duo-purple text-[#4b4b4b]"
                value={locDetail}
                onChange={(e) => updateForm({ locDetail: e.target.value })}
              >
                {locType === config.locTypes[0] && config.homeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                {locType === config.locTypes[1] && config.officeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                {locType === config.locTypes[2] && config.digitalLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : (
              <input
                type="text"
                className="w-full p-4 bg-gray-100 rounded-xl text-base font-bold outline-none border-2 border-gray-200 border-b-4 focus:border-duo-purple text-[#4b4b4b]"
                placeholder="Specific Location"
                value={locDetail}
                onChange={(e) => updateForm({ locDetail: e.target.value })}
                required
              />
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Notes</label>
        <textarea
          rows={3}
          className="w-full p-4 bg-gray-100 rounded-xl text-base font-bold outline-none border-2 border-gray-200 border-b-4 focus:border-duo-yellow resize-none placeholder:text-gray-300 text-[#4b4b4b]"
          placeholder="Detailed description..."
          value={itemNotes}
          onChange={(e) => updateForm({ itemNotes: e.target.value })}
        />
      </div>

      <button type="submit" className="w-full py-4 bg-duo-green text-white rounded-2xl font-black text-lg shadow-none border-b-4 border-[#58a700] active:border-b-0 active:translate-y-1 active:mt-1 transition-all uppercase tracking-widest hover:bg-[#61e002]">
        {submitLabel}
      </button>
    </form>
  )
};

export default ItemForm;
