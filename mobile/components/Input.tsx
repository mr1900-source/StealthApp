/**
 * Input Component
 * 
 * Reusable text input with label and error states.
 */

import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, radius, layout } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isPassword = secureTextEntry;
  const actualSecureEntry = isPassword && !showPassword;
  
  const containerStyles = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
  ];
  
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={containerStyles}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={colors.textSecondary} 
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={actualSecureEntry}
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
          >
            <Ionicons 
              name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !isPassword && (
          <TouchableOpacity 
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons 
              name={rightIcon} 
              size={20} 
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  
  label: {
    ...textStyles.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: layout.inputPaddingHorizontal,
  },
  
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  
  inputContainerError: {
    borderColor: colors.error,
  },
  
  input: {
    flex: 1,
    ...textStyles.body,
    color: colors.text,
    height: '100%',
  },
  
  leftIcon: {
    marginRight: spacing.sm,
  },
  
  rightIcon: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  
  error: {
    ...textStyles.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  
  hint: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default Input;
