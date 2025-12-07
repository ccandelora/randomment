/**
 * Core type definitions for Moment Roulette
 */

export interface Moment {
  id: string;
  uri: string;
  createdAt: string; // ISO 8601 date string
  description?: string; // Optional description
  username?: string; // Optional username for feed display
  displayName?: string; // Optional display name for feed display
}

export interface CameraState {
  isRecording: boolean;
  hasPermission: boolean | null;
  recordingDuration: number; // in seconds
}

export type RootStackParamList = {
  Auth: undefined;
  ProfileOnboarding: undefined;
  MainTabs: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Capture: undefined;
  Profile: undefined;
};

export type CaptureStackParamList = {
  CaptureMain: undefined;
  Review: { videoUri: string; duration: number };
};

