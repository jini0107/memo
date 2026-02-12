
import { supabase } from './supabaseClient';
import { Item } from '../types';

export const supabaseService = {
    fetchItems: async (): Promise<Item[]> => {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching items:', error);
            return [];
        }

        return data.map((item: any) => ({
            id: item.id,
            name: item.name,
            locationPath: item.location_path,
            category: item.category,
            imageUrls: item.image_urls || [],
            notes: item.notes || [],
            updatedAt: item.updated_at
        }));
    },

    addItem: async (item: Item): Promise<void> => {
        const { error } = await supabase
            .from('items')
            .insert({
                id: item.id,
                name: item.name,
                location_path: item.locationPath,
                category: item.category,
                image_urls: item.imageUrls,
                notes: item.notes,
                updated_at: item.updatedAt
            });

        if (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    },

    updateItem: async (item: Item): Promise<void> => {
        const { error } = await supabase
            .from('items')
            .update({
                name: item.name,
                location_path: item.locationPath,
                category: item.category,
                image_urls: item.imageUrls,
                notes: item.notes,
                updated_at: item.updatedAt
            })
            .eq('id', item.id);

        if (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    },

    deleteItem: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }
};
