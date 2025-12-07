/**
 * Hook for managing camera permissions with automatic request on mount
 */

import { useEffect } from 'react';
import { useCameraPermissions as useExpoCameraPermissions } from 'expo-camera';

interface UseCameraPermissionsReturn {
  permission: ReturnType<typeof useExpoCameraPermissions>[0];
  requestPermission: ReturnType<typeof useExpoCameraPermissions>[1];
  isLoading: boolean;
  isDenied: boolean;
  isGranted: boolean;
}

export function useCameraPermissions(): UseCameraPermissionsReturn {
  const [permission, requestPermission] = useExpoCameraPermissions();

  useEffect(() => {
    // Request permissions on mount if not already granted
    if (permission && !permission.granted && !permission.canAskAgain) {
      // Permission was denied permanently - user needs to enable in settings
      return;
    }
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const isLoading = !permission;
  const isDenied = permission !== null && !permission.granted;
  const isGranted = permission !== null && permission.granted;

  return {
    permission,
    requestPermission,
    isLoading,
    isDenied,
    isGranted,
  };
}

