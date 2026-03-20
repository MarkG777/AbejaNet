/**
 * useAppColors - Returns all color tokens for the current theme (light/dark).
 * Usage: const colors = useAppColors();
 *        <View style={{ backgroundColor: colors.background }}>
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export function useAppColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
