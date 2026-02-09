
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Item, Category } from './types';
import { LOCATION_TYPES, HOME_LOCATIONS, OFFICE_LOCATIONS, DIGITAL_LOCATIONS, CATEGORIES } from './constants';

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem('whereisit_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load items from localStorage', e);
      return [];
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'latest' | 'name' | 'category'>('latest');
  const [isAdding, setIsAdding] = useState(false);

  // Selected Item for Detail/Edit View
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form States (Used for both Add and Edit)
  const [itemName, setItemName] = useState('');

  // New Location States
  const [locType, setLocType] = useState(LOCATION_TYPES[0]); // '집'
  const [locDetail, setLocDetail] = useState(HOME_LOCATIONS[0]); // '거실'

  const [itemCat, setItemCat] = useState<string>(Category.OTHER);
  const [itemTags, setItemTags] = useState('');
  const [itemImages, setItemImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeCameraSlot, setActiveCameraSlot] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStorage.setItem('whereisit_items', JSON.stringify(items));
  }, [items]);

  // Config States
  const [configLocTypes, setConfigLocTypes] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('config_loc_types') || JSON.stringify(LOCATION_TYPES))
  );
  const [configHomeLocs, setConfigHomeLocs] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('config_home_locs') || JSON.stringify(HOME_LOCATIONS))
  );
  const [configOfficeLocs, setConfigOfficeLocs] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('config_office_locs') || JSON.stringify(OFFICE_LOCATIONS))
  );
  const [configDigitalLocs, setConfigDigitalLocs] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('config_digital_locs') || JSON.stringify(DIGITAL_LOCATIONS))
  );
  const [configCategories, setConfigCategories] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('config_categories') || JSON.stringify(CATEGORIES))
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => { localStorage.setItem('config_loc_types', JSON.stringify(configLocTypes)); }, [configLocTypes]);
  useEffect(() => { localStorage.setItem('config_home_locs', JSON.stringify(configHomeLocs)); }, [configHomeLocs]);
  useEffect(() => { localStorage.setItem('config_office_locs', JSON.stringify(configOfficeLocs)); }, [configOfficeLocs]);
  useEffect(() => { localStorage.setItem('config_digital_locs', JSON.stringify(configDigitalLocs)); }, [configDigitalLocs]);
  useEffect(() => { localStorage.setItem('config_categories', JSON.stringify(configCategories)); }, [configCategories]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const fullPath = `${locType} > ${locDetail}`;
    const item: Item = {
      id: Date.now().toString(),
      name: itemName,
      locationId: fullPath,
      locationPath: fullPath,
      category: itemCat,
      tags: itemTags.split('\n').map(t => t.trim()).filter(t => t),
      imageUrls: itemImages,
      updatedAt: Date.now()
    };
    setItems([item, ...items]);
    setIsAdding(false);
    resetForm();
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const fullPath = `${locType} > ${locDetail}`;
    const updatedItem: Item = {
      ...selectedItem,
      name: itemName,
      locationId: fullPath,
      locationPath: fullPath,
      category: itemCat,
      tags: itemTags.split('\n').map(t => t.trim()).filter(t => t),
      imageUrls: itemImages,
      updatedAt: Date.now()
    };

    setItems(items.map(i => i.id === selectedItem.id ? updatedItem : i));
    setSelectedItem(updatedItem);
    setIsEditMode(false);
  };

  const resetForm = () => {
    setItemName('');
    setLocType(LOCATION_TYPES[0]);
    setLocDetail(HOME_LOCATIONS[0]);
    setItemCat(Category.OTHER);
    setItemTags('');
    setItemImages([]);
    stopCamera();
  };

  const openEditMode = () => {
    if (!selectedItem) return;
    setItemName(selectedItem.name);

    // Parse location path
    const parts = selectedItem.locationPath.split(' > ');
    if (parts.length === 2 && LOCATION_TYPES.includes(parts[0])) {
      setLocType(parts[0]);
      setLocDetail(parts[1]);
    } else {
      setLocType('기타');
      setLocDetail(selectedItem.locationPath);
    }

    setItemCat(selectedItem.category);
    setItemTags(selectedItem.tags.join('\n'));
    setItemImages(selectedItem.imageUrls);
    setIsEditMode(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCameraSlot !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...itemImages];
        newImages[activeCameraSlot] = reader.result as string;
        setItemImages(newImages);
        stopCamera();
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
      setIsCameraActive(true);
      setActiveCameraSlot(slot);
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
    setIsCameraActive(false);
    setActiveCameraSlot(null);
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
        const newImages = [...itemImages];
        newImages[activeCameraSlot] = dataUrl;
        setItemImages(newImages);
        stopCamera();
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...itemImages];
    newImages.splice(index, 1);
    setItemImages(newImages);
  };




  const filteredItems = useMemo(() => {
    let result = items;
    if (searchTerm) {
      result = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.locationPath.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return [...result].sort((a, b) => {
      if (sortOption === 'name') return a.name.localeCompare(b.name);
      if (sortOption === 'category') return a.category.localeCompare(b.category);
      return b.updatedAt - a.updatedAt; // latest
    });
  }, [items, searchTerm, sortOption]);


  const deleteItem = (id: string) => {
    if (confirm('이 항목을 정말 삭제할까요?')) {
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const handleExportData = () => {
    const data = {
      items,
      config: {
        locTypes: configLocTypes,
        homeLocs: configHomeLocs,
        officeLocs: configOfficeLocs,
        digitalLocs: configDigitalLocs,
        categories: configCategories
      },
      version: 1
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whereisit_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.items && Array.isArray(data.items)) {
          if (confirm('현재 데이터를 모두 지우고 백업 파일의 내용으로 복원하시겠습니까?')) {
            setItems(data.items);
            if (data.config) {
              if (data.config.locTypes) setConfigLocTypes(data.config.locTypes);
              if (data.config.homeLocs) setConfigHomeLocs(data.config.homeLocs);
              if (data.config.officeLocs) setConfigOfficeLocs(data.config.officeLocs);
              if (data.config.digitalLocs) setConfigDigitalLocs(data.config.digitalLocs);
              if (data.config.categories) setConfigCategories(data.config.categories);
            }
            alert('데이터가 성공적으로 복원되었습니다.');
            setIsSettingsOpen(false);
          }
        } else {
          alert('올바르지 않은 백업 파일 형식입니다.');
        }
      } catch (err) {
        console.error(err);
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const renderFormFields = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col items-center">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        <canvas ref={canvasRef} className="hidden" />
        <div className="w-full grid grid-cols-2 gap-3 mb-2">
          {[0, 1].map((idx) => (
            <div key={idx} className="aspect-square rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-indigo-300">
              {isCameraActive && activeCameraSlot === idx ? (
                <div className="w-full h-full relative">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button type="button" onClick={capturePhoto} className="absolute bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/40 backdrop-blur-md rounded-full border-2 border-white flex items-center justify-center active:scale-90 shadow-lg">
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </button>
                  <button type="button" onClick={stopCamera} className="absolute top-2 right-2 bg-black/40 text-white w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm text-[10px]">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : itemImages[idx] ? (
                <div className="w-full h-full relative group">
                  <img src={itemImages[idx]} className="w-full h-full object-cover" alt={idx === 0 ? '기억물품' : '수납장소'} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                    <button type="button" onClick={() => removeImage(idx)} className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xl">삭제</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startCamera(idx)} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center hover:border-indigo-400">
                      <i className="fas fa-camera text-indigo-500 text-sm"></i>
                    </button>
                    <button type="button" onClick={() => { setActiveCameraSlot(idx); fileInputRef.current?.click(); }} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center hover:border-emerald-400">
                      <i className="fas fa-images text-emerald-500 text-sm"></i>
                    </button>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400">{idx === 0 ? '기억물품' : '수납장소'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">물건 이름</label>
        <div className="flex gap-2">
          <input required type="text" className="flex-1 p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100" placeholder="예: 여권, 보조 배터리" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <button type="button" disabled className="px-5 bg-indigo-100 text-indigo-400 rounded-2xl text-xs font-bold disabled:opacity-50 whitespace-nowrap hidden">
            AI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">보관 장소 (구분)</label>
          <select
            className="w-full p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100"
            value={locType}
            onChange={(e) => {
              const newType = e.target.value;
              setLocType(newType);
              if (newType === '집' && configHomeLocs.length > 0) {
                setLocDetail(configHomeLocs[0]);
              } else if (newType === '사무실' && configOfficeLocs.length > 0) {
                setLocDetail(configOfficeLocs[0]);
              } else if (newType === '디지털저장소' && configDigitalLocs.length > 0) {
                setLocDetail(configDigitalLocs[0]);
              } else {
                setLocDetail('');
              }
            }}
          >
            {configLocTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">상세 장소</label>
          {locType === '집' ? (
            <select
              className="w-full p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100"
              value={locDetail}
              onChange={(e) => setLocDetail(e.target.value)}
            >
              {configHomeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          ) : locType === '사무실' ? (
            <select
              className="w-full p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100"
              value={locDetail}
              onChange={(e) => setLocDetail(e.target.value)}
            >
              {configOfficeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          ) : locType === '디지털저장소' ? (
            <select
              className="w-full p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100"
              value={locDetail}
              onChange={(e) => setLocDetail(e.target.value)}
            >
              {configDigitalLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          ) : (
            <input
              type="text"
              className="w-full p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100"
              placeholder="상세 장소 입력"
              value={locDetail}
              onChange={(e) => setLocDetail(e.target.value)}
              required
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">카테고리</label>
        <select className="w-full p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100" value={itemCat} onChange={(e) => setItemCat(e.target.value)}>
          {configCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">상세 보관 장소 및 정보</label>
        <textarea
          rows={3}
          className="w-full p-3.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 border border-gray-100 shadow-sm resize-none"
          placeholder="예: 두 번째 서랍 안쪽 파란 상자 속&#10;중요한 서류니까 조심히 다룰 것"
          value={itemTags}
          onChange={(e) => setItemTags(e.target.value)}
        />
      </div>

      <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-indigo-200 mt-6 active:scale-95 transition-all text-sm h-14 flex items-center justify-center gap-2">
        <i className="fas fa-check-circle"></i> {submitLabel}
      </button>
    </form>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans border-x border-gray-200 shadow-xl relative">
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-50 flex flex-col items-center text-center relative">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border border-gray-100 shadow-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-gray-50 active:scale-95 transition-all group"
        >
          <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <i className="fas fa-sliders-h text-[10px]"></i>
          </span>
          <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">분류설정</span>
        </button>
        <h1 className="text-xl font-extrabold text-indigo-600 flex items-center justify-center gap-2 tracking-tight">
          <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
            <i className="fas fa-brain text-sm"></i>
          </span>
          기억을 맡기는 앱
        </h1>
        <p className="text-[10px] text-gray-400 font-medium mt-1">당신의 소중한 것들의 위치 정보를 대신 기억해 드립니다.</p>
      </header>

      <div className="px-6 py-2 bg-white sticky top-[73px] z-40 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="무엇을 찾으시나요? (예: 여권)"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all text-sm shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 mb-8 flex items-center justify-between shadow-xl">
          <div className="z-10 relative">
            <h2 className="text-xl font-bold text-white leading-tight">찾는 스트레스,<br />이제는 안녕! 👋</h2>
            <p className="text-[11px] text-indigo-100 mt-2 font-medium opacity-90">기록은 저희가 담당합니다.</p>
          </div>
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse scale-110"></div>
            <div className="relative w-full h-full bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg rotate-3">
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce"><i className="fas fa-lightbulb text-white text-lg"></i></div>
              <i className="fas fa-robot text-white text-4xl drop-shadow-md"></i>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <i className="fas fa-list-ul text-indigo-400 text-xs"></i>
            보관된 아이템 ({filteredItems.length})
          </h3>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { id: 'latest', label: '최신순' },
              { id: 'name', label: '이름순' },
              { id: 'category', label: '카테고리순' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSortOption(opt.id as any)}
                className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${sortOption === opt.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pb-24">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
              <i className="fas fa-ghost text-4xl mb-3 block animate-bounce"></i>
              <p className="text-sm font-medium">아직 맡겨진 기억이 없어요!</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-3 items-center group transition-all hover:shadow-md hover:border-indigo-100 cursor-pointer relative"
              >
                <div className="flex -space-x-3 overflow-hidden p-1">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    item.imageUrls.map((url, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border-2 border-white shadow-sm ring-1 ring-gray-100">
                        <img src={url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-gray-50 border border-dashed flex items-center justify-center text-gray-300">
                      <i className="fas fa-cube text-xl"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 ml-2">
                  <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase whitespace-nowrap">{item.category}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded whitespace-nowrap">{item.locationPath}</span>
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] text-indigo-500 bg-indigo-50/50 px-1 py-0.5 rounded">#{tag}</span>
                    ))}
                    {item.tags.length > 3 && <span className="text-[9px] text-gray-400">...</span>}
                  </div>
                </div>

                {/* 리스트 내 즉시 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 클릭 이벤트가 부모(상세보기 열기)로 전달되지 않게 함
                    deleteItem(item.id);
                  }}
                  className="text-gray-300 hover:text-red-500 p-2 transition-colors flex-shrink-0"
                >
                  <i className="fas fa-trash-alt text-sm"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => { resetForm(); setIsAdding(true); }}
        className="fixed bottom-8 right-1/2 translate-x-1/2 w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white"
      >
        <i className="fas fa-plus"></i>
      </button>

      {/* Add Item Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 animate-slide-up shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">새로운 기억 맡기기</h2>
              <button onClick={() => { setIsAdding(false); stopCamera(); }} className="bg-gray-100 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            {renderFormFields(handleAddItem, '이대로 보관하기')}
          </div>
        </div>
      )}

      {/* Item Detail / Edit Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 animate-slide-up shadow-2xl max-h-[95vh] overflow-y-auto">
            {/* 세련된 헤더 섹션 (뒤로가기 포함) */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pt-2 pb-4 z-20">
              <button
                onClick={() => { setSelectedItem(null); setIsEditMode(false); stopCamera(); }}
                className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all active:scale-95"
              >
                <i className="fas fa-chevron-left"></i>
                뒤로가기
              </button>
              <h2 className="text-lg font-bold text-gray-800 absolute left-1/2 -translate-x-1/2 pointer-events-none">
                {isEditMode ? '기억 수정하기' : '상세 정보'}
              </h2>
              <button
                onClick={() => { setSelectedItem(null); setIsEditMode(false); stopCamera(); }}
                className="bg-gray-100 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {isEditMode ? (
              renderFormFields(handleUpdateItem, '수정 완료')
            ) : (
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm flex items-center justify-center relative">
                        {selectedItem.imageUrls[idx] ? (
                          <img src={selectedItem.imageUrls[idx]} alt={idx === 0 ? '기억물품' : '수납장소'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-200">
                            <i className="fas fa-image text-2xl mb-1"></i>
                            <span className="text-[8px] font-bold">이미지 없음</span>
                          </div>
                        )}
                      </div>
                      <p className="text-center text-[10px] font-bold text-gray-400">{idx === 0 ? '기억물품' : '수납장소'}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">물건 이름</p>
                    <div className="flex justify-between items-end">
                      <p className="text-lg font-bold text-gray-800">{selectedItem.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {new Date(selectedItem.updatedAt).toLocaleDateString()} 업데이트
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">보관 장소</p>
                      <p className="text-sm font-bold text-indigo-600">{selectedItem.locationPath}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">카테고리</p>
                      <p className="text-sm font-bold text-gray-700">{selectedItem.category}</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">상세 보관 장소 및 정보</p>
                    {/* 메모장 스타일 컨테이너 */}
                    <div className="bg-yellow-50 p-5 rounded-2xl border-l-4 border-yellow-400 shadow-sm min-h-[120px] relative overflow-hidden ring-1 ring-yellow-100">
                      <div className="absolute top-0 right-0 w-10 h-10 bg-yellow-100 rounded-bl-3xl shadow-inner opacity-40"></div>
                      <div className="text-sm text-yellow-900 leading-relaxed font-medium whitespace-pre-wrap relative z-10">
                        {selectedItem.tags.length > 0
                          ? selectedItem.tags.join('\n')
                          : '기록된 상세 정보가 없습니다.'}
                      </div>
                      <i className="fas fa-sticky-note absolute bottom-3 right-3 text-yellow-200/50 text-2xl"></i>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={() => deleteItem(selectedItem!.id)}
                    className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-100"
                  >
                    <i className="fas fa-trash-alt"></i> 삭제하기
                  </button>
                  <button
                    onClick={openEditMode}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all hover:bg-indigo-700"
                  >
                    <i className="fas fa-edit"></i> 수정하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        video {
          transform: scaleX(-1);
        }
        textarea {
          font-family: inherit;
        }
        /* Custom scrollbar for modern feel */
        ::-webkit-scrollbar {
          width: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2">
              <h2 className="text-xl font-bold text-gray-800">설정 관리</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="bg-gray-100 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            <div className="space-y-8 pb-8">
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                <h3 className="font-bold text-sm text-indigo-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-database"></i> 데이터 백업 및 복원
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportData}
                    className="flex-1 py-3 bg-white text-indigo-600 rounded-xl text-xs font-bold border border-indigo-200 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-indigo-50"
                  >
                    <i className="fas fa-download"></i> 백업 저장
                  </button>
                  <label className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-indigo-700">
                    <i className="fas fa-upload"></i> 데이터 복원
                    <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                  </label>
                </div>
                <p className="text-[10px] text-indigo-400 mt-2 leading-relaxed">
                  * 기기를 변경하거나 브라우저 캐시 삭제에 대비해 주기적으로 백업 파일을 저장해 주세요.
                </p>
              </div>

              {[
                { title: '보관 장소 1 (구분)', list: configLocTypes, setList: setConfigLocTypes },
                { title: '집 상세 장소', list: configHomeLocs, setList: setConfigHomeLocs },
                { title: '사무실 상세 장소', list: configOfficeLocs, setList: setConfigOfficeLocs },
                { title: '디지털 저장소 상세', list: configDigitalLocs, setList: setConfigDigitalLocs },
                { title: '카테고리', list: configCategories, setList: setConfigCategories },
              ].map((section, sIdx) => (
                <div key={sIdx}>
                  <h3 className="font-bold text-sm text-gray-800 mb-3 border-b border-gray-100 pb-2">{section.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {section.list.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600">
                        {item}
                        <button
                          onClick={() => {
                            if (confirm(`"${item}" 항목을 삭제하시겠습니까?`)) {
                              section.setList(prev => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          className="text-gray-400 hover:text-red-500 w-4 h-4 flex items-center justify-center"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('newItem') as HTMLInputElement;
                      if (input.value.trim()) {
                        section.setList(prev => [...prev, input.value.trim()]);
                        input.value = '';
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="newItem"
                      type="text"
                      placeholder="새 항목 추가"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                    <button type="submit" className="bg-indigo-600 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-md active:scale-95">
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
