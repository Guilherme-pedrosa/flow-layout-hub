import { useState, useMemo, useCallback } from 'react';

export interface UseSelectionSumOptions<T> {
  items: T[];
  getAmount: (item: T) => number;
  getId: (item: T) => string;
}

export const useSelectionSum = <T>({ items, getAmount, getId }: UseSelectionSumOptions<T>) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)));
  }, [items, getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [selectedIds.size, items.length, selectAll, clearSelection]);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(getId(item)));
  }, [items, selectedIds, getId]);

  const totalSum = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + getAmount(item), 0);
  }, [selectedItems, getAmount]);

  const positiveSum = useMemo(() => {
    return selectedItems
      .filter(item => getAmount(item) > 0)
      .reduce((sum, item) => sum + getAmount(item), 0);
  }, [selectedItems, getAmount]);

  const negativeSum = useMemo(() => {
    return selectedItems
      .filter(item => getAmount(item) < 0)
      .reduce((sum, item) => sum + getAmount(item), 0);
  }, [selectedItems, getAmount]);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    totalSum,
    positiveSum,
    negativeSum,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleSelectAll,
    isSelected,
    isAllSelected,
    isSomeSelected
  };
};
