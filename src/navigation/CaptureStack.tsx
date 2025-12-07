/**
 * Capture Stack Navigator
 * Nested stack for Capture tab: CaptureMain → Review
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CaptureStackParamList } from '../types';
import { CaptureScreen } from '../screens/CaptureScreen';
import { ReviewScreen } from '../screens/ReviewScreen';

const Stack = createNativeStackNavigator<CaptureStackParamList>();

export function CaptureStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    >
      <Stack.Screen name="CaptureMain" component={CaptureScreen} />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Review Moment',
          headerStyle: { backgroundColor: '#1A1A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack.Navigator>
  );
}

