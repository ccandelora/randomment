/**
 * Review Screen
 * User reviews captured moment before adding to feed
 * Nothing is saved without explicit approval
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack/lib/typescript/src/types';
import type { RouteProp } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { CaptureStackParamList } from '../types';
import { useMoments } from '../context/MomentsContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { uploadMomentVideo, createMomentRecord, deleteMomentVideo, getMomentPublicUrl } from '../services/moments';
import { supabase } from '../services/supabaseClient'; // Import for auth debug

type NavigationProp = NativeStackNavigationProp<CaptureStackParamList>;
type ReviewRouteProp = RouteProp<CaptureStackParamList, 'Review'>;

export function ReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewRouteProp>();
  const { videoUri, duration } = route.params;
  const { addMoment } = useMoments();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState('');

  const handleApprove = async () => {
    if (isSaving || !user) {
      return;
    }

    setIsSaving(true);
    let uploadedStoragePath: string | null = null;

    try {
      // Debug: Check authentication before upload
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (__DEV__) {
        console.log('🔍 Auth Debug:', {
          reviewScreenUser: user?.id,
          supabaseAuthUser: authUser?.id,
          match: user?.id === authUser?.id,
          authError: authError?.message,
          userEmail: user?.email,
          authUserEmail: authUser?.email,
        });
      }
      
      if (authError || !authUser) {
        showError('Authentication error. Please log out and log back in.');
        setIsSaving(false);
        return;
      }
      
      if (user.id !== authUser.id) {
        showError('User ID mismatch. Please log out and log back in.');
        setIsSaving(false);
        return;
      }

      // Step 1: Upload video to Supabase Storage
      const { storagePath } = await uploadMomentVideo(videoUri, user.id);
      uploadedStoragePath = storagePath;

      // Step 2: Create moment record in database
      const momentRecord = await createMomentRecord({
        userId: user.id,
        storagePath,
        description: description.trim() || null,
        durationSeconds: duration || null,
        status: 'pending_review',
        visibility: 'public',
      });

      // Step 3: Get public URL for the video
      const publicUrl = getMomentPublicUrl(storagePath);

      // Step 4: Update local MomentsContext with the new moment
      await addMoment({
        id: momentRecord.id,
        uri: publicUrl, // Use public URL from storage
        description: momentRecord.description || undefined,
        createdAt: momentRecord.created_at,
      });

      setIsSaving(false);
      showSuccess('Moment saved successfully!');
      
      // Navigate back to root of Capture stack (CaptureMain)
      if (navigation.canGoBack()) {
        navigation.popToTop();
      } else {
        navigation.navigate('CaptureMain');
      }
    } catch (error) {
      setIsSaving(false);
      
      // If DB insert failed but upload succeeded, try to clean up the uploaded file
      if (uploadedStoragePath) {
        try {
          await deleteMomentVideo(uploadedStoragePath);
        } catch (deleteError) {
          // Silently fail cleanup - already logged
          if (__DEV__) {
            console.error('Failed to clean up uploaded video:', deleteError);
          }
        }
      }

      let errorMessage = 'Unable to save your moment. Please try again.';
      if (error instanceof Error) {
        // Provide user-friendly error messages
        if (error.message.includes('upload')) {
          errorMessage = 'Failed to upload video. Please check your connection and try again.';
        } else if (error.message.includes('database') || error.message.includes('create')) {
          errorMessage = 'Failed to save moment. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(errorMessage);
    }
  };

  const handleDiscard = () => {
    // Simply go back without saving
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Video Player Section */}
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            useNativeControls
            shouldPlay
            isLooping
          />
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Review your Moment</Text>
          <Text style={styles.description}>
            Approve to add it to your feed. Discard if you'd rather not share it.
          </Text>

          {/* Caption Input */}
          <View style={styles.captionContainer}>
            <Text style={styles.captionLabel}>Add a caption (optional)</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="What's happening in this moment?"
              placeholderTextColor="#666666"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.captionCounter}>
              {description.length}/200
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.discardButton]}
              onPress={handleDiscard}
              disabled={isSaving}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.approveButton, isSaving && styles.approveButtonDisabled]}
              onPress={handleApprove}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.approveButtonText}>Approve</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Privacy Footer */}
          <Text style={styles.privacyFooter}>
            Nothing is shared without your approval.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  videoContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  captionContainer: {
    marginBottom: 24,
  },
  captionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#333333',
  },
  captionCounter: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  discardButton: {
    backgroundColor: '#333333',
    marginRight: 8,
  },
  approveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  approveButtonDisabled: {
    opacity: 0.6,
  },
  discardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyFooter: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
