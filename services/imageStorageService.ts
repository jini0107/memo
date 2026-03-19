import { ITEM_IMAGE_BUCKET, supabase } from './supabaseClient';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const imageStorageService = {
  async uploadItemImage(params: {
    userId: string;
    itemId: string;
    slotIndex: number;
    file: File;
  }): Promise<string> {
    const { userId, itemId, slotIndex, file } = params;
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const safeFileName = sanitizeFileName(`${Date.now()}_${slotIndex}.${fileExtension}`);
    const filePath = `${userId}/${itemId}/${safeFileName}`;

    const { error } = await supabase.storage
      .from(ITEM_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload image to Supabase Storage:', error);
      throw error;
    }

    return filePath;
  },

  async createSignedImageUrls(paths: string[]): Promise<string[]> {
    const indexedPaths = paths
      .map((path, index) => ({ path, index }))
      .filter((entry) => Boolean(entry.path));
    const validPaths = indexedPaths.map((entry) => entry.path);
    if (validPaths.length === 0) {
      return paths.map(() => '');
    }

    const { data, error } = await supabase.storage
      .from(ITEM_IMAGE_BUCKET)
      .createSignedUrls(validPaths, SIGNED_URL_EXPIRES_IN_SECONDS);

    if (error) {
      console.error('Failed to create signed image URLs:', error);
      return paths.map(() => '');
    }

    const signedUrls = paths.map(() => '');
    data.forEach((entry, index) => {
      const targetIndex = indexedPaths[index]?.index;
      if (typeof targetIndex === 'number') {
        signedUrls[targetIndex] = entry.signedUrl || '';
      }
    });

    return signedUrls;
  },

  async removeImages(paths: string[]): Promise<void> {
    const validPaths = paths.filter(Boolean);
    if (validPaths.length === 0) {
      return;
    }

    const { error } = await supabase.storage
      .from(ITEM_IMAGE_BUCKET)
      .remove(validPaths);

    if (error) {
      console.error('Failed to remove image files from Supabase Storage:', error);
    }
  },
};
