import { useState, useCallback } from 'react';
import { DataRow } from '../types/dataset';
import { TransformationStep, TransformationActionType } from '../types/history';

export interface HistoryState {
  past: DataRow[][];
  present: DataRow[];
  future: DataRow[][];
  steps: TransformationStep[];
}

export function useTableHistory(initialRows: DataRow[] = [], tableId: string = '') {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialRows,
    future: [],
    steps: [],
  });

  // Reset history when table switches
  const resetHistory = useCallback((rows: DataRow[], newTableId: string) => {
    setHistory({
      past: [],
      present: rows,
      future: [],
      steps: [],
    });
  }, []);

  // Push a new state with a transformation description
  const pushState = useCallback((
    newRows: DataRow[],
    actionType: TransformationActionType,
    description: string,
    params?: Record<string, any>
  ) => {
    setHistory(prev => {
      const newStep: TransformationStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tableId,
        actionType,
        description,
        timestamp: Date.now(),
        params,
      };

      return {
        past: [...prev.past.slice(-20), prev.present], // Keep last 20 states in memory
        present: newRows,
        future: [], // clear redo branch
        steps: [...prev.steps, newStep],
      };
    });
  }, [tableId]);

  // Undo action
  const undo = useCallback((): DataRow[] | null => {
    if (history.past.length === 0) return null;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);

    setHistory(prev => ({
      past: newPast,
      present: previous,
      future: [prev.present, ...prev.future],
      steps: prev.steps.slice(0, -1),
    }));

    return previous;
  }, [history]);

  // Redo action
  const redo = useCallback((): DataRow[] | null => {
    if (history.future.length === 0) return null;
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: next,
      future: newFuture,
      steps: prev.steps,
    }));

    return next;
  }, [history]);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    rows: history.present,
    steps: history.steps,
    pushState,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  };
}
