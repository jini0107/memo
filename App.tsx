import React, { useContext, useEffect, useMemo, useState } from 'react';
import ItemDetail from './components/ItemDetail';
import ItemForm from './components/ItemForm';
import ItemList from './components/ItemList';
import PinPadModal from './components/PinPadModal';
import SearchBar from './components/SearchBar';
import Settings from './components/Settings';
import { DELETE_CONFIRM_MESSAGE } from './constants';
import { hashPin } from './services/securityService';
import { Item } from './types';
import { AppContext } from './src/context/StateContext';
import { useFilteredItems } from './src/hooks/useFilteredItems';
import { useItemActions } from './src/hooks/useItemActions';

type SortOption = 'latest' | 'name' | 'category';

interface PinModalState {
  isOpen: boolean;
  mode: 'setup' | 'verify' | 'change';
  title?: string;
  subTitle?: string;
  callback?: (pin: string, hint?: string) => void | Promise<void>;
}

const sortOptions: Array<{ id: SortOption; label: string; icon: string }> = [
  { id: 'latest', label: '최신', icon: 'fa-clock' },
  { id: 'name', label: '이름', icon: 'fa-font' },
  { id: 'category', label: '분류', icon: 'fa-tag' },
];

const App: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const {
    aiSearchResults,
    config,
    formState,
    isAdding,
    isAnalyzing,
    isEditMode,
    isSettingsOpen,
    items,
    searchTerm,
    security,
    selectedItem,
    sortOption,
    viewMode,
  } = state;
  const {
    buildItemFromForm,
    deleteItem,
    handleExportData,
    handleExportExcel,
    handleImageUpload,
    handleImportData,
    performNameAnalysis,
    populateFormFromItem,
    removeImage,
    resetForm,
    saveNewItem,
    updateItem,
  } = useItemActions();

  const [pinModal, setPinModal] = useState<PinModalState>({
    isOpen: false,
    mode: 'verify',
  });

  const filteredItems = useFilteredItems(items, searchTerm, sortOption, aiSearchResults);

  const categoryStats = useMemo(() => {
    const counter: Record<string, number> = {};
    items.forEach((item) => {
      counter[item.category] = (counter[item.category] || 0) + 1;
    });
    return Object.entries(counter).sort((left, right) => right[1] - left[1]).slice(0, 3);
  }, [items]);

  const locationStats = useMemo(() => {
    const counter: Record<string, number> = {};
    items.forEach((item) => {
      const locType = item.locationPath.split(' > ')[0] || '기타';
      counter[locType] = (counter[locType] || 0) + 1;
    });
    return Object.entries(counter).sort((left, right) => right[1] - left[1]).slice(0, 3);
  }, [items]);

  useEffect(() => {
    if (!searchTerm) {
      dispatch({ type: 'SET_AI_SEARCH_RESULTS', payload: null });
    }
  }, [dispatch, searchTerm]);

  const closePinModal = () => {
    setPinModal((current) => ({ ...current, isOpen: false }));
  };

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    const newItem = buildItemFromForm();

    if (newItem.isSecret && !config.secretPin) {
      setPinModal({
        isOpen: true,
        mode: 'setup',
        title: '시크릿 PIN 설정',
        subTitle: '시크릿 아이템 보호에 사용할 6자리 PIN을 입력하세요.',
        callback: async (newPin, newHint) => {
          const hashedPin = await hashPin(newPin);
          dispatch({
            type: 'UPDATE_CONFIG',
            payload: { secretPin: hashedPin, secretHint: newHint },
          });
          await saveNewItem(newItem);
          closePinModal();
        },
      });
      return;
    }

    await saveNewItem(newItem);
  };

  const handleUpdateItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedItem) {
      return;
    }

    const updatedItem = buildItemFromForm(selectedItem);
    await updateItem(updatedItem);
  };

  const handleDeleteItem = async (item: Item) => {
    if (!confirm(DELETE_CONFIRM_MESSAGE)) {
      return;
    }

    await deleteItem(item);
  };

  const handlePinChange = () => {
    if (!config.secretPin) {
      setPinModal({
        isOpen: true,
        mode: 'setup',
        title: 'PIN 설정',
        subTitle: '시크릿 모드에 사용할 6자리 PIN을 입력하세요.',
        callback: async (newPin, newHint) => {
          const hashedPin = await hashPin(newPin);
          dispatch({
            type: 'UPDATE_CONFIG',
            payload: { secretPin: hashedPin, secretHint: newHint },
          });
          closePinModal();
          alert('PIN이 설정되었습니다.');
        },
      });
      return;
    }

    setPinModal({
      isOpen: true,
      mode: 'verify',
      title: '현재 PIN 확인',
      subTitle: '변경 전 현재 PIN을 입력하세요.',
      callback: async () => {
        setPinModal({
          isOpen: true,
          mode: 'setup',
          title: '새 PIN 설정',
          subTitle: '새로 사용할 6자리 PIN을 입력하세요.',
          callback: async (newPin, newHint) => {
            const hashedPin = await hashPin(newPin);
            dispatch({
              type: 'UPDATE_CONFIG',
              payload: { secretPin: hashedPin, secretHint: newHint },
            });
            closePinModal();
            alert('PIN이 변경되었습니다.');
          },
        });
      },
    });
  };

  const handlePinReset = () => {
    if (!config.secretPin) {
      alert('설정된 PIN이 없습니다.');
      return;
    }

    if (!confirm('PIN을 초기화하면 모든 시크릿 아이템 보호가 해제됩니다. 계속할까요?')) {
      return;
    }

    setPinModal({
      isOpen: true,
      mode: 'verify',
      title: 'PIN 초기화 확인',
      subTitle: '현재 PIN을 입력하면 초기화가 진행됩니다.',
      callback: async () => {
        dispatch({
          type: 'UPDATE_CONFIG',
          payload: { secretPin: undefined, secretHint: undefined },
        });
        closePinModal();
        alert('PIN이 초기화되었습니다.');
      },
    });
  };

  const handleProtectedItemOpen = (item: Item) => {
    if (item.isSecret && !security.isAuthenticated) {
      setPinModal({
        isOpen: true,
        mode: 'verify',
        title: '시크릿 아이템 확인',
        subTitle: '이 항목을 열려면 PIN이 필요합니다.',
        callback: async () => {
          dispatch({ type: 'SET_SELECTED_ITEM', payload: item });
          closePinModal();
        },
      });
      return;
    }

    dispatch({ type: 'SET_SELECTED_ITEM', payload: item });
  };

  return (
    <div
      className="fixed inset-0 flex flex-col safe-top safe-bottom"
      style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 30%, #f1f5f9 100%)' }}
    >
      <header
        className="shrink-0 safe-left safe-right z-50 relative overflow-hidden"
        style={{ minHeight: '33vh', background: 'linear-gradient(160deg, #6366f1 0%, #818cf8 35%, #a78bfa 70%, #c4b5fd 100%)' }}
      >
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {items.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white/90 bg-white/20 backdrop-blur-sm border border-white/20 flex items-center gap-1">
              {items.length}개
            </div>
          )}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', payload: true })}
            className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white/80 hover:bg-white/25 transition-all flex items-center justify-center touch-feedback"
          >
            <i className="fas fa-cog text-sm"></i>
          </button>
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full bg-white/[0.06]" style={{ top: '-15%', left: '-10%' }}></div>
          <div className="absolute w-56 h-56 rounded-full bg-white/[0.04]" style={{ bottom: '-25%', right: '-15%' }}></div>
          <div className="absolute w-24 h-24 rounded-full bg-white/[0.06]" style={{ top: '20%', right: '10%' }}></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-6" style={{ minHeight: '33vh' }}>
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center mb-4 shadow-lg animate-bounce-in">
            <span className="text-3xl">📍</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-1.5 animate-fade-in">
            어딨더라
          </h1>
          <p className="text-base font-semibold text-white/90 text-center mb-2 animate-fade-in">
            "그거 어디 뒀더라?" 이제 기록으로 해결하세요.
          </p>
          <p className="text-xs text-white/60 text-center font-medium max-w-[260px] leading-relaxed animate-fade-in">
            이미지와 위치를 함께 저장하고,
            <br />
            AI 추천과 시크릿 보호까지 한 번에 처리합니다.
          </p>
        </div>
      </header>

      <div className="px-5 pt-3 pb-1 shrink-0 safe-left safe-right">
        <SearchBar />
      </div>

      <div className="flex-1 overflow-y-auto mobile-scroll px-5 pb-28 safe-left safe-right">
        {items.length === 0 && !searchTerm ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh] animate-fade-in-scale">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-[2rem] gradient-primary flex items-center justify-center shadow-glow-lg animate-float">
                <i className="fas fa-map-marker-alt text-white text-5xl"></i>
              </div>
            </div>

            <h2 className="text-2xl font-black text-surface-800 mb-2 tracking-tight text-center">
              물건을 잃어버리지 마세요
            </h2>
            <p className="text-sm text-surface-400 font-medium text-center max-w-[280px] leading-relaxed mb-8">
              물건 위치를 사진과 함께 기록하고,
              <br />
              필요할 때 바로 다시 찾아보세요.
            </p>

            <div className="w-full max-w-sm space-y-3 mb-8">
              {[
                { icon: 'fa-camera', color: 'bg-primary-500', title: '사진으로 기록', desc: '이미지를 찍고 위치를 바로 남길 수 있습니다.' },
                { icon: 'fa-brain', color: 'bg-accent-500', title: 'AI 자동 보조', desc: '이름과 메모를 AI가 빠르게 추천합니다.' },
                { icon: 'fa-lock', color: 'bg-indigo-500', title: '시크릿 보호', desc: '중요한 항목은 PIN으로 잠글 수 있습니다.' },
              ].map((feature) => (
                <div key={feature.title} className="card p-4 flex items-center gap-4">
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

            <button
              onClick={() => {
                resetForm();
                dispatch({ type: 'TOGGLE_ADDING', payload: true });
              }}
              className="btn-primary flex items-center gap-2 text-base px-8"
            >
              <i className="fas fa-plus"></i>
              첫 번째 물건 등록하기
            </button>
          </div>
        ) : (
          <>
            {items.length > 0 && !searchTerm && (
              <div className="mt-3 mb-5">
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

            <div className="flex justify-between items-center mb-4 mt-2">
              <h3 className="font-extrabold text-surface-700 text-base">
                {searchTerm ? `검색 결과 ${filteredItems.length}건` : '내 물건'}
              </h3>

              <div className="flex gap-2">
                <div className="flex bg-surface-100 rounded-xl p-0.5 border border-surface-200">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => dispatch({ type: 'SET_SORT_OPTION', payload: option.id })}
                      className={`toggle-chip text-[11px] px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 ${sortOption === option.id ? 'active' : 'text-surface-400'}`}
                    >
                      <i className={`fas ${option.icon} text-[9px]`}></i>
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="flex bg-surface-100 rounded-xl p-0.5 border border-surface-200">
                  <button
                    onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'card' })}
                    className={`toggle-chip w-8 h-8 rounded-lg flex items-center justify-center text-sm ${viewMode === 'card' ? 'active' : 'text-surface-400'}`}
                  >
                    <i className="fas fa-th-large text-xs"></i>
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'table' })}
                    className={`toggle-chip w-8 h-8 rounded-lg flex items-center justify-center text-sm ${viewMode === 'table' ? 'active' : 'text-surface-400'}`}
                  >
                    <i className="fas fa-list text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            <ItemList
              items={filteredItems}
              onDelete={(itemId) => {
                const targetItem = items.find((item) => item.id === itemId);
                if (targetItem) {
                  void handleDeleteItem(targetItem);
                }
              }}
              onItemClick={handleProtectedItemOpen}
            />
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40 safe-bottom">
          <button
            onClick={() => {
              resetForm();
              dispatch({ type: 'TOGGLE_ADDING', payload: true });
            }}
            className="pointer-events-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white text-xl fab-shadow touch-feedback"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      )}

      {isAdding && (
        <div className="fullscreen-modal animate-fade-in" onClick={() => dispatch({ type: 'TOGGLE_ADDING', payload: false })}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] animate-slide-up flex flex-col safe-bottom safe-left safe-right"
            style={{ maxHeight: '92vh', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-200"></div>
            </div>

            <div className="flex justify-between items-center px-6 pb-4">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_ADDING', payload: false })}
                className="w-10 h-10 rounded-xl bg-surface-100 text-surface-400 flex items-center justify-center"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
              <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2">
                <i className="fas fa-plus-circle text-primary-400"></i>
                새 물건 등록
              </h2>
              <div className="w-10"></div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6 mobile-scroll">
              <ItemForm
                onSubmit={handleAddItem}
                submitLabel="등록하기"
                isAnalyzing={isAnalyzing}
                performNameAnalysis={performNameAnalysis}
                removeImage={removeImage}
                handleImageUpload={(event, slotIndex) => {
                  void handleImageUpload(event, slotIndex);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div
          className="fullscreen-modal animate-fade-in"
          onClick={() => {
            dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
            dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false });
          }}
        >
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] animate-slide-up flex flex-col safe-bottom safe-left safe-right"
            style={{ maxHeight: '92vh', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-200"></div>
            </div>

            <div className="flex justify-between items-center px-6 pb-4">
              <button
                onClick={() => {
                  dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
                  dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false });
                }}
                className="w-10 h-10 rounded-xl bg-surface-100 text-surface-400 flex items-center justify-center"
              >
                <i className="fas fa-chevron-left text-lg"></i>
              </button>
              <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <i className="fas fa-pen text-primary-400"></i>
                    수정하기
                  </>
                ) : (
                  <>
                    <i className="fas fa-info-circle text-primary-400"></i>
                    상세 정보
                  </>
                )}
              </h2>
              <div className="w-10"></div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6 mobile-scroll">
              {isEditMode ? (
                <ItemForm
                  onSubmit={handleUpdateItem}
                  submitLabel="수정 완료"
                  isAnalyzing={isAnalyzing}
                  performNameAnalysis={performNameAnalysis}
                  removeImage={removeImage}
                  handleImageUpload={(event, slotIndex) => {
                    void handleImageUpload(event, slotIndex);
                  }}
                />
              ) : (
                <ItemDetail
                  item={selectedItem}
                  onEdit={() => populateFormFromItem(selectedItem)}
                  onDelete={() => void handleDeleteItem(selectedItem)}
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
        onPinChange={handlePinChange}
        onPinReset={handlePinReset}
      />

      {pinModal.isOpen && (
        <PinPadModal
          key={pinModal.mode}
          mode={pinModal.mode}
          title={pinModal.title}
          subTitle={pinModal.subTitle}
          onSuccess={async (pin, hint) => {
            if (pinModal.callback) {
              await pinModal.callback(pin, hint);
            } else {
              closePinModal();
            }
          }}
          onClose={closePinModal}
        />
      )}
    </div>
  );
};

export default App;
