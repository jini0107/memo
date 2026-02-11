import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';

interface ItemFormProps {
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isAnalyzing: boolean;
  performNameAnalysis: () => void;
  startCamera: (slot: number) => void;
  stopCamera: () => void;
  capturePhoto: () => void;
  removeImage: (index: number) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const ItemForm: React.FC<ItemFormProps> = ({
  onSubmit,
  submitLabel,
  isAnalyzing,
  performNameAnalysis,
  startCamera,
  stopCamera,
  capturePhoto,
  removeImage,
  handleImageUpload,
  videoRef,
  canvasRef,
  fileInputRef,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { formState, isCameraActive, activeCameraSlot, config } = state;
  const { itemName, locType, locDetail, itemNotes, itemImages } = formState;

  const updateForm = (updates: Partial<typeof formState>) => {
    dispatch({ type: 'UPDATE_FORM', payload: updates });
  };

  const setActiveCameraSlot = (slot: number | null) => {
    dispatch({ type: 'SET_CAMERA_ACTIVE', payload: { isActive: state.isCameraActive, slot } });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col items-center">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        <canvas ref={canvasRef} className="hidden" />
        <div className="w-full grid grid-cols-2 gap-4 mb-4">
          {[0, 1].map((idx) => (
            <div key={idx} className="aspect-square rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-brand-300 hover:bg-brand-50/30">
              {isCameraActive && activeCameraSlot === idx ? (
                <div className="w-full h-full relative">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20"></div>
                  <button type="button" onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white/40 backdrop-blur-xl rounded-full border-4 border-white flex items-center justify-center active:scale-90 shadow-2xl transition-all">
                    <div className="w-8 h-8 bg-white rounded-full shadow-inner"></div>
                  </button>
                  <button type="button" onClick={stopCamera} className="absolute top-3 right-3 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md text-xs">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : itemImages[idx] ? (
                <div className="w-full h-full relative group">
                  <img src={itemImages[idx]} className="w-full h-full object-cover" alt={idx === 0 ? '기억물품' : '수납장소'} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[4px]">
                    <button type="button" onClick={() => removeImage(idx)} className="bg-red-500 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-2xl tracking-tight">이미지 삭제</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => startCamera(idx)} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center hover:border-brand-400 hover:text-brand-600 transition-all">
                      <i className="fas fa-camera text-gray-400 text-lg"></i>
                    </button>
                    <button type="button" onClick={() => { setActiveCameraSlot(idx); fileInputRef.current?.click(); }} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center hover:border-emerald-400 hover:text-emerald-600 transition-all">
                      <i className="fas fa-images text-gray-400 text-lg"></i>
                    </button>
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{idx === 0 ? '물건 사진' : '공간 사진'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest flex justify-between items-center">
          <span>물건 이름</span>

        </label>
        <div className="relative">
          <input
            required
            type="text"
            className="w-full p-4 bg-gray-50 rounded-2xl text-base outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 font-bold placeholder:font-medium transition-all"
            placeholder="여권, 외장하드, 비상금 등"
            value={itemName}
            onChange={(e) => updateForm({ itemName: e.target.value })}
          />

        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest">장소 구분</label>
          <select
            className="w-full p-4 bg-gray-50 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
            value={locType}
            onChange={(e) => {
              const newType = e.target.value;
              updateForm({ locType: newType });
              if (newType === config.locTypes[0] && config.homeLocs.length > 0) {
                updateForm({ locDetail: config.homeLocs[0] });
              } else if (newType === config.locTypes[1] && config.officeLocs.length > 0) {
                updateForm({ locDetail: config.officeLocs[0] });
              } else if (newType === config.locTypes[2] && config.digitalLocs.length > 0) {
                updateForm({ locDetail: config.digitalLocs[0] });
              } else {
                updateForm({ locDetail: '' });
              }
            }}
          >
            {config.locTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest">상세 위치</label>
          <div className="relative">
            {locType === config.locTypes[0] ? (
              <select
                className="w-full p-4 bg-gray-50 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
                value={locDetail}
                onChange={(e) => updateForm({ locDetail: e.target.value })}
              >
                {config.homeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : locType === config.locTypes[1] ? (
              <select
                className="w-full p-4 bg-gray-50 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
                value={locDetail}
                onChange={(e) => updateForm({ locDetail: e.target.value })}
              >
                {config.officeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : locType === config.locTypes[2] ? (
              <select
                className="w-full p-4 bg-gray-50 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
                value={locDetail}
                onChange={(e) => updateForm({ locDetail: e.target.value })}
              >
                {config.digitalLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : (
              <input
                type="text"
                className="w-full p-4 bg-gray-50 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 transition-all"
                placeholder="상세 장소 입력"
                value={locDetail}
                onChange={(e) => updateForm({ locDetail: e.target.value })}
                required
              />
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest">특이사항 및 메모</label>
        <textarea
          rows={3}
          className="w-full p-5 bg-gray-50 rounded-[2rem] text-base font-medium outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 shadow-inner resize-none transition-all placeholder:text-gray-300"
          placeholder="예: 오른쪽 두 번째 서랍 안쪽 깊은 곳, 파란 상자 안에 들어있음"
          value={itemNotes}
          onChange={(e) => updateForm({ itemNotes: e.target.value })}
        />
      </div>

      <button type="submit" className="w-full py-5 brand-gradient text-white rounded-[2rem] font-black shadow-xl shadow-brand-100 mt-6 active:scale-95 transition-all text-lg flex items-center justify-center gap-3 tracking-tight">
        <i className="fas fa-check-circle text-xl"></i> {submitLabel}
      </button>
    </form>
  )
};

export default ItemForm;
