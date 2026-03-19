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

const compressImage = (source: string, maxLength = 400, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = source;
    image.onload = () => {
      let { width, height } = image;

      if (width > height && width > maxLength) {
        height *= maxLength / width;
        width = maxLength;
      } else if (height >= width && height > maxLength) {
        width *= maxLength / height;
        height = maxLength;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(source);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => resolve(source);
  });
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
      // 1. 화면에 띄울 아주 가벼운 임시 가상 주소 생성 (Base64 변환 없음)
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

      // 2. AI 분석(Gemini)에만 특별히 Base64 데이터가 필요하므로 백그라운드에서 읽음
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
      try {
        const rawJson = JSON.parse(String(loadEvent.target?.result || '{}'));
        const sanitizedData = dataService.validateAndSanitize(rawJson);
        if (!sanitizedData) {
          alert('올바르지 않은 백업 파일 형식입니다.');
          return;
        }

        const confirmMessage = sanitizedData.items.length > 0
          ? `총 ${sanitizedData.items.length}개의 아이템이 확인되었습니다.\n현재 데이터를 모두 지우고 백업 파일 내용으로 복원하시겠습니까?`
          : '백업 파일에 아이템이 없습니다. 계속하시겠습니까?';

        if (!confirm(confirmMessage)) {
          return;
        }

        dispatch({ type: 'SET_ITEMS', payload: sanitizedData.items });
        dispatch({ type: 'UPDATE_CONFIG', payload: sanitizedData.config });
        dispatch({ type: 'TOGGLE_SETTINGS', payload: false });
        alert('데이터가 복원되었습니다. 클라우드 동기화는 다음 단계 작업에서 보완할 예정입니다.');
      } catch (error) {
        console.error('Failed to import backup data:', error);
        alert('백업 파일을 읽는 중 오류가 발생했습니다.');
      }
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
