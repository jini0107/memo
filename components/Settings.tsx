import React, { useState, useContext } from 'react';
import { AppContext } from '../src/context/StateContext';
import { DELETE_CONFIRM_MESSAGE } from '../constants'; // Import DELETE_CONFIRM_MESSAGE

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  handleExportData: () => void;
  handleExportExcel: () => void;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  handleExportData,
  handleExportExcel,
  handleImportData,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { config } = state;

  if (!isOpen) return null;

  const setConfig = (key: keyof typeof config, value: string[]) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: { [key]: value } });
  };

  const sections = [
    { title: 'Location Groups', key: 'locTypes', list: config.locTypes },
    { title: 'Home Details', key: 'homeLocs', list: config.homeLocs },
    { title: 'Office Details', key: 'officeLocs', list: config.officeLocs },
    { title: 'Digital Paths', key: 'digitalLocs', list: config.digitalLocs },
    { title: 'Item Categories', key: 'categories', list: config.categories },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto relative border border-white/50 card-shadow">
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/50 backdrop-blur-md -mx-8 px-8 py-4 z-20 -mt-8 rounded-t-[3rem] border-b border-gray-100/50">
          <h2 className="text-base font-black text-gray-900 tracking-tight">환경 설정</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all">
            <i className="fas fa-times text-gray-400 text-sm"></i>
          </button>
        </div>

        <div className="space-y-10 pb-8">
          <div className="brand-gradient p-8 rounded-[2.5rem] shadow-2xl shadow-brand-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
            <h3 className="font-black text-sm text-white mb-4 flex items-center gap-2">
              <i className="fas fa-database opacity-70"></i> 데이터 관리
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportData}
                className="py-4 bg-white/20 backdrop-blur-md text-white rounded-2xl text-[11px] font-black border border-white/30 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-white/30"
              >
                <i className="fas fa-file-json"></i> JSON 백업
              </button>
              <button
                onClick={handleExportExcel}
                className="py-4 bg-emerald-500/80 backdrop-blur-md text-white rounded-2xl text-[11px] font-black border border-white/30 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-emerald-600"
              >
                <i className="fas fa-file-excel"></i> 엑셀 저장
              </button>
              <label className="col-span-2 py-4 bg-white text-brand-600 rounded-2xl text-[11px] font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-brand-50">
                <i className="fas fa-upload"></i> 데이터 복원하기
                <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
              </label>
            </div>
            <p className="text-[9px] text-brand-100 mt-4 leading-relaxed font-bold opacity-80 text-center uppercase tracking-widest">
              Secure your memories periodically
            </p>
          </div>

          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">{section.title}</h3>
                <span className="text-[10px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{section.list.length}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {section.list.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 shadow-sm hover:border-brand-200 transition-colors">
                    {item}
                    <button
                      onClick={() => {
                        if (confirm(DELETE_CONFIRM_MESSAGE)) {
                          setConfig(section.key as keyof typeof config, section.list.filter((_, i) => i !== idx));
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <i className="fas fa-times-circle"></i>
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem('newItem') as HTMLInputElement;
                  if (input.value.trim()) {
                    setConfig(section.key as keyof typeof config, [...section.list, input.value.trim()]);
                    input.value = '';
                  }
                }}
                className="flex gap-2"
              >
                <input
                  name="newItem"
                  type="text"
                  placeholder="Add new item..."
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-[1.5rem] px-5 py-3 text-xs font-bold focus:ring-4 focus:ring-brand-100 outline-none placeholder:text-gray-300 transition-all shadow-inner"
                />
                <button type="submit" className="w-11 h-11 brand-gradient text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                  <i className="fas fa-plus text-sm"></i>
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
