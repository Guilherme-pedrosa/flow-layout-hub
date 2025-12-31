import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export const useSortableData = <T extends Record<string, any>>(
  items: T[],
  initialSortKey?: string
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: initialSortKey || '', 
    direction: null 
  });

  const sortedItems = useMemo(() => {
    if (sortConfig.direction === null || !sortConfig.key) {
      return items;
    }

    const sortableItems = [...items];
    sortableItems.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // Handle dates
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const dateA = Date.parse(aValue);
        const dateB = Date.parse(bValue);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      if (aString < bString) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aString > bString) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction: SortDirection = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = null; // Volta ao padrão
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key || sortConfig.direction === null) {
      return null;
    }
    return sortConfig.direction;
  };

  return { 
    items: sortedItems, 
    requestSort, 
    sortConfig,
    getSortIndicator
  };
};
