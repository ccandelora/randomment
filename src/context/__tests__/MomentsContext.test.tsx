/**
 * Unit tests for MomentsContext
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { MomentsProvider, useMoments } from '../MomentsContext';
import { Moment } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to create a test wrapper with MomentsProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <MomentsProvider>{children}</MomentsProvider>
  );
};

describe('MomentsContext', () => {
  beforeEach(() => {
    // Clear AsyncStorage before each test
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('useMoments hook', () => {
    it('should throw error when used outside MomentsProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMoments());
      }).toThrow('useMoments must be used within a MomentsProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial empty moments array', async () => {
      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      // Initially loading should be true
      expect(result.current.isLoading).toBe(true);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.moments).toEqual([]);
    });

    it('should load moments from AsyncStorage on mount', async () => {
      const storedMoments: Moment[] = [
        {
          id: 'moment-1',
          uri: 'file:///path/to/video1.mp4',
          createdAt: '2024-01-01T00:00:00.000Z',
          description: 'First moment',
        },
        {
          id: 'moment-2',
          uri: 'file:///path/to/video2.mp4',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedMoments));

      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.moments).toHaveLength(2);
      expect(result.current.moments[0].id).toBe('moment-2'); // Newest first
      expect(result.current.moments[1].id).toBe('moment-1');
    });

    it('should handle AsyncStorage load errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should default to empty array on error
      expect(result.current.moments).toEqual([]);
    });
  });

  describe('addMoment', () => {
    it('should add a moment to the context', async () => {
      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMoment: Omit<Moment, 'id' | 'createdAt'> = {
        uri: 'file:///path/to/new-video.mp4',
        description: 'New moment',
      };

      await result.current.addMoment(newMoment);

      expect(result.current.moments).toHaveLength(1);
      expect(result.current.moments[0].uri).toBe(newMoment.uri);
      expect(result.current.moments[0].description).toBe(newMoment.description);
      expect(result.current.moments[0].id).toBeDefined();
      expect(result.current.moments[0].createdAt).toBeDefined();
    });

    it('should generate id and createdAt if not provided', async () => {
      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMoment: Omit<Moment, 'id' | 'createdAt'> = {
        uri: 'file:///path/to/video.mp4',
      };

      await result.current.addMoment(newMoment);

      const addedMoment = result.current.moments[0];
      expect(addedMoment.id).toBeDefined();
      expect(addedMoment.id).toMatch(/^moment_\d+_[a-z0-9]+$/);
      expect(addedMoment.createdAt).toBeDefined();
      expect(new Date(addedMoment.createdAt).getTime()).toBeGreaterThan(0);
    });

    it('should use provided id and createdAt if given', async () => {
      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const customId = 'custom-id-123';
      const customDate = '2024-12-25T12:00:00.000Z';

      await result.current.addMoment({
        id: customId,
        createdAt: customDate,
        uri: 'file:///path/to/video.mp4',
      });

      expect(result.current.moments[0].id).toBe(customId);
      expect(result.current.moments[0].createdAt).toBe(customDate);
    });

    it('should prepend new moments (newest first)', async () => {
      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add first moment
      await result.current.addMoment({
        uri: 'file:///path/to/video1.mp4',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      // Add second moment
      await result.current.addMoment({
        uri: 'file:///path/to/video2.mp4',
        createdAt: '2024-01-02T00:00:00.000Z',
      });

      expect(result.current.moments).toHaveLength(2);
      expect(result.current.moments[0].uri).toBe('file:///path/to/video2.mp4'); // Newest first
      expect(result.current.moments[1].uri).toBe('file:///path/to/video1.mp4');
    });

    it('should persist moment to AsyncStorage', async () => {
      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMoment: Omit<Moment, 'id' | 'createdAt'> = {
        uri: 'file:///path/to/video.mp4',
        description: 'Test moment',
      };

      await result.current.addMoment(newMoment);

      // Verify AsyncStorage.setItem was called
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('moments');
      const storedData = JSON.parse(callArgs[1]);
      expect(storedData).toHaveLength(1);
      expect(storedData[0].uri).toBe(newMoment.uri);
    });

    it('should handle AsyncStorage save errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));

      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMoment: Omit<Moment, 'id' | 'createdAt'> = {
        uri: 'file:///path/to/video.mp4',
      };

      // Should not throw, moment should still be in state
      await expect(result.current.addMoment(newMoment)).resolves.not.toThrow();
      expect(result.current.moments).toHaveLength(1);
    });
  });

  describe('removeMoment', () => {
    it('should remove a moment from the context', async () => {
      const storedMoments: Moment[] = [
        {
          id: 'moment-1',
          uri: 'file:///path/to/video1.mp4',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'moment-2',
          uri: 'file:///path/to/video2.mp4',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedMoments));

      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.moments).toHaveLength(2);

      await result.current.removeMoment('moment-1');

      expect(result.current.moments).toHaveLength(1);
      expect(result.current.moments[0].id).toBe('moment-2');
    });

    it('should persist deletion to AsyncStorage', async () => {
      const storedMoments: Moment[] = [
        {
          id: 'moment-1',
          uri: 'file:///path/to/video1.mp4',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedMoments));

      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.removeMoment('moment-1');

      // Verify AsyncStorage.setItem was called with updated array
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
        (call) => call[0] === 'moments'
      );
      if (callArgs) {
        const storedData = JSON.parse(callArgs[1]);
        expect(storedData).toHaveLength(0);
      }
    });

    it('should handle AsyncStorage delete errors gracefully', async () => {
      const storedMoments: Moment[] = [
        {
          id: 'moment-1',
          uri: 'file:///path/to/video1.mp4',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedMoments));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Delete error'));

      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw, moment should still be removed from state
      await expect(result.current.removeMoment('moment-1')).resolves.not.toThrow();
      expect(result.current.moments).toHaveLength(0);
    });
  });

  describe('refreshMoments', () => {
    it('should reload moments from AsyncStorage', async () => {
      const initialMoments: Moment[] = [
        {
          id: 'moment-1',
          uri: 'file:///path/to/video1.mp4',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(initialMoments));

      const { result } = renderHook(() => useMoments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.moments).toHaveLength(1);

      // Update AsyncStorage with new data
      const updatedMoments: Moment[] = [
        {
          id: 'moment-2',
          uri: 'file:///path/to/video2.mp4',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(updatedMoments));

      // Refresh moments
      await result.current.refreshMoments();

      await waitFor(() => {
        expect(result.current.moments).toHaveLength(1);
        expect(result.current.moments[0].id).toBe('moment-2');
      });
    });
  });
});

