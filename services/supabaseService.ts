import { Item } from '../types';
import { imageStorageService } from './imageStorageService';
import { ensureAuthenticatedUser, supabase } from './supabaseClient';

interface SupabaseItemRow {
  id: string;
  user_id: string;
  name: string;
  location_path: string;
  category: string;
  image_paths: string[] | null;
  image_urls: string[] | null;
  notes: string[] | null;
  is_secret: boolean | null;
  updated_at: number;
}

const mapRowToItem = async (row: SupabaseItemRow): Promise<Item> => {
  const imagePaths = Array.isArray(row.image_paths) ? row.image_paths : [];
  const imageUrls = imagePaths.length > 0
    ? await imageStorageService.createSignedImageUrls(imagePaths)
    : Array.isArray(row.image_urls)
      ? row.image_urls
      : [];

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    locationPath: row.location_path,
    category: row.category,
    imageUrls,
    imagePaths,
    notes: row.notes || [],
    updatedAt: row.updated_at,
    isSecret: row.is_secret || false,
  };
};

const buildUpsertPayload = async (item: Item) => {
  const user = await ensureAuthenticatedUser();
  if (!user) {
    throw new Error('인증된 사용자 정보를 가져오지 못했습니다.');
  }

  const imagePaths = item.imagePaths || [];
  const hasStorageImages = imagePaths.some(Boolean);
  const legacyImageUrls = hasStorageImages ? [] : item.imageUrls;

  return {
    id: item.id,
    user_id: user.id,
    name: item.name,
    location_path: item.locationPath,
    category: item.category,
    image_paths: imagePaths,
    image_urls: legacyImageUrls,
    notes: item.notes,
    updated_at: item.updatedAt,
    is_secret: item.isSecret || false,
  };
};

export const supabaseService = {
  async fetchItems(): Promise<Item[]> {
    await ensureAuthenticatedUser();

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching items:', error);
      return [];
    }

    return Promise.all(((data || []) as SupabaseItemRow[]).map(mapRowToItem));
  },

  async addItem(item: Item): Promise<void> {
    const payload = await buildUpsertPayload(item);
    const { error } = await supabase
      .from('items')
      .insert(payload);

    if (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  async updateItem(item: Item): Promise<void> {
    const payload = await buildUpsertPayload(item);
    const { error } = await supabase
      .from('items')
      .update(payload)
      .eq('id', item.id);

    if (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  /**
   * 백업 복원 전용: 현재 사용자의 모든 데이터를 삭제하고 복원 데이터로 일괄 교체합니다.
   * - 기존 레코드를 먼저 전부 삭제 후, 새 데이터를 청크(chunk) 단위로 upsert합니다.
   * - 대용량 복원 시 한 번에 너무 많은 요청이 가지 않도록 50개씩 나눠 처리합니다.
   * @param items - 복원할 아이템 목록
   * @param onProgress - 진행 상황 콜백 (현재 처리 수 / 전체 수)
   */
  async bulkReplaceItems(
    items: Item[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<void> {
    const user = await ensureAuthenticatedUser();
    if (!user) {
      throw new Error('인증된 사용자 정보를 가져오지 못했습니다.');
    }

    // 1단계: 현재 사용자의 기존 데이터 전체 삭제
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting existing items during bulk restore:', deleteError);
      throw deleteError;
    }

    if (items.length === 0) {
      return;
    }

    // 2단계: 복원 데이터를 50개 단위 청크로 나눠 upsert (서버 부하 방지)
    const CHUNK_SIZE = 50;
    let processedCount = 0;

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);

      // 각 청크의 아이템들을 Supabase 형식으로 변환 (userId는 현재 로그인 유저로 강제 설정)
      const payloads = await Promise.all(
        chunk.map((item) =>
          buildUpsertPayload({ ...item, userId: user.id }),
        ),
      );

      const { error: upsertError } = await supabase
        .from('items')
        .upsert(payloads);

      if (upsertError) {
        console.error(`Error upserting chunk at index ${i}:`, upsertError);
        throw upsertError;
      }

      processedCount += chunk.length;
      onProgress?.(processedCount, items.length);
    }
  },
};
