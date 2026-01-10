/**
 * Login / Signup Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/config';

export default function LoginScreen() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, username || undefined, name || undefined);
      } else {
        await login(email, password);
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo */}
          <Text style={styles.logo}>Drift</Text>
          <Text style={styles.tagline}>Turn ideas into plans</Text>

          {/* Form */}
          <View style={styles.form}>
            {isSignup && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Username (optional)"
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity 
                style={styles.showPassword}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Loading...' : isSignup ? 'Sign Up' : 'Log In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Switch mode */}
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignup(!isSignup)}
          >
            <Text style={styles.switchText}>
              {isSignup 
                ? 'Already have an account? Log in' 
                : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  logo: {
    fontSize: 56,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  showPassword: {
    paddingHorizontal: 16,
  },
  showPasswordText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.primary,
    fontSize: 15,
  },
});
