import { useMemo } from 'react';
import { Item } from '../../types';

export const useFilteredItems = (
  items: Item[],
  searchTerm: string,
  sortOption: 'latest' | 'name' | 'category',
  aiSearchResults: string[] | null,
): Item[] => {
  return useMemo(() => {
    let result = items;

    if (searchTerm) {
      if (aiSearchResults) {
        result = items.filter((item) => aiSearchResults.includes(item.name));
      } else {
        const loweredSearchTerm = searchTerm.toLowerCase();
        result = items.filter((item) =>
          item.name.toLowerCase().includes(loweredSearchTerm) ||
          item.notes.some((note) => note.toLowerCase().includes(loweredSearchTerm)) ||
          item.locationPath.toLowerCase().includes(loweredSearchTerm),
        );
      }
    }

    return [...result].sort((left, right) => {
      if (sortOption === 'name') {
        return left.name.localeCompare(right.name);
      }

      if (sortOption === 'category') {
        return left.category.localeCompare(right.category);
      }

      return right.updatedAt - left.updatedAt;
    });
  }, [aiSearchResults, items, searchTerm, sortOption]);
};
