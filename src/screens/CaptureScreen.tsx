/**
 * Capture Screen - "Moment Window"
 * Full-screen camera preview with explicit recording control
 * User must explicitly press "Record 10s" button to start recording
 * 
 * REFACTOR SUMMARY:
 * - Extracted permission handling into useCameraPermissions hook
 * - Extracted recording navigation logic into useRecordingNavigation hook
 * - Created reusable components: CameraPermissionDenied, CameraHeader, RecordingIndicator, CameraPrivacyMessage, CameraRecordButton
 * - Improved TypeScript typing (kept 'as any' for CameraView ref due to expo-camera type limitations)
 * - Consolidated error handling and removed duplicate code (reduced from ~387 to ~155 lines)
 * - Better separation of concerns: UI components, hooks, and business logic are now separated
 * - Improved readability: main component focuses on orchestration, not implementation details
 * 
 * UX IMPROVEMENTS:
 * - Improved spacing and visual hierarchy throughout
 * - Better typography with refined font weights and letter spacing
 * - Enhanced button designs with better contrast and feedback
 * - Safe area handling for modern devices
 * - More polished loading and error states
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, Linking } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCamera } from '../hooks/useCamera';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useRecordingNavigation } from '../hooks/useRecordingNavigation';
import { CameraPermissionDenied } from '../components/CameraPermissionDenied';
import { CameraHeader } from '../components/CameraHeader';
import { RecordingIndicator } from '../components/RecordingIndicator';
import { CameraPrivacyMessage } from '../components/CameraPrivacyMessage';
import { CameraRecordButton } from '../components/CameraRecordButton';

const getPermissionAlertButtons = () => [
  { text: 'Cancel', style: 'cancel' as const },
  {
    text: 'Open Settings',
    onPress: () => Linking.openSettings(),
  },
];

export function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const { cameraRef, state, startRecording, stopRecording, maxDuration } = useCamera();
  const { isLoading, isDenied, isGranted, requestPermission } = useCameraPermissions();
  const { isProcessing, handleRecordingComplete } = useRecordingNavigation();

  const handleRecordPress = useCallback(async () => {
    // Prevent multiple simultaneous recordings
    if (state.isRecording || isProcessing) {
      return;
    }

    // Check permissions before recording
    if (!isGranted) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera and microphone permissions to record moments.',
        getPermissionAlertButtons()
      );
      return;
    }

    try {
      const result = await startRecording();
      await handleRecordingComplete(result);
    } catch (error) {
      console.error('Recording error:', error);
      await handleRecordingComplete(null);
    }
  }, [state.isRecording, isProcessing, isGranted, startRecording, handleRecordingComplete]);

  const handleStopPress = useCallback(async () => {
    if (!state.isRecording || isProcessing) {
      return;
    }

    try {
      const result = await stopRecording();
      await handleRecordingComplete(result);
    } catch (error) {
      console.error('Stop recording error:', error);
      await handleRecordingComplete(null);
    }
  }, [state.isRecording, isProcessing, stopRecording, handleRecordingComplete]);

  // Loading state - checking permissions
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Checking camera permissions...</Text>
      </View>
    );
  }

  // Permission denied state
  if (isDenied) {
    return <CameraPermissionDenied onRequestPermission={requestPermission} />;
  }

  // Camera view with recording controls
  const remainingSeconds = Math.ceil(maxDuration - state.recordingDuration);

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video"
      />
      <View style={styles.overlay}>
        <CameraHeader />

        {state.isRecording && (
          <View style={styles.recordingContainer}>
            <RecordingIndicator remainingSeconds={remainingSeconds} />
          </View>
        )}

        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <CameraRecordButton
            isRecording={state.isRecording}
            onPress={state.isRecording ? handleStopPress : handleRecordPress}
            disabled={isProcessing}
          />
          <CameraPrivacyMessage />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  recordingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 24,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
