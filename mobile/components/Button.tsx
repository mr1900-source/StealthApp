/**
 * Button Component
 * 
 * Reusable button with multiple variants.
 */

import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, radius, layout } from '@/theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];
  
  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ];
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textLight} 
          size="small" 
        />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyles}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  
  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceSecondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  accent: {
    backgroundColor: colors.accent,
  },
  
  // Sizes
  small: {
    height: layout.buttonHeightSmall,
    paddingHorizontal: spacing.md,
  },
  medium: {
    height: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
  },
  large: {
    height: 56,
    paddingHorizontal: spacing.xxl,
  },
  
  // Full width
  fullWidth: {
    width: '100%',
  },
  
  // Disabled
  disabled: {
    opacity: 0.5,
  },
  
  // Text base
  text: {
    ...textStyles.button,
  },
  
  // Text variants
  primaryText: {
    color: colors.textLight,
  },
  secondaryText: {
    color: colors.text,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  accentText: {
    color: colors.textLight,
  },
  
  // Text sizes
  smallText: {
    ...textStyles.buttonSmall,
  },
  mediumText: {
    ...textStyles.button,
  },
  largeText: {
    ...textStyles.button,
    fontSize: 17,
  },
  
  // Disabled text
  disabledText: {
    opacity: 0.7,
  },
});

export default Button;
