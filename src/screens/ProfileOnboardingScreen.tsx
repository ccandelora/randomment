/**
 * Profile Onboarding Screen
 * 
 * Collects username and optional display name for new users.
 * Validates username format and uniqueness before creating profile.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useNotifications } from '../context/NotificationContext';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function ProfileOnboardingScreen() {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const { showError } = useNotifications();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const validateUsername = (value: string): string | null => {
    if (!value.trim()) {
      return 'Username is required';
    }

    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }

    if (value.length > 30) {
      return 'Username must be 30 characters or less';
    }

    if (!USERNAME_REGEX.test(value)) {
      return 'Username can only contain letters, numbers, and underscores';
    }

    return null;
  };

  const checkUsernameAvailability = async (value: string): Promise<boolean> => {
    if (!value.trim()) {
      return false;
    }

    setIsCheckingUsername(true);
    try {
      // RLS: SELECT policy allows reading any profile (public read access)
      // This query checks if a username is already taken
      // RLS allows authenticated users to read any profile, so this works
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value.trim().toLowerCase())
        .single();

      // If no error and data exists, username is taken
      if (!error && data) {
        return false;
      }

      // If error is "not found", username is available
      if (error && error.code === 'PGRST116') {
        return true;
      }

      // Other errors mean we can't check, assume unavailable
      return false;
    } catch (error) {
      if (__DEV__) {
        console.error('Username availability check error:', error);
      }
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = async (value: string) => {
    setUsername(value);
    setUsernameError(null);

    const validationError = validateUsername(value);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    // Check availability
    const isAvailable = await checkUsernameAvailability(value);
    if (!isAvailable) {
      setUsernameError('This username is already taken');
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a profile');
      return;
    }

    // Validate username
    const validationError = validateUsername(username);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    // Check availability one more time
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) {
      setUsernameError('This username is already taken');
      return;
    }

    setIsLoading(true);

    try {
      // RLS: INSERT policy requires id = auth.uid()
      // Setting id = user.id ensures RLS will allow the insert
      // RLS will reject if user.id doesn't match auth.uid()
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id, // Must equal auth.uid() for RLS to allow insert
          username: username.trim().toLowerCase(),
          display_name: displayName.trim() || null,
        });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          setUsernameError('This username is already taken');
        } else {
          throw error;
        }
        return;
      }

      // Refresh profile context
      await refreshProfile();
    } catch (error) {
      if (__DEV__) {
        console.error('Profile creation error:', error);
      }
      showError('Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Choose a username to get started
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Username <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                usernameError && styles.inputError,
              ]}
              placeholder="username"
              placeholderTextColor="#666666"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !isCheckingUsername}
              maxLength={30}
            />
            {usernameError && (
              <Text style={styles.errorText}>{usernameError}</Text>
            )}
            {isCheckingUsername && (
              <Text style={styles.checkingText}>Checking availability...</Text>
            )}
            {!usernameError && username.trim() && !isCheckingUsername && (
              <Text style={styles.helpText}>
                Username can contain letters, numbers, and underscores
              </Text>
            )}

            <Text style={styles.label}>Display Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#666666"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              editable={!isLoading}
              maxLength={50}
            />
            <Text style={styles.helpText}>
              This is how others will see your name
            </Text>

            <TouchableOpacity
              style={[
                styles.button,
                (isLoading || isCheckingUsername || !!usernameError || !username.trim()) &&
                styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || isCheckingUsername || !!usernameError || !username.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    width: '100%',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  checkingText: {
    color: '#007AFF',
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

