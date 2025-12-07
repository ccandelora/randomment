/**
 * Authentication Screen
 * 
 * Handles user sign-up and sign-in with email and password.
 * Provides a clean, simple UI for authentication flows.
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
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AuthError } from '@supabase/supabase-js';

type AuthMode = 'signin' | 'signup';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const { signIn, signUp, resendVerificationEmail } = useAuth();
  const { showSuccess, showError } = useNotifications();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          handleAuthError(error);
        }
      } else {
        // Sign up
        const { error, needsEmailVerification } = await signUp(email.trim(), password);
        
        if (error) {
          handleAuthError(error);
        } else if (needsEmailVerification) {
          // User created but needs email verification
          showSuccess('Account created! Please check your email to verify your account.');
          setShowResendEmail(true);
          setMode('signin');
        } else {
          // Email verification might be disabled in Supabase settings
          // User can sign in immediately
          showSuccess('Account created successfully!');
          setMode('signin');
        }
      }
    } catch (error) {
      showError('An unexpected error occurred. Please try again.');
      if (__DEV__) {
        console.error('Auth error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: AuthError) => {
    let message = 'Authentication failed. Please try again.';

    // Provide user-friendly error messages
    if (error.message.includes('Invalid login credentials')) {
      message = 'Invalid email or password. Please check your credentials and try again.';
    } else if (error.message.includes('Email not confirmed')) {
      message = 'Please verify your email address before signing in.';
    } else if (error.message.includes('User already registered')) {
      message = 'An account with this email already exists. Please sign in instead.';
    } else if (error.message.includes('Password')) {
      message = 'Password must be at least 6 characters long.';
    } else if (error.message) {
      message = error.message;
    }

    showError(message);
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setEmail('');
    setPassword('');
    setShowResendEmail(false);
  };

  const handleResendVerificationEmail = async () => {
    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    setIsResendingEmail(true);
    try {
      const { error } = await resendVerificationEmail(email.trim());
      if (error) {
        showError(error.message || 'Failed to resend verification email');
      } else {
        showSuccess('Verification email sent! Please check your inbox.');
        setShowResendEmail(false);
      }
    } catch (error) {
      showError('An unexpected error occurred. Please try again.');
      if (__DEV__) {
        console.error('Resend email error:', error);
      }
    } finally {
      setIsResendingEmail(false);
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
          <Text style={styles.title}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Sign in to continue'
              : 'Sign up to get started'}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#666666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!isLoading}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={mode === 'signin' ? 'password' : 'newPassword'}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
              disabled={isLoading}
            >
              <Text style={styles.toggleText}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>

            {/* Resend verification email option */}
            {showResendEmail && mode === 'signin' && (
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didn't receive the verification email?
                </Text>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendVerificationEmail}
                  disabled={isResendingEmail || isLoading}
                >
                  {isResendingEmail ? (
                    <ActivityIndicator color="#007AFF" size="small" />
                  ) : (
                    <Text style={styles.resendButtonText}>Resend Email</Text>
                  )}
                </TouchableOpacity>
                {__DEV__ && (
                  <Text style={styles.devNote}>
                    Note: In development, check Supabase Dashboard → Authentication → Users
                    or disable "Enable email confirmations" in Auth settings.
                  </Text>
                )}
              </View>
            )}
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
  toggleButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 14,
  },
  resendContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  resendText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  resendButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  devNote: {
    color: '#666666',
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

