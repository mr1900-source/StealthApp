/**
 * Root Layout
 * 
 * App entry point with AuthProvider and navigation structure.
 */

import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/constants/config';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {/* Main tabs */}
        <Stack.Screen name="(tabs)" />
        
        {/* Auth screens */}
        <Stack.Screen name="login" />
        
        {/* Modal screens */}
        <Stack.Screen 
          name="idea/[id]" 
          options={{ 
            presentation: 'card',
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="idea/new" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'New Idea',
          }} 
        />
        <Stack.Screen 
          name="group/[id]" 
          options={{ 
            presentation: 'card',
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="group/new" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'New Group',
          }} 
        />
        <Stack.Screen 
          name="plan/[id]" 
          options={{ 
            presentation: 'card',
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="plan/new" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Make a Plan',
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}
