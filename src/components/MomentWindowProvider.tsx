/**
 * Moment Window Provider
 * Wraps the app to provide Moment Window functionality
 * Uses useMomentWindow hook and displays modal when window opens
 */

import React from 'react';
import { useMomentWindow } from '../hooks/useMomentWindow';
import { MomentWindowModal } from './MomentWindowModal';

interface MomentWindowProviderProps {
  children: React.ReactNode;
}

export function MomentWindowProvider({ children }: MomentWindowProviderProps) {
  const { isWindowOpen, closeWindow } = useMomentWindow({
    minDelayMs: 30000, // 30 seconds
    maxDelayMs: 120000, // 120 seconds (2 minutes)
    enabled: true,
    onWindowOpen: () => {
      // Optional: Could add analytics or other side effects here
      console.log('Moment Window opened');
    },
  });

  return (
    <>
      {children}
      <MomentWindowModal visible={isWindowOpen} onClose={closeWindow} />
    </>
  );
}

