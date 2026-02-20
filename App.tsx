import React, { useContext, useMemo, useEffect } from 'react';
import { Item } from './types';
import { DELETE_CONFIRM_MESSAGE } from './constants';
import { analyzeImage, suggestCategoryAndNotes, searchWithGemini } from './services/geminiService';
import SearchBar from './components/SearchBar';
import ItemList from './components/ItemList';
import ItemForm from './components/ItemForm';
import ItemDetail from './components/ItemDetail';
import Settings from './components/Settings';
import { AppContext } from './src/context/StateContext';
import { exportItemsToExcel } from './services/excelService';
import { dataService } from './services/dataService';
import { supabaseService } from './services/supabaseService';

type SortOption = 'latest' | 'name' | 'category';

const App: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);

  const {
    items, searchTerm, sortOption, isAdding, selectedItem, isEditMode,
    formState, isAnalyzing, aiSearchResults, isSearchingAI,
    config, isSettingsOpen
  } = state;

  useEffect(() => {
    // Initialization or cleanup if needed
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    }
  }, [searchTerm, dispatch]);

  /**
   * 새 아이템 추가 핸들러
   * - Supabase에 저장하고, 로컬 상태도 업데이트
   */
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPath = `${formState.locType} > ${formState.locDetail}`;
    const newItem: Item = {
      id: Date.now().toString(),
      name: formState.itemName,
      locationPath: fullPath,
      category: formState.itemCat,
      notes: formState.itemNotes.split('\n').map(t => t.trim()).filter(t => t),
      imageUrls: formState.itemImages,
      updatedAt: Date.now()
    };

    const updatedItems = [newItem, ...items];
    dispatch({ type: 'SET_ITEMS', payload: updatedItems });
    dispatch({ type: 'TOGGLE_ADDING', payload: false });
    dispatch({ type: 'RESET_FORM' });

    try {
      await supabaseService.addItem(newItem);
    } catch (error: any) {
      console.error("Failed to save to Supabase", error);
      alert(`클라우드 저장에 실패했습니다. (로컬에는 저장됨)\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
    }
  };

  /**
   * 아이템 수정 핸들러
   */
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const fullPath = `${formState.locType} > ${formState.locDetail}`;
    const updatedItem: Item = {
      ...selectedItem,
      name: formState.itemName,
      locationPath: fullPath,
      category: formState.itemCat,
      notes: formState.itemNotes.split('\n').map(t => t.trim()).filter(t => t),
      imageUrls: formState.itemImages,
      updatedAt: Date.now()
    };

    const newItems = items.map(i => i.id === selectedItem.id ? updatedItem : i);
    dispatch({ type: 'SET_ITEMS', payload: newItems });
    dispatch({ type: 'SET_SELECTED_ITEM', payload: updatedItem });
    dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false });

    try {
      await supabaseService.updateItem(updatedItem);
    } catch (error: any) {
      console.error("Failed to update in Supabase", error);
      alert(`클라우드 업데이트에 실패했습니다. (로컬에는 반영됨)\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
    }
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  const openEditMode = () => {
    if (!selectedItem) return;
    const parts = selectedItem.locationPath.split(' > ');
    const locType = (parts.length === 2 && config.locTypes.includes(parts[0])) ? parts[0] : (config.locTypes[0] || '기타');
    const locDetail = (parts.length === 2 && config.locTypes.includes(parts[0])) ? parts[1] : selectedItem.locationPath;

    dispatch({
      type: 'UPDATE_FORM', payload: {
        itemName: selectedItem.name,
        locType: locType,
        locDetail: locDetail,
        itemCat: selectedItem.category,
        itemNotes: selectedItem.notes.join('\n'),
        itemImages: selectedItem.imageUrls,
      }
    });
    dispatch({ type: 'TOGGLE_EDIT_MODE', payload: true });
  };

  /**
   * AI 이미지 분석
   */
  const performImageAnalysis = async (base64: string) => {
    dispatch({ type: 'SET_IS_ANALYZING', payload: true });
    try {
      const result = await analyzeImage(base64);
      const updates: Partial<typeof formState> = {};
      if (result.name) updates.itemName = result.name;
      if (result.category) updates.itemCat = result.category;
      if (result.notes && result.notes.length > 0) {
        updates.itemNotes = formState.itemNotes
          ? `${formState.itemNotes}\n${result.notes.join('\n')}`
          : result.notes.join('\n');
      }
      dispatch({ type: 'UPDATE_FORM', payload: updates });
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING', payload: false });
    }
  };

  const performNameAnalysis = async () => {
    if (!formState.itemName.trim()) return;
    dispatch({ type: 'SET_IS_ANALYZING', payload: true });
    try {
      const result = await suggestCategoryAndNotes(formState.itemName);
      const updates: Partial<typeof formState> = {};
      if (result.category) updates.itemCat = result.category;
      if (result.notes && result.notes.length > 0) {
        updates.itemNotes = formState.itemNotes
          ? `${formState.itemNotes}\n${result.notes.join('\n')}`
          : result.notes.join('\n');
      }
      dispatch({ type: 'UPDATE_FORM', payload: updates });
    } catch (error) {
      console.error("AI Suggestion failed", error);
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING', payload: false });
    }
  };

  /**
   * 이미지 압축 함수
   * - 가로/세로 중 긴 쪽을 기준으로 400px로 리사이즈
   * - JPEG 품질 60%로 압축
   */
  const compressImage = (base64Str: string, maxWidth = 400, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  /**
   * 이미지 업로드 핸들러
   * - 모든 이미지는 자동 400px 리사이즈
   * - slot 0 (아이템 포토)인 경우 AI 분석 자동 실행
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawDataUrl = reader.result as string;
      if (!rawDataUrl) return;

      try {
        const compressedDataUrl = await compressImage(rawDataUrl, 400, 0.6);
        const newImages = [...formState.itemImages];
        newImages[slot] = compressedDataUrl;
        dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });

        if (slot === 0) {
          performImageAnalysis(compressedDataUrl);
        }
      } catch (error) {
        console.error('이미지 처리 중 오류:', error);
        alert('이미지 처리 중 오류가 발생했습니다.');
      }
    };
    reader.onerror = () => alert('파일을 읽는 중 오류가 발생했습니다.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = [...formState.itemImages];
    newImages.splice(index, 1);
    dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchTerm) {
      if (aiSearchResults) {
        result = items.filter(item => aiSearchResults.includes(item.name));
      } else {
        const lowerSearchTerm = searchTerm.toLowerCase();
        result = items.filter(item =>
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.notes.some(t => t.toLowerCase().includes(lowerSearchTerm)) ||
          item.locationPath.toLowerCase().includes(lowerSearchTerm)
        );
      }
    }
    return [...result].sort((a, b) => {
      if (sortOption === 'name') return a.name.localeCompare(b.name);
      if (sortOption === 'category') return a.category.localeCompare(b.category);
      return b.updatedAt - a.updatedAt;
    });
  }, [items, searchTerm, sortOption, aiSearchResults]);

  const deleteItem = async (id: string) => {
    if (confirm(DELETE_CONFIRM_MESSAGE)) {
      dispatch({ type: 'SET_ITEMS', payload: items.filter(i => i.id !== id) });
      if (selectedItem?.id === id) {
        dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
      }
      try {
        await supabaseService.deleteItem(id);
      } catch (error: any) {
        console.error("Failed to delete from Supabase", error);
        alert(`클라우드 삭제에 실패했습니다.\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
      }
    }
  };

  const handleExportData = () => {
    dataService.exportToJson({ items, config, version: 1 });
  };

  const handleExportExcel = () => {
    exportItemsToExcel(items);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string);
        const sanitizedData = dataService.validateAndSanitize(rawJson);
        if (sanitizedData) {
          const confirmMessage = sanitizedData.items.length > 0
            ? `총 ${sanitizedData.items.length}개의 아이템이 확인되었습니다.\n현재 데이터를 모두 지우고 백업 파일의 내용으로 복원하시겠습니까?`
            : '백업 파일에 아이템이 없습니다. 계속하시겠습니까?';
          if (confirm(confirmMessage)) {
            dispatch({ type: 'SET_ITEMS', payload: sanitizedData.items });
            if (sanitizedData.config) {
              dispatch({ type: 'UPDATE_CONFIG', payload: sanitizedData.config });
            }
            alert('데이터가 안전하게 복원되었습니다.');
            dispatch({ type: 'TOGGLE_SETTINGS', payload: false });
          }
        } else {
          alert('올바르지 않은 백업 파일 형식입니다.');
        }
      } catch (err) {
        console.error('파일 읽기 오류:', err);
        alert('파일을 분석하는 중 오류가 발생했습니다. JSON 형식을 확인해 주세요.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sortOptions: { id: SortOption, label: string, icon: string }[] = [
    { id: 'latest', label: '최신', icon: 'fa-clock' },
    { id: 'name', label: '이름', icon: 'fa-font' },
    { id: 'category', label: '분류', icon: 'fa-tag' }
  ];

  // 카테고리별 통계
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(item => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [items]);

  // 장소별 통계
  const locationStats = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(item => {
      const locType = item.locationPath.split(' > ')[0] || '기타';
      map[locType] = (map[locType] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [items]);

  return (
    <div className="fixed inset-0 flex flex-col safe-top safe-bottom" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 30%, #f1f5f9 100%)' }}>

      {/* ═══════════════════════════════════════════
          📌 히어로 헤더 - 화면 1/3 크기, 앱 소개 + 이모지
          ═══════════════════════════════════════════ */}
      <header className="shrink-0 safe-left safe-right z-50 relative overflow-hidden" style={{ minHeight: '33vh', background: 'linear-gradient(160deg, #6366f1 0%, #818cf8 35%, #a78bfa 70%, #c4b5fd 100%)' }}>
        {/* 설정 버튼 - 우상단 고정 */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {items.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white/90 bg-white/20 backdrop-blur-sm border border-white/20 flex items-center gap-1">
              📦 {items.length}개
            </div>
          )}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', payload: true })}
            className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white/80 hover:bg-white/25 transition-all flex items-center justify-center touch-feedback"
          >
            <i className="fas fa-cog text-sm"></i>
          </button>
        </div>

        {/* 배경 장식 원형들 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full bg-white/[0.06]" style={{ top: '-15%', left: '-10%' }}></div>
          <div className="absolute w-56 h-56 rounded-full bg-white/[0.04]" style={{ bottom: '-25%', right: '-15%' }}></div>
          <div className="absolute w-24 h-24 rounded-full bg-white/[0.06]" style={{ top: '20%', right: '10%' }}></div>
        </div>

        {/* 떠다니는 이모지 오브젝트들 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <span className="absolute text-2xl animate-float" style={{ top: '15%', left: '8%', animationDelay: '0s' }}>🔑</span>
          <span className="absolute text-xl animate-float" style={{ top: '25%', right: '12%', animationDelay: '0.8s' }}>👜</span>
          <span className="absolute text-2xl animate-float" style={{ bottom: '25%', left: '15%', animationDelay: '1.5s' }}>📱</span>
          <span className="absolute text-lg animate-float" style={{ top: '12%', right: '32%', animationDelay: '0.4s' }}>🎧</span>
          <span className="absolute text-xl animate-float" style={{ bottom: '18%', right: '8%', animationDelay: '1.2s' }}>💳</span>
          <span className="absolute text-base animate-float" style={{ bottom: '35%', left: '5%', animationDelay: '2s' }}>🧸</span>
          <span className="absolute text-lg animate-float" style={{ top: '40%', right: '25%', animationDelay: '0.6s' }}>📦</span>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-6" style={{ minHeight: '33vh' }}>
          {/* 로고 아이콘 */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center mb-4 shadow-lg animate-bounce-in">
            <span className="text-3xl">📍</span>
          </div>

          {/* 앱 이름 */}
          <h1 className="text-3xl font-black text-white tracking-tight mb-1.5 animate-fade-in">
            WhereIsIt
          </h1>

          {/* 핵심 문구 - 앱을 한번에 알 수 있는 */}
          <p className="text-base font-semibold text-white/90 text-center mb-2 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            "그거 어디 뒀더라?" 🤔 이제 고민 끝!
          </p>

          {/* 보조 설명 */}
          <p className="text-xs text-white/60 text-center font-medium max-w-[260px] leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            사진 찍고 📸 위치 기록하면 끝!<br />
            AI가 자동 분류까지 해드려요 ✨
          </p>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          🔍 검색창 영역
          ═══════════════════════════════════════════ */}
      <div className="px-5 pt-3 pb-1 shrink-0 safe-left safe-right">
        <SearchBar />
      </div>

      {/* ═══════════════════════════════════════════
          📋 메인 컨텐츠 영역 - 스크롤 가능
          ═══════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto mobile-scroll px-5 pb-28 safe-left safe-right">

        {/* 아이템이 없을 때: 히어로 온보딩 화면 */}
        {items.length === 0 && !searchTerm ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh] animate-fade-in-scale">
            {/* 메인 일러스트 영역 */}
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-[2rem] gradient-primary flex items-center justify-center shadow-glow-lg animate-float">
                <i className="fas fa-map-marker-alt text-white text-5xl"></i>
              </div>
              {/* 장식 오브젝트 */}
              <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-accent-400 flex items-center justify-center shadow-lg animate-bounce-in stagger-2">
                <i className="fas fa-box text-white text-sm"></i>
              </div>
              <div className="absolute -bottom-2 -left-4 w-8 h-8 rounded-lg bg-warn-400 flex items-center justify-center shadow-lg animate-bounce-in stagger-3">
                <i className="fas fa-key text-white text-xs"></i>
              </div>
              <div className="absolute top-1/2 -right-6 w-7 h-7 rounded-full bg-danger-400 flex items-center justify-center shadow-lg animate-bounce-in stagger-4">
                <i className="fas fa-headphones text-white text-[10px]"></i>
              </div>
            </div>

            {/* 앱 소개 텍스트 */}
            <h2 className="text-2xl font-black text-surface-800 mb-2 tracking-tight text-center">
              물건을 잃어버리지 마세요
            </h2>
            <p className="text-sm text-surface-400 font-medium text-center max-w-[280px] leading-relaxed mb-8">
              소중한 물건의 위치를 사진과 함께 기록하고,<br />
              필요할 때 바로 찾으세요.
            </p>

            {/* 기능 하이라이트 카드 */}
            <div className="w-full max-w-sm space-y-3 mb-8">
              {[
                { icon: 'fa-camera', color: 'bg-primary-500', title: '사진으로 기록', desc: '물건과 보관 장소를 촬영하세요' },
                { icon: 'fa-brain', color: 'bg-accent-500', title: 'AI 자동 분류', desc: '사진만 찍으면 AI가 알아서 정리해요' },
                { icon: 'fa-magnifying-glass', color: 'bg-warn-500', title: '스마트 검색', desc: '키워드로 순식간에 찾아보세요' },
              ].map((feature, idx) => (
                <div key={idx} className={`card p-4 flex items-center gap-4 animate-fade-in-scale stagger-${idx + 2}`}>
                  <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center shrink-0`}>
                    <i className={`fas ${feature.icon} text-white text-base`}></i>
                  </div>
                  <div>
                    <p className="font-bold text-surface-800 text-sm">{feature.title}</p>
                    <p className="text-xs text-surface-400 font-medium">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={() => { resetForm(); dispatch({ type: 'TOGGLE_ADDING', payload: true }); }}
              className="btn-primary flex items-center gap-2 text-base px-8 animate-bounce-in stagger-5"
            >
              <i className="fas fa-plus"></i>
              첫 번째 물건 등록하기
            </button>
          </div>
        ) : (
          <>
            {/* ───── 아이템이 있을 때: 대시보드 + 리스트 ───── */}

            {/* 미니 통계 대시보드 */}
            {items.length > 0 && !searchTerm && (
              <div className="mt-3 mb-5 animate-fade-in">
                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-3 text-center">
                    <p className="text-2xl font-black gradient-text">{items.length}</p>
                    <p className="text-[10px] font-bold text-surface-400 mt-0.5">전체 아이템</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-2xl font-black text-accent-500">{locationStats.length}</p>
                    <p className="text-[10px] font-bold text-surface-400 mt-0.5">보관 장소</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-2xl font-black text-warn-500">{categoryStats.length}</p>
                    <p className="text-[10px] font-bold text-surface-400 mt-0.5">카테고리</p>
                  </div>
                </div>
              </div>
            )}

            {/* 리스트 헤더 - 정렬 + 뷰모드 */}
            <div className="flex justify-between items-center mb-4 mt-2">
              <h3 className="font-extrabold text-surface-700 text-base">
                {searchTerm ? (
                  <span className="flex items-center gap-2">
                    <i className="fas fa-search text-primary-400 text-sm"></i>
                    검색 결과
                    <span className="badge badge-primary">{filteredItems.length}</span>
                  </span>
                ) : '내 물건'}
              </h3>

              <div className="flex gap-2">
                {/* 정렬 토글 */}
                <div className="flex bg-surface-100 rounded-xl p-0.5 border border-surface-200">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => dispatch({ type: 'SET_SORT_OPTION', payload: opt.id })}
                      className={`toggle-chip text-[11px] px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 ${sortOption === opt.id ? 'active' : 'text-surface-400'
                        }`}
                    >
                      <i className={`fas ${opt.icon} text-[9px]`}></i>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* 뷰모드 토글 */}
                <div className="flex bg-surface-100 rounded-xl p-0.5 border border-surface-200">
                  <button
                    onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'card' })}
                    className={`toggle-chip w-8 h-8 rounded-lg flex items-center justify-center text-sm ${state.viewMode === 'card' ? 'active' : 'text-surface-400'
                      }`}
                  >
                    <i className="fas fa-th-large text-xs"></i>
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'table' })}
                    className={`toggle-chip w-8 h-8 rounded-lg flex items-center justify-center text-sm ${state.viewMode === 'table' ? 'active' : 'text-surface-400'
                      }`}
                  >
                    <i className="fas fa-list text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* 아이템 목록 */}
            <ItemList items={filteredItems} />
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          ➕ FAB (플로팅 추가 버튼)
          ═══════════════════════════════════════════ */}
      {items.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40 safe-bottom">
          <button
            onClick={() => { resetForm(); dispatch({ type: 'TOGGLE_ADDING', payload: true }); }}
            className="pointer-events-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white text-xl fab-shadow touch-feedback"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          📝 새 아이템 추가 모달 (바텀시트)
          ═══════════════════════════════════════════ */}
      {isAdding && (
        <div className="fullscreen-modal animate-fade-in" onClick={() => dispatch({ type: 'TOGGLE_ADDING', payload: false })}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] animate-slide-up flex flex-col safe-bottom safe-left safe-right"
            style={{ maxHeight: '92vh', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-200"></div>
            </div>

            {/* 모달 헤더 */}
            <div className="flex justify-between items-center px-6 pb-4">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_ADDING', payload: false })}
                className="w-10 h-10 rounded-xl bg-surface-100 text-surface-400 flex items-center justify-center hover:bg-surface-200 transition-all touch-feedback"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
              <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2">
                <i className="fas fa-plus-circle text-primary-400"></i>
                새 물건 등록
              </h2>
              <div className="w-10"></div>
            </div>

            {/* 폼 영역 */}
            <div className="overflow-y-auto flex-1 px-6 pb-6 mobile-scroll">
              <ItemForm
                onSubmit={handleAddItem}
                submitLabel="등록하기"
                isAnalyzing={isAnalyzing}
                performNameAnalysis={performNameAnalysis}
                removeImage={removeImage}
                handleImageUpload={handleImageUpload}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          📖 아이템 상세 모달 (바텀시트)
          ═══════════════════════════════════════════ */}
      {selectedItem && (
        <div className="fullscreen-modal animate-fade-in" onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); }}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] animate-slide-up flex flex-col safe-bottom safe-left safe-right"
            style={{ maxHeight: '92vh', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-200"></div>
            </div>

            {/* 모달 헤더 */}
            <div className="flex justify-between items-center px-6 pb-4">
              <button
                onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); }}
                className="w-10 h-10 rounded-xl bg-surface-100 text-surface-400 flex items-center justify-center hover:bg-surface-200 transition-all touch-feedback"
              >
                <i className="fas fa-chevron-left text-lg"></i>
              </button>
              <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2">
                {isEditMode ? (
                  <><i className="fas fa-pen text-primary-400"></i> 수정하기</>
                ) : (
                  <><i className="fas fa-info-circle text-primary-400"></i> 상세 정보</>
                )}
              </h2>
              <div className="w-10"></div>
            </div>

            {/* 상세/수정 폼 */}
            <div className="overflow-y-auto flex-1 px-6 pb-6 mobile-scroll">
              {isEditMode ? (
                <ItemForm
                  onSubmit={handleUpdateItem}
                  submitLabel="수정 완료"
                  isAnalyzing={isAnalyzing}
                  performNameAnalysis={performNameAnalysis}
                  removeImage={removeImage}
                  handleImageUpload={handleImageUpload}
                />
              ) : (
                <ItemDetail
                  item={selectedItem}
                  onEdit={openEditMode}
                  onDelete={() => deleteItem(selectedItem!.id)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ⚙️ 설정 모달
          ═══════════════════════════════════════════ */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => dispatch({ type: 'TOGGLE_SETTINGS', payload: false })}
        handleExportData={handleExportData}
        handleExportExcel={handleExportExcel}
        handleImportData={handleImportData}
      />
    </div>
  );
};

export default App;