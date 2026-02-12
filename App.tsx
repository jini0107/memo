import React, { useContext, useMemo, useRef, useEffect } from 'react';
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

    // Optimistic Update
    const updatedItems = [newItem, ...items];
    dispatch({ type: 'SET_ITEMS', payload: updatedItems });
    dispatch({ type: 'TOGGLE_ADDING', payload: false });
    dispatch({ type: 'RESET_FORM' });

    // Save to Supabase
    try {
      await supabaseService.addItem(newItem);
    } catch (error: any) {
      console.error("Failed to save to Supabase", error);
      alert(`클라우드 저장에 실패했습니다. (로컬에는 저장됨)\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
    }
  };

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

    // Optimistic Update
    const newItems = items.map(i => i.id === selectedItem.id ? updatedItem : i);
    dispatch({ type: 'SET_ITEMS', payload: newItems });
    dispatch({ type: 'SET_SELECTED_ITEM', payload: updatedItem });
    dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false });

    // Update in Supabase
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
   * - 카메라 촬영 또는 갤러리에서 선택한 모든 이미지를 400px로 리사이즈
   * - 가로/세로 중 긴 쪽을 기준으로 400px로 조정
   * - JPEG 품질 60%로 압축하여 파일 크기 최적화
   */
  const compressImage = (base64Str: string, maxWidth = 400, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 가로가 더 긴 경우
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          // 세로가 더 긴 경우
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str); // Fallback
        }
      };
      img.onerror = () => resolve(base64Str); // Fallback
    });
  };

  /**
   * 이미지 업로드 핸들러
   * - 카메라 버튼: capture="environment" 속성으로 기본 카메라 앱 실행
   * - 갤러리 버튼: 갤러리에서 사진 선택
   * - 모든 이미지는 자동으로 400px로 리사이즈됨
   * - slot 0 (아이템 포토)의 경우 AI 분석 자동 실행
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    console.log('📸 handleImageUpload 호출됨 - slot:', slot);

    const file = e.target.files?.[0];
    console.log('📁 선택된 파일:', file);

    if (!file) {
      console.warn('⚠️ 파일이 선택되지 않았습니다.');
      return;
    }

    console.log('📋 파일 정보:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified)
    });

    const reader = new FileReader();

    reader.onloadstart = () => {
      console.log('🔄 파일 읽기 시작...');
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentLoaded = Math.round((e.loaded / e.total) * 100);
        console.log(`📊 읽기 진행률: ${percentLoaded}%`);
      }
    };

    reader.onerror = (error) => {
      console.error('❌ 파일 읽기 오류:', error);
      alert('파일을 읽는 중 오류가 발생했습니다.');
    };

    reader.onloadend = async () => {
      console.log('✅ 파일 읽기 완료');

      const rawDataUrl = reader.result as string;

      if (!rawDataUrl) {
        console.error('❌ 파일 데이터가 비어있습니다.');
        return;
      }

      console.log('📏 원본 이미지 크기:', rawDataUrl.length, 'bytes');

      try {
        // 🔧 이미지를 400px로 강제 리사이즈
        console.log('🔧 이미지 압축 시작...');
        const compressedDataUrl = await compressImage(rawDataUrl, 400, 0.6);
        console.log('✅ 이미지 압축 완료');
        console.log('📏 압축된 이미지 크기:', compressedDataUrl.length, 'bytes');

        const newImages = [...formState.itemImages];
        newImages[slot] = compressedDataUrl;

        console.log('💾 이미지 저장 중... slot:', slot);
        console.log('📦 현재 이미지 배열:', newImages.map((img, i) => `[${i}]: ${img ? '있음' : '없음'}`));

        dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
        console.log('✅ 이미지가 formState에 저장되었습니다!');

        // 첫 번째 슬롯(아이템 포토)인 경우 AI 분석 실행
        if (slot === 0) {
          console.log('🤖 AI 분석 시작...');
          performImageAnalysis(compressedDataUrl);
        }
      } catch (error) {
        console.error('❌ 이미지 처리 중 오류:', error);
        alert('이미지 처리 중 오류가 발생했습니다.');
      }
    };

    console.log('📖 파일 읽기 시작...');
    reader.readAsDataURL(file);

    // input 값을 리셋하여 같은 파일을 다시 선택할 수 있도록 함
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
      // Optimistic Delete
      dispatch({ type: 'SET_ITEMS', payload: items.filter(i => i.id !== id) });
      if (selectedItem?.id === id) {
        dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
      }

      // Delete from Supabase
      try {
        await supabaseService.deleteItem(id);
      } catch (error: any) {
        console.error("Failed to delete from Supabase", error);
        alert(`클라우드 삭제에 실패했습니다. (로컬에서는 삭제됨)\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
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
          alert('올바르지 않은 백업 파일 형식입니다. 데이터를 읽을 수 없습니다.');
        }
      } catch (err) {
        console.error('파일 읽기 오류:', err);
        alert('파일을 분석하는 중 오류가 발생했습니다. JSON 형식을 확인해 주세요.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sortOptions: { id: SortOption, label: string }[] = [
    { id: 'latest', label: '최신순' },
    { id: 'name', label: '이름순' },
    { id: 'category', label: '카테고리순' }
  ];

  return (
    // 📱 모바일 풀스크린 레이아웃
    <div className="fixed inset-0 bg-white flex flex-col safe-top safe-bottom">
      {/* 헤더 - 고정 */}
      <header className="px-4 py-4 flex justify-between items-center bg-white border-b-2 border-gray-100 shrink-0 safe-left safe-right">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-duo-green flex items-center justify-center border-b-4 border-[#58a700] active:border-b-0 active:translate-y-1 transition-all touch-feedback">
            <i className="fas fa-box-open text-white text-xl"></i>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#4b4b4b]">
            WhereIsIt
          </h1>
        </div>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', payload: true })}
          className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 border-b-4 text-gray-400 hover:bg-gray-50 hover:text-duo-blue active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center touch-feedback"
        >
          <i className="fas fa-cog text-xl"></i>
        </button>
      </header>

      {/* 검색창 */}
      <div className="px-4 py-3 bg-white shrink-0 safe-left safe-right">
        <SearchBar />
      </div>

      {/* 메인 컨텐츠 - 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto mobile-scroll px-4 pb-24 safe-left safe-right">
        {/* 리스트 헤더 */}
        <div className="flex justify-between items-center mb-4 mt-2">
          <h3 className="font-extrabold text-[#4b4b4b] text-lg">
            My Items
          </h3>

          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1 border-2 border-gray-200">
              {sortOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => dispatch({ type: 'SET_SORT_OPTION', payload: opt.id })}
                  className={`text-xs px-3 py-2 rounded-lg font-bold transition-all touch-feedback ${sortOption === opt.id
                    ? 'bg-white text-duo-blue shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1 border-2 border-gray-200">
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'card' })}
                className={`p-2 w-10 rounded-lg transition-all flex items-center justify-center touch-feedback ${state.viewMode === 'card' ? 'bg-white shadow-sm text-duo-green' : 'text-gray-400'}`}
              >
                <i className="fas fa-th-large"></i>
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'table' })}
                className={`p-2 w-10 rounded-lg transition-all flex items-center justify-center touch-feedback ${state.viewMode === 'table' ? 'bg-white shadow-sm text-duo-green' : 'text-gray-400'}`}
              >
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 아이템 목록 */}
        <ItemList items={filteredItems} />
      </div>

      {/* FAB (플로팅 추가 버튼) - 안전 영역 고려 */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40 safe-bottom">
        <button
          onClick={() => { resetForm(); dispatch({ type: 'TOGGLE_ADDING', payload: true }); }}
          className="pointer-events-auto btn-3d btn-duo-green w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-xl hover:scale-105 active:scale-95 transition-all border-4 border-white touch-feedback"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* 새 아이템 추가 모달 - 바텀 시트 스타일 */}
      {isAdding && (
        <div className="fullscreen-modal animate-fade-in" onClick={() => dispatch({ type: 'TOGGLE_ADDING', payload: false })}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-6 animate-slide-up shadow-2xl flex flex-col safe-bottom safe-left safe-right"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_ADDING', payload: false })}
                className="btn-3d w-12 h-12 rounded-xl bg-white border-2 border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-50 active:border-b-0 touch-feedback"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
              <h2 className="text-2xl font-black text-[#4b4b4b]">ADD ITEM</h2>
              <div className="w-12"></div>
            </div>

            <div className="overflow-y-auto flex-1 px-1 mobile-scroll">
              <ItemForm
                onSubmit={handleAddItem}
                submitLabel="SAVE ITEM"
                isAnalyzing={isAnalyzing}
                performNameAnalysis={performNameAnalysis}
                removeImage={removeImage}
                handleImageUpload={handleImageUpload}
              />
            </div>
          </div>
        </div>
      )}

      {/* 아이템 상세 모달 - 바텀 시트 스타일 */}
      {selectedItem && (
        <div className="fullscreen-modal animate-fade-in" onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); }}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-6 animate-slide-up shadow-2xl flex flex-col safe-bottom safe-left safe-right"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <button
                onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); }}
                className="btn-3d w-12 h-12 rounded-xl bg-white border-2 border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-50 touch-feedback"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h2 className="text-2xl font-black text-[#4b4b4b]">
                {isEditMode ? 'EDIT' : 'DETAILS'}
              </h2>
              <div className="w-12"></div>
            </div>

            <div className="overflow-y-auto flex-1 px-1 mobile-scroll">
              {isEditMode ? (
                <ItemForm
                  onSubmit={handleUpdateItem}
                  submitLabel="UPDATE"
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