import React from 'react';
import { StyleSheet } from 'react-native';
import { BaseToast, ToastConfig } from 'react-native-toast-message';

const styles = StyleSheet.create({
  successIcon: { fontSize: 18 },
  errorText: { fontSize: 14, fontWeight: '600' },
  errorBody: { fontSize: 13 },
});

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#22C55E', backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={styles.errorText}
      text2Style={styles.errorBody}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#EF4444', backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={styles.errorText}
      text2Style={styles.errorBody}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#3B82F6', backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={styles.errorText}
      text2Style={styles.errorBody}
    />
  ),
};
