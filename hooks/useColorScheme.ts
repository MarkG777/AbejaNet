import { useAppTheme } from '@/context/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  try {
    const { activeColorScheme } = useAppTheme();
    return activeColorScheme;
  } catch (e) {
    // Falback during init
    return 'light';
  }
}
