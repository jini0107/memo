import React, { useContext, useRef, useCallback } from 'react';
import { AppContext } from '../src/context/StateContext';

interface ItemFormProps {
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isAnalyzing: boolean;
  performNameAnalysis: () => void;
  removeImage: (index: number) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, slot: number) => void;
}

/**
 * ItemForm 컴포넌트
 * - 아이템 등록/수정 폼
 * - 카메라 버튼 → 네이티브 카메라 앱 바로 실행 → 촬영 후 자동 저장
 * - 갤러리 버튼 → 앨범에서 사진 선택 → 자동 저장
 *
 * [핵심 원리]
 * 모바일에서 <input type="file" accept="image/*" capture="environment">를 사용하면
 * OS가 자동으로 카메라 앱을 실행합니다.
 * 촬영 완료(확인 버튼) → onChange 이벤트 발생 → handleImageUpload() 자동 호출 → 슬롯에 저장
 *
 * capture="environment" : 후면 카메라 (물건/장소 촬영에 적합)
 * capture 없음 : 갤러리/파일 선택기 열림
 */
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

  /**
   * 각 슬롯별 카메라/갤러리 input ref
   * - ref를 사용하여 프로그래밍 방식으로 input.click() 호출
   * - 이렇게 해야 모바일에서 카메라가 확실히 실행됨
   */
  const cameraRefs = useRef<(HTMLInputElement | null)[]>([null, null]);
  const galleryRefs = useRef<(HTMLInputElement | null)[]>([null, null]);

  /**
   * 카메라 버튼 클릭 핸들러
   * - 숨겨진 카메라 전용 input을 프로그래밍 방식으로 클릭
   * - capture="environment" 덕분에 후면 카메라가 바로 실행됨
   */
  const openCamera = useCallback((slotIndex: number) => {
    const cameraInput = cameraRefs.current[slotIndex];
    if (cameraInput) {
      // 같은 파일을 다시 선택할 수 있도록 값 초기화
      cameraInput.value = '';
      cameraInput.click();
    }
  }, []);

  /**
   * 갤러리 버튼 클릭 핸들러
   * - 숨겨진 갤러리 전용 input을 프로그래밍 방식으로 클릭
   * - capture 속성이 없으므로 갤러리/파일 선택기가 열림
   */
  const openGallery = useCallback((slotIndex: number) => {
    const galleryInput = galleryRefs.current[slotIndex];
    if (galleryInput) {
      galleryInput.value = '';
      galleryInput.click();
    }
  }, []);

  // 폼 상태 업데이트 헬퍼
  const updateForm = (updates: Partial<typeof formState>) => {
    dispatch({ type: 'UPDATE_FORM', payload: updates });
  };

  // 사진 슬롯 라벨
  const slotLabels = ['📦 물건 사진', '📍 장소 사진'];
  const slotIcons = ['fa-cube', 'fa-location-dot'];

  return (
    <form onSubmit={onSubmit} className="space-y-5 pt-1 animate-fade-in">

      {/* ═══════════════════════════════════════════
          📸 사진 업로드 영역
          - 카메라: 바로 촬영 → 확인 → 자동 저장
          - 갤러리: 앨범 선택 → 자동 저장
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((idx) => {
          const hasImage = itemImages[idx];
          return (
            <div key={`photo-slot-${idx}-${hasImage ? 'filled' : 'empty'}`}
              className="aspect-square rounded-2xl bg-surface-50 border-2 border-dashed border-surface-200 flex flex-col items-center justify-center overflow-hidden relative group transition-all hover:border-primary-300"
            >
              {/* ───── 숨겨진 Input 요소들 (카메라 / 갤러리) ───── */}
              {/* 카메라 전용 input: capture="environment" → 후면 카메라 바로 실행 */}
              <input
                ref={(el) => { cameraRefs.current[idx] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  console.log(`📷 카메라 촬영 완료 - 슬롯 ${idx}, 자동 저장 중...`);
                  handleImageUpload(e, idx);
                }}
              />
              {/* 갤러리 전용 input: capture 없음 → 앨범/파일 선택기 */}
              <input
                ref={(el) => { galleryRefs.current[idx] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  console.log(`🖼️ 갤러리 사진 선택 - 슬롯 ${idx}, 자동 저장 중...`);
                  handleImageUpload(e, idx);
                }}
              />

              {hasImage ? (
                /* ───── 사진이 있을 때: 미리보기 + 재촬영/삭제 ───── */
                <div className="w-full h-full relative">
                  <img
                    src={itemImages[idx]}
                    className="w-full h-full object-cover"
                    alt={slotLabels[idx]}
                  />

                  {/* 호버/터치 시 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-end pb-3 gap-2">
                    {/* 재촬영 버튼 */}
                    <button
                      type="button"
                      onClick={() => openCamera(idx)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/90 text-surface-700 font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <i className="fas fa-camera text-[10px] text-primary-500"></i>
                      재촬영
                    </button>
                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-danger-500/90 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <i className="fas fa-trash-alt text-[10px]"></i>
                      삭제
                    </button>
                  </div>

                  {/* 라벨 뱃지 */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold text-white"
                    style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)' }}
                  >
                    {slotLabels[idx]}
                  </div>

                  {/* 저장 완료 체크 표시 */}
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center shadow-sm">
                    <i className="fas fa-check text-white text-[10px]"></i>
                  </div>
                </div>
              ) : (
                /* ───── 사진이 없을 때: 촬영/선택 버튼 ───── */
                <div className="flex flex-col items-center gap-3">
                  {/* 슬롯 아이콘 */}
                  <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center">
                    <i className={`fas ${slotIcons[idx]} text-surface-300 text-xl`}></i>
                  </div>

                  {/* 카메라 / 갤러리 버튼 그룹 */}
                  <div className="flex gap-2">
                    {/* 📷 카메라 버튼 - 탭하면 바로 카메라 앱 실행 */}
                    <button
                      type="button"
                      onClick={() => openCamera(idx)}
                      className="w-11 h-11 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-md transition-all touch-feedback active:scale-90"
                      title="카메라로 바로 촬영"
                    >
                      <i className="fas fa-camera text-base"></i>
                    </button>

                    {/* 🖼️ 갤러리 버튼 - 탭하면 앨범 열기 */}
                    <button
                      type="button"
                      onClick={() => openGallery(idx)}
                      className="w-11 h-11 rounded-xl bg-white border-2 border-surface-200 text-surface-400 flex items-center justify-center transition-all touch-feedback active:scale-90 hover:text-accent-500 hover:border-accent-300"
                      title="앨범에서 선택"
                    >
                      <i className="fas fa-image text-base"></i>
                    </button>
                  </div>

                  {/* 슬롯 라벨 */}
                  <span className="text-[10px] font-bold text-surface-300">{slotLabels[idx]}</span>

                  {/* 안내 문구 */}
                  <span className="text-[9px] text-surface-300 font-medium -mt-1">
                    {idx === 0 ? '물건을 촬영하세요' : '보관 장소를 촬영하세요'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI 분석 중 인디케이터 */}
      {isAnalyzing && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl animate-fade-in-scale"
          style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}
        >
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <i className="fas fa-spinner fa-spin text-white text-sm"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-primary-600">AI 분석 중...</p>
            <p className="text-[10px] text-primary-400">물건을 자동으로 인식하고 있어요</p>
          </div>
        </div>
      )}

      {/* ═══════ 아이템 이름 ═══════ */}
      <div>
        <label className="block text-[11px] font-bold text-surface-400 mb-1.5 uppercase tracking-wider">
          <i className="fas fa-pen mr-1 text-[9px] text-primary-300"></i>
          물건 이름
        </label>
        <div className="relative">
          <input
            required
            type="text"
            className="input-field pr-10"
            placeholder="예: 여권, 열쇠, 충전기..."
            value={itemName}
            onChange={(e) => updateForm({ itemName: e.target.value })}
          />
          {/* AI 제안 버튼 */}
          {itemName.trim() && (
            <button
              type="button"
              onClick={performNameAnalysis}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-primary-50 text-primary-400 flex items-center justify-center hover:bg-primary-100 transition-all text-xs touch-feedback"
              title="AI 자동 분류"
            >
              <i className="fas fa-wand-magic-sparkles"></i>
            </button>
          )}
        </div>
      </div>

      {/* ═══════ 위치 설정 ═══════ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-surface-400 mb-1.5 uppercase tracking-wider">
            <i className="fas fa-layer-group mr-1 text-[9px] text-primary-300"></i>
            장소 유형
          </label>
          <select
            className="input-field appearance-none"
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
          <label className="block text-[11px] font-bold text-surface-400 mb-1.5 uppercase tracking-wider">
            <i className="fas fa-map-pin mr-1 text-[9px] text-accent-400"></i>
            세부 위치
          </label>
          {[config.locTypes[0], config.locTypes[1], config.locTypes[2]].includes(locType) ? (
            <select
              className="input-field appearance-none"
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
              className="input-field"
              placeholder="구체적인 위치"
              value={locDetail}
              onChange={(e) => updateForm({ locDetail: e.target.value })}
              required
            />
          )}
        </div>
      </div>

      {/* ═══════ 메모 ═══════ */}
      <div>
        <label className="block text-[11px] font-bold text-surface-400 mb-1.5 uppercase tracking-wider">
          <i className="fas fa-sticky-note mr-1 text-[9px] text-warn-400"></i>
          메모 · 특이사항
        </label>
        <textarea
          rows={3}
          className="input-field resize-none"
          placeholder="색상, 크기, 보관 방법 등 상세 정보..."
          value={itemNotes}
          onChange={(e) => updateForm({ itemNotes: e.target.value })}
        />
      </div>

      {/* ═══════ 제출 버튼 ═══════ */}
      <button
        type="submit"
        className="w-full py-4 btn-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 touch-feedback"
      >
        <i className="fas fa-check"></i>
        {submitLabel}
      </button>
    </form>
  );
};

export default ItemForm;
