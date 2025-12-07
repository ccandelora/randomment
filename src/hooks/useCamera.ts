/**
 * Custom hook for managing camera state and recording
 * Ensures explicit user control - nothing happens automatically
 */

import { useState, useRef, useCallback } from 'react';
import { CameraRecordingOptions } from 'expo-camera';
import CameraView from 'expo-camera/build/CameraView';
import { CameraState } from '../types';

const MAX_RECORDING_DURATION = 10; // 10 seconds max

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    isRecording: false,
    hasPermission: null,
    recordingDuration: 0,
  });

  const cameraRef = useRef<CameraView>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

  const startRecording = useCallback(async (): Promise<{ uri: string; duration: number } | null> => {
    if (!cameraRef.current || state.isRecording) {
      return null;
    }

    try {
      const options: CameraRecordingOptions = {
        maxDuration: MAX_RECORDING_DURATION,
      };

      setState((prev) => ({ ...prev, isRecording: true, recordingDuration: 0 }));

      let finalDuration = 0;
      const startTime = Date.now();

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        setState((prev) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const newDuration = Math.min(elapsed, MAX_RECORDING_DURATION);
          finalDuration = newDuration;
          return { ...prev, recordingDuration: newDuration };
        });
      }, 100);

      // Start recording and store the promise
      recordingPromiseRef.current = cameraRef.current.recordAsync(options);
      const result = await recordingPromiseRef.current;
      
      // Clear interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Capture final duration before resetting
      const recordedDuration = finalDuration || MAX_RECORDING_DURATION;

      setState((prev) => ({ ...prev, isRecording: false, recordingDuration: 0 }));
      recordingPromiseRef.current = null;
      
      if (!result) {
        return null;
      }
      
      return { uri: result.uri, duration: recordedDuration };
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setState((prev) => ({ ...prev, isRecording: false, recordingDuration: 0 }));
      recordingPromiseRef.current = null;
      return null;
    }
  }, [state.isRecording]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; duration: number } | null> => {
    if (cameraRef.current && state.isRecording && recordingPromiseRef.current) {
      try {
        // Capture current duration before stopping
        const currentDuration = state.recordingDuration;
        
        // Stop the recording first
        cameraRef.current.stopRecording();
        
        // Wait for the recording promise to resolve
        const result = await recordingPromiseRef.current;
        
        // Clear interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        setState((prev) => ({ ...prev, isRecording: false, recordingDuration: 0 }));
        recordingPromiseRef.current = null;
        
        if (result?.uri) {
          return { uri: result.uri, duration: currentDuration };
        }
        return null;
      } catch (error) {
        console.error('Failed to stop recording:', error);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        setState((prev) => ({ ...prev, isRecording: false, recordingDuration: 0 }));
        recordingPromiseRef.current = null;
        return null;
      }
    }
    return null;
  }, [state.isRecording, state.recordingDuration]);

  return {
    cameraRef,
    state,
    startRecording,
    stopRecording,
    maxDuration: MAX_RECORDING_DURATION,
  };
}

