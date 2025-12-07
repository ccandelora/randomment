/**
 * Reports Service
 * 
 * Handles moment reporting using Supabase moment_reports table.
 * Allows users to report moments with a reason and optional text.
 */

import { supabase } from './supabaseClient';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'violence'
  | 'hate_speech'
  | 'other';

export interface MomentReport {
  id: string;
  moment_id: string;
  reporter_id: string;
  reason: ReportReason;
  reason_text: string | null;
  created_at: string;
}

export interface CreateReportPayload {
  momentId: string;
  reporterId: string;
  reason: ReportReason;
  reasonText?: string | null;
}

/**
 * Creates a report for a moment
 * 
 * @param payload - Report data
 * @returns Promise resolving to the created report
 * @throws Error if creation fails
 */
export async function reportMoment(
  payload: CreateReportPayload
): Promise<MomentReport> {
  try {
    const { data, error } = await supabase
      .from('moment_reports')
      .insert({
        moment_id: payload.momentId,
        reporter_id: payload.reporterId,
        reason: payload.reason,
        reason_text: payload.reasonText || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase reportMoment error:', error);
      throw new Error(`Failed to report moment: ${error.message}`);
    }

    if (!data) {
      throw new Error('Report creation succeeded but no data returned');
    }

    return data as MomentReport;
  } catch (error) {
    if (error instanceof Error) {
      console.error('reportMoment failed:', error.message);
      throw error;
    }
    console.error('reportMoment failed with unknown error:', error);
    throw new Error('Failed to report moment: Unknown error');
  }
}

