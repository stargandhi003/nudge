import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, radii } from '../../theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  prefix?: string;
  suffix?: string;
  error?: string;
  style?: ViewStyle;
  large?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  prefix,
  suffix,
  error,
  style,
  large = false,
}: InputProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError, large && styles.inputLarge]}>
        {prefix && <Text style={styles.affix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          style={[styles.input, large && styles.inputTextLarge]}
          selectionColor={colors.primary}
        />
        {suffix && <Text style={styles.affix}>{suffix}</Text>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.semiBold,
    fontSize: typography.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputLarge: {
    paddingVertical: spacing.lg,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typography.md,
    color: colors.textPrimary,
    padding: 0,
  },
  inputTextLarge: {
    fontSize: typography.xxl,
    fontFamily: typography.bold,
  },
  affix: {
    fontFamily: typography.semiBold,
    fontSize: typography.md,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  errorText: {
    fontFamily: typography.regular,
    fontSize: typography.sm,
    color: colors.error,
  },
});
