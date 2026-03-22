import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextData {
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  activeColorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextData | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const systemColorScheme = useSystemColorScheme() ?? 'light';

  useEffect(() => {
    // Cargar preferencia guardada al iniciar
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('themePreference');
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
          setThemePreferenceState(storedTheme);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  const setThemePreference = async (theme: ThemePreference) => {
    try {
      await AsyncStorage.setItem('themePreference', theme);
      setThemePreferenceState(theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // El esquema activo real que usará la app
  const activeColorScheme = themePreference === 'system' ? systemColorScheme : themePreference;

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, activeColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
