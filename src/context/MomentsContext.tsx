/**
 * Context for managing moments state across the app
 * Handles loading, saving, and deleting moments
 * Lightweight implementation - no backend dependency
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Moment } from '../types';
import { getMoments, saveMoment, deleteMoment } from '../services/storage';

interface MomentsContextValue {
  moments: Moment[];
  isLoading: boolean;
  addMoment: (moment: Omit<Moment, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => Promise<void>;
  removeMoment: (momentId: string) => Promise<void>;
  refreshMoments: () => Promise<void>;
}

const MomentsContext = createContext<MomentsContextValue | undefined>(undefined);

export function MomentsProvider({ children }: { children: React.ReactNode }) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMoments = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedMoments = await getMoments();
      // Sort by createdAt, newest first (ISO strings sort correctly)
      const sorted = loadedMoments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMoments(sorted);
    } catch (error) {
      // If loading fails, log error and start with empty array
      console.error('Failed to load moments from storage:', error);
      setMoments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addMoment = useCallback(async (
    momentData: Omit<Moment, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ) => {
    // Generate ID if not provided
    const id = momentData.id || `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use provided createdAt or generate ISO string
    const createdAt = momentData.createdAt || new Date().toISOString();
    
    const moment: Moment = {
      id,
      uri: momentData.uri,
      createdAt,
      description: momentData.description,
    };

    // Update state first (optimistic update)
    setMoments((prev) => [moment, ...prev]);

    // Then persist to AsyncStorage
    try {
      await saveMoment(moment);
    } catch (error) {
      // If saving fails, log but don't crash the app
      // The moment is already in state, so user can still see it
      // On next app restart, it won't be persisted, but app continues to work
      console.error('Failed to persist moment to storage:', error);
      // Optionally: Could revert the state update here if desired
      // But for better UX, we keep it in memory
    }
  }, []);

  const removeMoment = useCallback(async (momentId: string) => {
    // Update state first (optimistic update)
    setMoments((prev) => prev.filter((m) => m.id !== momentId));

    // Then persist deletion to AsyncStorage
    try {
      await deleteMoment(momentId);
    } catch (error) {
      // If deletion fails, log but don't crash
      // The moment is already removed from state
      console.error('Failed to persist moment deletion to storage:', error);
      // Optionally: Could restore the moment in state here if desired
    }
  }, []);

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  const value: MomentsContextValue = {
    moments,
    isLoading,
    addMoment,
    removeMoment,
    refreshMoments: loadMoments,
  };

  return <MomentsContext.Provider value={value}>{children}</MomentsContext.Provider>;
}

export function useMoments() {
  const context = useContext(MomentsContext);
  if (context === undefined) {
    throw new Error('useMoments must be used within a MomentsProvider');
  }
  return context;
}

