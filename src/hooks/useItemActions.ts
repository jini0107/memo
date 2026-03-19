import { ChangeEvent, useContext } from 'react';
import { analyzeImage, suggestCategoryAndNotes } from '../../services/geminiService';
import { dataService } from '../../services/dataService';
import { exportItemsToExcel } from '../../services/excelService';
import { getAuthenticatedUserId } from '../../services/supabaseClient';
import { imageStorageService } from '../../services/imageStorageService';
import { supabaseService } from '../../services/supabaseService';
import { Item } from '../../types';
import { AppContext } from '../context/StateContext';

const MAX_IMAGE_SLOTS = 2;

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
};

/**
 * blob: 으로 시작하는 가상 URL을 안전하게 해제합니다.
 * createObjectURL()로 생성한 URL은 반드시 이 함수로 해제해야 메모리 누수가 없습니다.
 */
const revokeBlobUrl = (url: string | null | undefined): void => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export const useItemActions = () => {
  const { state, dispatch } = useContext(AppContext);
  const { config, formState, items, selectedItem } = state;

  const performImageAnalysis = async (base64Image: string) => {
    dispatch({ type: 'SET_IS_ANALYZING', payload: true });

    try {
      const result = await analyzeImage(base64Image);
      const updates: Partial<typeof formState> = {};

      if (result.name) {
        updates.itemName = result.name;
      }

      if (result.category) {
        updates.itemCat = result.category;
      }

      if (result.notes.length > 0) {
        updates.itemNotes = formState.itemNotes
          ? `${formState.itemNotes}\n${result.notes.join('\n')}`
          : result.notes.join('\n');
      }

      dispatch({ type: 'UPDATE_FORM', payload: updates });
    } catch (error) {
      console.error('AI image analysis failed:', error);
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING', payload: false });
    }
  };

  const performNameAnalysis = async () => {
    if (!formState.itemName.trim()) {
      return;
    }

    dispatch({ type: 'SET_IS_ANALYZING', payload: true });

    try {
      const result = await suggestCategoryAndNotes(formState.itemName.trim());
      const updates: Partial<typeof formState> = {};

      if (result.category) {
        updates.itemCat = result.category;
      }

      if (result.notes.length > 0) {
        updates.itemNotes = formState.itemNotes
          ? `${formState.itemNotes}\n${result.notes.join('\n')}`
          : result.notes.join('\n');
      }

      dispatch({ type: 'UPDATE_FORM', payload: updates });
    } catch (error) {
      console.error('AI name analysis failed:', error);
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING', payload: false });
    }
  };

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    slotIndex: number,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      // [C-1 Fix] 같은 슬롯에 기존 blob URL이 있으면 먼저 메모리에서 해제 후 새 URL 생성
      // 해제하지 않으면 사진을 교체할 때마다 메모리 조각이 누적되어 앱이 느려집니다.
      revokeBlobUrl(formState.itemImages[slotIndex]);

      // 화면에 띄울 가벼운 임시 가상 주소 생성 (Base64 변환 없음)
      const virtualPreviewUrl = URL.createObjectURL(file);

      const nextImages = [...formState.itemImages];
      const nextImageFiles = [...formState.itemImageFiles];
      const nextImagePaths = [...formState.itemImagePaths];

      nextImages[slotIndex] = virtualPreviewUrl;
      nextImageFiles[slotIndex] = file;
      nextImagePaths[slotIndex] = '';

      dispatch({
        type: 'UPDATE_FORM',
        payload: {
          itemImages: nextImages,
          itemImageFiles: nextImageFiles,
          itemImagePaths: nextImagePaths,
        },
      });

      // AI 분석(Gemini)에만 특별히 Base64 데이터가 필요하므로 백그라운드에서 읽음
      if (slotIndex === 0) {
        const rawDataUrl = await readFileAsDataUrl(file);
        await performImageAnalysis(rawDataUrl);
      }
    } catch (error) {
      console.error('Image handling failed:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    // [C-1 Fix] 삭제 전 해당 슬롯의 blob URL을 즉시 메모리에서 해제합니다.
    revokeBlobUrl(formState.itemImages[index]);

    const nextImages = [...formState.itemImages];
    const nextImageFiles = [...formState.itemImageFiles];
    const nextImagePaths = [...formState.itemImagePaths];

    nextImages[index] = '';
    nextImageFiles[index] = null;
    nextImagePaths[index] = '';

    dispatch({
      type: 'UPDATE_FORM',
      payload: {
        itemImages: nextImages,
        itemImageFiles: nextImageFiles,
        itemImagePaths: nextImagePaths,
      },
    });
  };

  const buildItemFromForm = (baseItem?: Item): Item => {
    const itemId = baseItem?.id || Date.now().toString();
    const fullPath = `${formState.locType} > ${formState.locDetail}`;

    return {
      id: itemId,
      userId: baseItem?.userId,
      name: formState.itemName,
      locationPath: fullPath,
      category: formState.itemCat,
      // blob: 으로 시작하는 임시 가상 주소는 로컬에 저장되지 않도록 비워둠
      imageUrls: formState.itemImages.map(img => img.startsWith('blob:') ? '' : img),
      imagePaths: [...formState.itemImagePaths],
      notes: formState.itemNotes.split('\n').map((text) => text.trim()).filter(Boolean),
      updatedAt: Date.now(),
      isSecret: formState.isSecret,
    };
  };

  const prepareItemFromForm = async (item: Item, previousItem?: Item): Promise<Item> => {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error('인증된 사용자 정보를 가져오지 못했습니다.');
    }

    const nextImagePaths: string[] = Array.from({ length: MAX_IMAGE_SLOTS }, () => '');
    const pathsToRemove: string[] = [];

    for (let slotIndex = 0; slotIndex < MAX_IMAGE_SLOTS; slotIndex += 1) {
      const pendingFile = formState.itemImageFiles[slotIndex];
      const existingPath = formState.itemImagePaths[slotIndex];
      const hasPreview = Boolean(formState.itemImages[slotIndex]);

      if (pendingFile) {
        const uploadedPath = await imageStorageService.uploadItemImage({
          userId,
          itemId: item.id,
          slotIndex,
          file: pendingFile,
        });
        nextImagePaths[slotIndex] = uploadedPath;

        if (existingPath) {
          pathsToRemove.push(existingPath);
        }
        continue;
      }

      if (existingPath && hasPreview) {
        nextImagePaths[slotIndex] = existingPath;
        continue;
      }

      if (existingPath && !hasPreview) {
        pathsToRemove.push(existingPath);
      }
    }

    const signedImageUrls = await imageStorageService.createSignedImageUrls(nextImagePaths);
    const nextItem: Item = {
      ...item,
      userId,
      imagePaths: nextImagePaths,
      imageUrls: signedImageUrls,
    };

    if (previousItem && previousItem.imagePaths) {
      const removedLegacyPaths = previousItem.imagePaths.filter(
        (path) => path && !nextItem.imagePaths?.includes(path),
      );
      pathsToRemove.push(...removedLegacyPaths);
    }

    nextItem.imagePaths = nextItem.imagePaths || [];
    (nextItem as Item & { pathsToRemove?: string[] }).pathsToRemove = Array.from(new Set(pathsToRemove.filter(Boolean)));

    return nextItem;
  };

  const saveNewItem = async (item: Item) => {
    const preparedItem = await prepareItemFromForm(item);
    dispatch({ type: 'SET_ITEMS', payload: [preparedItem, ...items] });
    dispatch({ type: 'TOGGLE_ADDING', payload: false });
    dispatch({ type: 'RESET_FORM' });

    try {
      await supabaseService.addItem(preparedItem);
    } catch (error: any) {
      await imageStorageService.removeImages(preparedItem.imagePaths || []);
      console.error('Failed to save item:', error);
      alert(`클라우드 저장에 실패했습니다.\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
    }
  };

  const updateItem = async (item: Item) => {
    const preparedItem = await prepareItemFromForm(item, selectedItem || undefined);
    const updatedItems = items.map((currentItem) => currentItem.id === item.id ? preparedItem : currentItem);

    dispatch({ type: 'SET_ITEMS', payload: updatedItems });
    dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
    dispatch({ type: 'TOGGLE_EDIT_MODE', payload: false });

    try {
      await supabaseService.updateItem(preparedItem);
      const pathsToRemove = (preparedItem as Item & { pathsToRemove?: string[] }).pathsToRemove || [];
      await imageStorageService.removeImages(pathsToRemove);
    } catch (error: any) {
      const previousPaths = selectedItem?.imagePaths || [];
      const uploadedPaths = (preparedItem.imagePaths || []).filter((path) => !previousPaths.includes(path));
      await imageStorageService.removeImages(uploadedPaths);
      console.error('Failed to update item:', error);
      alert(`클라우드 업데이트에 실패했습니다.\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
    }
  };

  const deleteItem = async (item: Item) => {
    dispatch({ type: 'SET_ITEMS', payload: items.filter((currentItem) => currentItem.id !== item.id) });
    if (selectedItem?.id === item.id) {
      dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
    }

    try {
      await supabaseService.deleteItem(item.id);
      await imageStorageService.removeImages(item.imagePaths || []);
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      alert(`클라우드 삭제에 실패했습니다.\n\n상세 에러: ${error.message || JSON.stringify(error)}`);
    }
  };

  const populateFormFromItem = (item: Item) => {
    const parts = item.locationPath.split(' > ');
    const locType = parts.length === 2 && config.locTypes.includes(parts[0])
      ? parts[0]
      : (config.locTypes[0] || '기타');
    const locDetail = parts.length === 2 && config.locTypes.includes(parts[0])
      ? parts[1]
      : item.locationPath;

    const itemImages = Array.from({ length: MAX_IMAGE_SLOTS }, (_, index) => item.imageUrls[index] || '');
    const itemImagePaths = Array.from({ length: MAX_IMAGE_SLOTS }, (_, index) => item.imagePaths?.[index] || '');

    dispatch({
      type: 'UPDATE_FORM',
      payload: {
        itemName: item.name,
        locType,
        locDetail,
        itemCat: item.category,
        itemNotes: item.notes.join('\n'),
        itemImages,
        itemImagePaths,
        itemImageFiles: [null, null],
        isSecret: item.isSecret || false,
      },
    });
    dispatch({ type: 'TOGGLE_EDIT_MODE', payload: true });
  };

  const resetForm = () => {
    // [C-1 Fix] 폼 전체 초기화 전, 보관 중인 모든 슬롯의 blob URL을 일괄 해제합니다.
    // 등록 취소나 저장 완료 시 메모리에 남아있던 가상 이미지 주소를 모두 정리합니다.
    formState.itemImages.forEach(revokeBlobUrl);
    dispatch({ type: 'RESET_FORM' });
  };

  const handleExportData = () => {
    dataService.exportToJson({ items, config, version: 1 });
  };

  const handleExportExcel = () => {
    exportItemsToExcel(items);
  };

  const handleImportData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      // [C-4 Fix] reader.onload 내부에서 async를 직접 쓸 수 없어 즉시 실행 async 함수로 감쌉니다.
      void (async () => {
        try {
          const rawJson = JSON.parse(String(loadEvent.target?.result || '{}'));
          const sanitizedData = dataService.validateAndSanitize(rawJson);
          if (!sanitizedData) {
            alert('올바르지 않은 백업 파일 형식입니다.');
            return;
          }

          const confirmMessage = sanitizedData.items.length > 0
            ? `총 ${sanitizedData.items.length}개의 아이템이 확인되었습니다.\n현재 데이터를 모두 지우고 백업 파일 내용으로 복원하시겠습니까?\n\n⚠️ 복원 중에는 앱을 닫지 마세요.`
            : '백업 파일에 아이템이 없습니다. 계속하시겠습니까?';

          if (!confirm(confirmMessage)) {
            return;
          }

          // 1단계: 로컬 상태 먼저 복원 (사용자에게 빠른 피드백)
          dispatch({ type: 'SET_ITEMS', payload: sanitizedData.items });
          dispatch({ type: 'UPDATE_CONFIG', payload: sanitizedData.config });
          dispatch({ type: 'TOGGLE_SETTINGS', payload: false });

          // 2단계: Supabase 클라우드에 재동기화 (새로고침해도 데이터 유지)
          if (sanitizedData.items.length > 0) {
            console.log(`☁️ 클라우드 동기화 시작: 총 ${sanitizedData.items.length}개 아이템`);
            await supabaseService.bulkReplaceItems(
              sanitizedData.items,
              (current, total) => {
                console.log(`☁️ 클라우드 동기화 진행 중: ${current}/${total}`);
              },
            );
            console.log('✅ 클라우드 동기화 완료');
            alert(`✅ 복원 완료!\n${sanitizedData.items.length}개의 아이템이 로컬과 클라우드 모두에 저장되었습니다.`);
          } else {
            alert('✅ 복원 완료! (아이템 없음)');
          }
        } catch (error) {
          console.error('Failed to import backup data:', error);
          alert('백업 파일을 읽거나 클라우드에 동기화하는 중 오류가 발생했습니다.\n로컬에는 복원되었지만 클라우드 동기화에 실패했습니다.\n앱을 재시작하면 이전 데이터로 돌아갈 수 있습니다.');
        }
      })();
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return {
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
  };
};
