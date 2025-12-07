/**
 * Moderation Service
 * 
 * Consolidated service for content moderation features:
 * - Reporting moments
 * - Blocking users
 * 
 * This module provides a unified interface for moderation actions.
 */

import { reportMoment, ReportReason, CreateReportPayload } from './reports';
import { blockUser, Block } from './blocks';

// Re-export types for convenience
export type { ReportReason } from './reports';
export type { Block } from './blocks';

/**
 * Report a moment with a reason and optional text
 * 
 * @param params - Report parameters
 * @param params.momentId - ID of the moment being reported
 * @param params.reporterId - ID of the user reporting
 * @param params.reason - Reason for the report (must match CHECK constraint)
 * @param params.reasonText - Optional additional details
 * @returns Promise resolving to the created report
 * @throws Error if report creation fails
 */
export async function reportMomentService(params: {
  momentId: string;
  reporterId: string;
  reason: ReportReason;
  reasonText?: string | null;
}) {
  return reportMoment({
    momentId: params.momentId,
    reporterId: params.reporterId,
    reason: params.reason,
    reasonText: params.reasonText,
  });
}

/**
 * Block a user
 * 
 * @param params - Block parameters
 * @param params.blockerId - ID of the user doing the blocking
 * @param params.blockedId - ID of the user being blocked
 * @returns Promise resolving to the created block record
 * @throws Error if block creation fails
 */
export async function blockUserService(params: {
  blockerId: string;
  blockedId: string;
}) {
  return blockUser(params.blockerId, params.blockedId);
}

// Re-export for backward compatibility
export { reportMoment, blockUser };

