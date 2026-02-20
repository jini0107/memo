import React, { useContext } from 'react';
import { AppContext } from '../src/context/StateContext';
import { DELETE_CONFIRM_MESSAGE } from '../constants';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  handleExportData: () => void;
  handleExportExcel: () => void;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Settings 컴포넌트
 * - 환경설정 + 데이터 관리
 * - 프리미엄 모달 디자인
 */
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

  // 설정 업데이트 헬퍼
  const setConfig = (key: keyof typeof config, value: string[]) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: { [key]: value } });
  };

  // 설정 섹션 정의
  const sections = [
    { title: '장소 유형', key: 'locTypes', list: config.locTypes, icon: 'fa-layer-group', color: 'text-primary-400' },
    { title: '집 세부 장소', key: 'homeLocs', list: config.homeLocs, icon: 'fa-house', color: 'text-accent-500' },
    { title: '사무실 세부 장소', key: 'officeLocs', list: config.officeLocs, icon: 'fa-building', color: 'text-blue-500' },
    { title: '디지털 저장소', key: 'digitalLocs', list: config.digitalLocs, icon: 'fa-cloud', color: 'text-purple-500' },
    { title: '아이템 카테고리', key: 'categories', list: config.categories, icon: 'fa-tag', color: 'text-warn-500' },
  ];

  return (
    <div className="fullscreen-modal animate-fade-in" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] animate-slide-up flex flex-col safe-bottom safe-left safe-right"
        style={{ maxHeight: '92vh', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-200"></div>
        </div>

        {/* 헤더 */}
        <div className="flex justify-between items-center px-6 pb-4 shrink-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-surface-100 text-surface-400 flex items-center justify-center hover:bg-surface-200 transition-all touch-feedback"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
          <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2">
            <i className="fas fa-cog text-primary-400"></i>
            환경 설정
          </h2>
          <div className="w-10"></div>
        </div>

        {/* 스크롤 컨텐츠 */}
        <div className="overflow-y-auto flex-1 px-6 pb-8 mobile-scroll">
          <div className="space-y-7">

            {/* ═══════ 데이터 관리 카드 ═══════ */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}>
              <div className="p-5 relative">
                {/* 장식 */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ background: 'white', filter: 'blur(30px)', transform: 'translate(30%, -30%)' }}></div>

                <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                  <i className="fas fa-shield-halved opacity-80"></i>
                  데이터 관리
                </h3>
                <p className="text-[11px] text-white/60 font-medium mb-4">소중한 데이터를 안전하게 백업하세요</p>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* JSON 백업 */}
                  <button
                    onClick={handleExportData}
                    className="py-3.5 bg-white/15 backdrop-blur-sm text-white rounded-xl text-xs font-bold border border-white/20 flex items-center justify-center gap-2 transition-all touch-feedback hover:bg-white/25"
                  >
                    <i className="fas fa-file-code"></i>
                    JSON 백업
                  </button>

                  {/* 엑셀 저장 */}
                  <button
                    onClick={handleExportExcel}
                    className="py-3.5 bg-white/15 backdrop-blur-sm text-white rounded-xl text-xs font-bold border border-white/20 flex items-center justify-center gap-2 transition-all touch-feedback hover:bg-white/25"
                  >
                    <i className="fas fa-file-excel"></i>
                    엑셀 저장
                  </button>

                  {/* 데이터 복원 */}
                  <label className="col-span-2 py-3.5 bg-white text-primary-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all touch-feedback hover:bg-primary-50 shadow-sm">
                    <i className="fas fa-cloud-arrow-up"></i>
                    백업 파일에서 복원하기
                    <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                  </label>
                </div>
              </div>
            </div>

            {/* ═══════ 설정 섹션들 ═══════ */}
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-3">
                {/* 섹션 헤더 */}
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                    <i className={`fas ${section.icon} ${section.color} text-[10px]`}></i>
                    {section.title}
                  </h3>
                  <span className="badge badge-primary text-[10px]">{section.list.length}개</span>
                </div>

                {/* 아이템 태그 목록 */}
                <div className="flex flex-wrap gap-2">
                  {section.list.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-600 hover:border-primary-200 transition-colors group"
                    >
                      {item}
                      <button
                        onClick={() => {
                          if (confirm(DELETE_CONFIRM_MESSAGE)) {
                            setConfig(section.key as keyof typeof config, section.list.filter((_, i) => i !== idx));
                          }
                        }}
                        className="w-4 h-4 rounded-full bg-surface-200 text-surface-400 flex items-center justify-center hover:bg-danger-500 hover:text-white transition-all text-[8px]"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>

                {/* 새 아이템 추가 폼 */}
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
                    placeholder="새 항목 추가..."
                    className="input-field flex-1 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-xl gradient-primary text-white flex items-center justify-center shadow-glow transition-all touch-feedback shrink-0"
                  >
                    <i className="fas fa-plus text-sm"></i>
                  </button>
                </form>
              </div>
            ))}

            {/* ═══════ 앱 정보 ═══════ */}
            <div className="text-center pt-4 pb-2">
              <p className="text-[10px] text-surface-300 font-medium">WhereIsIt v1.0</p>
              <p className="text-[10px] text-surface-300 font-medium mt-0.5">물건 위치 관리 도우미 ✨</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
