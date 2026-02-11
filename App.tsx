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

// 정렬 옵션 타입을 정의합니다. (최신순, 이름순, 카테고리순)
// 이렇게 미리 정해두면 오타를 방지할 수 있어요.
type SortOption = 'latest' | 'name' | 'category';

/**
 * App 컴포넌트: 우리 앱의 가장 큰 상자입니다.
 * 여기서 모든 중요한 데이터(기억)를 관리하고 화면을 그려줍니다.
 */
const App: React.FC = () => {
  // AppContext에서 데이터(state)와 데이터를 바꾸는 도구(dispatch)를 꺼내옵니다.
  // 마치 도구함에서 필요한 연장을 꺼내는 것과 같아요.
  const { state, dispatch } = useContext(AppContext);

  // state 안에 들어있는 여러 가지 정보들을 편하게 쓰기 위해 따로따로 꺼내둡니다.
  // items: 물건 목록, searchTerm: 검색어, isAdding: 추가 중인지 여부 등을 의미해요.
  const {
    items, searchTerm, sortOption, isAdding, selectedItem, isEditMode,
    formState, isAnalyzing, aiSearchResults, isSearchingAI,
    isCameraActive, activeCameraSlot, config, isSettingsOpen
  } = state;

  // 화면에 있는 비디오(카메라 화면)나 캔버스(사진 찍는 판) 등을 코드에서 직접 만지기 위해 이름표(ref)를 붙여둡니다.
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // 카메라 영상 데이터 흐름을 담아두는 곳

  // useEffect: 화면이 처음 켜지거나 꺼질 때 실행되는 특별한 함수입니다.
  useEffect(() => {
    // 화면이 꺼질 때(이 컴포넌트가 사라질 때) 카메라를 끕니다.
    return () => stopCamera();
  }, []);

  // 검색어가 바뀔 때마다 실행되는 함수입니다.
  useEffect(() => {
    // 검색어가 텅 비면 AI 검색 결과도 깨끗하게 비웁니다.
    if (!searchTerm) {
      dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    }
  }, [searchTerm, dispatch]);

  /**
   * handleAddItem: '이대로 보관하기' 버튼을 눌렀을 때 실행됩니다.
   * 새로운 물건 정보를 만들어서 목록에 추가해줍니다.
   */
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault(); // 페이지가 새로고침 되는 것을 막아줍니다.

    // 장소 구분과 상세 위치를 합쳐서 전체 위치 주소를 만듭니다. (예: 집 > 거실)
    const fullPath = `${formState.locType} > ${formState.locDetail}`;

    // 새로운 아이템 정보를 묶어서 만듭니다.
    const newItem: Item = {
      id: Date.now().toString(), // 현재 시간을 ID로 써서 겹치지 않게 합니다.
      name: formState.itemName, // 입력한 이름
      locationPath: fullPath, // 합쳐진 위치 정보
      category: formState.itemCat, // 선택한 카테고리
      notes: formState.itemNotes.split('\n').map(t => t.trim()).filter(t => t), // 메모를 줄바꿈 기준으로 나눠서 저장합니다.
      imageUrls: formState.itemImages, // 사진들
      updatedAt: Date.now() // 저장한 시간
    };

    // 만든 아이템을 목록 맨 앞에 추가해달라고 요청(dispatch)합니다.
    dispatch({ type: 'SET_ITEMS', payload: [newItem, ...items] });
    // '추가하기' 화면을 닫습니다.
    dispatch({ type: 'TOGGLE_ADDING', payload: false });
    // 입력 칸들을 깨끗하게 비웁니다.
    dispatch({ type: 'RESET_FORM' });
  };

  /**
   * handleUpdateItem: 내용을 수정하고 저장할 때 실행됩니다.
   */
  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return; // 선택된 아이템이 없으면 아무것도 안 합니다.

    const fullPath = `${formState.locType} > ${formState.locDetail}`;
    // 기존 아이템 정보(...selectedItem)에 새로운 정보들을 덮어씌웁니다.
    const updatedItem: Item = {
      ...selectedItem,
      name: formState.itemName,
      locationPath: fullPath,
      category: formState.itemCat,
      notes: formState.itemNotes.split('\n').map(t => t.trim()).filter(t => t),
      imageUrls: formState.itemImages,
      updatedAt: Date.now() // 수정한 시간으로 업데이트
    };

    // 전체 목록에서 예전 아이템을 찾아서 새 아이템으로 바꿔치기 합니다.
    const newItems = items.map(i => i.id === selectedItem.id ? updatedItem : i);
    dispatch({ type: 'SET_ITEMS', payload: newItems });
    dispatch({ type: 'SET_SELECTED_ITEM', payload: updatedItem }); // 선택된 아이템 정보도 업데이트
    dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); // 수정 모드 끄기
  };

  // 폼(입력창)을 초기화하고 카메라도 끄는 함수입니다.
  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
    stopCamera();
  };

  /**
   * openEditMode: '수정하기' 버튼을 누르면 실행됩니다.
   * 현재 선택된 물건의 정보를 입력창에 미리 채워넣어 줍니다.
   */
  const openEditMode = () => {
    if (!selectedItem) return;

    // 저장된 위치 정보(집 > 거실)를 쪼개서 각각 넣을 준비를 합니다.
    const parts = selectedItem.locationPath.split(' > ');
    const locType = (parts.length === 2 && config.locTypes.includes(parts[0])) ? parts[0] : (config.locTypes[0] || '기타');
    const locDetail = (parts.length === 2 && config.locTypes.includes(parts[0])) ? parts[1] : selectedItem.locationPath;

    // 입력창들에 값을 채워넣으라고 요청합니다.
    dispatch({
      type: 'UPDATE_FORM', payload: {
        itemName: selectedItem.name,
        locType: locType,
        locDetail: locDetail,
        itemCat: selectedItem.category,
        itemNotes: selectedItem.notes.join('\n'), // 메모 배열을 다시 줄글로 합칩니다.
        itemImages: selectedItem.imageUrls,
      }
    });
    // 수정 모드를 켭니다.
    dispatch({ type: 'TOGGLE_EDIT_MODE', payload: true });
  };

  /**
   * performImageAnalysis: 사진을 찍거나 올렸을 때 AI가 사진을 분석해주는 함수입니다.
   * 사진만 보고 이게 무슨 물건인지 알아맞힙니다.
   */
  const performImageAnalysis = async (base64: string) => {
    dispatch({ type: 'SET_IS_ANALYZING', payload: true }); // "분석 중..." 표시 켜기
    try {
      const result = await analyzeImage(base64); // AI에게 물어봅니다.
      const updates: Partial<typeof formState> = {};

      // AI가 알아낸 정보가 있으면 입력창에 자동으로 채워줍니다.
      if (result.name) updates.itemName = result.name;
      if (result.category) updates.itemCat = result.category;
      if (result.notes && result.notes.length > 0) {
        // 기존 메모가 있으면 그 뒤에 이어 붙입니다.
        updates.itemNotes = formState.itemNotes
          ? `${formState.itemNotes}\n${result.notes.join('\n')}`
          : result.notes.join('\n');
      }
      dispatch({ type: 'UPDATE_FORM', payload: updates });
    } catch (error) {
      console.error("AI Analysis failed", error); // 실패하면 에러 내용을 콘솔에 적어둡니다.
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING', payload: false }); // "분석 중..." 표시 끄기
    }
  };

  /**
   * performNameAnalysis: 물건 이름만 입력했을 때 AI가 나머지를 추측해주는 함수입니다.
   * "여권"이라고 쓰면 "중요 서류" 카테고리를 추천해주는 식이죠.
   */
  const performNameAnalysis = async () => {
    if (!formState.itemName.trim()) return; // 이름이 없으면 안 합니다.
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

  // 파일을 선택해서 사진을 업로드할 때 쓰는 함수입니다.
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // 선택한 파일을 가져옵니다.
    if (file && activeCameraSlot !== null) {
      const reader = new FileReader(); // 파일을 읽는 도구를 꺼냅니다.
      reader.onloadend = () => {
        const dataUrl = reader.result as string; // 파일 내용을 글자(문자열)로 바꿉니다.
        const newImages = [...formState.itemImages];
        newImages[activeCameraSlot] = dataUrl; // 해당 위치에 사진을 넣습니다.
        dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
        stopCamera(); // 카메라는 끕니다.
        if (activeCameraSlot === 0) {
          performImageAnalysis(dataUrl); // 첫 번째 사진(물건 사진)이면 AI 분석을 시작합니다.
        }
      };
      reader.readAsDataURL(file); // 파일을 읽어오라고 시킵니다.
    }
  };

  // 카메라를 켜는 함수입니다.
  const startCamera = async (slot: number) => {
    try {
      // 브라우저에게 카메라 권한을 요청합니다. (facingMode: 'environment'는 후면 카메라를 의미해요)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false // 소리는 필요 없어요.
      });
      streamRef.current = stream; // 스트림을 저장해둡니다.
      if (videoRef.current) {
        videoRef.current.srcObject = stream; // 비디오 태그에 화면을 연결합니다.
      }
      dispatch({ type: 'SET_CAMERA_ACTIVE', payload: { isActive: true, slot: slot } });
    } catch (err) {
      console.error("Camera access denied", err);
      alert("카메라에 접근할 수 없습니다.");
    }
  };

  // 카메라를 끄는 함수입니다.
  const stopCamera = () => {
    if (streamRef.current) {
      // 연결된 모든 트랙(영상 신호)을 멈춥니다.
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    dispatch({ type: 'SET_CAMERA_ACTIVE', payload: { isActive: false, slot: null } });
  };

  // 사진을 '찰칵' 찍는 함수입니다.
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && activeCameraSlot !== null) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // 캔버스 크기를 비디오 크기와 맞춥니다.
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 비디오의 현재 화면을 캔버스(도화지)에 그대로 그립니다.
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // 그림을 JPG 이미지 파일 데이터로 바꿉니다.
        const dataUrl = canvas.toDataURL('image/jpeg');
        const newImages = [...formState.itemImages];
        newImages[activeCameraSlot] = dataUrl;
        dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
        stopCamera();
        if (activeCameraSlot === 0) {
          performImageAnalysis(dataUrl); // 찍은 사진도 분석해봅니다.
        }
      }
    }
  };

  // 업로드한 사진을 삭제하는 함수입니다.
  const removeImage = (index: number) => {
    const newImages = [...formState.itemImages];
    newImages.splice(index, 1); // 해당 순서의 사진을 목록에서 뺍니다.
    dispatch({ type: 'UPDATE_FORM', payload: { itemImages: newImages } });
  };

  // AI 검색을 실행하는 함수입니다.
  const handleAISearch = async () => {
    if (!searchTerm.trim()) return; // 검색어가 없으면 안 해요.
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

  /**
   * filteredItems: 화면에 보여줄 아이템 목록을 계산합니다.
   * 검색어가 있으면 검색된 것만, 없으면 전부 다 보여줍니다.
   * 정렬 옵션(이름순, 최신순 등)에 따라 순서도 바꿉니다.
   */
  const filteredItems = useMemo(() => {
    let result = items;
    if (searchTerm) {
      if (aiSearchResults) {
        // AI 검색 결과가 있으면 그 결과에 포함된 아이템만 골라냅니다.
        result = items.filter(item => aiSearchResults.includes(item.name));
      } else {
        // 일반 검색이면 이름, 메모, 위치에 검색어가 들어있는지 확인합니다.
        const lowerSearchTerm = searchTerm.toLowerCase();
        result = items.filter(item =>
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.notes.some(t => t.toLowerCase().includes(lowerSearchTerm)) ||
          item.locationPath.toLowerCase().includes(lowerSearchTerm)
        );
      }
    }
    // 정렬 규칙에 따라 줄을 세웁니다.
    return [...result].sort((a, b) => {
      if (sortOption === 'name') return a.name.localeCompare(b.name); // 이름 가나다순
      if (sortOption === 'category') return a.category.localeCompare(b.category); // 카테고리별
      return b.updatedAt - a.updatedAt; // 기본은 최신순 (새거가 위로)
    });
  }, [items, searchTerm, sortOption, aiSearchResults]);

  // 아이템을 삭제하는 함수입니다.
  const deleteItem = (id: string) => {
    if (confirm(DELETE_CONFIRM_MESSAGE)) { // 진짜 지울 건지 물어봅니다.
      dispatch({ type: 'SET_ITEMS', payload: items.filter(i => i.id !== id) }); // 그 아이템만 뺀 나머지 목록으로 덮어씁니다.
      if (selectedItem?.id === id) {
        dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
      }
    }
  };

  // 데이터를 파일로 내보내는(백업) 함수입니다.
  const handleExportData = () => {
    dataService.exportToJson({ items, config, version: 1 });
  };

  // 엑셀 파일로 저장하는 함수입니다.
  const handleExportExcel = () => {
    exportItemsToExcel(items);
  };

  // 백업 파일을 불러와서 데이터를 복구하는 함수입니다.
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader(); // 파일을 읽을 준비
    reader.onload = (event) => {
      try {
        // 파일 내용을 읽어서 자바스크립트 객체로 만듭니다.
        const rawJson = JSON.parse(event.target?.result as string);
        const sanitizedData = dataService.validateAndSanitize(rawJson); // 데이터가 올바른지 검사합니다.

        if (sanitizedData) {
          const confirmMessage = sanitizedData.items.length > 0
            ? `총 ${sanitizedData.items.length}개의 아이템이 확인되었습니다.\n현재 데이터를 모두 지우고 백업 파일의 내용으로 복원하시겠습니까?`
            : '백업 파일에 아이템이 없습니다. 계속하시겠습니까?';

          if (confirm(confirmMessage)) {
            // 가져온 데이터로 현재 상태를 업데이트합니다.
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
    reader.readAsText(file); // 텍스트로 읽기 시작!
    e.target.value = ''; // 파일 선택 초기화 (같은 파일 다시 선택 가능하게)
  };

  // 정렬 버튼에 들어갈 내용들입니다.
  const sortOptions: { id: SortOption, label: string }[] = [
    { id: 'latest', label: '최신순' },
    { id: 'name', label: '이름순' },
    { id: 'category', label: '카테고리순' }
  ];

  /**
   * return (...): 여기서부터는 실제 화면에 보여질 HTML(JSX)을 그리는 곳입니다.
   * 마치 그림을 그리듯이 화면을 구성합니다.
   */
  return (
    // 1. 최상위 배경 (화면 전체) - 모달 밖의 어두운 배경과 대비되는, 혹은 조화로운 배경색
    <div className="fixed inset-0 bg-gray-100 flex justify-center p-4">
      {/* 2. 메인 카드 박스 (모달 사이즈 및 스타일과 통일) */}
      <div className="w-full max-w-md bg-gray-50 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/50 relative h-full ring-8 ring-gray-200/50">

        {/* 내부 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide relative w-full">
          {/* 헤더: 앱의 제목과 설정 버튼이 있는 맨 윗부분 */}
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

          {/* 검색창 컴포넌트 */}
          <SearchBar />

          <div className="px-6 py-6">
            {/* 리스트 헤더: 아이템 개수와 보기 모드(카드/테이블), 정렬 버튼이 있는 곳 */}
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

            {/* 아이템 목록을 보여주는 컴포넌트 */}
            <ItemList
              items={filteredItems}
            />
            {/* 하단 여백 확보 */}
            <div className="h-24"></div>
          </div>
        </div>

        {/* 오른쪽 아래 떠있는 + 버튼 (새 아이템 추가) - absolute로 카드 안에 가둠 */}
        <button
          onClick={() => { resetForm(); dispatch({ type: 'TOGGLE_ADDING', payload: true }); }}
          className="absolute bottom-6 right-1/2 translate-x-1/2 w-16 h-16 brand-gradient text-white rounded-full shadow-[0_10px_30px_rgba(99,102,241,0.4)] flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white group"
        >
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
          <i className="fas fa-plus relative z-10"></i>
        </button>

        <style>{`
          /* 스크롤바 숨기기 유틸리티 */
          .scrollbar-hide::-webkit-scrollbar {
              display: none;
          }
          .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
        `}</style>
      </div>

      {/* 새 아이템 추가 모달(팝업) 창 */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          {/* 모달 박스 - 메인 카드와 동일한 스타일 적용 */}
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-full h-full overflow-hidden flex flex-col relative border border-white/50 card-shadow">
            <div className="flex justify-between items-center mb-6 shrink-0 z-20">
              <h2 className="text-lg font-black text-gray-900 tracking-tight ml-2">새로운 기억 맡기기</h2>
              <button onClick={() => { dispatch({ type: 'TOGGLE_ADDING', payload: false }); stopCamera(); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all">
                <i className="fas fa-times text-gray-400 text-sm"></i>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 -mx-4 px-4 pb-4 scrollbar-hide">
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
        </div>
      )}

      {/* 아이템 상세 보기 및 수정 모달(팝업) 창 */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-full h-full overflow-hidden flex flex-col relative border border-white/50 card-shadow">
            <div className="flex justify-between items-center mb-6 shrink-0 z-20">
              <button onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); stopCamera(); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95">
                <i className="fas fa-arrow-left text-gray-400 text-sm"></i>
              </button>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {isEditMode ? '기억 수정' : '상세 정보'}
              </h2>
              <button onClick={() => { dispatch({ type: 'SET_SELECTED_ITEM', payload: null }); dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false }); stopCamera(); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all">
                <i className="fas fa-times text-gray-400 text-sm"></i>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 -mx-4 px-4 pb-4 scrollbar-hide">
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