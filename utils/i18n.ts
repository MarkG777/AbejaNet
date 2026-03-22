import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import es from '../locales/es.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

// Intentar cargar el idioma guardado previamente
const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  if (!savedLanguage) {
    // Si no hay guardado, leemos el idioma del teléfono (ej: 'es-MX' -> 'es')
    const phoneLocales = Localization.getLocales();
    if (phoneLocales && phoneLocales.length > 0) {
      savedLanguage = phoneLocales[0].languageCode;
    }
  }

  // Si el idioma no es 'es' o 'en', forzamos a 'es' como predeterminado
  const finalLanguage = (savedLanguage === 'en' || savedLanguage === 'es') ? savedLanguage : 'es';

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: finalLanguage,
      fallbackLng: 'es', // Por defecto si falta alguna traducción, usa la de español
      interpolation: {
        escapeValue: false, // React ya previene XSS
      },
    });
};

initI18n();

export default i18n;
