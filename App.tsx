
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
                    <button type="button" onClick={() => removeImage(idx)} className="bg-red-500 text-white px-4 py-2 rounded-2xl text-[11px] font-black shadow-2xl tracking-tight">이미지 삭제</button>
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
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{idx === 0 ? '물건 사진' : '공간 사진'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest">물건 이름</label>
        <div className="relative">
          <input
            required
            type="text"
            className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 font-bold placeholder:font-medium transition-all"
            placeholder="여권, 외장하드, 비상금 등"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button type="button" disabled className="w-8 h-8 brand-gradient text-white rounded-xl text-[10px] items-center justify-center hidden">
              <i className="fas fa-magic"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest">장소 구분</label>
          <select
            className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
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
          <label className="block text-[10px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest">상세 위치</label>
          <div className="relative">
            {locType === '집' ? (
              <select
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
                value={locDetail}
                onChange={(e) => setLocDetail(e.target.value)}
              >
                {configHomeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : locType === '사무실' ? (
              <select
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
                value={locDetail}
                onChange={(e) => setLocDetail(e.target.value)}
              >
                {configOfficeLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : locType === '디지털저장소' ? (
              <select
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 appearance-none"
                value={locDetail}
                onChange={(e) => setLocDetail(e.target.value)}
              >
                {configDigitalLocs.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : (
              <input
                type="text"
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 transition-all"
                placeholder="상세 장소 입력"
                value={locDetail}
                onChange={(e) => setLocDetail(e.target.value)}
                required
              />
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-widest">특이사항 및 메모</label>
        <textarea
          rows={3}
          className="w-full p-5 bg-gray-50 rounded-[2rem] text-sm font-medium outline-none focus:ring-4 focus:ring-brand-100 border border-gray-100 shadow-inner resize-none transition-all placeholder:text-gray-300"
          placeholder="예: 오른쪽 두 번째 서랍 안쪽 깊은 곳, 파란 상자 안에 들어있음"
          value={itemTags}
          onChange={(e) => setItemTags(e.target.value)}
        />
      </div>

      <button type="submit" className="w-full py-5 brand-gradient text-white rounded-[2rem] font-black shadow-xl shadow-brand-100 mt-6 active:scale-95 transition-all text-base flex items-center justify-center gap-3 tracking-tight">
        <i className="fas fa-check-circle text-xl"></i> {submitLabel}
      </button>
    </form>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans border-x border-gray-200 shadow-xl relative">
      <header className="glass border-b border-gray-100/50 px-6 py-6 sticky top-0 z-50 flex flex-col items-center text-center relative rounded-b-[2.5rem] shadow-sm">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute right-4 top-6 bg-white/50 backdrop-blur-md border border-white/80 shadow-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-white active:scale-95 transition-all group"
        >
          <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all shadow-inner">
            <i className="fas fa-sliders-h text-[10px]"></i>
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
          <p className="text-[11px] text-gray-400 font-semibold mt-1 tracking-wide uppercase">Your Digital Memory Safe</p>
        </div>
      </header>

      <div className="px-6 py-4 bg-transparent sticky top-[110px] z-40">
        <div className="relative group">
          <input
            type="text"
            placeholder="어떤 물건을 찾으시나요?"
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-md rounded-3xl border border-white/50 focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all text-sm shadow-xl card-shadow outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-brand-400 text-lg transition-transform group-focus-within:scale-110"></i>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="relative overflow-hidden brand-gradient rounded-[2.5rem] p-8 mb-8 flex items-center justify-between shadow-2xl shadow-brand-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="z-10 relative">
            <h2 className="text-2xl font-bold text-white leading-tight">복잡한 보관,<br />한 번에 <span className="text-brand-100">Click!</span></h2>
            <p className="text-[12px] text-brand-50 mt-3 font-semibold opacity-80 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full w-fit">Smart Memory Manager</p>
          </div>
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse scale-125"></div>
            <div className="relative w-full h-full glass rounded-3xl flex items-center justify-center border border-white/30 shadow-2xl rotate-6 transition-transform hover:rotate-0 duration-500">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce duration-[2000ms]">
                <i className="fas fa-bolt text-white text-xl"></i>
              </div>
              <i className="fas fa-sparkles text-brand-200 text-4xl mb-1"></i>
              <div className="absolute inset-x-0 bottom-2 text-center text-[8px] font-black text-brand-100 tracking-tighter uppercase">AI Powered</div>
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

        <div className="space-y-4 pb-28">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400 glass rounded-[2.5rem] border-dashed border-2 border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-box-open text-3xl opacity-30"></i>
              </div>
              <p className="text-sm font-bold text-gray-500">비어있는 기억 저장소</p>
              <p className="text-[10px] text-gray-400 mt-1">잊고 싶지 않은 물건을 아래 + 버튼으로 추가하세요.</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white p-4 rounded-[2rem] card-shadow border border-white/60 flex gap-4 items-center group transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] cursor-pointer relative"
              >
                <div className="flex -space-x-4 overflow-hidden p-1 shrink-0">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    item.imageUrls.map((url, idx) => (
                      <div key={idx} className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 border-4 border-white shadow-xl ring-1 ring-gray-100 relative z-[2-idx]">
                        <img src={url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    ))
                  ) : (
                    <div className="w-20 h-20 rounded-2xl flex-shrink-0 bg-brand-50 border-2 border-white shadow-inner flex items-center justify-center text-brand-200">
                      <i className="fas fa-layer-group text-2xl"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-1 bg-brand-600 text-white rounded-lg shadow-sm shadow-brand-200 uppercase tracking-tighter">{item.category}</span>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg">{item.locationPath.split(' > ')[1] || item.locationPath}</span>
                  </div>
                  <h4 className="font-extrabold text-gray-900 text-base mb-1 tracking-tight">{item.name}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">#{tag}</span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
                >
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => { resetForm(); setIsAdding(true); }}
        className="fixed bottom-8 right-1/2 translate-x-1/2 w-20 h-20 brand-gradient text-white rounded-full shadow-[0_20px_50px_rgba(99,102,241,0.4)] flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all z-40 border-8 border-white group"
      >
        <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
        <i className="fas fa-plus relative z-10"></i>
      </button>

      {/* Add Item Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto relative border border-white/50 card-shadow">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/50 backdrop-blur-md -mx-8 px-8 py-4 z-20 -mt-8 rounded-t-[3rem] border-b border-gray-100/50">
              <h2 className="text-base font-black text-gray-900 tracking-tight">새로운 기억 맡기기</h2>
              <button onClick={() => { setIsAdding(false); stopCamera(); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all">
                <i className="fas fa-times text-gray-400 text-sm"></i>
              </button>
            </div>
            {renderFormFields(handleAddItem, '이대로 보관하기')}
          </div>
        </div>
      )}

      {/* Item Detail / Edit Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto relative border border-white/50 card-shadow">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/50 backdrop-blur-md -mx-8 px-8 py-4 z-20 -mt-8 rounded-t-[3rem] border-b border-gray-100/50">
              <button
                onClick={() => { setSelectedItem(null); setIsEditMode(false); stopCamera(); }}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95"
              >
                <i className="fas fa-arrow-left text-gray-400 text-sm"></i>
              </button>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                {isEditMode ? '기억 수정' : '상세 정보'}
              </h2>
              <button
                onClick={() => { setSelectedItem(null); setIsEditMode(false); stopCamera(); }}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all"
              >
                <i className="fas fa-times text-gray-400 text-sm"></i>
              </button>
            </div>

            {isEditMode ? (
              renderFormFields(handleUpdateItem, '변경사항 저장')
            ) : (
              <div className="space-y-8 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1].map((idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="aspect-square rounded-[2rem] overflow-hidden bg-gray-50 border-4 border-white shadow-2xl flex items-center justify-center relative">
                        {selectedItem.imageUrls[idx] ? (
                          <img src={selectedItem.imageUrls[idx]} alt={idx === 0 ? '기억물품' : '수납장소'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-200">
                            <i className="fas fa-image text-4xl mb-2 opacity-30"></i>
                            <span className="text-[10px] font-black uppercase tracking-tighter">No Image</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] text-white font-black uppercase tracking-widest">{idx === 0 ? 'ITEM' : 'PLACE'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="p-1">
                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-3">Item Identity</p>
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{selectedItem.name}</h3>
                      <span className="shrink-0 text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        {new Date(selectedItem.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50/50 p-5 rounded-[2rem] border border-indigo-100/50 shadow-inner">
                      <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-2">Location</p>
                      <p className="text-base font-black text-indigo-700 leading-tight">{selectedItem.locationPath}</p>
                    </div>
                    <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100/50 shadow-inner">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Category</p>
                      <p className="text-base font-black text-emerald-700 leading-tight">{selectedItem.category}</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Special Notes</p>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl relative overflow-hidden ring-4 ring-gray-50/50">
                      <div className="text-base text-gray-700 leading-relaxed font-semibold whitespace-pre-wrap relative z-10 italic">
                        "{selectedItem.tags.length > 0
                          ? selectedItem.tags.join('\n')
                          : '기록된 상세 정보가 없습니다.'}"
                      </div>
                      <i className="fas fa-quote-right absolute bottom-4 right-6 text-brand-50 text-5xl opacity-50"></i>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => deleteItem(selectedItem!.id)}
                    className="flex-1 py-5 bg-red-50 text-red-500 rounded-3xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all border border-red-100 hover:bg-red-100 text-sm"
                  >
                    <i className="fas fa-trash-alt"></i> 삭제
                  </button>
                  <button
                    onClick={openEditMode}
                    className="flex-[2] py-5 brand-gradient text-white rounded-3xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-brand-100 active:scale-95 transition-all text-sm tracking-tight"
                  >
                    <i className="fas fa-edit"></i> 정보 수정하기
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
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto relative border border-white/50 card-shadow">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/50 backdrop-blur-md -mx-8 px-8 py-4 z-20 -mt-8 rounded-t-[3rem] border-b border-gray-100/50">
              <h2 className="text-base font-black text-gray-900 tracking-tight">환경 설정</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all">
                <i className="fas fa-times text-gray-400 text-sm"></i>
              </button>
            </div>

            <div className="space-y-10 pb-8">
              <div className="brand-gradient p-8 rounded-[2.5rem] shadow-2xl shadow-brand-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
                <h3 className="font-black text-sm text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-database opacity-70"></i> 데이터 관리
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportData}
                    className="flex-1 py-4 bg-white/20 backdrop-blur-md text-white rounded-2xl text-[11px] font-black border border-white/30 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-white/30"
                  >
                    <i className="fas fa-download"></i> 백업하기
                  </button>
                  <label className="flex-1 py-4 bg-white text-brand-600 rounded-2xl text-[11px] font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-brand-50">
                    <i className="fas fa-upload"></i> 복원하기
                    <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                  </label>
                </div>
                <p className="text-[9px] text-brand-100 mt-4 leading-relaxed font-bold opacity-80 text-center uppercase tracking-widest">
                  Secure your memories periodically
                </p>
              </div>

              {[
                { title: 'Location Groups', list: configLocTypes, setList: setConfigLocTypes },
                { title: 'Home Details', list: configHomeLocs, setList: setConfigHomeLocs },
                { title: 'Office Details', list: configOfficeLocs, setList: setConfigOfficeLocs },
                { title: 'Digital Paths', list: configDigitalLocs, setList: setConfigDigitalLocs },
                { title: 'Item Categories', list: configCategories, setList: setConfigCategories },
              ].map((section, sIdx) => (
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
                            if (confirm(`"${item}" 항목을 삭제하시겠습니까?`)) {
                              section.setList(prev => prev.filter((_, i) => i !== idx));
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
                        section.setList(prev => [...prev, input.value.trim()]);
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
      )}
    </div>
  );
};

export default App;
