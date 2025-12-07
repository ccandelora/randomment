/**
 * Feed Screen
 * Displays published moments from Supabase in a modern feed layout
 * Newest moments appear first
 * Supports pull-to-refresh and optimistic updates from local context
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMoments } from '../context/MomentsContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Moment } from '../types';
import { fetchFeedMoments, FeedMoment } from '../services/moments';
import { toggleLike } from '../services/reactions';
import { reportMoment, ReportReason } from '../services/reports';
import { blockUser, getBlockedUserIds } from '../services/blocks';

/**
 * Format ISO date string to human-readable format
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📹</Text>
      <Text style={styles.emptyTitle}>No Moments Yet</Text>
      <Text style={styles.emptyDescription}>
        Tap the Capture tab to record your first moment.{'\n'}
        Pull down to refresh and see moments from other users.
      </Text>
    </View>
  );
}

interface MomentCardProps {
  item: Moment & { 
    username?: string; 
    displayName?: string | null;
    likeCount?: number;
    hasLiked?: boolean;
    userId?: string; // user_id of the moment owner
  };
  onLikeToggle: (momentId: string) => Promise<void>;
  onReport: (momentId: string, userId: string, username: string) => Promise<void>;
  onBlock: (userId: string, username: string) => Promise<void>;
}

function MomentCard({ item, onLikeToggle, onReport, onBlock }: MomentCardProps) {
  const videoRef = React.useRef<Video>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [localHasLiked, setLocalHasLiked] = useState(item.hasLiked || false);
  const [localLikeCount, setLocalLikeCount] = useState(item.likeCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Sync with prop changes (e.g., after refresh)
  React.useEffect(() => {
    setLocalHasLiked(item.hasLiked || false);
    setLocalLikeCount(item.likeCount || 0);
  }, [item.hasLiked, item.likeCount]);

  const handleLikePress = async () => {
    if (isLiking) return;

    // Optimistic update
    const wasLiked = localHasLiked;
    const newLikeCount = wasLiked ? localLikeCount - 1 : localLikeCount + 1;
    
    setLocalHasLiked(!wasLiked);
    setLocalLikeCount(newLikeCount);
    setIsLiking(true);

    try {
      await onLikeToggle(item.id);
    } catch (error) {
      // Revert optimistic update on error
      setLocalHasLiked(wasLiked);
      setLocalLikeCount(localLikeCount);
      if (__DEV__) {
        console.error('Like toggle failed:', error);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleMenuPress = () => {
    setShowMenu(true);
  };

  const handleReport = async () => {
    setShowMenu(false);
    if (item.id && item.userId && item.username) {
      await onReport(item.id, item.userId, item.username);
    }
  };

  const handleBlock = async () => {
    setShowMenu(false);
    if (item.userId && item.username) {
      await onBlock(item.userId, item.username);
    }
  };

  return (
    <View style={styles.card}>
      {/* Video Player */}
      <View style={styles.videoWrapper}>
        {videoError ? (
          <View style={styles.videoErrorContainer}>
            <Text style={styles.videoErrorText}>⚠️ Video unavailable</Text>
            {__DEV__ && (
              <Text style={styles.videoErrorDebug}>{videoError}</Text>
            )}
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: item.uri }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            useNativeControls
            shouldPlay={false}
            isLooping
            onError={(error: any) => {
              const errorMessage = error?.nativeEvent?.error?.message || error?.message || String(error);
              if (__DEV__) {
                console.error('Video playback error:', {
                  momentId: item.id,
                  uri: item.uri,
                  error: errorMessage,
                  fullError: error,
                });
              }
              setVideoError(`Failed to load video: ${item.uri?.substring(0, 50)}...`);
            }}
            onLoadStart={() => {
              if (__DEV__) {
                console.log('Video loading:', { 
                  momentId: item.id, 
                  uri: item.uri,
                  storagePath: (item as any).storage_path,
                });
              }
            }}
            onLoad={() => {
              if (__DEV__) {
                console.log('Video loaded successfully:', { momentId: item.id });
              }
              setVideoError(null);
            }}
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Username, Timestamp, and Overflow Menu */}
        <View style={styles.headerRow}>
          <Text style={styles.username}>@{item.username || 'unknown'}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.menuIcon}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Optional Description */}
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        {/* Like Button and Count */}
        <View style={styles.likeRow}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLikePress}
            disabled={isLiking}
            activeOpacity={0.7}
          >
            <Text style={styles.likeIcon}>
              {localHasLiked ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.likeCount}>
            {localLikeCount > 0 ? localLikeCount : ''}
          </Text>
        </View>
      </View>

      {/* Action Sheet Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.actionSheet}>
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={handleReport}
            >
              <Text style={styles.actionSheetText}>Report Moment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={handleBlock}
            >
              <Text style={styles.actionSheetText}>
                Block @{item.username || 'user'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetItem, styles.actionSheetCancel]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { moments: localMoments } = useMoments(); // Local moments for optimistic updates (temporary until server sync)
  const { user } = useAuth();
  const { showError: showNotificationError, showSuccess } = useNotifications();
  const [feedMoments, setFeedMoments] = useState<FeedMoment[]>([]); // Primary data source from feed_moments view
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isLoadingRef = useRef(false); // Prevent concurrent loads

  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportMomentId, setReportMomentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportText, setReportText] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Convert FeedMoment from feed_moments view to Moment format for display
  const convertFeedMomentToMoment = useCallback((feedMoment: FeedMoment): Moment & {
    username?: string;
    displayName?: string | null;
    likeCount?: number;
    hasLiked?: boolean;
    userId?: string;
    storage_path?: string; // Include for debugging
  } => {
    if (__DEV__) {
      console.log('Converting feed moment:', {
        id: feedMoment.id,
        video_url: feedMoment.video_url,
        storage_path: feedMoment.storage_path,
        username: feedMoment.username,
      });
    }
    return {
      id: feedMoment.id,
      uri: feedMoment.video_url, // Already converted from storage_path to public URL
      createdAt: feedMoment.created_at,
      description: feedMoment.description || undefined,
      username: feedMoment.username,
      displayName: feedMoment.display_name || undefined,
      likeCount: feedMoment.like_count,
      hasLiked: feedMoment.has_liked,
      userId: feedMoment.user_id,
      storage_path: feedMoment.storage_path, // Include for debugging
    };
  }, []);

  // Load blocked users
  const loadBlockedUsers = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const blockedIds = await getBlockedUserIds(user.id);
      return blockedIds;
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      return []; // Return empty array on error
    }
  }, [user]);

  // Fetch moments from feed_moments view (primary data source)
  const loadMoments = useCallback(async (isRefresh = false) => {
    // Prevent concurrent loads (unless it's a refresh)
    if (isLoadingRef.current && !isRefresh) {
      return;
    }

    isLoadingRef.current = true;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Load blocked users if user is logged in
      let currentBlockedIds: string[] = [];
      if (user) {
        currentBlockedIds = await loadBlockedUsers();
        setBlockedUserIds(currentBlockedIds);
      }

      // Fetch from feed_moments view (includes profile data and reaction data)
      const fetchedMoments = await fetchFeedMoments(50, currentBlockedIds);
      setFeedMoments(fetchedMoments);
      setError(null); // Clear any previous errors
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load moments');
      setError(error);
      
      // Only show notification if not initial load (to avoid duplicate error messages)
      if (!isLoading) {
        showNotificationError('Failed to load moments. Pull down to retry.');
      }
      
      if (__DEV__) {
        console.error('FeedScreen loadMoments error:', error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [user, loadBlockedUsers, showNotificationError]);

  // Load moments on mount (only once)
  useEffect(() => {
    // Only load if we haven't loaded yet
    if (feedMoments.length === 0 && !isLoadingRef.current) {
      loadMoments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Merge feed_moments view data with local optimistic updates
  // feed_moments is the canonical source; local moments are temporary until server sync
  const mergedMoments = useMemo(() => {
    const blockedSet = new Set(blockedUserIds);
    
    // Convert feed moments to Moment format (canonical data from server)
    const momentsFromFeed = feedMoments.map(convertFeedMomentToMoment);
    const feedMomentIds = new Set(momentsFromFeed.map((m) => m.id));
    
    // Add local moments that aren't in feed yet (optimistic updates)
    // These are moments the user just approved but haven't been synced to server
    // Filter out blocked users and moments already in feed
    const localOnlyMoments = localMoments
      .filter((localMoment) => {
        const userId = (localMoment as any).userId || '';
        return (
          !feedMomentIds.has(localMoment.id) &&
          !blockedSet.has(userId)
        );
      })
      .map((localMoment) => ({
        ...localMoment,
        // Ensure local moments have required fields for display
        likeCount: (localMoment as any).likeCount ?? 0,
        hasLiked: (localMoment as any).hasLiked ?? false,
      }));
    
    // Filter out blocked users from feed moments (already filtered in fetchFeedMoments, but double-check)
    const filteredFeedMoments = momentsFromFeed.filter(
      (moment) => !blockedSet.has(moment.userId || '')
    );
    
    // Combine: local-only moments first (optimistic, newest), then feed moments (canonical)
    // Sort by createdAt descending to show newest first
    const allMoments = [...localOnlyMoments, ...filteredFeedMoments];
    return allMoments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [feedMoments, localMoments, blockedUserIds, convertFeedMomentToMoment]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    loadMoments(true);
  }, [loadMoments]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async (momentId: string) => {
    if (!user) {
      // User must be logged in to like
      return;
    }

    try {
      await toggleLike(momentId, user.id);
      // Don't refresh immediately - optimistic update in MomentCard handles UI feedback
      // Refresh will happen on next pull-to-refresh or when user navigates back to feed
      // This prevents the moment from disappearing due to race conditions
    } catch (error) {
      // Error is handled by optimistic update revert in MomentCard
      // Show error notification
      showNotificationError('Failed to update like. Please try again.');
      
      if (__DEV__) {
        console.error('Like toggle error:', error);
      }
      throw error; // Re-throw so MomentCard can handle it
    }
  }, [user, showNotificationError]);

  // Handle report
  const handleReport = useCallback(async (
    momentId: string,
    _userId: string,
    _username: string
  ) => {
    setReportMomentId(momentId);
    setShowReportDialog(true);
  }, []);

  // Handle block
  const handleBlock = useCallback(async (userId: string, username: string) => {
    if (!user) return;

    Alert.alert(
      `Block @${username}`,
      `Are you sure you want to block @${username}? You won't see their moments anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.id, userId);
              // Immediately add to blocked list
              setBlockedUserIds((prev) => [...prev, userId]);
              // Show success message
              showSuccess(`@${username} has been blocked.`);
              // Refresh feed to remove blocked user's moments
              loadMoments(true);
            } catch (error) {
              if (__DEV__) {
                console.error('Block error:', error);
              }
              showNotificationError('Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  }, [user, loadMoments, showSuccess, showNotificationError]);

  // Handle report submission
  const handleReportSubmit = useCallback(async () => {
    if (!user || !reportMomentId || !reportReason) return;

    setIsReporting(true);
    try {
      await reportMoment({
        momentId: reportMomentId,
        reporterId: user.id,
        reason: reportReason,
        reasonText: reportText.trim() || null,
      });

      showSuccess('Thank you for your report. We will review it shortly.');
      setShowReportDialog(false);
      setReportMomentId(null);
      setReportReason(null);
      setReportText('');
    } catch (error) {
      if (__DEV__) {
        console.error('Report error:', error);
      }
      showNotificationError('Failed to submit report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  }, [user, reportMomentId, reportReason, reportText, showNotificationError]);

  // Loading state (initial load)
  if (isLoading && feedMoments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading moments...</Text>
      </View>
    );
  }

  // Error state
  if (error && feedMoments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load moments</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
        <Text style={styles.retryText} onPress={() => loadMoments()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  // Empty state
  if (mergedMoments.length === 0) {
    return <EmptyState />;
  }

  const reportReasons: { label: string; value: ReportReason }[] = [
    { label: 'Spam', value: 'spam' },
    { label: 'Harassment', value: 'harassment' },
    { label: 'Inappropriate Content', value: 'inappropriate_content' },
    { label: 'Violence', value: 'violence' },
    { label: 'Hate Speech', value: 'hate_speech' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={mergedMoments}
        renderItem={({ item }) => (
          <MomentCard
            item={item}
            onLikeToggle={handleLikeToggle}
            onReport={handleReport}
            onBlock={handleBlock}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: Math.max(insets.top + 16, 24) },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      />

      {/* Report Dialog Modal */}
      <Modal
        visible={showReportDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportDialog}>
            <Text style={styles.reportDialogTitle}>Report Moment</Text>
            <Text style={styles.reportDialogSubtitle}>
              Why are you reporting this moment?
            </Text>

            {/* Reason Selection */}
            <View style={styles.reasonList}>
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonItem,
                    reportReason === reason.value && styles.reasonItemSelected,
                  ]}
                  onPress={() => setReportReason(reason.value)}
                >
                  <Text
                    style={[
                      styles.reasonItemText,
                      reportReason === reason.value && styles.reasonItemTextSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional Text Input */}
            <TextInput
              style={styles.reportTextInput}
              placeholder="Additional details (optional)"
              placeholderTextColor="#999999"
              value={reportText}
              onChangeText={setReportText}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <View style={styles.reportDialogActions}>
              <TouchableOpacity
                style={[styles.reportDialogButton, styles.reportDialogButtonCancel]}
                onPress={() => {
                  setShowReportDialog(false);
                  setReportReason(null);
                  setReportText('');
                }}
                disabled={isReporting}
              >
                <Text style={styles.reportDialogButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportDialogButton,
                  styles.reportDialogButtonSubmit,
                  (!reportReason || isReporting) && styles.reportDialogButtonDisabled,
                ]}
                onPress={handleReportSubmit}
                disabled={!reportReason || isReporting}
              >
                {isReporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.reportDialogButtonSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    // paddingTop is set dynamically based on safe area insets
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoErrorContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoErrorText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  videoErrorDebug: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  menuIcon: {
    color: '#999999',
    fontSize: 20,
    fontWeight: 'bold',
  },
  username: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  timestamp: {
    color: '#999999',
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    marginTop: 4,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  likeButton: {
    padding: 4,
    marginRight: 8,
  },
  likeIcon: {
    fontSize: 24,
  },
  likeCount: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  actionSheetItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  actionSheetText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  actionSheetCancel: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  actionSheetCancelText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  reportDialog: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  reportDialogTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reportDialogSubtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 20,
  },
  reasonList: {
    marginBottom: 20,
  },
  reasonItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  reasonItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reasonItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  reasonItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reportTextInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 20,
  },
  reportDialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportDialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  reportDialogButtonCancel: {
    backgroundColor: '#333333',
  },
  reportDialogButtonSubmit: {
    backgroundColor: '#007AFF',
  },
  reportDialogButtonDisabled: {
    opacity: 0.5,
  },
  reportDialogButtonCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reportDialogButtonSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
