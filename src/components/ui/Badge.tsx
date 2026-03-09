import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radii } from '../../theme';
import { getVerdictColors } from '../../theme/colors';
import { VerdictLevel } from '../../types/models';

interface BadgeProps {
  level: VerdictLevel;
  size?: 'sm' | 'md' | 'lg';
}

export function VerdictBadge({ level, size = 'md' }: BadgeProps) {
  const verdictColors = getVerdictColors(level);

  return (
    <View style={[styles.base, sizeStyles[size], { backgroundColor: verdictColors.bg, borderColor: verdictColors.border }]}>
      <Text style={[styles.text, textSizeStyles[size], { color: verdictColors.main }]}>
        {verdictColors.label}
      </Text>
    </View>
  );
}

interface StatusBadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export function StatusBadge({ label, color = colors.textSecondary, bgColor = colors.surfaceElevated }: StatusBadgeProps) {
  return (
    <View style={[styles.base, sizeStyles.sm, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, textSizeStyles.sm, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: typography.xs },
  md: { fontSize: typography.sm },
  lg: { fontSize: typography.base },
});
