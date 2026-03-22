/**
 * useAppColors - Returns all color tokens for the current theme (light/dark).
 * Usage: const colors = useAppColors();
 *        <View style={{ backgroundColor: colors.background }}>
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useAppColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
