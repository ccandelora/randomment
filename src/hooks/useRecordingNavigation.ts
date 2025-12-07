/**
 * Hook for handling recording completion and navigation to review screen
 * Consolidates navigation logic and error handling
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack/lib/typescript/src/types';
import { CaptureStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<CaptureStackParamList>;

interface RecordingResult {
  uri: string;
  duration: number;
}

interface UseRecordingNavigationReturn {
  isProcessing: boolean;
  handleRecordingComplete: (result: RecordingResult | null) => Promise<void>;
}

const ERROR_MESSAGES = {
  RECORDING_FAILED: {
    title: 'Recording Failed',
    message: 'Unable to record video. Please try again.',
  },
  STOP_FAILED: {
    title: 'Recording Failed',
    message: 'Unable to stop recording. Please try again.',
  },
} as const;

export function useRecordingNavigation(): UseRecordingNavigationReturn {
  const navigation = useNavigation<NavigationProp>();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecordingComplete = useCallback(
    async (result: RecordingResult | null) => {
      setIsProcessing(true);

      try {
        if (result?.uri) {
          navigation.navigate('Review', {
            videoUri: result.uri,
            duration: result.duration,
          });
        } else {
          Alert.alert(
            ERROR_MESSAGES.RECORDING_FAILED.title,
            ERROR_MESSAGES.RECORDING_FAILED.message,
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert(
          ERROR_MESSAGES.RECORDING_FAILED.title,
          ERROR_MESSAGES.RECORDING_FAILED.message,
          [{ text: 'OK' }]
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [navigation]
  );

  return {
    isProcessing,
    handleRecordingComplete,
  };
}

