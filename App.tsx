import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { MomentsProvider } from './src/context/MomentsContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { MomentWindowProvider } from './src/components/MomentWindowProvider';
import { logError } from './src/utils/errorHandling';
import { navigationRef, navigateToTab } from './src/utils/navigationRef';
import { storePendingNavigation, getAndClearPendingNavigation } from './src/utils/pendingNavigation';
import { useAuth } from './src/context/AuthContext';
import { useProfile } from './src/context/ProfileContext';
import { logDatabaseDiagnostics } from './src/utils/databaseDiagnostics';
import { useAppActivation } from './src/hooks/useAppActivation';

/**
 * Global error handler for unhandled errors
 * Prevents crashes and reduces console noise in production
 */
function setupGlobalErrorHandlers() {
  // Handle unhandled errors using React Native's ErrorUtils
  if (typeof ErrorUtils !== 'undefined') {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      logError('Unhandled error:', error);
      // Call original handler to maintain default behavior
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
}

/**
 * Component that handles push notification responses
 * Must be inside AuthProvider and ProfileProvider to access auth state
 */
function NotificationResponseHandler() {
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    /**
     * Handle notification responses (when user taps a notification)
     * 
     * SERVER-SIDE SCHEDULER INTEGRATION:
     * 
     * The server-side scheduler (e.g., a cron job or scheduled function) sends
     * push notifications to users at random intervals (30-120 seconds after app activation).
     * These notifications have:
     * - type: "moment_window"
     * - data: { type: "moment_window" }
     * 
     * When a user taps the notification, this handler:
     * 1. Checks if the notification is of type "moment_window"
     * 2. If user is authenticated and has profile → Navigate to Capture tab
     * 3. If user is not authenticated → Store intent and execute after login
     * 
     * The scheduler workflow:
     * 1. User opens app → Device token registered in device_tokens table
     * 2. Server detects app activation (via analytics or heartbeat)
     * 3. Server waits random delay (30-120s)
     * 4. Server sends push notification with type="moment_window"
     * 5. User taps notification → This handler executes navigation
     */
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const notification = response.notification;
        const notificationType = notification.request.content.data?.type;

        if (__DEV__) {
          console.log('Notification tapped:', {
            type: notificationType,
            user: user?.id,
            hasProfile: !!profile,
          });
        }

        // Handle "moment_window" notification type
        if (notificationType === 'moment_window') {
          // Check if user is authenticated and has profile
          if (user && profile) {
            // User is fully onboarded, navigate immediately
            // Use retry pattern to ensure navigation is ready
            const attemptNavigation = () => {
              if (navigationRef.isReady()) {
                try {
                  navigateToTab('Capture');
                  if (__DEV__) {
                    console.log('Navigated to Capture tab from notification');
                  }
                } catch (error) {
                  if (__DEV__) {
                    console.error('Failed to navigate to Capture tab:', error);
                  }
                }
              } else {
                // Retry after a short delay if navigation not ready
                setTimeout(attemptNavigation, 200);
              }
            };

            // Start navigation attempt after a brief delay
            setTimeout(attemptNavigation, 300);
          } else {
            // User not authenticated or no profile, store intent for later
            await storePendingNavigation({
              type: 'moment_window',
              timestamp: Date.now(),
            });
            if (__DEV__) {
              console.log('Stored pending navigation intent (user not authenticated)');
            }
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [user, profile]);

  /**
   * Execute pending navigation intents when user becomes authenticated
   * This handles the case where a notification arrived before login
   */
  useEffect(() => {
    if (user && profile) {
      // User is now authenticated and has profile
      // Check for pending navigation intents
      getAndClearPendingNavigation().then((intent) => {
        if (intent && intent.type === 'moment_window') {
          // Wait for navigation to be ready, then navigate
          const attemptNavigation = () => {
            if (navigationRef.isReady()) {
              try {
                navigateToTab('Capture');
                if (__DEV__) {
                  console.log('Executed pending navigation intent: moment_window');
                }
              } catch (error) {
                if (__DEV__) {
                  console.error('Failed to execute pending navigation:', error);
                }
              }
            } else {
              // Retry after a short delay if navigation not ready
              setTimeout(attemptNavigation, 200);
            }
          };

          // Start navigation attempt after a brief delay to ensure navigation is set up
          setTimeout(attemptNavigation, 500);
        }
      });
    }
  }, [user, profile]);

  return null; // This component doesn't render anything
}

/**
 * Component that tracks app activation and schedules moment windows
 * Must be inside AuthProvider and ProfileProvider to access auth state
 */
function AppActivationTracker() {
  // Track app activation and schedule moment windows via Edge Function
  useAppActivation({
    enabled: true,
    minDelaySeconds: 30,
    maxDelaySeconds: 120,
  });

  return null; // This component doesn't render anything
}

export default function App() {
  useEffect(() => {
    setupGlobalErrorHandlers();
    
    // Run database diagnostics in development to identify legacy data issues
    if (__DEV__) {
      // Run diagnostics after a short delay to ensure Supabase is initialized
      setTimeout(() => {
        logDatabaseDiagnostics().catch((error) => {
          if (__DEV__) {
            console.error('Failed to run database diagnostics:', error);
          }
        });
      }, 2000);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <AuthProvider>
          <ProfileProvider>
            <MomentsProvider>
              <NavigationContainer ref={navigationRef}>
                <MomentWindowProvider>
                  <AppActivationTracker />
                  <RootNavigator />
                  <NotificationResponseHandler />
                  <StatusBar style="light" />
                </MomentWindowProvider>
              </NavigationContainer>
            </MomentsProvider>
          </ProfileProvider>
        </AuthProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

