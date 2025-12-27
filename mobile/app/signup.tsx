/**
 * Signup Screen
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
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, layout } from '@/theme/spacing';
import { Button, Input } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { APP_CONFIG } from '@/constants/app.config';

export default function SignupScreen() {
  const { signup, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    school: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    
    try {
      await signup({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        name: formData.name || undefined,
        school: formData.school || undefined,
      });
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join {APP_CONFIG.name} and start exploring</Text>
          </View>
          
          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
            />
            
            <Input
              label="Username"
              placeholder="Choose a username"
              value={formData.username}
              onChangeText={(v) => updateField('username', v)}
              error={errors.username}
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="at-outline"
            />
            
            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChangeText={(v) => updateField('password', v)}
              error={errors.password}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />
            
            <Input
              label="Confirm Password"
              placeholder="Enter password again"
              value={formData.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              error={errors.confirmPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />
            
            <Input
              label="Name (optional)"
              placeholder="Your display name"
              value={formData.name}
              onChangeText={(v) => updateField('name', v)}
              leftIcon="person-outline"
            />
            
            <Input
              label="School (optional)"
              placeholder="e.g., Georgetown"
              value={formData.school}
              onChangeText={(v) => updateField('school', v)}
              leftIcon="school-outline"
            />
            
            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={isLoading}
              fullWidth
              style={styles.button}
            />
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Log In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  
  // Header
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...textStyles.h1,
    color: colors.text,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
