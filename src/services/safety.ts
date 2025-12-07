/**
 * Safety Service
 * Content moderation and safety checks for Moments
 * 
 * This module provides stubs for future content safety features.
 * Currently returns "safe" for all content, but structured to support:
 * 
 * FUTURE INTEGRATIONS:
 * 
 * 1. On-Device Analysis (Before Upload):
 *    - Use TensorFlow Lite or Core ML for local video analysis
 *    - Check metadata (duration, file size, format)
 *    - Basic heuristics (black frames, audio levels)
 *    - Privacy: All analysis stays on device
 *    - Example: expo-image-manipulator for frame extraction
 *    - Example: react-native-vision-camera for metadata
 * 
 * 2. Server-Side AI Moderation (After Upload):
 *    - Send video to moderation API (e.g., AWS Rekognition, Google Cloud Video Intelligence)
 *    - Content policy enforcement
 *    - Community guidelines checking
 *    - Example: Supabase Edge Functions with moderation service
 *    - Example: Custom backend with ML pipeline
 * 
 * 3. Hybrid Approach (Recommended):
 *    - Quick local checks first (fast, private)
 *    - Upload if passes local checks
 *    - Server-side deep analysis in background
 *    - Flag for review if server finds issues
 * 
 * IMPLEMENTATION NOTES:
 * - Keep this lightweight - no heavy ML libraries yet
 * - Design for async/await pattern
 * - Return clear status codes for UI handling
 * - Provide human-readable explanations
 */

export type SafetyStatus = 'safe' | 'needs_review' | 'blocked';

export interface SafetyAnalysisResult {
  status: SafetyStatus;
  confidence?: number; // 0-1, optional for future use
  reasons?: string[]; // Optional array of specific issues found
}

/**
 * Analyze a video locally for safety concerns
 * 
 * TODO: Implement actual analysis
 * - Extract video metadata (duration, resolution, file size)
 * - Run on-device ML model if available
 * - Check for suspicious patterns
 * - Return appropriate status code
 * 
 * @param uri - Local file URI of the video to analyze
 * @returns Promise resolving to safety status
 */
export async function analyzeVideoLocally(
  uri: string
): Promise<SafetyStatus> {
  // TODO: Implement local video analysis
  // 
  // Example implementation steps:
  // 1. Get video metadata using expo-av or react-native-vision-camera
  // 2. Check basic constraints (duration, size limits)
  // 3. Extract frames for analysis (if ML model available)
  // 4. Run lightweight on-device checks
  // 5. Return appropriate status
  
  // For now, always return safe
  // This allows the app to function while safety features are developed
  return 'safe';
}

/**
 * Get detailed analysis result with confidence and reasons
 * 
 * TODO: Implement detailed analysis
 * - Return confidence scores
 * - Provide specific reasons for flags
 * - Include metadata about what was checked
 * 
 * @param uri - Local file URI of the video to analyze
 * @returns Promise resolving to detailed analysis result
 */
export async function analyzeVideoDetailed(
  uri: string
): Promise<SafetyAnalysisResult> {
  // TODO: Implement detailed analysis
  // 
  // Example return:
  // {
  //   status: 'needs_review',
  //   confidence: 0.75,
  //   reasons: ['Unusual audio patterns detected', 'Duration exceeds typical range']
  // }
  
  return {
    status: 'safe',
  };
}

/**
 * Explain a safety decision in human-readable terms
 * 
 * Provides user-friendly explanations for why content was flagged
 * or approved. Used in UI to communicate safety decisions.
 * 
 * @param code - Safety status code
 * @returns Human-readable explanation string
 */
export function explainDecision(code: SafetyStatus): string {
  switch (code) {
    case 'safe':
      return 'This moment looks good and can be shared.';
    
    case 'needs_review':
      return 'This moment needs manual review before it can be shared. This usually takes a few minutes.';
    
    case 'blocked':
      return 'This moment cannot be shared due to content policy violations. Please record a different moment.';
    
    default:
      return 'Unable to determine safety status.';
  }
}

/**
 * Check if a video meets basic requirements before analysis
 * 
 * TODO: Implement basic validation
 * - File exists and is readable
 * - Valid video format
 * - Within size/duration limits
 * - Not corrupted
 * 
 * @param uri - Local file URI to validate
 * @returns Promise resolving to true if valid, false otherwise
 */
export async function validateVideoBasic(uri: string): Promise<boolean> {
  // TODO: Implement basic validation
  // 
  // Example checks:
  // - File exists at URI
  // - File size < max limit (e.g., 100MB)
  // - Duration < max limit (e.g., 60 seconds)
  // - Valid video codec/format
  
  // For now, assume valid
  return true;
}

/**
 * Get human-readable explanation for a specific safety issue
 * 
 * TODO: Implement detailed explanations
 * - Map specific detection codes to user messages
 * - Provide actionable guidance
 * - Support i18n for multiple languages
 * 
 * @param reason - Specific reason code (from analysis result)
 * @returns Human-readable explanation
 */
export function explainReason(reason: string): string {
  // TODO: Implement reason mapping
  // 
  // Example reasons:
  // - 'audio_anomaly' -> 'Unusual audio detected'
  // - 'duration_exceeded' -> 'Video is too long'
  // - 'file_size_exceeded' -> 'File is too large'
  // - 'format_invalid' -> 'Video format not supported'
  
  return `Issue detected: ${reason}`;
}

