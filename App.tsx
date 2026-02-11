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

// Define a type for the sort options to avoid using 'any'
type SortOption = 'latest' | 'name' | 'category';

const App: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const {
    items, searchTerm, sortOption, isAdding, selectedItem, isEditMode,
    formState, isAnalyzing, aiSearchResults, isSearchingAI,
    isCameraActive, activeCameraSlot, config, isSettingsOpen
  } = state;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    }
  }, [searchTerm, dispatch]);

  const handleAddItem = (e: React.FormEvent) => {
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
    dispatch({ type: 'SET_ITEMS', payload: [newItem, ...items] });
    dispatch({ type: 'TOGGLE_ADDING', payload: false });
    dispatch({ type: 'RESET_FORM' });
  };

  const handleUpdateItem = (e: React.FormEvent) => {
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
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
    stopCamera();
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCameraSlot !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const newImages = [...formState.itemImages];
        newImages[activeCameraSlot] = dataUrl;
        dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
        stopCamera();
        if (activeCameraSlot === 0) {
          performImageAnalysis(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async (slot: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      dispatch({ type: 'SET_CAMERA_ACTIVE', payload: { isActive: true, slot: slot } });
    } catch (err) {
      console.error("Camera access denied", err);
      alert("카메라에 접근할 수 없습니다.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    dispatch({ type: 'SET_CAMERA_ACTIVE', payload: { isActive: false, slot: null } });
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && activeCameraSlot !== null) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const newImages = [...formState.itemImages];
        newImages[activeCameraSlot] = dataUrl;
        dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
        stopCamera();
        if (activeCameraSlot === 0) {
          performImageAnalysis(dataUrl);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...formState.itemImages];
    newImages.splice(index, 1);
    dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
  };

  const handleAISearch = async () => {
    if (!searchTerm.trim()) return;
    dispatch({ type: 'SET_IS_SEARCHING_AI', payload: true });
    try {
      const results = await searchWithGemini(searchTerm, items);
      dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: results });
    } catch (error) {
      console.error("AI Search failed", error);
      // Alert is handled in the service
    } finally {
      dispatch({ type: 'SET_IS_SEARCHING_AI', payload: false });
    }
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

  const deleteItem = (id: string) => {
    if (confirm(DELETE_CONFIRM_MESSAGE)) {
      dispatch({ type: 'SET_ITEMS', payload: items.filter(i => i.id !== id) });
      if (selectedItem?.id === id) {
        dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
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
    e.target.value = ''; // 파일 선택 초기화
  };

  const sortOptions: { id: SortOption, label: string }[] = [
    { id: 'latest', label: '최신순' },
    { id: 'name', label: '이름순' },
    { id: 'category', label: '카테고리순' }
  ];

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans md:border-x border-gray-200 md:shadow-xl relative text-gray-900">
      <header className="glass border-b border-gray-100/50 px-6 py-6 sticky top-0 z-50 flex flex-col items-center text-center relative rounded-b-[2.5rem] shadow-sm">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', payload: true })}
          className="absolute right-4 top-6 bg-white/50 backdrop-blur-md border border-white/80 shadow-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-white active:scale-95 transition-all group"
        >
          <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all shadow-inner">
            <i className="fas fa-sliders-h text-xs"></i>
          </span>
          <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">설정</span>
        </button>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 brand-gradient rounded-2xl shadow-lg shadow-brand-200 flex items-center justify-center mb-2 float-anim">
            <i className="fas fa-brain text-white text-xl"></i>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Memory <span className="gradient-text">Whisp</span>
          </h1>
          <p className="text-xs text-gray-400 font-semibold mt-1 tracking-wide uppercase">Your Digital Memory Safe</p>
        </div>
      </header>

      <SearchBar />

      <div className="px-6 py-6">


        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <i className="fas fa-list-ul text-indigo-400 text-sm"></i>
              보관된 아이템 ({filteredItems.length})
            </h3>
            <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/50">
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'card' })}
                className={`p-1.5 rounded-md transition-all ${state.viewMode === 'card' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="카드 뷰"
              >
                <i className="fas fa-th-large text-xs"></i>
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'table' })}
                className={`p-1.5 rounded-md transition-all ${state.viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="테이블 뷰"
              >
                <i className="fas fa-table text-xs"></i>
              </button>
            </div>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {sortOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => dispatch({ type: 'SET_SORT_OPTION', payload: opt.id })}
                className={`text-xs px-2 py-1 rounded-md font-bold transition-all ${sortOption === opt.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ItemList
          items={filteredItems}
        />
      </div>

      <button
        onClick={() => { resetForm(); dispatch({ type: 'TOGGLE_ADDING', payload: true }); }}
        className="fixed bottom-8 right-1/2 translate-x-1/2 w-20 h-20 brand-gradient text-white rounded-full shadow-[0_20px_50px_rgba(99,102,241,0.4)] flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all z-40 border-8 border-white group"
      >
        <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
        <i className="fas fa-plus relative z-10"></i>
      </button>

      {isAdding && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto relative border border-white/50 card-shadow">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/50 backdrop-blur-md -mx-8 px-8 py-4 z-20 -mt-8 rounded-t-[3rem] border-b border-gray-100/50">
              <h2 className="text-base font-black text-gray-900 tracking-tight">새로운 기억 맡기기</h2>
              <button onClick={() => { dispatch({ type: 'TOGGLE_ADDING', payload: false }); stopCamera(); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all">
                <i className="fas fa-times text-gray-400 text-sm"></i>
              </button>
            </div>
            <ItemForm
              onSubmit={handleAddItem}
              submitLabel="이대로 보관하기"
              isAnalyzing={isAnalyzing}
              performNameAnalysis={performNameAnalysis}
              startCamera={startCamera}
              stopCamera={stopCamera}
              capturePhoto={capturePhoto}
              removeImage={removeImage}
              handleImageUpload={handleImageUpload}
              videoRef={videoRef}
              canvasRef={canvasRef}
              fileInputRef={fileInputRef}
            />
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto relative border border-white/50 card-shadow">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/50 backdrop-blur-md -mx-8 px-8 py-4 z-20 -mt-8 rounded-t-[3rem] border-b border-gray-100/50">
              <button onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); stopCamera(); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95">
                <i className="fas fa-arrow-left text-gray-400 text-sm"></i>
              </button>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                {isEditMode ? '기억 수정' : '상세 정보'}
              </h2>
              <button onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); stopCamera(); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all">
                <i className="fas fa-times text-gray-400 text-sm"></i>
              </button>
            </div>

            {isEditMode ? (
              <ItemForm
                onSubmit={handleUpdateItem}
                submitLabel="변경사항 저장"
                isAnalyzing={isAnalyzing}
                performNameAnalysis={performNameAnalysis}
                startCamera={startCamera}
                stopCamera={stopCamera}
                capturePhoto={capturePhoto}
                removeImage={removeImage}
                handleImageUpload={handleImageUpload}
                videoRef={videoRef}
                canvasRef={canvasRef}
                fileInputRef={fileInputRef}
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
      )}

      <style>{`
        /* ... styles remain unchanged ... */
      `}</style>
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