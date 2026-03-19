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
};
