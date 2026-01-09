import { useState } from 'react';
import { initializeLocalModel, isModelLoaded } from '../services/transformersService';

export function useLocalModel() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadModel = async () => {
    if (isModelLoaded()) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await initializeLocalModel((progress) => {
        setLoadProgress(Math.round(progress * 100));
      });
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoaded,
    isLoading,
    loadProgress,
    error,
    loadModel,
  };
}
