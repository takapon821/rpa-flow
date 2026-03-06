'use client';
import { useState, useCallback } from 'react';

export interface VisualStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'select' | 'scroll' | 'wait';
  selector?: string;
  value?: string;
  url?: string;
  description?: string;
}

export interface UseVisualEditorReturn {
  steps: VisualStep[];
  addStep: (step: Omit<VisualStep, 'id'>) => void;
  insertStepAfter: (afterId: string, step: Omit<VisualStep, 'id'>) => void;
  updateStep: (id: string, updates: Partial<Omit<VisualStep, 'id'>>) => void;
  removeStep: (id: string) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  selectedStepId: string | null;
  setSelectedStepId: (id: string | null) => void;
  currentUrl: string;
  setCurrentUrl: (url: string) => void;
  setSteps: (steps: VisualStep[]) => void;
}

export function useVisualEditor(initialSteps: VisualStep[] = []): UseVisualEditorReturn {
  const [steps, setSteps] = useState<VisualStep[]>(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  const addStep = useCallback((step: Omit<VisualStep, 'id'>) => {
    setSteps(prev => [...prev, { ...step, id: String(Date.now()) }]);
  }, []);

  const insertStepAfter = useCallback((afterId: string, step: Omit<VisualStep, 'id'>) => {
    setSteps(prev => {
      const index = prev.findIndex(s => s.id === afterId);
      if (index === -1) return [...prev, { ...step, id: String(Date.now()) }];
      const next = [...prev];
      next.splice(index + 1, 0, { ...step, id: String(Date.now()) });
      return next;
    });
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<Omit<VisualStep, 'id'>>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setSteps(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return {
    steps,
    addStep,
    insertStepAfter,
    updateStep,
    removeStep,
    reorderSteps,
    selectedStepId,
    setSelectedStepId,
    currentUrl,
    setCurrentUrl,
    setSteps,
  };
}
