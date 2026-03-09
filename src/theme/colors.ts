import { VerdictLevel } from '../types/models';

export const colors = {
  // Backgrounds
  background: '#0A0E17',
  surface: '#141926',
  surfaceElevated: '#1C2333',
  surfaceHover: '#232B3E',

  // Primary Accent
  primary: '#6C5CE7',
  primaryLight: '#8B7CF6',
  primaryDark: '#5A4BD1',

  // Text
  textPrimary: '#F0F2F5',
  textSecondary: '#A0A8BD',
  textMuted: '#5A6178',
  textInverse: '#0A0E17',

  // Verdict Colors
  verdictProceed: '#00D68F',
  verdictProceedBg: 'rgba(0, 214, 143, 0.08)',
  verdictProceedBorder: 'rgba(0, 214, 143, 0.2)',

  verdictAdjust: '#FFCB45',
  verdictAdjustBg: 'rgba(255, 203, 69, 0.08)',
  verdictAdjustBorder: 'rgba(255, 203, 69, 0.2)',

  verdictWait: '#FF9F43',
  verdictWaitBg: 'rgba(255, 159, 67, 0.08)',
  verdictWaitBorder: 'rgba(255, 159, 67, 0.2)',

  verdictStop: '#FF4757',
  verdictStopBg: 'rgba(255, 71, 87, 0.08)',
  verdictStopBorder: 'rgba(255, 71, 87, 0.2)',

  // Market
  marketUp: '#00D68F',
  marketDown: '#FF4757',

  // Utility
  border: '#1E2640',
  borderLight: '#2A3352',
  divider: '#1A1F35',

  // Semantic
  info: '#339AF0',
  warning: '#FFCB45',
  error: '#FF4757',
  success: '#00D68F',

  // Transparent
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

export function getVerdictColors(level: VerdictLevel) {
  const map = {
    proceed: { main: colors.verdictProceed, bg: colors.verdictProceedBg, border: colors.verdictProceedBorder, label: 'Proceed' },
    adjust: { main: colors.verdictAdjust, bg: colors.verdictAdjustBg, border: colors.verdictAdjustBorder, label: 'Adjust' },
    wait: { main: colors.verdictWait, bg: colors.verdictWaitBg, border: colors.verdictWaitBorder, label: 'Wait' },
    stop: { main: colors.verdictStop, bg: colors.verdictStopBg, border: colors.verdictStopBorder, label: 'Stop' },
  };
  return map[level];
}
