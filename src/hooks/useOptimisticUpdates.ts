import { useState, useCallback } from 'react';

type OptimisticState<T> = {
  data: T;
  isOptimistic: boolean;
};

export const useOptimisticUpdates = <T>(initialData: T) => {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
  });

  const updateOptimistically = useCallback((newData: T, asyncOperation: () => Promise<T>) => {
    // Immediately update UI
    setState({ data: newData, isOptimistic: true });

    // Perform async operation
    asyncOperation()
      .then((result) => {
        setState({ data: result, isOptimistic: false });
      })
      .catch((error) => {
        // Revert on error
        setState({ data: initialData, isOptimistic: false });
        console.error('Optimistic update failed:', error);
      });
  }, [initialData]);

  const setData = useCallback((newData: T) => {
    setState({ data: newData, isOptimistic: false });
  }, []);

  return {
    data: state.data,
    isOptimistic: state.isOptimistic,
    updateOptimistically,
    setData,
  };
};