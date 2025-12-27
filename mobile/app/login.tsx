/**
 * Login Screen
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, layout } from '@/theme/spacing';
import { Button, Input } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { APP_CONFIG } from '@/constants/app.config';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    try {
      await login({ email, password });
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>{APP_CONFIG.name}</Text>
            <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>
          </View>
          
          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
            />
            
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />
            
            <Button
              title="Log In"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              style={styles.button}
            />
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    justifyContent: 'center',
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    ...textStyles.displayLarge,
    color: colors.primary,
  },
  tagline: {
    ...textStyles.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  
  // Form
  form: {
    marginBottom: spacing.xxl,
  },
  button: {
    marginTop: spacing.md,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  footerLink: {
    ...textStyles.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
