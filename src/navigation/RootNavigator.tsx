/**
 * Root Navigator
 * Combines bottom tabs with nested stack navigation
 * Conditionally shows Auth screen or MainTabs based on auth state
 */

import React from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../types';
import { FeedScreen } from '../screens/FeedScreen';
import { CaptureStack } from './CaptureStack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { ProfileOnboardingScreen } from '../screens/ProfileOnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/TermsOfServiceScreen';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333333',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999999',
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon icon="📹" color={color} />
          ),
          tabBarLabel: 'Feed',
        }}
      />
      <Tab.Screen
        name="Capture"
        component={CaptureStack}
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🎬" color={color} />
          ),
          tabBarLabel: 'Capture',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon icon="👤" color={color} />
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Simple icon component for tabs
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={[styles.tabIcon, { color }]}>{icon}</Text>;
}

export function RootNavigator() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  
  // Register push notifications when user is authenticated and has profile
  // This hook automatically handles permission requests and token registration
  usePushNotifications();

  // Show loading screen while checking auth state or profile
  if (authLoading || (user && profileLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    >
      {!user ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : !profile ? (
        <Stack.Screen name="ProfileOnboarding" component={ProfileOnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#000000' },
              headerTintColor: '#FFFFFF',
              headerTitle: 'Settings',
            }}
          />
          <Stack.Screen 
            name="PrivacyPolicy" 
            component={PrivacyPolicyScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="TermsOfService" 
            component={TermsOfServiceScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});

