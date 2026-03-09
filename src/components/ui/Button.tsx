import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../../theme';
import { useAppStore } from '../../stores/useAppStore';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  style,
}: ButtonProps) {
  const hapticEnabled = useAppStore((s) => s.hapticEnabled);

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, textSizeStyles[size], textVariantStyles[variant]]}>
            {title}
          </Text>
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
    gap: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: typography.semiBold,
    textAlign: 'center',
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.sm },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radii.md },
  lg: { paddingVertical: spacing.lg + 2, paddingHorizontal: spacing.xxl, borderRadius: radii.lg },
};

const textSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: typography.sm },
  md: { fontSize: typography.base },
  lg: { fontSize: typography.md },
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderLight },
  ghost: { backgroundColor: colors.transparent },
  danger: { backgroundColor: colors.error },
};

const textVariantStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.white },
  secondary: { color: colors.textPrimary },
  ghost: { color: colors.primary },
  danger: { color: colors.white },
};
